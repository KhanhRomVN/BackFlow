export interface FileItem {
  name: string
  path: string
  isDirectory: boolean
}

export interface TabFile {
  id: string
  path: string
  name: string
  content: string
  isDirty?: boolean
  lastSaved?: Date
}
