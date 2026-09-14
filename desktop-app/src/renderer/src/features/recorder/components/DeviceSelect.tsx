import React from 'react'
import { Alert } from '../../../components/ui/Alert'

interface DeviceSelectProps {
  devices: MediaDeviceInfo[]
  selectedDeviceId: string
  onSelectDevice: (deviceId: string) => void
  disabled?: boolean
  isBluetoothSelected: boolean
  isLoading?: boolean
}

export const DeviceSelect: React.FC<DeviceSelectProps> = ({
  devices,
  selectedDeviceId,
  onSelectDevice,
  disabled = false,
  isBluetoothSelected,
  isLoading = false
}) => {
  return (
    <div className="space-y-2.5">
      <label
        htmlFor="microphone-select"
        className="block font-mono text-[11px] uppercase tracking-wider text-[#737373]"
      >
        Microphone Source
      </label>

      <select
        id="microphone-select"
        value={selectedDeviceId}
        onChange={(e) => onSelectDevice(e.target.value)}
        disabled={disabled || isLoading}
        className="w-full rounded-lg border border-[#e2e0d8] bg-white px-3.5 py-2.5 text-sm text-[#1a1a1a] transition-all focus:border-[#2d2d2d] focus:outline-none focus:ring-1 focus:ring-[#2d2d2d] disabled:opacity-50 disabled:bg-[#f4f3f0]"
      >
        {devices.length === 0 && <option value="">Loading microphones...</option>}
        {devices.map((mic) => (
          <option key={mic.deviceId} value={mic.deviceId}>
            {mic.label || `Microphone ${mic.deviceId.slice(0, 5)}...`}
          </option>
        ))}
      </select>

      {isBluetoothSelected && (
        <Alert type="warning" title="Bluetooth Microphone Detected">
          Wireless audio reduces voice recording bandwidth. For the highest fidelity meeting
          transcription, built-in MacBook microphones or wired mics are recommended.
        </Alert>
      )}
    </div>
  )
}
