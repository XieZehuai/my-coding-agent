import * as fs from 'fs'
import * as path from 'path'
import { saveUndoState, getUndoState, clearUndoState } from '../db/undo'

export class UndoService {
  private convId: string
  private projectPath: string
  private backupDir: string
  private createdFiles: Set<string> = new Set()
  private modifiedFiles: Set<string> = new Set()

  constructor(convId: string, projectPath: string) {
    this.convId = convId
    this.projectPath = projectPath
    this.backupDir = path.join(projectPath, '.agents', 'backups', convId)
  }

  getBackupCallback(): (filePath: string) => void {
    return (filePath: string) => {
      this.backupFile(filePath)
    }
  }

  backupFile(relativePath: string): void {
    const fullPath = path.resolve(this.projectPath, relativePath)
    if (!fullPath.startsWith(path.resolve(this.projectPath))) {
      return
    }

    if (fs.existsSync(fullPath)) {
      const backupPath = path.join(this.backupDir, relativePath)
      const backupDirPath = path.dirname(backupPath)
      if (!fs.existsSync(backupDirPath)) {
        fs.mkdirSync(backupDirPath, { recursive: true })
      }
      fs.copyFileSync(fullPath, backupPath)
      this.modifiedFiles.add(relativePath)
    } else {
      this.createdFiles.add(relativePath)
    }

    this.saveState()
  }

  undoAll(): string[] {
    const restored: string[] = []

    for (const relativePath of this.modifiedFiles) {
      const fullPath = path.resolve(this.projectPath, relativePath)
      const backupPath = path.join(this.backupDir, relativePath)

      if (fs.existsSync(backupPath)) {
        const backupDirPath = path.dirname(fullPath)
        if (!fs.existsSync(backupDirPath)) {
          fs.mkdirSync(backupDirPath, { recursive: true })
        }
        fs.copyFileSync(backupPath, fullPath)
        restored.push(`restored: ${relativePath}`)
      }
    }

    for (const relativePath of this.createdFiles) {
      const fullPath = path.resolve(this.projectPath, relativePath)
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath)
        restored.push(`deleted: ${relativePath}`)
      }
    }

    this.cleanup()
    return restored
  }

  cleanup(): void {
    if (fs.existsSync(this.backupDir)) {
      fs.rmSync(this.backupDir, { recursive: true, force: true })
    }
    clearUndoState(this.convId)
  }

  hasChanges(): boolean {
    return this.createdFiles.size > 0 || this.modifiedFiles.size > 0
  }

  getModifiedFiles(): string[] {
    return Array.from(this.modifiedFiles)
  }

  getCreatedFiles(): string[] {
    return Array.from(this.createdFiles)
  }

  private saveState(): void {
    saveUndoState(this.convId, Array.from(this.createdFiles), Array.from(this.modifiedFiles))
  }

  static load(convId: string, projectPath: string): UndoService {
    const manager = new UndoService(convId, projectPath)
    const state = getUndoState(convId)
    if (state) {
      manager.createdFiles = new Set(JSON.parse(state.createdFiles) as string[])
      manager.modifiedFiles = new Set(JSON.parse(state.modifiedFiles) as string[])
    }
    return manager
  }
}
