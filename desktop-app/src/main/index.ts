import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { ChildProcess, spawn } from 'child_process'
import { unlink, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
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

  mainWindow.webContents.setWindowOpenHandler((details) => {
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
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Handle getDisplayMedia requests — screen video + loopback audio (Windows fallback)
  import('electron').then(({ session, desktopCapturer }) => {
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
  })

  // --- IPC Handlers for Swift System Audio Capture ---

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
