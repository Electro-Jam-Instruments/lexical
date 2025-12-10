# @lexical/accessibility

Screen reader accessibility plugin for Lexical rich text editor.

## Overview

This plugin provides screen reader announcements for editor operations, making Lexical accessible to users who rely on assistive technology. It announces:

- Text formatting changes (bold, italic, underline, strikethrough, code)
- Structural changes (headings, lists, code blocks)
- Navigation between code blocks and inline code
- Indentation changes

## Installation

### From npm (when published)

```bash
npm install @lexical/accessibility
```

### From GitHub Fork (Electro Jam Instruments)

To install the custom accessibility package from our GitHub fork:

**Step 1:** Update your `package.json` dependencies:

```json
{
  "dependencies": {
    "@lexical/accessibility": "github:Electro-Jam-Instruments/lexical#main"
  }
}
```

**Step 2:** Force install to fetch from GitHub:

```bash
npm install --force
```

**Note:** The `--force` flag is required because npm caches GitHub packages. Without it, npm may use a stale cached version instead of fetching the latest from the repository.

**Updating to latest:** When the fork is updated, run:

```bash
npm install --force
```

## Basic Usage

```tsx
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {AccessibilityPlugin, AccessibleTextNode} from '@lexical/accessibility';

const initialConfig = {
  namespace: 'MyEditor',
  nodes: [
    AccessibleTextNode,  // Required for CSS-based formatting
    // ... other nodes
  ],
  onError: (error) => console.error(error),
};

function Editor() {
  return (
    <LexicalComposer initialConfig={initialConfig}>
      <RichTextPlugin
        contentEditable={<ContentEditable />}
        placeholder={<div>Enter text...</div>}
      />
      <AccessibilityPlugin />
    </LexicalComposer>
  );
}
```

## Configuration

```tsx
<AccessibilityPlugin
  config={{
    enabled: true,           // Enable/disable the plugin
    verbosity: 'standard',   // 'minimal' | 'standard' | 'verbose'
    announceFormats: true,   // Announce bold, italic, etc.
    announceStructural: true, // Announce headings, lists, etc.
    useCSSFormatting: true,  // Use CSS instead of semantic tags
  }}
/>
```

### Verbosity Levels

| Level | Example Heading Announcement | Example Format Announcement |
|-------|------------------------------|----------------------------|
| minimal | "Heading 2" | "Bold" |
| standard | "Heading level 2" | "Bolded" |
| verbose | "Changed to heading level 2" | "Bolded: selected text" |

## CSS-Based Formatting

By default, the plugin uses CSS styling for bold, italic, underline, and strikethrough instead of semantic HTML tags (`<strong>`, `<em>`, etc.). This prevents screen readers from announcing "selected/unselected" when formatting changes, which occurs due to DOM node replacement.

To enable this, register `AccessibleTextNode` in your editor config:

```tsx
import {AccessibleTextNode} from '@lexical/accessibility';

const initialConfig = {
  nodes: [AccessibleTextNode],
  // ...
};
```

## Markdown Paste Support

The plugin includes smart markdown paste handling with extended transformer support:

```tsx
import {
  AccessibilityPlugin,
  ACCESSIBILITY_TRANSFORMERS,
} from '@lexical/accessibility';

// Default usage - includes HR transformer
<AccessibilityPlugin />

// Custom transformers
<AccessibilityPlugin
  transformers={[MY_CUSTOM_TRANSFORMER, ...ACCESSIBILITY_TRANSFORMERS]}
/>
```

### Included Transformers

`ACCESSIBILITY_TRANSFORMERS` includes all standard `@lexical/markdown` transformers plus:

- **HR** (Horizontal Rule) - converts `---`, `***`, `___` to horizontal rules

### Supported Markdown on Paste

| Syntax | Result |
|--------|--------|
| `# Heading` | Heading level 1-6 |
| `> quote` | Block quote |
| `- item` / `* item` | Unordered list |
| `1. item` | Ordered list |
| `` ```code``` `` | Code block |
| `**bold**` / `__bold__` | Bold text |
| `*italic*` / `_italic_` | Italic text |
| `~~strike~~` | Strikethrough |
| `` `code` `` | Inline code |
| `==highlight==` | Highlighted text |
| `[text](url)` | Link |
| `\| a \| b \|` | Table |
| `---` / `***` / `___` | Horizontal rule |

## Suppressing Announcements

For bulk operations like clearing the editor or inserting large content, you can suppress announcements using the `SUPPRESS_A11Y_ANNOUNCEMENTS_TAG`:

```tsx
import {SUPPRESS_A11Y_ANNOUNCEMENTS_TAG} from '@lexical/accessibility';
import {$getRoot} from 'lexical';

// Clear editor without "table removed", "list removed", etc.
editor.update(() => {
  $getRoot().clear();
}, {tag: SUPPRESS_A11Y_ANNOUNCEMENTS_TAG});

// Bulk insert without creation announcements
editor.update(() => {
  $convertFromMarkdownString(largeMarkdownContent);
}, {tag: SUPPRESS_A11Y_ANNOUNCEMENTS_TAG});

// Replace all content silently
editor.update(() => {
  $getRoot().clear();
  $insertNodes(newNodes);
}, {tag: SUPPRESS_A11Y_ANNOUNCEMENTS_TAG});
```

This is useful when:
- Clearing the editor
- Loading initial content
- Replacing all content
- Any bulk operation where individual announcements would be noisy

## Exports

### Main Plugin

```tsx
import {AccessibilityPlugin} from '@lexical/accessibility';
```

### Accessible Text Node

```tsx
import {
  AccessibleTextNode,
  $createAccessibleTextNode,
  $isAccessibleTextNode,
} from '@lexical/accessibility';
```

### Types and Config

```tsx
import {
  AccessibilityConfig,
  AccessibilityPluginProps,
  DEFAULT_CONFIG,
  SUPPRESS_A11Y_ANNOUNCEMENTS_TAG,
} from '@lexical/accessibility';
```

### Transformers

```tsx
import {
  ACCESSIBILITY_TRANSFORMERS,
  HR,
} from '@lexical/accessibility';
```

### Markdown Utilities

```tsx
import {
  $insertMarkdownAtSelection,
  $replaceWithMarkdown,
} from '@lexical/accessibility';
```

### Advanced Usage

For custom node announcement configurations:

```tsx
import {
  useNodeRegistry,
  nodeConfigs,
  headingConfig,
  listItemConfig,
  AccessibilityLiveRegion,
  useAnnounce,
  generateFormatAnnouncement,
  generateHeadingAnnouncement,
  generateListAnnouncement,
  generateIndentAnnouncement,
} from '@lexical/accessibility';
```

## Peer Dependencies

- `react` >= 18.0.0
- `react-dom` >= 18.0.0
- `lexical` (same version as this package)

## License

MIT
