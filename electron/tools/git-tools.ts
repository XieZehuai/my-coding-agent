import { execSync } from 'child_process'

function runGit(command: string, projectPath: string): string {
  try {
    const output = execSync(command, {
      cwd: projectPath,
      encoding: 'utf-8',
      timeout: 30000,
      windowsHide: true,
    })
    return output.trim() || '(empty)'
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message?: string }
    const detail = err.stdout || err.stderr || err.message || 'Unknown git error'
    throw new Error(`Git command failed: ${detail}`)
  }
}

export async function executeTool(
  toolName: string,
  _args: Record<string, unknown>,
  projectPath: string
): Promise<string> {
  switch (toolName) {
    case 'git_status':
      return runGit('git status --short', projectPath)
    case 'git_diff':
      return runGit('git diff', projectPath)
    default:
      throw new Error(`Unknown git tool: ${toolName}`)
  }
}
