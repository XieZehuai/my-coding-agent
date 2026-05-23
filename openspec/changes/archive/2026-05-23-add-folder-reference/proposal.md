## Why

Currently the `@` command only supports referencing individual files. Directories appear in the search dropdown (with a trailing `/`), but selecting one results in `@file:dirname` which attempts `fs.readFileSync` on a directory and silently fails. Users need to reference entire folders to include their contents as context in a single action, rather than manually `@`-referencing each file individually.

## What Changes

- Extend `parseFileReferences` in `chat-service.ts` to detect and handle directory paths: when a referenced path is a directory, recursively enumerate and read all files within it
- Update the file search dropdown in `InputBox.vue` to distinguish folder references visually and insert them with a dedicated `@folder:` prefix (or reuse `@file:` with folder-awareness)
- Add a `searchFolders` or extend `searchFiles` to properly support folder-only filtering in the autocomplete
- Folder references SHALL expand to all readable files recursively (respecting `.gitignore` and `node_modules` exclusions)
- The context builder SHALL include folder-referenced files with their relative paths, organized by folder structure

## Capabilities

### New Capabilities

- `folder-reference`: Support referencing directories via `@` command, automatically expanding to all contained files for context injection

### Modified Capabilities

<!-- No existing capability specs need requirement-level changes -->

## Impact

- `electron/services/chat-service.ts:14-39` — `parseFileReferences` needs folder detection and recursive reading logic
- `electron/services/file-service.ts:4-38` — `searchFiles` may need enhancement for folder-only filtering
- `src/components/chat/InputBox.vue:128-131` — `selectDropdownItem` needs to handle folder-type selections
- `electron/utils/context-builder.ts:48-54` — file context injection may benefit from folder-structure grouping
