import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI & {
      dialog: {
        showOpenDialog: (options: any) => Promise<any>
      }
      ipcRenderer: {
        invoke: (channel: string, ...args: any[]) => Promise<any>
        on: (channel: string, func: (...args: any[]) => void) => () => void
        removeListener: (channel: string, func: (...args: any[]) => void) => void
      }
    }
    api: unknown
  }
}
