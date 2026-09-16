import { useContext } from 'react'
import { RecorderContext } from '../context/RecorderContext'
import { MediaRecorderState } from './useMediaRecorder'

export function useRecorder(): MediaRecorderState {
  const context = useContext(RecorderContext)
  if (!context) {
    throw new Error('useRecorder must be used within a RecorderProvider')
  }
  return context
}
