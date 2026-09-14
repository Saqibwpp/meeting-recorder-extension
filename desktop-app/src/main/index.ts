import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { ChildProcess, spawn } from 'child_process'
import { unlink, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import http from 'http'
import crypto from 'crypto'
import { AddressInfo } from 'net'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import ffprobePath from 'ffprobe-static'

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

function getSwiftBinaryPath(): string {
  if (is.dev) {
    // During development, use the locally compiled binary
    return join(app.getAppPath(), 'swift-audio', 'build', 'AudioCapture')
  }
  // In production, use the binary bundled via extraResources
  return join(process.resourcesPath, 'AudioCapture')
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
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
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Set defaultSession User-Agent to standard Chrome (remove Electron/...)
  const { session, desktopCapturer } = await import('electron')
  const defaultUA = session.defaultSession.getUserAgent().replace(/Electron\/\S+ /, '')
  session.defaultSession.setUserAgent(defaultUA)

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

  // --- IPC Handlers for Authentication & System Capture ---

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
        // Prompt user for save location
        const { canceled, filePath } = await dialog.showSaveDialog({
          title: 'Save Recording',
          defaultPath: `${title.replace(/\s+/g, '_')}_Recording.webm`,
          filters: [{ name: 'WebM Video', extensions: ['webm'] }]
        })

        if (canceled || !filePath) {
          return false
        }

        // Write video buffer to a temp file
        const videoPath = join(tmpdir(), `video-mic-${Date.now()}.webm`)
        await writeFile(videoPath, Buffer.from(videoBuffer))

        console.log('[Main] Starting FFmpeg merge...')

        // Probe the video file to see if it has an audio track (e.g. mic was selected)
        return new Promise<boolean>((resolve, reject) => {
          ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) {
              console.error('[Main] Error probing video file:', err)
              reject(err)
              return
            }

            const hasAudio = metadata.streams.some((s) => s.codec_type === 'audio')
            console.log(`[Main] Video has audio track: ${hasAudio}`)

            let command = ffmpeg().input(videoPath).input(sysAudioPath)

            if (hasAudio) {
              // Mix the audio from both inputs, keep the video from the first input
              command = command
                .complexFilter(['[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=3[a]'])
                .outputOptions([
                  '-map 0:v', // Take video from first input
                  '-map [a]', // Take mixed audio
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
                resolve(true)
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
                resolve(false) // resolve false to indicate fallback occurred
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
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Save Recording',
        defaultPath: `${title.replace(/\s+/g, '_')}_Recording.webm`,
        filters: [{ name: 'WebM Video', extensions: ['webm'] }]
      })

      if (canceled || !filePath) return false

      await writeFile(filePath, Buffer.from(videoBuffer))
      return true
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

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Clean up Swift process on app quit
app.on('before-quit', () => {
  if (swiftProcess) {
    swiftProcess.kill('SIGINT')
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
