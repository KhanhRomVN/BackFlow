import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'fs'
import { join } from 'path'
import * as path from 'path'

export function findFileRecursive(dir: string, fileName: string): string | null {
  try {
    const items = readdirSync(dir, { withFileTypes: true })

    for (const item of items) {
      const fullPath = join(dir, item.name)

      if (
        item.isDirectory() &&
        !item.name.startsWith('.') &&
        item.name !== 'vendor' &&
        item.name !== 'node_modules'
      ) {
        const found = findFileRecursive(fullPath, fileName)
        if (found) return found
      } else if (item.isFile() && item.name === fileName) {
        return fullPath
      }
    }

    return null
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error)
    return null
  }
}

export function resolvePath(inputPath: string, projectPath: string): string {
  try {
    console.log(`Resolving path: ${inputPath} in project: ${projectPath}`)

    // If inputPath is already absolute, check if it exists
    if (path.isAbsolute(inputPath)) {
      if (existsSync(inputPath)) {
        return inputPath
      }
    }

    // Try relative to project root
    const projectRelativePath = path.join(projectPath, inputPath)
    if (existsSync(projectRelativePath)) {
      return projectRelativePath
    }

    // Search for the file in the project directory recursively
    const fileName = path.basename(inputPath)
    const foundPath = findFileRecursive(projectPath, fileName)
    if (foundPath) {
      return foundPath
    }

    // If not found, return the original inputPath
    return inputPath
  } catch (error) {
    console.error('Error resolving path:', error)
    return inputPath
  }
}

export function copyDirectoryRecursive(source: string, destination: string): void {
  // Create destination directory if it doesn't exist
  if (!existsSync(destination)) {
    mkdirSync(destination, { recursive: true })
  }

  // Read all files/directories from source
  const items = readdirSync(source, { withFileTypes: true })

  for (const item of items) {
    const sourcePath = join(source, item.name)
    const destinationPath = join(destination, item.name)

    if (item.isDirectory()) {
      // Recursively copy directories
      copyDirectoryRecursive(sourcePath, destinationPath)
    } else {
      // Copy files
      copyFileSync(sourcePath, destinationPath)
    }
  }
}

export async function updateProjectReferences(
  projectPath: string,
  projectName: string
): Promise<void> {
  const files = getAllFiles(projectPath)

  for (const file of files) {
    if (file.endsWith('.go') || file.endsWith('.mod') || file.endsWith('.sum')) {
      let content = readFileSync(file, 'utf8')

      // Replace all occurrences of the old module name
      content = content.replace(/domain_centric_microservice/g, projectName)

      writeFileSync(file, content, 'utf8')
    }
  }
}

export function getAllFiles(dir: string): string[] {
  const files: string[] = []

  try {
    const items = readdirSync(dir, { withFileTypes: true })

    for (const item of items) {
      const fullPath = join(dir, item.name)

      if (item.isDirectory()) {
        files.push(...getAllFiles(fullPath))
      } else {
        files.push(fullPath)
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error)
  }

  return files
}
