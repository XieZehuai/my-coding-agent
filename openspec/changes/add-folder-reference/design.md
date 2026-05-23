## Context

The `@` command currently allows users to reference individual files which are read and injected into the AI conversation context. Directories appear in the autocomplete dropdown (with a trailing `/`), but selecting one produces `@file:dirname` which fails silently because `parseFileReferences` calls `fs.readFileSync` on the directory path. The user needs the ability to reference folders and get a directory tree listing as context.

Current flow:
1. User types `@` → `searchFiles` returns matched entries (files and directories, directories suffixed with `/`)
2. User selects a directory → `selectDropdownItem` strips the `/` → inserts `@file:dirname` into text
3. `parseFileReferences` regex-matches `@file:dirname` → calls `fs.readFileSync(dirname)` on full path → directory read fails silently
4. No context is injected for the folder

## Goals / Non-Goals

**Goals:**
- Allow users to reference a folder via `@` and get a tree-style directory listing as context
- Reuse the existing `@file:` prefix — the system auto-detects whether the path is a file or directory
- Present directory listings with tree formatting (`├──`, `└──`) with depth and entry count limits
- Handle empty folders, symlinks, and unreadable subdirectories gracefully

**Non-Goals:**
- Recursively reading all files inside the folder (file contents are not included)
- A new `@folder:` prefix or separate syntax
- `.gitignore`-based filtering

## Decisions

### 1. Reuse `@file:` prefix with auto-detection

**Decision:** `parseFileReferences` detects whether a resolved path is a directory via `fs.statSync` and generates a listing instead of reading it as a file. No new prefix.

**Rationale:** Auto-detection keeps UX simple. The user types `@`, picks any entry, and the system does the right thing — file content for files, tree listing for directories.

### 2. Directory listing as tree text

**Decision:** Generate a tree-format string (like `tree` command output) with depth limit 3 and max 100 entries. Exclude `node_modules` and hidden dirs (except `.agents`).

**Rationale:** Tree format is compact, readable, and familiar to developers. Depth 3 covers typical project structure views. 100 entries is generous for most folders.

### 3. Label directory listings distinctly in context

**Decision:** Use `### Directory: <path>` label (vs `### File: <path>` for files). Detection based on content containing tree characters.

**Rationale:** Helps the AI distinguish between file contents and directory listings. No structural changes needed — just a label difference in the context builder.

## Risks / Trade-offs

- **Listing may be truncated**: Large directories (>100 entries) show a truncation message. → Acceptable — the listing gives a useful overview even when truncated.
- **No file contents**: The AI sees directory structure but not file contents, requiring follow-up file reads. → This is intentional and keeps context lean. The AI can use `read_file` tool if needed.
- **Symlinks**: `fs.statSync` follows symlinks, so symlinked directories show their target contents. → Expected behavior.
