const ffmpeg = require('fluent-ffmpeg')
const ffmpegPath = require('ffmpeg-static')
ffmpeg.setFfmpegPath(ffmpegPath)

ffmpeg.ffprobe('test.webm', (err, metadata) => {
  console.log(metadata)
})
