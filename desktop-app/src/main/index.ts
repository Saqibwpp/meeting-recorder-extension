import { app, shell, BrowserWindow, ipcMain, Tray, nativeImage, protocol } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { ChildProcess, spawn } from 'child_process'
import { unlink, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import http from 'http'
import crypto from 'crypto'
import { AddressInfo } from 'net'
import { pathToFileURL } from 'url'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import ffprobePath from 'ffprobe-static'

// ==========================================
// 1. SETUP & GLOBALS
// ==========================================

// Set the ffmpeg and ffprobe paths for fluent-ffmpeg
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath)
} else {
  console.error('[Main] FFmpeg path is null!')
}

if (ffprobePath.path) {
  ffmpeg.setFfprobePath(ffprobePath.path)
} else {
  console.error('[Main] FFprobe path is null!')
}

// Track the Swift audio capture process
let swiftProcess: ChildProcess | null = null
let systemAudioPath: string | null = null

// Register local scheme as privileged (must be before app is ready)
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
      stream: true,
      corsEnabled: true
    }
  }
])

let mainWindow: BrowserWindow | null = null
let trayWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isRecordingActive = false
let micMonitorProcess: ChildProcess | null = null

function getSwiftBinaryPath(): string {
  if (is.dev) {
    // During development, use the locally compiled binary
    return join(app.getAppPath(), 'swift-audio', 'build', 'AudioCapture')
  }
  // In production, use the binary bundled via extraResources
  return join(process.resourcesPath, 'AudioCapture')
}

function getMicMonitorBinaryPath(): string {
  if (is.dev) {
    return join(app.getAppPath(), 'swift-audio', 'build', 'MicMonitor')
  }
  return join(process.resourcesPath, 'MicMonitor')
}

function startMicMonitor(): void {
  if (process.platform !== 'darwin') return

  const binaryPath = getMicMonitorBinaryPath()
  try {
    console.log(`[Main] Launching MicMonitor listener: ${binaryPath}`)
    micMonitorProcess = spawn(binaryPath, [], {
      stdio: ['ignore', 'pipe', 'pipe']
    })

    micMonitorProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString().trim()
      if (output.includes('MIC_ACTIVE:1')) {
        console.log('[Main] macOS Microphone became ACTIVE!')
        if (!isRecordingActive) {
          showTrayWindow()
          trayWindow?.webContents.send('meeting-detected')
        }
      } else if (output.includes('MIC_ACTIVE:0')) {
        console.log('[Main] macOS Microphone is now IDLE.')
      }
    })

    micMonitorProcess.stderr?.on('data', (data: Buffer) => {
      console.warn(`[MicMonitor] ${data.toString().trim()}`)
    })

    micMonitorProcess.on('error', (err) => {
      console.warn('[Main] MicMonitor failed to start:', err)
      micMonitorProcess = null
    })

    micMonitorProcess.on('exit', () => {
      micMonitorProcess = null
    })
  } catch (err) {
    console.warn('[Main] Error starting MicMonitor:', err)
  }
}

// ==========================================
// 2. MAIN WINDOW MANAGEMENT
// ==========================================

function createMainWindow(showOnReady = true): void {
  if (mainWindow) {
    if (showOnReady) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
      if (app.dock) app.dock.show()
    }
    return
  }

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    title: 'Embrace AI',
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  if (process.platform === 'darwin' && app.dock) {
    const dockIcon = nativeImage.createFromPath(icon)
    if (!dockIcon.isEmpty()) {
      app.dock.setIcon(dockIcon)
    }
  }

  mainWindow.on('ready-to-show', () => {
    if (showOnReady) {
      mainWindow?.show()
      if (app.dock) app.dock.show()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
    if (app.dock) app.dock.hide()
  })

  // Strip 'Electron/...' from User Agent so Google OAuth does not block with 'disallowed_user_agent'
  const customUserAgent = mainWindow.webContents.getUserAgent().replace(/Electron\/\S+ /, '')
  mainWindow.webContents.setUserAgent(customUserAgent)

  mainWindow.webContents.setWindowOpenHandler((details) => {
    // Firebase Auth opens 'about:blank' first, then redirects to Google / Firebase Auth
    if (
      details.url === 'about:blank' ||
      details.url === '' ||
      details.url.includes('firebaseapp.com') ||
      details.url.includes('accounts.google.com') ||
      details.url.includes('google.com')
    ) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 500,
          height: 650,
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
          }
        }
      }
    }

    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '#/')
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/' })
  }
}

