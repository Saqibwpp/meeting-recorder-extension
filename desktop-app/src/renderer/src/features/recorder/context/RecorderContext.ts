import { createContext } from 'react'
import { MediaRecorderState } from '../hooks/useMediaRecorder'

export const RecorderContext = createContext<MediaRecorderState | null>(null)
