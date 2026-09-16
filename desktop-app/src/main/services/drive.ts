import { app, shell } from 'electron'
import { google } from 'googleapis'
import http from 'http'
import { AddressInfo } from 'net'
import fs from 'fs/promises'
import path from 'path'
import { createReadStream } from 'fs'

const SCOPES = ['https://www.googleapis.com/auth/drive.file']

// OAuth2 Client setup
const CLIENT_ID =
  (import.meta.env.MAIN_VITE_GOOGLE_CLIENT_ID as string) ||
  (process.env.MAIN_VITE_GOOGLE_CLIENT_ID as string)
const CLIENT_SECRET =
  (import.meta.env.MAIN_VITE_GOOGLE_CLIENT_SECRET as string) ||
  (process.env.MAIN_VITE_GOOGLE_CLIENT_SECRET as string)

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, 'http://localhost')

function getTokenPath(): string {
  return path.join(app.getPath('userData'), 'drive-token.json')
}

/**
 * Check if the user is already authenticated with Google Drive.
 */
export async function checkDriveStatus(): Promise<boolean> {
  try {
    const tokenPath = getTokenPath()
    const tokenData = await fs.readFile(tokenPath, 'utf-8')
    const tokens = JSON.parse(tokenData)
    oauth2Client.setCredentials(tokens)
    return true
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return false
  }
}

/**
 * Disconnect Google Drive.
 */
export async function disconnectDrive(): Promise<void> {
  try {
    const tokenPath = getTokenPath()
    await fs.unlink(tokenPath)
    oauth2Client.setCredentials({})
  } catch (error) {
    console.error('[Drive] Error disconnecting:', error)
  }
}

/**
 * Start the local OAuth flow to connect to Google Drive.
 */
export async function connectDrive(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    let server: http.Server | null = null
    const timeout = setTimeout(
      () => {
        if (server) server.close()
        reject(new Error('Google Drive authentication timed out.'))
      },
      5 * 60 * 1000
    )

    server = http.createServer(async (req, res) => {
      try {
        const reqUrl = new URL(req.url || '', `http://${req.headers.host}`)
        if (reqUrl.pathname === '/') {
          const code = reqUrl.searchParams.get('code')

          if (!code) {
            res.writeHead(400, { 'Content-Type': 'text/plain' })
            res.end('Missing authorization code.')
            return
          }

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Google Drive Connected</title>
                <style>
                  body { font-family: -apple-system, sans-serif; background: #faf9f6; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; color: #1a1a1a; }
                  .card { background: white; padding: 32px; border-radius: 12px; border: 1px solid #e2e0d8; text-align: center; max-width: 400px; box-shadow: 0 4px 20px -4px rgba(0,0,0,0.05); }
                </style>
              </head>
              <body>
                <div class="card">
                  <h2>✓ Google Drive Connected</h2>
                  <p>You can close this window and return to Embrace AI Desktop.</p>
                </div>
              </body>
            </html>
          `)

          // Exchange code for tokens
          try {
            // We use a local OAuth client mapped to the dynamic port for the token exchange
            const address = server?.address() as AddressInfo
            const localOauth2Client = new google.auth.OAuth2(
              CLIENT_ID,
              CLIENT_SECRET,
              `http://127.0.0.1:${address.port}`
            )
            const { tokens } = await localOauth2Client.getToken(code)
            oauth2Client.setCredentials(tokens)

            // Save tokens locally
            await fs.writeFile(getTokenPath(), JSON.stringify(tokens))
            console.log('[Drive] Tokens acquired and saved.')

            clearTimeout(timeout)
            resolve(true)
          } catch (err) {
            console.error('[Drive] Error getting tokens:', err)
            reject(err)
          }

          setTimeout(() => server?.close(), 1000)
        } else {
          res.writeHead(404)
          res.end()
        }
      } catch (err) {
        console.error('[Drive] Loopback server error:', err)
        res.writeHead(500)
        res.end()
      }
    })

    // Listen on a random free port
    server.listen(0, '127.0.0.1', () => {
      const address = server?.address() as AddressInfo
      const port = address.port
      const redirectUri = `http://127.0.0.1:${port}`

      // Generate the Auth URL using a local client instance to properly bind the dynamic redirect URI
      const localOauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, redirectUri)
      const authUrl = localOauth2Client.generateAuthUrl({
        access_type: 'offline', // Required to get a refresh token
        scope: SCOPES,
        prompt: 'consent' // Force consent to guarantee refresh token delivery
      })

      console.log(`[Drive] Launching external browser auth: ${authUrl}`)
      shell.openExternal(authUrl)
    })

    server.on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })
  })
}

/**
 * Upload a local file to Google Drive.
 */
export async function uploadToDrive(filePath: string, title: string): Promise<string | null> {
  try {
    const isConnected = await checkDriveStatus()
    if (!isConnected) {
      throw new Error('Google Drive is not connected.')
    }

    const drive = google.drive({ version: 'v3', auth: oauth2Client })

    console.log(`[Drive] Uploading ${filePath} as "${title}"...`)

    // We create a generic "Embrace AI" folder to keep things tidy
    let folderId: string | null | undefined = null
    const folderRes = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder' and name='Embrace AI Recordings'",
      spaces: 'drive',
      fields: 'files(id, name)'
    })

    if (folderRes.data.files && folderRes.data.files.length > 0) {
      folderId = folderRes.data.files[0].id
    } else {
      console.log('[Drive] Creating "Embrace AI Recordings" folder...')
      const newFolder = await drive.files.create({
        requestBody: {
          name: 'Embrace AI Recordings',
          mimeType: 'application/vnd.google-apps.folder'
        },
        fields: 'id'
      })
      if (newFolder.data.id) {
        folderId = newFolder.data.id
      }
    }

    // Upload the video file
    const fileMetadata = {
      name: `${title}.webm`,
      parents: folderId ? [folderId] : []
    }

    const media = {
      mimeType: 'video/webm',
      body: createReadStream(filePath)
    }

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink'
    })

    console.log('[Drive] Upload complete:', file.data.webViewLink)
    return file.data.webViewLink || null
  } catch (error) {
    console.error('[Drive] Error uploading file:', error)
    return null
  }
}
