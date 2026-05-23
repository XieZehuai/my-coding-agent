## 1. Command Service

- [x] 1.1 Create `electron/services/command-service.ts` with `resolveCommand()` and `searchCommands()`
- [x] 1.2 Implement built-in `/config` command (create/update config.toml)
- [x] 1.3 Implement custom command resolution (read `.agents/commands/<name>/COMMAND.md`)
- [x] 1.4 Return `CommandResult` with type: builtin / custom / not_found

## 2. Chat Flow Integration

- [x] 2.1 Update `chat-service.ts` to call `resolveCommand()` before agent loop
- [x] 2.2 Built-in commands: save result as assistant message, emit token events, skip agent loop
- [x] 2.3 Custom commands: inject COMMAND.md as system message, pass via `customPrompt`
- [x] 2.4 Add `customPrompt` field to `AgentRunOptions` in agent-service.ts
- [x] 2.5 Inject customPrompt as first system message in agent context

## 3. Configurable max_turns

- [x] 3.1 Add `maxTurns` to `AppConfig` type in shared/types.ts
- [x] 3.2 Add default `maxTurns: 50` to `DEFAULT_CONFIG`
- [x] 3.3 Parse `max_turns` from config.toml in utils/config.ts
- [x] 3.4 Remove hardcoded `MAX_TURNS` constant from agent-service.ts, use config value

## 4. IPC & Frontend

- [x] 4.1 Add `COMMAND_SEARCH` IPC channel to shared/types.ts
- [x] 4.2 Add `command:search` handler in ipc/register.ts
- [x] 4.3 Expose `searchCommands` in preload.ts
- [x] 4.4 Update InputBox.vue with `/` command autocomplete
- [x] 4.5 Support ↑↓ navigation and Enter/Tab selection in command dropdown

## 5. Config Generation

- [x] 5.1 Generate default config.toml content with all keys
- [x] 5.2 Detect missing keys in existing config.toml and append only those
- [x] 5.3 Handle case where config is already complete
