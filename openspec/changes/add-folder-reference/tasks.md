## 1. Backend — Directory Listing Utility

- [x] 1.1 Add `listDirectory(dirPath: string, basePath: string, maxDepth: number, maxEntries: number): string` to `electron/services/file-service.ts` — recursively walk directory and return a tree-formatted string listing (respecting `node_modules`, hidden dirs except `.agents`, depth limit 3, entry count limit 100)

## 2. Backend — Parse and Resolve Folder References

- [x] 2.1 In `parseFileReferences` (`electron/services/chat-service.ts`), after resolving `fullPath`, check if `fullPath` is a directory using `fs.statSync`. If directory, call `listDirectory()` and store the tree listing in `fileContents` map keyed by the reference path
- [x] 2.2 Ensure consistent relative path keys in `fileContents` to avoid duplicates between folder and file references

## 3. Backend — Context Representation

- [x] 3.1 In `buildInitialMessages` (`electron/utils/context-builder.ts`), detect directory listing content (by tree characters) and label as `### Directory:` instead of `### File:`
- [x] 3.2 Ensure existing single-file reference formatting is unchanged

## 4. Edge Cases & Verification

- [x] 4.1 Verify empty folder produces a listing with just the directory path header
- [x] 4.2 Verify unreadable subdirectory shows `[unreadable]` and listing continues
- [x] 4.3 Verify depth limit is enforced (trees beyond depth 3 are excluded)
- [x] 4.4 Verify entry count limit is enforced (beyond 100 entries, truncation message shown)
- [x] 4.5 Verify `node_modules` and hidden directories (except `.agents`) are excluded
- [x] 4.6 Verify symlinked directories are followed and listed correctly
