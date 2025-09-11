import React from 'react'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      ERR: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        id: number
        type: string
      }
    }
  }

  interface Window {
    electron: {
      ipcRenderer: {
        invoke: (channel: string, ...args: any[]) => Promise<any>
        on: (channel: string, listener: (event: any, ...args: any[]) => void) => void
        removeListener: (channel: string, listener: (...args: any[]) => void) => void
        removeAllListeners: (channel: string) => void
      }
    }
  }
}
