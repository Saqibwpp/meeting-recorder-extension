import { useState, useEffect, useCallback } from 'react'

const BLUETOOTH_KEYWORDS = [
  'bluetooth',
  'airpods',
  'beats',
  'bose',
  'sony wh',
  'sony wf',
  'jabra',
  'galaxy buds',
  'jbl',
  'sennheiser',
  'wireless'
]

export function isBluetoothDevice(label: string): boolean {
  const lower = label.toLowerCase()
  return BLUETOOTH_KEYWORDS.some((keyword) => lower.includes(keyword))
}

export interface AudioDevicesState {
  audioDevices: MediaDeviceInfo[]
  selectedMicId: string
  setSelectedMicId: React.Dispatch<React.SetStateAction<string>>
  selectedDevice: MediaDeviceInfo | undefined
  isBluetoothSelected: boolean
  isLoading: boolean
  refreshDevices: () => Promise<void>
}

export function useAudioDevices(): AudioDevicesState {
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedMicId, setSelectedMicId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  const refreshDevices = useCallback(async (): Promise<void> => {
    try {
      await navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((s) => s.getTracks().forEach((t) => t.stop()))
        .catch(() => {})

      const devices = await navigator.mediaDevices.enumerateDevices()
      const mics = devices.filter((d) => d.kind === 'audioinput')
      setAudioDevices(mics)

      setSelectedMicId((currentId) => {
        const stillExists = mics.some((m) => m.deviceId === currentId)
        if (currentId && stillExists) return currentId

        const builtIn = mics.find(
          (m) =>
            m.label.toLowerCase().includes('built-in') || m.label.toLowerCase().includes('macbook')
        )
        if (builtIn) return builtIn.deviceId
        if (mics.length > 0) return mics[0].deviceId
        return ''
      })
    } catch (err) {
      console.error('Error fetching audio devices', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      refreshDevices()
    }, 0)

    navigator.mediaDevices.addEventListener('devicechange', refreshDevices)
    return (): void => {
      clearTimeout(timeoutId)
      navigator.mediaDevices.removeEventListener('devicechange', refreshDevices)
    }
  }, [refreshDevices])

  const selectedDevice = audioDevices.find((d) => d.deviceId === selectedMicId)
  const isBluetoothSelected = selectedDevice ? isBluetoothDevice(selectedDevice.label) : false

  return {
    audioDevices,
    selectedMicId,
    setSelectedMicId,
    selectedDevice,
    isBluetoothSelected,
    isLoading,
    refreshDevices
  }
}
