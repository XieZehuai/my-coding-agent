## Why

Users need to execute repetitive workflows (e.g., generate git commits, configure projects) without typing full instructions every time. A commands system — with built-in utilities and user-definable `/command` shortcuts — makes the agent more efficient and extensible, similar to how slash commands work in Slack or VS Code.

## What Changes

- New built-in `/config` command that creates or updates `.agents/config.toml` with default values
- Custom command system: users create `.agents/commands/<name>/COMMAND.md` files, then invoke them via `/name` in chat
- `COMMAND.md` content is injected as a system prompt instruction to the AI
- Command interception in chat-service: `/`-prefixed messages are resolved against built-in and custom commands before reaching the agent
- Command autocomplete in the input box (triggered by typing `/`)
- New IPC channel `command:search` for querying available commands
- New config option `max_turns` (default 50) in `.agents/config.toml`

## Capabilities

### New Capabilities

- `command-system`: Support for slash commands including built-in `${/config}$` command and user-defined custom commands via `.agents/commands/<name>/COMMAND.md`. Command interception in chat flow, autocomplete in input box, and command search API.

### Modified Capabilities

- `agent-chat`: Message sending now resolves `/`-prefixed commands before starting the agent loop. Built-in commands execute locally and return results as assistant messages. Custom commands inject `COMMAND.md` as a system-level instruction. The `AgentRunOptions` interface gains an optional `customPrompt` field.

## Impact

- New file: `electron/services/command-service.ts`
- Modified: `electron/services/chat-service.ts` (command interception)
- Modified: `electron/services/agent-service.ts` (customPrompt injection, maxTurns from config)
- Modified: `electron/ipc/register.ts` (command:search handler)
- Modified: `electron/preload.ts` (searchCommands API)
- Modified: `src/components/chat/InputBox.vue` (/ command autocomplete)
- Modified: `shared/types.ts` (command IPC channels, maxTurns in config)
- Modified: `electron/utils/config.ts` (maxTurns parsing)
- New project convention: `.agents/commands/` directory for user-defined commands
