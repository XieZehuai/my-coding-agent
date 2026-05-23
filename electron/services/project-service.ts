import * as path from 'path'
import { addProject, removeProject, listProjects, getProject } from '../db/projects'

export function listAllProjects() {
  return listProjects()
}

export function createProject(folderPath: string) {
  const name = path.basename(folderPath)
  return addProject(name, folderPath)
}

export { removeProject, getProject }
