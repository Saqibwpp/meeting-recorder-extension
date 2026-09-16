import React from 'react'
import { useMediaRecorder } from '../hooks/useMediaRecorder'
import { RecorderContext } from './RecorderContext'

export const RecorderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const recorder = useMediaRecorder()

  return <RecorderContext.Provider value={recorder}>{children}</RecorderContext.Provider>
}
