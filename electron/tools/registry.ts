import { ToolDefinition, ToolResult } from "../../shared/types";
import { executeTool as execFileTool } from "./file-tools";
import { executeTool as execCommandTool } from "./command-tools";
import { executeTool as execGitTool } from "./git-tools";

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read content from a file. Use start_line and end_line for partial reads.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path relative to project root" },
          start_line: { type: "number", description: "Start line (1-indexed, optional)" },
          end_line: { type: "number", description: "End line (1-indexed, optional)" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Write content to a file. Creates the file if it does not exist.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path relative to project root" },
          content: { type: "string", description: "Content to write to the file" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_directory",
      description: "List the directory structure of a given path.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: 'Directory path relative to project root. Use "." for root.' },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "glob_search",
      description: "Find files matching a glob pattern.",
      parameters: {
        type: "object",
        properties: {
          pattern: { type: "string", description: 'Glob pattern (e.g., "src/**/*.ts")' },
        },
        required: ["pattern"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "grep_search",
      description: "Search file contents for a regex pattern. Returns matching lines with file paths and line numbers.",
      parameters: {
        type: "object",
        properties: {
          pattern: { type: "string", description: "Regex pattern to search for" },
        },
        required: ["pattern"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_command",
      description: "Execute a shell command via PowerShell. Returns stdout and stderr.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "Command to execute" },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "git_status",
      description: "Show the working tree status of the git repository.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "git_diff",
      description: "Show changes in the working tree (unstaged diff).",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];

const FILE_TOOLS = new Set(["read_file", "write_file", "list_directory", "glob_search", "grep_search"]);
const COMMAND_TOOLS = new Set(["run_command"]);
const GIT_TOOLS = new Set(["git_status", "git_diff"]);

export function getPermissionCategory(toolName: string): "read" | "write" | "execute" {
  switch (toolName) {
    case "write_file":
      return "write";
    case "run_command":
      return "execute";
    default:
      return "read";
  }
}

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  projectPath: string,
  onBackup?: (filePath: string) => void
): Promise<ToolResult> {
  try {
    let result: string;

    if (FILE_TOOLS.has(toolName)) {
      result = await execFileTool(toolName, args, projectPath, onBackup);
    } else if (COMMAND_TOOLS.has(toolName)) {
      result = await execCommandTool(toolName, args, projectPath);
    } else if (GIT_TOOLS.has(toolName)) {
      result = await execGitTool(toolName, args, projectPath);
    } else {
      return { toolCallId: "", content: "", error: `Unknown tool: ${toolName}` };
    }

    return { toolCallId: "", content: result };
  } catch (e) {
    return { toolCallId: "", content: "", error: (e as Error).message };
  }
}
