## 1. Message Transcript

- [ ] 1.1 Update `MessageBubble.vue` to render role identity, compact timestamp metadata, and role-specific message panels.
- [ ] 1.2 Improve markdown styling for headings, paragraphs, inline code, code blocks, lists, blockquotes, links, and tables within message panels.
- [ ] 1.3 Add responsive behavior so message panels remain readable on narrow windows.

## 2. Tool Call Presentation

- [ ] 2.1 Update saved-message tool call rendering to show tool name, status dot, status label, and argument preview in the collapsed summary.
- [ ] 2.2 Render formatted arguments, results, and errors inside expandable tool details.
- [ ] 2.3 Ensure error tool calls are visually emphasized and easy to inspect.
- [ ] 2.4 Remove fragile entity-based tool icons from `ToolCallCard.vue`.

## 3. Streaming Feedback

- [ ] 3.1 Update `MessageList.vue` to render active assistant output in a dedicated streaming panel.
- [ ] 3.2 Show a waiting indicator before streaming text or tool segments arrive.
- [ ] 3.3 Show a live cursor or equivalent active indicator while assistant text is streaming.
- [ ] 3.4 Show inline running, done, and error states for streaming tool calls using stable text labels.

## 4. Input Composer

- [ ] 4.1 Keep the chat input textarea at a default five-row height.
- [ ] 4.2 Wrap the textarea in a composer shell with focus and disabled states.
- [ ] 4.3 Add compact composer status text for ready, file search, no conversation selected, and agent responding states.
- [ ] 4.4 Add a character count and keep send/cancel actions consistently positioned.
- [ ] 4.5 Improve the file autocomplete dropdown spacing and replace entity-rendered file icons with stable markers.

## 5. Trust Mode Visibility

- [ ] 5.1 Update the chat header trust-mode control to display explicit `Trust On` and `Trust Off` labels.
- [ ] 5.2 Add active and inactive visual treatment for the trust-mode control without changing trust-mode behavior.

## 6. Verification

- [ ] 6.1 Run the renderer build to verify Vue templates and TypeScript compile.
- [ ] 6.2 Search chat components for mojibake-prone strings and Vue-interpolated HTML entities.
- [ ] 6.3 If an Electron-compatible preview is available, visually inspect normal messages, streaming state, tool calls, autocomplete, and trust mode.
