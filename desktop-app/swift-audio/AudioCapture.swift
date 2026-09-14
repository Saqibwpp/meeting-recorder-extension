import AVFoundation
import Foundation
import ScreenCaptureKit

class AudioCaptureDelegate: NSObject, SCStreamDelegate, SCStreamOutput {
  let outputPath: String
  private var assetWriter: AVAssetWriter?
  private var audioInput: AVAssetWriterInput?
  private var isWriting = false
  private var hasStartedSession = false

  init(outputPath: String) {
    self.outputPath = outputPath
    super.init()
  }

  func startWriting() throws {
    let url = URL(fileURLWithPath: outputPath)
    // Remove existing file if present
    if FileManager.default.fileExists(atPath: outputPath) {
      try FileManager.default.removeItem(at: url)
    }

    // Determine file type from extension
    let isWav = outputPath.lowercased().hasSuffix(".wav")
    let fileType: AVFileType = isWav ? .wav : .m4a

    assetWriter = try AVAssetWriter(outputURL: url, fileType: fileType)

    // Output settings: match the stream (or convert if needed)
    // We'll let AVAssetWriter infer the best format if we just pass settings, 
    // or we can use the source format. 
    // Wait, ScreenCaptureKit provides PCM buffers, AVAssetWriterInput can compress them if we specify AAC,
    // or just write PCM if we specify LPCM.
    var audioSettings: [String: Any]
    if isWav {
      audioSettings = [
        AVFormatIDKey: kAudioFormatLinearPCM,
        AVSampleRateKey: 48000.0,
        AVNumberOfChannelsKey: 2,
        AVLinearPCMBitDepthKey: 16,
        AVLinearPCMIsNonInterleaved: false,
        AVLinearPCMIsFloatKey: false,
        AVLinearPCMIsBigEndianKey: false
      ]
    } else {
      audioSettings = [
        AVFormatIDKey: kAudioFormatMPEG4AAC,
        AVSampleRateKey: 48000.0,
        AVNumberOfChannelsKey: 2,
        AVEncoderBitRateKey: 128000
      ]
    }

    let input = AVAssetWriterInput(mediaType: .audio, outputSettings: audioSettings)
    input.expectsMediaDataInRealTime = true

    if assetWriter!.canAdd(input) {
      assetWriter!.add(input)
      audioInput = input
    } else {
      fputs("AudioCapture: Cannot add audio input to asset writer\n", stderr)
      exit(1)
    }

    if assetWriter!.startWriting() {
      isWriting = true
      fputs("AudioCapture: Started writing to \(outputPath)\n", stderr)
    } else {
      fputs("AudioCapture: Failed to start writing: \(String(describing: assetWriter?.error))\n", stderr)
      exit(1)
    }
  }

  func finalizeFile() {
    guard isWriting else { return }
    isWriting = false

    audioInput?.markAsFinished()
    
    let semaphore = DispatchSemaphore(value: 0)
    assetWriter?.finishWriting {
      fputs("AudioCapture: Finalized \(self.outputPath)\n", stderr)
      semaphore.signal()
    }
    semaphore.wait()
  }

  // SCStreamOutput — receives audio sample buffers
  func stream(
    _ stream: SCStream, didOutputSampleBuffer sampleBuffer: CMSampleBuffer,
    of type: SCStreamOutputType
  ) {
    guard type == .audio, isWriting else { return }
    guard let input = audioInput, input.isReadyForMoreMediaData else { return }

    if !hasStartedSession {
      hasStartedSession = true
      let startTime = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
      assetWriter?.startSession(atSourceTime: startTime)
    }

    input.append(sampleBuffer)
  }

  // SCStreamDelegate — handle errors
  func stream(_ stream: SCStream, didStopWithError error: Error) {
    fputs("AudioCapture: Stream stopped with error: \(error.localizedDescription)\n", stderr)
  }
}

// MARK: - Main

guard CommandLine.arguments.count >= 2 else {
  fputs("Usage: AudioCapture <output-path.m4a>\n", stderr)
  exit(1)
}

let outputPath = CommandLine.arguments[1]
fputs("AudioCapture: Starting system audio capture → \(outputPath)\n", stderr)

let delegate = AudioCaptureDelegate(outputPath: outputPath)
var activeStream: SCStream?

// Get shareable content (we need it to configure the stream, even though we only want audio)
SCShareableContent.getExcludingDesktopWindows(false, onScreenWindowsOnly: false) {
  content, error in
  guard let content = content, error == nil else {
    fputs("AudioCapture: Failed to get shareable content: \(error?.localizedDescription ?? "unknown")\n", stderr)
    exit(1)
  }

  guard let display = content.displays.first else {
    fputs("AudioCapture: No display found\n", stderr)
    exit(1)
  }

  // Configure for audio-only capture
  let config = SCStreamConfiguration()
  config.capturesAudio = true
  config.excludesCurrentProcessAudio = true  // Don't capture our own app's audio

  // We must capture "something" for the display, but we'll ignore the video frames
  config.width = 2
  config.height = 2
  config.minimumFrameInterval = CMTime(value: 1, timescale: 1)  // 1 FPS to minimize overhead

  // Create a content filter for the entire display
  let filter = SCContentFilter(display: display, excludingWindows: [])

  let stream = SCStream(filter: filter, configuration: config, delegate: delegate)

  do {
    try delegate.startWriting()
    try stream.addStreamOutput(delegate, type: .audio, sampleHandlerQueue: .global(qos: .userInitiated))
    stream.startCapture { error in
      if let error = error {
        fputs("AudioCapture: Failed to start capture: \(error.localizedDescription)\n", stderr)
        exit(1)
      }
      fputs("AudioCapture: Capture started successfully\n", stderr)
    }
    activeStream = stream
  } catch {
    fputs("AudioCapture: Error: \(error.localizedDescription)\n", stderr)
    exit(1)
  }
}

// Handle SIGINT (sent by Electron when recording stops)
signal(SIGINT) { _ in
  fputs("AudioCapture: Received SIGINT, stopping...\n", stderr)
  if let stream = activeStream {
    stream.stopCapture { error in
      if let error = error {
        fputs("AudioCapture: Error stopping: \(error.localizedDescription)\n", stderr)
      }
      delegate.finalizeFile()
      exit(0)
    }
  } else {
    delegate.finalizeFile()
    exit(0)
  }
}

// Handle SIGTERM as well
signal(SIGTERM) { _ in
  fputs("AudioCapture: Received SIGTERM, stopping...\n", stderr)
  if let stream = activeStream {
    stream.stopCapture { _ in
      delegate.finalizeFile()
      exit(0)
    }
  } else {
    delegate.finalizeFile()
    exit(0)
  }
}

// Keep the process alive
dispatchMain()
