# Integrators Guide for @lexical/accessibility

This guide covers everything you need to integrate the accessibility features into your Lexical-based editor.

## Table of Contents

1. [Installation](#installation)
2. [Core Accessibility Plugin](#core-accessibility-plugin)
3. [CSS-Based Formatting (AccessibleTextNode)](#css-based-formatting)
4. [Emoji Support](#emoji-support)
5. [AutoLink Plugin](#autolink-plugin)
6. [Markdown Paste Support](#markdown-paste-support)
7. [Suppressing Announcements](#suppressing-announcements)
8. [Background Editor Operations](#background-editor-operations)
9. [Custom Node Announcements](#custom-node-announcements)
10. [Complete Example](#complete-example)

---

## Installation

### Step 1: Update package.json

Replace `v0.38.2-a11y.11` with the latest release tag:

```json
{
  "dependencies": {
    "lexical": "https://github.com/Electro-Jam-Instruments/lexical/releases/download/v0.38.2-a11y.11/lexical-0.38.2.tgz",
    "@lexical/accessibility": "https://github.com/Electro-Jam-Instruments/lexical/releases/download/v0.38.2-a11y.11/lexical-accessibility-0.38.2.tgz",
    "@lexical/react": "https://github.com/Electro-Jam-Instruments/lexical/releases/download/v0.38.2-a11y.11/lexical-react-0.38.2.tgz",
    "@lexical/rich-text": "https://github.com/Electro-Jam-Instruments/lexical/releases/download/v0.38.2-a11y.11/lexical-rich-text-0.38.2.tgz",
    "@lexical/list": "https://github.com/Electro-Jam-Instruments/lexical/releases/download/v0.38.2-a11y.11/lexical-list-0.38.2.tgz",
    "@lexical/link": "https://github.com/Electro-Jam-Instruments/lexical/releases/download/v0.38.2-a11y.11/lexical-link-0.38.2.tgz",
    "@lexical/table": "https://github.com/Electro-Jam-Instruments/lexical/releases/download/v0.38.2-a11y.11/lexical-table-0.38.2.tgz",
    "@lexical/selection": "https://github.com/Electro-Jam-Instruments/lexical/releases/download/v0.38.2-a11y.11/lexical-selection-0.38.2.tgz",
    "@lexical/utils": "https://github.com/Electro-Jam-Instruments/lexical/releases/download/v0.38.2-a11y.11/lexical-utils-0.38.2.tgz",
    "@lexical/clipboard": "https://github.com/Electro-Jam-Instruments/lexical/releases/download/v0.38.2-a11y.11/lexical-clipboard-0.38.2.tgz",
    "@lexical/code": "https://github.com/Electro-Jam-Instruments/lexical/releases/download/v0.38.2-a11y.11/lexical-code-0.38.2.tgz",
    "@lexical/history": "https://github.com/Electro-Jam-Instruments/lexical/releases/download/v0.38.2-a11y.11/lexical-history-0.38.2.tgz",
    "@lexical/html": "https://github.com/Electro-Jam-Instruments/lexical/releases/download/v0.38.2-a11y.11/lexical-html-0.38.2.tgz",
    "@lexical/markdown": "https://github.com/Electro-Jam-Instruments/lexical/releases/download/v0.38.2-a11y.11/lexical-markdown-0.38.2.tgz"
  }
}
```

### Step 2: Clean install

```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

---

## Core Accessibility Plugin

The core plugin provides screen reader announcements for formatting changes, structural elements, and navigation.

### Basic Setup

```tsx
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {AccessibilityPlugin} from '@lexical/accessibility';

function Editor() {
  return (
    <LexicalComposer initialConfig={initialConfig}>
      <RichTextPlugin
        contentEditable={<ContentEditable />}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <AccessibilityPlugin />
    </LexicalComposer>
  );
}
```

### Configuration Options

```tsx
<AccessibilityPlugin
  config={{
    enabled: true,            // Enable/disable announcements
    verbosity: 'standard',    // 'minimal' | 'standard' | 'verbose'
    announceFormats: true,    // Announce bold, italic, etc.
    announceStructural: true, // Announce headings, lists, etc.
    useCSSFormatting: true,   // Use CSS instead of semantic tags
  }}
/>
```

### What Gets Announced

| Action | Announcement Example |
|--------|---------------------|
| Apply bold | "Bolded" |
| Apply italic | "Italicized" |
| Create heading | "Heading level 2" |
| Create list item | "Bulleted list, item 1" |
| Indent | "Indented to level 2" |
| Enter code block | "Entered code block" |

---

## CSS-Based Formatting

The `AccessibleTextNode` uses CSS classes instead of semantic HTML tags (`<strong>`, `<em>`) for formatting. This prevents screen readers from announcing "selected/unselected" when DOM nodes are replaced during formatting changes.

### Setup

**IMPORTANT:** Use `ACCESSIBLE_TEXT_NODE_REPLACEMENT` instead of just `AccessibleTextNode` to ensure proper transform inheritance (required for AutoLink and other features):

```tsx
import {ACCESSIBLE_TEXT_NODE_REPLACEMENT} from '@lexical/accessibility';

const initialConfig = {
  namespace: 'MyEditor',
  nodes: [
    ACCESSIBLE_TEXT_NODE_REPLACEMENT,
    // ... other nodes
  ],
  onError: (error) => console.error(error),
};
```

> **Why `ACCESSIBLE_TEXT_NODE_REPLACEMENT`?**
>
> Lexical's transform system works by node type. When you register `AccessibleTextNode` directly, transforms registered for `TextNode` (like AutoLink) won't fire for `AccessibleTextNode` because they have different types. The `ACCESSIBLE_TEXT_NODE_REPLACEMENT` config tells Lexical to also apply `TextNode` transforms to `AccessibleTextNode`.

### Required CSS

Add these styles to your CSS:

```css
/* Bold */
.lexical-bold {
  font-weight: bold;
}

/* Italic */
.lexical-italic {
  font-style: italic;
}

/* Underline */
.lexical-underline {
  text-decoration: underline;
}

/* Strikethrough */
.lexical-strikethrough {
  text-decoration: line-through;
}

/* Combined underline + strikethrough */
.lexical-underline.lexical-strikethrough {
  text-decoration: underline line-through;
}

/* Code */
.lexical-code {
  font-family: monospace;
  background-color: #f0f0f0;
  padding: 2px 4px;
  border-radius: 3px;
}

/* Subscript */
.lexical-subscript {
  font-size: 0.8em;
  vertical-align: sub;
}

/* Superscript */
.lexical-superscript {
  font-size: 0.8em;
  vertical-align: super;
}

/* Highlight */
.lexical-highlight {
  background-color: yellow;
}
```

---

## Emoji Support

The package provides three components for emoji functionality:

1. **EmojiNode** - The node class representing an emoji in the editor
2. **EmojisPlugin** - Auto-converts text patterns to emojis (`:)` becomes 🙂)
3. **EmojiPickerPlugin** - Typeahead menu triggered by `::`

### Step 1: Register EmojiNode

```tsx
import {ACCESSIBLE_TEXT_NODE_REPLACEMENT, EmojiNode} from '@lexical/accessibility';

const initialConfig = {
  namespace: 'MyEditor',
  nodes: [
    ACCESSIBLE_TEXT_NODE_REPLACEMENT,
    EmojiNode,
    // ... other nodes
  ],
};
```

### Step 2: Add EmojisPlugin (Auto-conversion)

```tsx
import {EmojisPlugin} from '@lexical/accessibility';

// In your editor component
<EmojisPlugin />
```

Default patterns converted:
| Pattern | Emoji |
|---------|-------|
| `:)` | 🙂 |
| `:D` | 😀 |
| `:(` | 🙁 |
| `<3` | ❤ |
| `-->` | ➡️ |
| `<--` | ⬅️ |

Custom patterns:

```tsx
const customPatterns = new Map([
  [':P', ['emoji tongue', '😛']],
  [';)', ['emoji wink', '😉']],
  ['...', ['emoji ellipsis', '…']],
]);

<EmojisPlugin emojiPatterns={customPatterns} />
```

### Step 3: Add EmojiPickerPlugin (Typeahead Menu)

The picker is triggered by typing `::` followed by a search term (e.g., `::smile`).

#### Default: Built-in emoji list (100 common emojis)

The simplest setup - just add the plugin with no props:

```tsx
import {EmojiPickerPlugin} from '@lexical/accessibility';

<EmojiPickerPlugin />
```

This uses the built-in list of 100 most common emojis (smileys, gestures, hearts, etc.).

#### Full emoji list (~1800 emojis)

For the complete emoji set, copy the full list from the playground:

```bash
# Copy from playground to your project
cp lexical-fork/packages/lexical-playground/src/utils/emoji-list.ts src/utils/emoji-list.ts
```

Then use it:

```tsx
import {EmojiPickerPlugin} from '@lexical/accessibility';
import fullEmojiList from './utils/emoji-list';

<EmojiPickerPlugin emojiData={fullEmojiList} />
```

#### Dynamic import (for code splitting)

For better bundle performance with the full list:

```tsx
import {EmojiPickerPlugin} from '@lexical/accessibility';

<EmojiPickerPlugin
  emojiDataLoader={() => import('./utils/emoji-list')}
/>
```

#### Custom emoji subset

```tsx
const myEmojis = [
  {
    emoji: '😀',
    description: 'grinning face',
    category: 'Smileys',
    aliases: ['grinning'],
    tags: ['happy', 'smile'],
    unicode_version: '6.1',
    ios_version: '6.0',
  },
  // ... more emojis
];

<EmojiPickerPlugin emojiData={myEmojis} />
```

### Step 4: Add Required CSS for Emojis

```css
/* Emoji container */
.emoji {
  display: inline-block;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  vertical-align: middle;
}

/* Emoji inner text (for native emoji display) */
.emoji-inner {
  display: inline-block;
}

/* Arrow emojis (text-based, no background image) */
.emoji.arrow-right,
.emoji.arrow-left {
  color: inherit;
  background-image: none;
}

/* Emoji picker menu */
.typeahead-popover.emoji-menu {
  background: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 300px;
  overflow-y: auto;
}

.typeahead-popover.emoji-menu ul {
  list-style: none;
  margin: 0;
  padding: 8px 0;
}

.typeahead-popover.emoji-menu .item {
  padding: 8px 16px;
  cursor: pointer;
}

.typeahead-popover.emoji-menu .item.selected {
  background-color: #e8f0fe;
}

.typeahead-popover.emoji-menu .item:hover {
  background-color: #f5f5f5;
}
```

### Step 5: Emoji Accessibility Announcements (Optional)

To have emojis announced to screen readers when created/deleted:

```tsx
import {
  AccessibilityPlugin,
  createEmojiConfig,
  EmojiNode,
} from '@lexical/accessibility';

// Create the emoji announcement config
const emojiConfig = createEmojiConfig(EmojiNode);

// Pass to AccessibilityPlugin
<AccessibilityPlugin
  additionalNodeConfigs={[emojiConfig]}
/>
```

This will announce:
- "Emoji: grinning face" when an emoji is created
- "Deleted emoji: grinning face" when deleted with DELETE key

---

## AutoLink Plugin

Automatically converts URLs and email addresses into clickable links.

### Setup

```tsx
import {
  AccessibilityAutoLinkPlugin,
  AutoLinkNode,
  LinkNode,
} from '@lexical/accessibility';

// Register nodes
const initialConfig = {
  nodes: [
    AutoLinkNode,
    LinkNode,
    // ... other nodes
  ],
};

// Add plugin
<AccessibilityAutoLinkPlugin />
```

### Default Matchers

The plugin automatically detects:
- URLs: `https://example.com`, `http://example.com`, `www.example.com`
- Emails: `user@example.com`

### Custom Matchers

```tsx
import {
  AccessibilityAutoLinkPlugin,
  DEFAULT_LINK_MATCHERS,
} from '@lexical/accessibility';

const customMatchers = [
  ...DEFAULT_LINK_MATCHERS,
  // Add custom matcher
  (text) => {
    const match = /\bticket-(\d+)\b/.exec(text);
    if (match) {
      return {
        index: match.index,
        length: match[0].length,
        text: match[0],
        url: `https://tickets.example.com/${match[1]}`,
      };
    }
    return null;
  },
];

<AccessibilityAutoLinkPlugin matchers={customMatchers} />
```

### Troubleshooting AutoLink

**URLs not converting to links?**

1. **Check node registration** - Both `AutoLinkNode` AND `LinkNode` must be in your editor's nodes array:
   ```tsx
   import { AutoLinkNode, LinkNode } from '@lexical/accessibility';

   const initialConfig = {
     nodes: [
       AutoLinkNode,  // Required!
       LinkNode,      // Required!
       // ... other nodes
     ],
   };
   ```

2. **Check plugin is mounted** - Ensure `<AccessibilityAutoLinkPlugin />` is inside your `<LexicalComposer>`.

3. **AutoLink only works on typed/pasted bare URLs** - It converts `http://example.com` to a link. For markdown links like `[text](url)`, use paste with markdown support (see below).

---

## Markdown Paste Support

The plugin includes smart markdown paste handling.

### Setup

Markdown paste is included automatically with `AccessibilityPlugin`. It uses `ACCESSIBILITY_TRANSFORMERS` which include all standard transformers plus HR support.

### Custom Transformers

```tsx
import {
  AccessibilityPlugin,
  ACCESSIBILITY_TRANSFORMERS,
} from '@lexical/accessibility';

// Add custom transformer
const myTransformers = [
  MY_CUSTOM_TRANSFORMER,
  ...ACCESSIBILITY_TRANSFORMERS,
];

<AccessibilityPlugin transformers={myTransformers} />
```

### Supported Markdown Syntax

| Syntax | Result |
|--------|--------|
| `# Heading` | Heading levels 1-6 |
| `> quote` | Block quote |
| `- item` | Unordered list |
| `1. item` | Ordered list |
| `` ```code``` `` | Code block (supports language: js, ts, c, c++, c#, f#, etc.) |
| `**bold**` | Bold text |
| `*italic*` | Italic text |
| `~~strike~~` | Strikethrough |
| `` `code` `` | Inline code |
| `[text](url)` | Link |
| `---` | Horizontal rule |

### Programmatic Markdown Insertion

When inserting markdown content programmatically (not via paste), use `$insertMarkdownAtSelection`:

```tsx
import {
  $insertMarkdownAtSelection,
  ACCESSIBILITY_TRANSFORMERS,
} from '@lexical/accessibility';

editor.update(() => {
  // Position cursor first (optional - content inserts at root if no selection)
  const lastChild = $getRoot().getLastChild();
  if (lastChild) {
    lastChild.selectEnd();
  }

  // Insert markdown at cursor position
  $insertMarkdownAtSelection(
    '# New Heading\n\nSome **bold** text',
    ACCESSIBILITY_TRANSFORMERS
  );
});
```

#### Cursor Behavior

By default, `$insertMarkdownAtSelection` positions the cursor at the **end of the document** after insertion. This is typically what users expect for interactive editing.

**Options:**

| Option | Default | Cursor Behavior | Use Case |
|--------|---------|-----------------|----------|
| `preserveSelection: false` | ✓ | Cursor moves to end of document | Normal user interactions, paste operations |
| `preserveSelection: true` | | Cursor stays where it was | Background editors, programmatic insertion without focus change |

```typescript
// Default behavior: cursor at end of document
$insertMarkdownAtSelection(markdown, transformers);

// Preserve selection: cursor stays in place (for background editors)
$insertMarkdownAtSelection(markdown, transformers, { preserveSelection: true });
```

**Note:** As of v0.38.2-a11y.14, `$insertMarkdownAtSelection` automatically handles selection management internally. You no longer need to manually restore selection after calling this function.

---

## Suppressing Announcements

For bulk operations, suppress announcements to avoid noise:

```tsx
import {SUPPRESS_A11Y_ANNOUNCEMENTS_TAG} from '@lexical/accessibility';
import {$getRoot} from 'lexical';

// Clear editor silently
editor.update(() => {
  $getRoot().clear();
}, {tag: SUPPRESS_A11Y_ANNOUNCEMENTS_TAG});

// Bulk insert silently
editor.update(() => {
  $insertNodes(manyNodes);
}, {tag: SUPPRESS_A11Y_ANNOUNCEMENTS_TAG});
```

Use this when:
- Clearing the editor
- Loading initial content
- Replacing all content
- Any operation where individual announcements would be overwhelming

---

## Background Editor Operations

When you have multiple editors in your application and need to programmatically insert content into a non-focused/hidden editor, use the `preserveSelection` option to prevent focus from shifting.

### The Problem

Normally, when you insert markdown content using `$insertMarkdownAtSelection`, the function moves the cursor to the end of the document. This cursor movement can:
1. Trigger focus events that shift focus to the hidden editor
2. Cause screen readers to announce the new cursor position
3. Disrupt the user's workflow in the currently focused editor

### The Solution

Use the `preserveSelection: true` option to skip cursor restoration:

```tsx
import {
  $insertMarkdownAtSelection,
  SUPPRESS_A11Y_ANNOUNCEMENTS_TAG,
  ACCESSIBILITY_TRANSFORMERS,
} from '@lexical/accessibility';

// Insert into a background editor without stealing focus
backgroundEditor.update(() => {
  $insertMarkdownAtSelection(
    '# New Heading\n\nSome **bold** content',
    ACCESSIBILITY_TRANSFORMERS,
    { preserveSelection: true }
  );
}, {
  tag: SUPPRESS_A11Y_ANNOUNCEMENTS_TAG
});
```

### Options

```typescript
interface InsertMarkdownOptions {
  /**
   * When true, preserves the current selection/cursor position instead of
   * moving the cursor to the end of inserted content.
   *
   * Use this when inserting content into a non-focused/background editor
   * to prevent focus from shifting to that editor.
   *
   * @default false
   */
  preserveSelection?: boolean;
}
```

### Common Use Cases

**1. Syncing content to a preview editor:**
```tsx
// User is editing in mainEditor, preview in backgroundEditor
mainEditor.registerUpdateListener(({editorState}) => {
  const markdown = exportToMarkdown(editorState);

  backgroundEditor.update(() => {
    $replaceWithMarkdown(markdown);
  }, {
    tag: SUPPRESS_A11Y_ANNOUNCEMENTS_TAG
  });
});
```

**2. Appending log entries to a hidden editor:**
```tsx
function appendToLog(message: string) {
  logEditor.update(() => {
    $insertMarkdownAtSelection(
      `\n- ${new Date().toISOString()}: ${message}`,
      ACCESSIBILITY_TRANSFORMERS,
      { preserveSelection: true }
    );
  }, {
    tag: SUPPRESS_A11Y_ANNOUNCEMENTS_TAG
  });
}
```

**3. Loading initial content without focus disruption:**
```tsx
// During app initialization, load content into multiple editors
Promise.all([
  loadContent('doc1').then(content => {
    editor1.update(() => {
      $replaceWithMarkdown(content);
    }, { tag: SUPPRESS_A11Y_ANNOUNCEMENTS_TAG });
  }),
  loadContent('doc2').then(content => {
    editor2.update(() => {
      $replaceWithMarkdown(content);
    }, { tag: SUPPRESS_A11Y_ANNOUNCEMENTS_TAG });
  }),
]);
```

### Best Practices

1. **Always combine with `SUPPRESS_A11Y_ANNOUNCEMENTS_TAG`** - This prevents both focus shifts AND announcement noise

2. **Use for background operations only** - For normal user interactions (paste, type), let the cursor move naturally

3. **Test with screen readers** - Verify that focus stays in the intended editor and announcements are appropriate

---

## Custom Node Announcements

Create announcements for your own custom nodes:

```tsx
import type {NodeAnnouncementConfig} from '@lexical/accessibility';
import {MyCustomNode} from './MyCustomNode';

const myNodeConfig: NodeAnnouncementConfig<MyCustomNode> = {
  nodeType: MyCustomNode,

  // Announce when node is created
  generateCreationAnnouncement: (node, context) => {
    return `Created custom element: ${node.getValue()}`;
  },

  // Announce when node is destroyed
  generateDestructionAnnouncement: (node, context) => {
    return `Removed custom element`;
  },

  // Control when destruction is announced
  shouldAnnounceDestruction: () => true,
};

// Register with plugin
<AccessibilityPlugin
  additionalNodeConfigs={[myNodeConfig]}
/>
```

---

## Complete Example

Here's a complete editor setup with all accessibility features:

```tsx
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {ListPlugin} from '@lexical/react/LexicalListPlugin';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {ListItemNode, ListNode} from '@lexical/list';
import {CodeNode, CodeHighlightNode} from '@lexical/code';
import {TableNode, TableCellNode, TableRowNode} from '@lexical/table';
import {HorizontalRuleNode} from '@lexical/react/LexicalHorizontalRuleNode';

import {
  // Core accessibility
  AccessibilityPlugin,
  ACCESSIBLE_TEXT_NODE_REPLACEMENT,

  // Emoji support
  EmojiNode,
  EmojisPlugin,
  EmojiPickerPlugin,
  createEmojiConfig,

  // AutoLink
  AccessibilityAutoLinkPlugin,
  AutoLinkNode,
  LinkNode,
} from '@lexical/accessibility';

// Create emoji config for announcements
const emojiConfig = createEmojiConfig(EmojiNode);

const initialConfig = {
  namespace: 'AccessibleEditor',
  theme: {
    // Your theme config
  },
  nodes: [
    // IMPORTANT: Use ACCESSIBLE_TEXT_NODE_REPLACEMENT for AutoLink to work!
    ACCESSIBLE_TEXT_NODE_REPLACEMENT,
    EmojiNode,
    AutoLinkNode,
    LinkNode,

    // Standard nodes
    HeadingNode,
    QuoteNode,
    ListNode,
    ListItemNode,
    CodeNode,
    CodeHighlightNode,
    TableNode,
    TableCellNode,
    TableRowNode,
    HorizontalRuleNode,
  ],
  onError: (error) => console.error(error),
};

function AccessibleEditor() {
  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="editor-container">
        <RichTextPlugin
          contentEditable={<ContentEditable className="editor-input" />}
          placeholder={<div className="placeholder">Enter text...</div>}
          ErrorBoundary={LexicalErrorBoundary}
        />

        {/* Core plugins */}
        <HistoryPlugin />
        <ListPlugin />

        {/* Accessibility plugin with emoji announcements */}
        <AccessibilityPlugin
          additionalNodeConfigs={[emojiConfig]}
          config={{
            verbosity: 'standard',
            useCSSFormatting: true,
          }}
        />

        {/* Emoji auto-conversion */}
        <EmojisPlugin />

        {/* Emoji picker (:: trigger) */}
        <EmojiPickerPlugin
          emojiDataLoader={() => import('./utils/emoji-list')}
        />

        {/* Auto-link URLs and emails */}
        <AccessibilityAutoLinkPlugin />
      </div>
    </LexicalComposer>
  );
}

export default AccessibleEditor;
```

---

## Troubleshooting

### AutoLink not converting URLs

**Most common cause:** Using `AccessibleTextNode` instead of `ACCESSIBLE_TEXT_NODE_REPLACEMENT`.

1. **Use the replacement config** - The `ACCESSIBLE_TEXT_NODE_REPLACEMENT` export ensures `TextNode` transforms (like AutoLink) also apply to `AccessibleTextNode`:
   ```tsx
   import {ACCESSIBLE_TEXT_NODE_REPLACEMENT} from '@lexical/accessibility';

   nodes: [
     ACCESSIBLE_TEXT_NODE_REPLACEMENT,  // NOT just AccessibleTextNode
     AutoLinkNode,
     LinkNode,
   ]
   ```

2. **Ensure both link nodes are registered** - `AutoLinkNode` AND `LinkNode` must be in your nodes array

3. **Ensure plugin is mounted** - `<AccessibilityAutoLinkPlugin />` must be inside your `<LexicalComposer>`

### Emojis not converting

1. Ensure `EmojiNode` is registered in your nodes array
2. Ensure `EmojisPlugin` is included in your editor
3. Check that `ACCESSIBLE_TEXT_NODE_REPLACEMENT` is used (required for emoji transforms)

### Emoji picker not showing

1. Ensure you're providing emoji data via `emojiData` or `emojiDataLoader`
2. Trigger with `::` (two colons), not single `:`
3. Check browser console for errors loading emoji data

### Screen reader not announcing

1. Ensure `AccessibilityPlugin` is included
2. Check `config.enabled` is `true` (default)
3. Verify `config.announceFormats` and `config.announceStructural` are `true`

### CSS formatting not working

1. Use `ACCESSIBLE_TEXT_NODE_REPLACEMENT` in nodes array
2. Ensure `config.useCSSFormatting` is `true` (default)
3. Add the required CSS classes to your stylesheet

---

## Version Compatibility

This guide is for `v0.38.2-a11y.11`. When updating to newer versions:

1. Update all package.json URLs to the new version tag
2. Run clean install: `rm -rf node_modules package-lock.json && npm cache clean --force && npm install`
3. Check release notes for breaking changes