// ==========================================
// 3. TRAY WINDOW MANAGEMENT (MENU BAR APP)
// ==========================================

function createTrayWindow(): void {
  trayWindow = new BrowserWindow({
    width: 320,
    height: 480,
    show: false,
    frame: false,
    resizable: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Hide the window when it loses focus
  trayWindow.on('blur', () => {
    if (!trayWindow?.webContents.isDevToolsOpened()) {
      trayWindow?.hide()
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    trayWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '#/tray')
  } else {
    trayWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/tray' })
  }
}

function showTrayWindow(): void {
  if (!tray || !trayWindow) return

  const trayBounds = tray.getBounds()
  const windowBounds = trayWindow.getBounds()

  const x = Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2)
  let y: number
  if (process.platform === 'win32') {
    y = Math.round(trayBounds.y - windowBounds.height)
  } else {
    y = Math.round(trayBounds.y + trayBounds.height)
  }

  trayWindow.setPosition(x, y, false)
  trayWindow.show()
  trayWindow.focus()
}

function toggleTrayWindow(): void {
  if (!tray || !trayWindow) return

  if (trayWindow.isVisible()) {
    trayWindow.hide()
  } else {
    showTrayWindow()
  }
}

function createTray(): void {
  const trayIcon = nativeImage.createFromPath(icon).resize({ width: 16, height: 16 })
  tray = new Tray(trayIcon)
  tray.setToolTip('Embrace AI')

  tray.on('click', () => {
    toggleTrayWindow()
  })
}

// ==========================================
// 4. APP INITIALIZATION
// ==========================================

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Set defaultSession User-Agent to standard Chrome (remove Electron/...)
  const { session, desktopCapturer, protocol, net } = await import('electron')
  const defaultUA = session.defaultSession.getUserAgent().replace(/Electron\/\S+ /, '')
  session.defaultSession.setUserAgent(defaultUA)

  // Register local:// protocol to allow loading local files securely
  protocol.handle('local', (request) => {
    try {
      // Strip scheme and any leading slashes (e.g. local:///Users/... -> Users/...)
      const raw = request.url.replace(/^local:\/*/, '')
      const decoded = decodeURIComponent(raw)
      // On macOS/Linux, guarantee single leading slash
      const filePath = process.platform === 'win32' ? decoded : '/' + decoded
      return net.fetch(pathToFileURL(filePath).toString())
    } catch (err) {
      console.error('[Main] local protocol fetch error:', err)
      return new Response('File not found', { status: 404 })
    }
  })

  // Allow Google Drive preview iframes without CSP/X-Frame-Options blocking
  session.defaultSession.webRequest.onHeadersReceived(
    { urls: ['https://drive.google.com/*', 'https://*.googleusercontent.com/*'] },
    (details, callback) => {
      const responseHeaders = { ...(details.responseHeaders || {}) }
      delete responseHeaders['x-frame-options']
      delete responseHeaders['X-Frame-Options']
      delete responseHeaders['content-security-policy']
      delete responseHeaders['Content-Security-Policy']
      callback({ cancel: false, responseHeaders })
    }
  )

  // Handle getDisplayMedia requests — screen video + loopback audio (Windows fallback)
  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
    desktopCapturer
      .getSources({ types: ['screen'] })
      .then((sources) => {
        if (sources.length > 0) {
          if (process.platform === 'darwin') {
            // On macOS, only capture video — system audio is handled by Swift
            callback({ video: sources[0] })
          } else {
            // On Windows, use loopback for system audio (WASAPI works fine)
            callback({ video: sources[0], audio: 'loopback' })
          }
        }
      })
      .catch((err) => {
        console.error('Error getting screen sources:', err)
      })
  })

  // ==========================================
  // 5. IPC HANDLERS: AUTHENTICATION & AI
  // ==========================================

  ipcMain.handle(
    'transcribe-audio',
    async (_event, audioPath: string, apiKey: string, title: string, modelName?: string) => {
      try {
        console.log('[Main] Reading audio file for transcription:', audioPath)
        const fs = await import('fs/promises')
        const fileBuffer = await fs.readFile(audioPath)
        const base64Audio = fileBuffer.toString('base64')

        console.log('[Main] Calling Gemini API...')
        const { transcribeAudioFile } = await import('./services/gemini')
        const transcript = await transcribeAudioFile(base64Audio, apiKey, title, modelName)
        return transcript
      } catch (err: unknown) {
        console.error('[Main] Transcription error:', err)
        throw err
      }
    }
  )

  ipcMain.handle('get-gemini-models', async (_event, apiKey: string) => {
    try {
      const { fetchAvailableModels } = await import('./services/gemini')
      return await fetchAvailableModels(apiKey)
    } catch (err: unknown) {
      if (err instanceof Error) {
        throw new Error(`Failed to fetch models: ${err.message}`)
      }
      throw new Error('Failed to fetch models')
    }
  })

  // Starts a local HTTP loopback server and opens web browser for Google/Email auth
  ipcMain.handle('login-with-browser', async () => {
    const webBaseUrl = process.env.VITE_API_BASE_URL || 'http://localhost:3000'
    const expectedState = crypto.randomBytes(16).toString('hex')

    return new Promise<string>((resolve, reject) => {
      let server: http.Server | null = null

      const timeout = setTimeout(
        () => {
          if (server) {
            server.close()
          }
          reject(new Error('Authentication timed out. Please try again.'))
        },
        5 * 60 * 1000
      )

      server = http.createServer((req, res) => {
        try {
          const reqUrl = new URL(req.url || '', `http://${req.headers.host}`)
          if (reqUrl.pathname === '/callback') {
            const token = reqUrl.searchParams.get('token')
            const state = reqUrl.searchParams.get('state')

            if (state !== expectedState) {
              res.writeHead(400, { 'Content-Type': 'text/plain' })
              res.end('Invalid authentication state.')
              return
            }

            if (!token) {
              res.writeHead(400, { 'Content-Type': 'text/plain' })
              res.end('Missing token.')
              return
            }

            res.writeHead(200, {
              'Content-Type': 'text/html; charset=utf-8',
              'Access-Control-Allow-Origin': '*'
            })
            res.end(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Connected</title>
                  <style>
                    body { font-family: -apple-system, sans-serif; background: #faf9f6; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; color: #1a1a1a; }
                    .card { background: white; padding: 32px; border-radius: 12px; border: 1px solid #e2e0d8; text-align: center; max-width: 400px; box-shadow: 0 4px 20px -4px rgba(0,0,0,0.05); }
                    h2 { margin-top: 0; }
                    p { color: #737373; font-size: 14px; }
                  </style>
                </head>
                <body>
                  <div class="card">
                    <h2>✓ Logged In Successfully</h2>
                    <p>You can close this window and return to Embrace AI Desktop.</p>
                  </div>
                </body>
              </html>
            `)

            clearTimeout(timeout)
            resolve(token)

            setTimeout(() => {
              server?.close()
            }, 1000)
          } else {
            res.writeHead(404)
            res.end()
          }
        } catch (err) {
          console.error('[Main] Loopback server error:', err)
          res.writeHead(500)
          res.end()
        }
      })

      server.listen(0, '127.0.0.1', () => {
        const address = server?.address() as AddressInfo
        const port = address.port
        const authUrl = `${webBaseUrl}/desktop-login?port=${port}&state=${expectedState}`
        console.log(`[Main] Launching external browser login: ${authUrl}`)
        shell.openExternal(authUrl)
      })

      server.on('error', (err) => {
        clearTimeout(timeout)
        reject(err)
      })
    })
  })

  // Google Drive IPCs
  ipcMain.handle('connect-drive', async () => {
    const { connectDrive } = await import('./services/drive')
    return connectDrive()
  })

  ipcMain.handle('disconnect-drive', async () => {
    const { disconnectDrive } = await import('./services/drive')
    return disconnectDrive()
  })

  ipcMain.handle('check-drive-status', async () => {
    const { checkDriveStatus } = await import('./services/drive')
    return checkDriveStatus()
  })

  ipcMain.handle(
    'upload-to-drive',
    async (_event, filePath: string, title: string, makePublic?: boolean) => {
      const { uploadToDrive } = await import('./services/drive')
      return uploadToDrive(filePath, title, makePublic)
    }
  )

  // ==========================================
  // 6. IPC HANDLERS: AUDIO CAPTURE & RECORDING
  // ==========================================

  // Returns the platform so the renderer knows whether to use Swift or loopback
  ipcMain.handle('get-platform', () => {
    return process.platform
  })

  // Start the Swift audio capture process (macOS only)
  ipcMain.handle('start-system-audio', () => {
    if (process.platform !== 'darwin') {
      // On Windows, system audio is captured via getDisplayMedia loopback
      return
    }

    // Generate a unique temp file path for this recording session
    systemAudioPath = join(tmpdir(), `system-audio-${Date.now()}.m4a`)
    const binaryPath = getSwiftBinaryPath()

    console.log(`[Main] Starting Swift audio capture: ${binaryPath} → ${systemAudioPath}`)

    swiftProcess = spawn(binaryPath, [systemAudioPath], {
      stdio: ['ignore', 'pipe', 'pipe']
    })

    swiftProcess.stderr?.on('data', (data: Buffer) => {
      console.log(`[Swift] ${data.toString().trim()}`)
    })

    swiftProcess.on('error', (err) => {
      console.error('[Main] Failed to start Swift process:', err)
      swiftProcess = null
    })

    swiftProcess.on('exit', (code) => {
      console.log(`[Swift] Process exited with code ${code}`)
      swiftProcess = null
    })
  })

  // Stop the Swift audio capture and return the PATH to the audio file
  ipcMain.handle('stop-system-audio', async () => {
    if (process.platform !== 'darwin' || !swiftProcess || !systemAudioPath) {
      return null
    }

    const audioPath = systemAudioPath

    // Send SIGINT to gracefully stop the Swift process
    return new Promise<string | null>((resolve) => {
      const timeout = setTimeout(() => {
        // Force kill if it doesn't stop within 5 seconds
        console.warn('[Main] Swift process did not exit in time, force killing')
        swiftProcess?.kill('SIGKILL')
        resolve(null)
      }, 5000)

      swiftProcess!.on('exit', async () => {
        clearTimeout(timeout)
        resolve(audioPath)
      })

      console.log('[Main] Sending SIGINT to Swift process')
      swiftProcess!.kill('SIGINT')
    })
  })

  // Merge the video/mic blob and the system audio, then prompt to save
  ipcMain.handle(
    'merge-and-save-recording',
    async (_event, videoBuffer: ArrayBuffer, sysAudioPath: string, title: string) => {
      try {
        // -------------------------------------------------------------
        // LOCATION: WHERE DO WE SAVE FILES?
        // We cannot save user files inside the application folder
        // (e.g. /Applications or C:\Program Files) because modern OS's
        // strictly enforce these folders as READ-ONLY to prevent malware.
        // Therefore, we use the industry standard `app.getPath('documents')`
        // to save videos safely in the user's `~/Documents/Embrace AI` folder.
        // -------------------------------------------------------------
        const docsPath = app.getPath('documents')
        const appDir = join(docsPath, 'Embrace AI')

        // Ensure the directory exists
        const fs = await import('fs/promises')
        await fs.mkdir(appDir, { recursive: true })

        const safeTitle = title.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
        const filePath = join(appDir, `${safeTitle}_${Date.now()}.webm`)

        // Write video buffer (which contains mic audio) to a temp file
        const videoPath = join(tmpdir(), `video-mic-${Date.now()}.webm`)
        await writeFile(videoPath, Buffer.from(videoBuffer))

        console.log('[Main] Starting FFmpeg merge...')

        // Probe the video file to see if it has an audio track (e.g. mic was selected)
        return new Promise<{ videoPath: string; audioPath: string } | false>((resolve, reject) => {
          ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) {
              console.error('[Main] Error probing video file:', err)
              reject(err)
              return
            }

            const hasAudio = metadata.streams.some((s) => s.codec_type === 'audio')
            console.log(`[Main] Video has audio track: ${hasAudio}`)

            // -------------------------------------------------------------
            // AUDIO MERGING LOGIC
            // Input 0: `videoPath` (Screen Recording + Microphone Audio)
            // Input 1: `sysAudioPath` (System Audio from Swift binary)
            // -------------------------------------------------------------
            let command = ffmpeg().input(videoPath).input(sysAudioPath)

            if (hasAudio) {
              // Mix the audio from both inputs, keep the video from the first input
              // `[0:a][1:a]amix=inputs=2` perfectly merges the mic and system audio!
              command = command
                .complexFilter(['[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=3[a]'])
                .outputOptions([
                  '-map 0:v', // Take video from first input
                  '-map [a]', // Take the perfectly mixed audio
                  '-c:v copy', // Do not re-encode video (instant copy)
                  '-c:a libopus', // Re-encode mixed audio to Opus (WebM compatible)
                  '-b:a 128k'
                ])
            } else {
              // Video has no audio, just map video from 0 and audio from 1
              command = command.outputOptions([
                '-map 0:v', // Take video from first input
                '-map 1:a', // Take audio from second input (system audio)
                '-c:v copy', // Do not re-encode video (instant copy)
                '-c:a libopus', // Re-encode system audio to Opus (WebM compatible)
                '-b:a 128k',
                '-shortest' // End when the shortest input ends (usually the audio)
              ])
            }

            command
              .save(filePath)
              .on('end', async () => {
                console.log('[Main] FFmpeg merge complete ->', filePath)
                // Cleanup temp files
                await unlink(videoPath).catch(() => {})
                await unlink(sysAudioPath).catch(() => {})

                const audioPath = join(appDir, `${safeTitle}_${Date.now()}.m4a`)
                console.log('[Main] Starting audio extraction...')

                ffmpeg(filePath)
                  .output(audioPath)
                  .noVideo()
                  .audioCodec('aac')
                  .audioBitrate('128k')
                  .on('end', () => {
                    console.log('[Main] Audio extraction complete ->', audioPath)
                    resolve({ videoPath: filePath, audioPath })
                  })
                  .on('error', (err) => {
                    console.error('[Main] Audio extraction error:', err)
                    resolve({ videoPath: filePath, audioPath: '' })
                  })
                  .run()
              })
              .on('error', async (err, stdout, stderr) => {
                console.error('[Main] FFmpeg merge error:', err.message)
                console.error('[Main] FFmpeg stderr:', stderr)
                console.error('[Main] FFmpeg stdout:', stdout)
                // Cleanup temp files
                await unlink(videoPath).catch(() => {})
                await unlink(sysAudioPath).catch(() => {})

                // Fallback: write the raw video buffer directly to the file path
                console.log('[Main] Falling back to saving unmerged video...')
                await writeFile(filePath, Buffer.from(videoBuffer)).catch(() => {})
                resolve(false) // resolve false to indicate fallback occurred (or maybe we should resolve filePath here too, but for now we leave as is or return false)
              })
          })
        })
      } catch (err) {
        console.error('[Main] Error in merge-and-save-recording:', err)
        return false
      }
    }
  )

  // Fallback for saving just the video buffer (e.g. on Windows)
  ipcMain.handle('save-recording', async (_event, videoBuffer: ArrayBuffer, title: string) => {
    try {
      // -------------------------------------------------------------
      // LOCATION: WHERE DO WE SAVE FILES?
      // We cannot save user files inside the application folder
      // (e.g. /Applications or C:\Program Files) because modern OS's
      // strictly enforce these folders as READ-ONLY to prevent malware.
      // Therefore, we use the industry standard `app.getPath('documents')`
      // to save videos safely in the user's `~/Documents/Embrace AI` folder.
      // -------------------------------------------------------------
      const docsPath = app.getPath('documents')
      const appDir = join(docsPath, 'Embrace AI')

      // Ensure the directory exists
      await import('fs/promises').then((fs) => fs.mkdir(appDir, { recursive: true }))

      const safeTitle = title.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
      const timestamp = Date.now()
      const videoPath = join(appDir, `${safeTitle}_${timestamp}.webm`)
      const audioPath = join(appDir, `${safeTitle}_${timestamp}.m4a`)

      await writeFile(videoPath, Buffer.from(videoBuffer))
      console.log('[Main] Saved video directly to:', videoPath)

      // Extract audio for transcription
      return new Promise<{ videoPath: string; audioPath: string } | false>((resolve) => {
        ffmpeg(videoPath)
          .output(audioPath)
          .noVideo()
          .audioCodec('aac')
          .audioBitrate('128k')
          .on('end', () => {
            console.log('[Main] Audio extraction complete ->', audioPath)
            resolve({ videoPath, audioPath })
          })
          .on('error', (err) => {
            console.error('[Main] Audio extraction error:', err)
            // Even if audio extraction fails, we still saved the video
            resolve({ videoPath, audioPath: '' })
          })
          .run()
      })
    } catch (err) {
      console.error('[Main] Error in save-recording:', err)
      return false
    }
  })

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Launch at Login
  ipcMain.handle('get-launch-at-login', () => {
    return app.getLoginItemSettings().openAtLogin
  })

  ipcMain.handle('set-launch-at-login', (_event, enabled: boolean) => {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: true
    })
    return app.getLoginItemSettings().openAtLogin
  })

  ipcMain.on(
    'tray-start-recording',
    (_event, payload?: string | { title?: string; model?: string }) => {
      if (!mainWindow) {
        createMainWindow(false)
      }
      mainWindow?.webContents.send('trigger-start-recording', payload)
    }
  )

  ipcMain.on('tray-stop-recording', () => {
    mainWindow?.webContents.send('trigger-stop-recording')
  })

  ipcMain.on('broadcast-recording-state', (_event, state) => {
    isRecordingActive = !!state.isRecording
    trayWindow?.webContents.send('recording-state-changed', state)
  })

  ipcMain.on('hide-tray-window', () => {
    trayWindow?.hide()
  })

  ipcMain.on('open-main-window', (_event, route?: string) => {
    createMainWindow(true)
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
      if (route) {
        mainWindow.webContents.send('navigate-to', route)
      }
    }
    if (trayWindow?.isVisible()) {
      trayWindow.hide()
    }
  })

  ipcMain.on('quit-app', () => {
    app.quit()
  })

  createTray()
  createTrayWindow()
  startMicMonitor()
  createMainWindow()

  app.on('activate', function () {
    if (!mainWindow) createMainWindow()
  })
})

// ==========================================
// 7. APP LIFECYCLE & CLEANUP
// ==========================================

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Clean up background processes on app quit
app.on('before-quit', () => {
  if (swiftProcess) {
    swiftProcess.kill('SIGINT')
  }
  if (micMonitorProcess) {
    micMonitorProcess.kill('SIGKILL')
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
