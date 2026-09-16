import CoreAudio
import Foundation

// MARK: - CoreAudio Microphone Activity Monitor

class MicMonitor {
  private var currentInputDeviceID: AudioObjectID = kAudioObjectUnknown

  func start() {
    setupDefaultInputDeviceListener()
    updateInputDevice()
    print("MIC_MONITOR_READY")
    fflush(stdout)
  }

  private func setupDefaultInputDeviceListener() {
    var defaultInputAddress = AudioObjectPropertyAddress(
      mSelector: kAudioHardwarePropertyDefaultInputDevice,
      mScope: kAudioObjectPropertyScopeGlobal,
      mElement: kAudioObjectPropertyElementMain
    )

    let block: AudioObjectPropertyListenerBlock = { [weak self] _, _ in
      self?.updateInputDevice()
    }

    AudioObjectAddPropertyListenerBlock(
      AudioObjectID(kAudioObjectSystemObject),
      &defaultInputAddress,
      DispatchQueue.main,
      block
    )
  }

  private func updateInputDevice() {
    var defaultDeviceID = AudioObjectID(kAudioObjectUnknown)
    var size = UInt32(MemoryLayout<AudioObjectID>.size)
    var address = AudioObjectPropertyAddress(
      mSelector: kAudioHardwarePropertyDefaultInputDevice,
      mScope: kAudioObjectPropertyScopeGlobal,
      mElement: kAudioObjectPropertyElementMain
    )

    let status = AudioObjectGetPropertyData(
      AudioObjectID(kAudioObjectSystemObject),
      &address,
      0,
      nil,
      &size,
      &defaultDeviceID
    )

    if status == noErr && defaultDeviceID != kAudioObjectUnknown {
      self.currentInputDeviceID = defaultDeviceID
      attachDeviceListener(deviceID: defaultDeviceID)
      checkDeviceRunningState(deviceID: defaultDeviceID)
    }
  }

  private func attachDeviceListener(deviceID: AudioObjectID) {
    var isRunningAddress = AudioObjectPropertyAddress(
      mSelector: kAudioDevicePropertyDeviceIsRunningSomewhere,
      mScope: kAudioObjectPropertyScopeGlobal,
      mElement: kAudioObjectPropertyElementMain
    )

    let block: AudioObjectPropertyListenerBlock = { [weak self] _, _ in
      self?.checkDeviceRunningState(deviceID: deviceID)
    }

    AudioObjectAddPropertyListenerBlock(
      deviceID,
      &isRunningAddress,
      DispatchQueue.main,
      block
    )
  }

  private func checkDeviceRunningState(deviceID: AudioObjectID) {
    var isRunning: UInt32 = 0
    var size = UInt32(MemoryLayout<UInt32>.size)
    var isRunningAddress = AudioObjectPropertyAddress(
      mSelector: kAudioDevicePropertyDeviceIsRunningSomewhere,
      mScope: kAudioObjectPropertyScopeGlobal,
      mElement: kAudioObjectPropertyElementMain
    )

    let status = AudioObjectGetPropertyData(
      deviceID,
      &isRunningAddress,
      0,
      nil,
      &size,
      &isRunning
    )

    if status == noErr {
      let active = (isRunning != 0) ? 1 : 0
      print("MIC_ACTIVE:\(active)")
      fflush(stdout)
    }
  }
}

// Start monitoring
let monitor = MicMonitor()
monitor.start()
dispatchMain()
