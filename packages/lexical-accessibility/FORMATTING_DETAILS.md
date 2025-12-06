# Lexical Accessibility Plugin - Formatting Implementation Details

## Problem Statement

When applying text formatting (bold, italic, etc.) via keyboard shortcuts like Ctrl+B or Ctrl+I, screen readers announce "selected" and "unselected" in addition to our intended format announcements. This creates a confusing and noisy experience for screen reader users.

### Root Cause

Lexical replaces DOM nodes when changing format:
- `<span>text</span>` becomes `<strong>text</strong>` for bold
- `<span>text</span>` becomes `<em>text</em>` for italic

This DOM replacement triggers:
1. Selection is saved
2. Old node is destroyed
3. New node is created with different tag
4. Selection is restored on new node
5. Screen reader announces the selection restoration as "selected"

The relevant code is in `LexicalTextNode.ts`:

```typescript
function getElementInnerTag(node: TextNode, format: number): string {
  if (format & IS_BOLD) return 'strong';  // Tag changes = DOM replacement
  if (format & IS_ITALIC) return 'em';
  return 'span';
}

// In updateDOM():
if (prevTag !== nextTag) {
  return true;  // Signals full DOM REPLACEMENT
}
```

---

## Research Findings

### CSS Styling and Screen Reader Detection

Screen readers (NVDA, JAWS, VoiceOver) detect text formatting through CSS computed styles, not just semantic HTML tags:

| CSS Property | Screen Reader Detection | Notes |
|-------------|------------------------|-------|
| `font-weight: bold` | Yes - announces as bold | Equivalent to `<strong>` or `<b>` |
| `font-style: italic` | Yes - announces as italic | Equivalent to `<em>` or `<i>` |
| `text-decoration: underline` | Yes - detected | Some SRs announce, some don't by default |
| `text-decoration: line-through` | Yes - detected | Strikethrough detection varies |
| `font-family: monospace` | Partial | Detected as font change, not "code" |
| `vertical-align: sub/super` | No | Visual only - not announced |
| `background-color` | No | Invisible to screen readers |

**Important:** Format detection is often OFF by default in screen readers. Users must enable "announce font attributes" in NVDA/JAWS settings for these to be spoken.

### DOM Insertion Alternatives Research

We investigated whether there are DOM APIs that can add formatting tags without triggering selection loss.

#### DOM Operations That PRESERVE Selection

```javascript
// Modifying attributes/styles on existing elements - WORKS
element.style.fontWeight = 'bold';      // Selection stays intact
element.classList.add('bold');          // Selection stays intact
element.setAttribute('data-format', 'bold');  // Selection stays intact

// Modifying text content within same node
textNode.nodeValue = 'new text';        // Selection may need adjustment but no announcement
```

#### DOM Operations That BREAK Selection

```javascript
// 1. Replacing elements (what Lexical does now)
const newElement = document.createElement('strong');
newElement.textContent = oldElement.textContent;
oldElement.replaceWith(newElement);     // Selection lost, must restore

// 2. Wrapping content
const wrapper = document.createElement('strong');
wrapper.appendChild(textNode);          // Text node moved = selection broken

// 3. insertAdjacentElement / insertAdjacentHTML
element.insertAdjacentElement('beforebegin', newElement);
element.insertAdjacentHTML('afterend', '<strong>text</strong>');
// Doesn't help for wrapping - still moves text node

// 4. Range.surroundContents()
const range = document.createRange();
range.selectNodeContents(textNode);
const wrapper = document.createElement('strong');
range.surroundContents(wrapper);        // Still moves text node into wrapper

// 5. DocumentFragment approach
const fragment = document.createDocumentFragment();
// Build new structure in fragment, then replace
// Still triggers selection loss when inserted
```

#### The Fundamental Problem

To wrap `text` in `<strong>text</strong>`, you must either:
- Create `<strong>`, move text inside → text node moves = selection breaks
- Replace `<span>` with `<strong>` → element replaced = selection breaks

**There is no DOM API to "add a tag around" content without moving or replacing nodes.**

#### Available Solutions Summary

| Approach | How It Works | Selection Impact |
|----------|--------------|------------------|
| **CSS styling** | Keep same `<span>`, add `style="font-weight:bold"` | No impact |
| **Class toggle** | Keep same `<span>`, add `class="bold"` | No impact |
| **Pre-wrap all text** | Always render `<span><strong><em>text</em></strong></span>` and toggle visibility with CSS | No impact |
| **Accept selection noise** | Current Lexical behavior | Selection announced |
| **Suppress selection events** | Clear/restore selection around DOM change | Workaround |

#### Pre-wrap Approach (Not Recommended)

```html
<!-- Always have all formatting tags present, toggle visibility -->
<span class="text-node">
  <strong style="display: contents;">
    <em style="display: contents;">
      text content
    </em>
  </strong>
</span>
```

Toggle formatting by changing `display: contents` vs `display: none`. This is complex, bloats the DOM, and would require significant Lexical core changes.

#### Conclusion

**CSS styling is the only clean solution** for avoiding selection announcements. There is no DOM API that allows wrapping content in new tags without disturbing selection. Our Phase 1 plan (AccessibleTextNode with CSS) addresses this correctly.

---

### CSS4 Pseudo-Elements (Chrome 121+)

New CSS pseudo-elements for text decoration:

```css
::spelling-error {
  text-decoration: spelling-error wavy red;
}

::grammar-error {
  text-decoration: grammar-error wavy green;
}
```

**Browser Support:**
- Chrome 121+ (January 2024)
- Edge 121+
- Safari: No
- Firefox: No

These are useful for spelling/grammar but NOT for general text formatting.

### CSS Custom Highlight API

Allows styling text ranges without DOM changes:

```javascript
const range = new Range();
range.setStart(node, 0);
range.setEnd(node, 10);

const highlight = new Highlight(range);
CSS.highlights.set('custom-highlight', highlight);
```

```css
::highlight(custom-highlight) {
  background-color: yellow;
}
```

**Limitation:** Only supports limited CSS properties (background, color, text-decoration). Cannot apply font-weight or font-style.

### ARIA Attributes for Text Formatting

**There are NO standard ARIA attributes for text formatting:**
- No `aria-bold`
- No `aria-italic`
- No `aria-format`

**Available ARIA for semantic meaning:**

| ARIA Attribute | Use Case |
|---------------|----------|
| `role="insertion"` | Track changes - inserted text |
| `role="deletion"` | Track changes - deleted text |
| `role="mark"` | Highlighted/marked text |
| `role="note"` | Supplementary content |
| `aria-describedby` | Links element to comment/annotation |
| `aria-label` | Custom accessible name |
| `aria-roledescription` | Custom role announcement |

**Example for comments:**
```html
<span aria-describedby="comment-1">annotated text</span>
<div id="comment-1" hidden>This is the comment content</div>
```

---

## Format Categories

### Category A: CSS-Compatible (Can Eliminate DOM Changes)

These formats can use CSS styling with full screen reader compatibility:

| Format | Current DOM | CSS Replacement | SR Detection |
|--------|-------------|-----------------|--------------|
| Bold | `<strong>` | `font-weight: bold` | Full |
| Italic | `<em>` | `font-style: italic` | Full |
| Underline | (span+style) | `text-decoration: underline` | Full |
| Strikethrough | (span+style) | `text-decoration: line-through` | Full |

### Category B: Requires DOM (No CSS Equivalent)

These formats need semantic HTML for proper screen reader support:

| Format | Required Tag | Why CSS Won't Work |
|--------|-------------|-------------------|
| Code | `<code>` | CSS `font-family` not announced as "code" |
| Subscript | `<sub>` | CSS `vertical-align` not announced |
| Superscript | `<sup>` | CSS `vertical-align` not announced |
| Highlight | (needs wrapper) | CSS background invisible to SR |

### Category C: Semantic Types (Need ARIA)

These require DOM elements with ARIA attributes:

| Type | Implementation |
|------|---------------|
| Comments | `<span aria-describedby="comment-id">` + hidden comment element |
| Insertions | `<ins>` or `<span role="insertion">` |
| Deletions | `<del>` or `<span role="deletion">` |
| Marks | `<mark>` or `<span role="mark">` |

---

## Implementation Plan

### Phase 1: CSS-Only Formatting (Bold, Italic, Underline, Strikethrough)

**Status: IN PROGRESS**

**Goal:** Eliminate DOM replacement for Category A formats.

**Scope:** Bold, Italic, Underline, Strikethrough only. These formats:
- Have full CSS equivalents (`font-weight`, `font-style`, `text-decoration`)
- Are detected by screen readers via CSS computed styles
- Are the most commonly used formatting operations

**Approach:** Create an `AccessibleTextNode` that extends Lexical's `TextNode` and uses CSS instead of tag changes.

#### Implementation Steps

1. **Create `AccessibleTextNode.ts`**
   - Extend Lexical's `TextNode`
   - Override `createDOM()` to apply CSS styles
   - Override `updateDOM()` to return `false` for CSS-compatible format changes
   - Implement `applyCSSFormatting()` helper method

2. **Register node in `LexicalAccessibilityPlugin.tsx`**
   - Add `useEffect` to register `AccessibleTextNode`
   - Add node transform to replace `TextNode` with `AccessibleTextNode`
   - Only activate when `useCSSFormatting` config is true

3. **Update configuration in `types.ts`**
   - Add `useCSSFormatting?: boolean` option
   - Default to `true`

4. **Export from `index.ts`**
   - Export `AccessibleTextNode` and helper functions

5. **Testing**
   - Verify bold/italic no longer triggers "selected" announcement
   - Verify formatting still appears correctly
   - Verify screen reader still announces format changes
   - Test undo/redo
   - Test copy/paste

#### New File: `src/AccessibleTextNode.ts`

```typescript
import {TextNode, $applyNodeReplacement} from 'lexical';
import type {EditorConfig, LexicalNode, NodeKey, SerializedTextNode} from 'lexical';

// Format bit flags (from Lexical)
const IS_BOLD = 1;
const IS_ITALIC = 2;
const IS_UNDERLINE = 8;
const IS_STRIKETHROUGH = 4;
const IS_CODE = 16;
const IS_SUBSCRIPT = 32;
const IS_SUPERSCRIPT = 64;

// Formats that can be CSS-only (no DOM replacement needed)
const CSS_COMPATIBLE_FORMATS = IS_BOLD | IS_ITALIC | IS_UNDERLINE | IS_STRIKETHROUGH;

// Formats that require semantic HTML tags
const DOM_REQUIRED_FORMATS = IS_CODE | IS_SUBSCRIPT | IS_SUPERSCRIPT;

export class AccessibleTextNode extends TextNode {
  static getType(): string {
    return 'accessible-text';
  }

  static clone(node: AccessibleTextNode): AccessibleTextNode {
    return new AccessibleTextNode(node.__text, node.__key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    this.applyCSSFormatting(dom);
    return dom;
  }

  updateDOM(
    prevNode: AccessibleTextNode,
    dom: HTMLElement,
    config: EditorConfig,
  ): boolean {
    const prevFormat = prevNode.__format;
    const nextFormat = this.__format;

    // Check if only CSS-compatible formats changed
    const prevDOMFormats = prevFormat & DOM_REQUIRED_FORMATS;
    const nextDOMFormats = nextFormat & DOM_REQUIRED_FORMATS;

    if (prevDOMFormats !== nextDOMFormats) {
      // DOM-required format changed - need full replacement
      return true;
    }

    // Only CSS-compatible formats changed - update in place
    this.applyCSSFormatting(dom);

    // Let parent handle text content changes
    return super.updateDOM(prevNode, dom, config);
  }

  private applyCSSFormatting(dom: HTMLElement): void {
    const format = this.__format;

    // Bold
    dom.style.fontWeight = (format & IS_BOLD) ? 'bold' : '';

    // Italic
    dom.style.fontStyle = (format & IS_ITALIC) ? 'italic' : '';

    // Text decorations (can combine multiple)
    const decorations: string[] = [];
    if (format & IS_UNDERLINE) {
      decorations.push('underline');
    }
    if (format & IS_STRIKETHROUGH) {
      decorations.push('line-through');
    }
    dom.style.textDecoration = decorations.join(' ') || '';
  }

  static importJSON(serializedNode: SerializedTextNode): AccessibleTextNode {
    const node = $createAccessibleTextNode(serializedNode.text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  exportJSON(): SerializedTextNode {
    return {
      ...super.exportJSON(),
      type: 'accessible-text',
    };
  }
}

export function $createAccessibleTextNode(text: string = ''): AccessibleTextNode {
  return $applyNodeReplacement(new AccessibleTextNode(text));
}

export function $isAccessibleTextNode(
  node: LexicalNode | null | undefined,
): node is AccessibleTextNode {
  return node instanceof AccessibleTextNode;
}
```

#### Modified File: `src/LexicalAccessibilityPlugin.tsx`

Add node replacement registration:

```typescript
import {TextNode} from 'lexical';
import {AccessibleTextNode, $createAccessibleTextNode} from './AccessibleTextNode';

// In the plugin, after editor context:
useEffect(() => {
  // Register the accessible text node
  const removeNode = editor.registerNodes([AccessibleTextNode]);

  // Replace existing TextNodes with AccessibleTextNodes
  const removeTransform = editor.registerNodeTransform(TextNode, (node) => {
    // Only transform if it's a regular TextNode, not already accessible
    if (node.getType() === 'text') {
      const accessibleNode = $createAccessibleTextNode(node.getTextContent());
      accessibleNode.setFormat(node.getFormat());
      accessibleNode.setDetail(node.getDetail());
      accessibleNode.setMode(node.getMode());
      accessibleNode.setStyle(node.getStyle());
      node.replace(accessibleNode);
    }
  });

  return () => {
    removeNode();
    removeTransform();
  };
}, [editor]);
```

### Phase 2: Selection Suppression for DOM-Required Formats

**Goal:** For code, subscript, superscript - keep DOM but suppress selection announcements.

#### New File: `src/selectionSuppressionUtils.ts`

```typescript
import type {LexicalEditor} from 'lexical';
import {FORMAT_TEXT_COMMAND, COMMAND_PRIORITY_CRITICAL} from 'lexical';

// Formats that require DOM changes
const DOM_REQUIRED_FORMATS = ['code', 'subscript', 'superscript'];

export function registerSelectionSuppression(
  editor: LexicalEditor,
): () => void {
  let suppressionActive = false;

  const unregister = editor.registerCommand(
    FORMAT_TEXT_COMMAND,
    (format) => {
      if (DOM_REQUIRED_FORMATS.includes(format)) {
        suppressionActive = true;

        // Add aria-hidden temporarily to prevent selection announcement
        const rootElement = editor.getRootElement();
        if (rootElement) {
          // Store current selection
          const selection = window.getSelection();
          const ranges: Range[] = [];
          if (selection) {
            for (let i = 0; i < selection.rangeCount; i++) {
              ranges.push(selection.getRangeAt(i).cloneRange());
            }
          }

          // Temporarily clear selection before DOM change
          selection?.removeAllRanges();

          // Re-apply after DOM settles
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (selection && ranges.length > 0) {
                ranges.forEach(range => {
                  try {
                    selection.addRange(range);
                  } catch {
                    // Range may be invalid after DOM change
                  }
                });
              }
              suppressionActive = false;
            });
          });
        }
      }
      return false; // Don't block the command
    },
    COMMAND_PRIORITY_CRITICAL,
  );

  return unregister;
}
```

### Phase 3: Integration and Configuration

#### Update: `src/types.ts`

```typescript
export interface AccessibilityConfig {
  enabled?: boolean;
  verbosity?: 'minimal' | 'standard' | 'verbose';
  announceFormats?: boolean;
  announceStructural?: boolean;

  // New options
  useCSSFormatting?: boolean;  // Use CSS instead of DOM tags (default: true)
  suppressSelectionNoise?: boolean;  // Suppress selection announcements (default: true)
}

export const DEFAULT_CONFIG: Required<AccessibilityConfig> = {
  enabled: true,
  verbosity: 'standard',
  announceFormats: true,
  announceStructural: true,
  useCSSFormatting: true,
  suppressSelectionNoise: true,
};
```

#### Update: `src/index.ts`

```typescript
// Add new exports
export {
  AccessibleTextNode,
  $createAccessibleTextNode,
  $isAccessibleTextNode,
} from './AccessibleTextNode';

export {registerSelectionSuppression} from './selectionSuppressionUtils';
```

---

## File Structure After Implementation

```
lexical-accessibility/
├── src/
│   ├── index.ts                      # Main exports
│   ├── LexicalAccessibilityPlugin.tsx # Main plugin
│   ├── AccessibleTextNode.ts         # NEW: CSS-based text node
│   ├── selectionSuppressionUtils.ts  # NEW: Selection noise prevention
│   ├── AccessibilityLiveRegion.tsx   # ARIA live region component
│   ├── announcementGenerator.ts      # Message generation
│   ├── useAnnouncementQueue.ts       # Announcement queue hook
│   ├── useNodeRegistry.ts            # Node listener registration
│   ├── nodeConfigTypes.ts            # Type definitions
│   ├── listItemConfig.ts             # List item announcements
│   ├── headingConfig.ts              # Heading announcements
│   └── types.ts                      # Configuration types
└── FORMATTING_DETAILS.md             # This document
```

---

## Regression Risk Assessment

| Change | Risk | Mitigation |
|--------|------|------------|
| AccessibleTextNode | Low | Only active when a11y plugin is present |
| CSS formatting | Low | Same visual appearance, SR-compatible |
| Selection suppression | Medium | Only affects DOM-required formats |
| Node replacement | Medium | Transforms run once per node |

### Testing Checklist

- [x] Bold/Italic with CSS - no "selected" announcement
- [x] Bold/Italic - format announced correctly
- [x] Code formatting - still uses `<code>` tag
- [x] Code formatting - no selection noise issues
- [x] Undo/redo works correctly
- [x] No visual differences from standard Lexical
- [x] Screen reader announces formats correctly (NVDA tested)

---

## Decision Points for Discussion

1. **Should CSS formatting be the default?**
   - Pro: Better accessibility experience
   - Con: Semantic HTML purists may prefer `<strong>` tags

2. **Should we modify Lexical core or keep changes in plugin?**
   - Recommendation: Keep in plugin for minimal regression risk
   - Future: Could propose as Lexical core feature

3. **Should selection suppression be opt-in or opt-out?**
   - Recommendation: Opt-out (enabled by default)
   - Users can disable if it causes issues

4. **What about code formatting?**
   - Option A: Accept the selection noise (it's infrequent)
   - Option B: Use selection suppression (implemented in Phase 2)
   - Option C: Use CSS + aria-label="code" (experimental)

---

## References

- [Lexical TextNode Source](https://github.com/facebook/lexical/blob/main/packages/lexical/src/nodes/LexicalTextNode.ts)
- [WCAG 1.4.1 Use of Color](https://www.w3.org/WAI/WCAG21/Understanding/use-of-color)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [NVDA User Guide - Speech Settings](https://www.nvaccess.org/files/nvda/documentation/userGuide.html)
- [CSS Custom Highlight API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API)
- [CSS Spelling/Grammar Errors](https://developer.chrome.com/blog/css-text-decoration-update)

---

## Status

- [x] Research completed
- [x] Plan documented
- [x] **Phase 1: CSS-Only Formatting (COMPLETE)**
  - [x] Step 1: Create `AccessibleTextNode.ts`
  - [x] Step 2: Register node in plugin
  - [x] Step 3: Update configuration
  - [x] Step 4: Export from index
  - [x] Step 5: Testing - ALL FORMATS WORKING (Bold, Italic, Underline, Strikethrough)
- [x] **Phase 2: Code Accessibility (COMPLETE)**
  - [x] Code block enter/exit announcements
  - [x] Inline code enter/exit announcements
  - [x] Arrow key navigation fix for code blocks
  - [x] Line number announcements for Enter in code blocks
- [x] User testing with screen readers (ongoing with NVDA)

---

## Phase 1 Implementation Complete

### Implementation Approach Validated

Our implementation follows the **official Lexical patterns** for custom nodes. Key validation points:

1. **Plugins export nodes, users register them** - This is the standard Lexical pattern (same as @lexical/list, @lexical/code, etc.)
2. **Node transforms can be registered dynamically** - `editor.registerNodeTransform()` IS supported after editor creation
3. **No dynamic node registration API exists** - `editor.registerNodes()` does NOT exist; nodes must be in config at creation time
4. **`editor.hasNode()` is the correct check** - Plugins should verify nodes are registered before using transforms

### What We Implemented

| Format | CSS Property | Replaces |
|--------|-------------|----------|
| Bold | `font-weight: bold` | `<strong>` tag |
| Italic | `font-style: italic` | `<em>` tag |
| Underline | `text-decoration: underline` | inline style |
| Strikethrough | `text-decoration: line-through` | inline style |

### Files Created/Modified

1. `src/AccessibleTextNode.ts` - NEW: Custom TextNode using CSS
2. `src/LexicalAccessibilityPlugin.tsx` - MODIFIED: Added transform registration
3. `src/types.ts` - MODIFIED: Added `useCSSFormatting` config option
4. `src/index.ts` - MODIFIED: Export AccessibleTextNode and helpers

### How to Use

**Option 1: Plugin Transform Pattern (Current Implementation)**

Users add AccessibleTextNode to their editor config, plugin handles transformation:

```typescript
// In your editor config (e.g., PlaygroundNodes.ts)
import {AccessibleTextNode} from '@lexical/accessibility';

const nodes = [
  AccessibleTextNode,  // Register the node
  HeadingNode,
  ListNode,
  // ... other nodes
];

// In your editor setup
<LexicalComposer initialConfig={{nodes, ...}}>
  <AccessibilityPlugin />  // Plugin auto-transforms TextNodes
</LexicalComposer>
```

The plugin:
1. Checks if `AccessibleTextNode` is registered via `editor.hasNode()`
2. If registered and `useCSSFormatting: true`, registers a transform
3. Transform converts all base `TextNode` instances to `AccessibleTextNode`

**Option 2: Official Replace Pattern (Alternative)**

Users can use Lexical's official "replace" pattern for automatic conversion without plugin transform:

```typescript
import {AccessibleTextNode, $createAccessibleTextNode} from '@lexical/accessibility';
import {TextNode} from 'lexical';

const nodes = [
  AccessibleTextNode,
  {
    replace: TextNode,
    with: (node: TextNode) => {
      const accessible = $createAccessibleTextNode(node.getTextContent());
      accessible.setFormat(node.getFormat());
      accessible.setDetail(node.getDetail());
      accessible.setMode(node.getMode());
      accessible.setStyle(node.getStyle());
      return accessible;
    },
    withKlass: AccessibleTextNode,  // Required in future Lexical versions
  },
  HeadingNode,
  ListNode,
  // ... other nodes
];
```

With this pattern, ALL TextNodes automatically become AccessibleTextNodes at creation time. The plugin's transform becomes redundant (but harmless).

### Why Both Options Are Valid

| Aspect | Option 1 (Plugin Transform) | Option 2 (Replace Pattern) |
|--------|---------------------------|---------------------------|
| Where conversion happens | Plugin's useEffect | Editor initialization |
| When conversion runs | On dirty nodes | On node creation |
| User configuration | Just add node to array | Add node + replace config |
| Lexical pattern | Matches emoji-plugin example | Official "Node Replacement" pattern |
| Complexity | Simpler for users | More explicit, more control |

Both follow official Lexical patterns. Option 1 is simpler for users; Option 2 is more explicit and may have slight performance benefits since conversion happens at creation rather than via transform.

### Configuration

```typescript
// In AccessibilityPlugin config
<AccessibilityPlugin config={{
  useCSSFormatting: true,  // Default: true - use CSS instead of DOM tags
}} />
```

Set `useCSSFormatting: false` to disable CSS-based formatting and use standard Lexical behavior.

### Expected Outcome

- Ctrl+B / Ctrl+I no longer causes "selected" announcement
- Formatting still works and looks the same visually
- Screen reader still announces "Bolded [word]" via our live region
- Code, subscript, superscript still use semantic tags (DOM replacement still occurs for these)

### Phase 1 Testing Results - CONFIRMED WORKING

All CSS-based formatting announcements verified:

| Format | Apply Shortcut | Announcement | Remove Announcement | Status |
|--------|---------------|--------------|---------------------|--------|
| Bold | Ctrl+B | "Bolded [text]" | "Removed bold from [text]" | WORKING |
| Italic | Ctrl+I | "Italicized [text]" | "Removed italic from [text]" | WORKING |
| Underline | Ctrl+U | "Underlined [text]" | "Removed underline from [text]" | WORKING |
| Strikethrough | (toolbar) | "Strikethrough [text]" | "Removed strikethrough from [text]" | WORKING |

No "selected/unselected" announcements occur for these formats.

---

## Phase 2 Planning: Code Formatting (Keeping DOM)

### Why Code Stays as `<code>` Tag (Not CSS)

We intentionally keep code formatting as a DOM element (`<code>` tag) rather than converting to CSS for accessibility benefits:

1. **Sub-control Navigation**: The `<code>` tag creates a distinct DOM element that screen readers can navigate to/from. Users can identify "entering code" and "exiting code" as they arrow through content.

2. **Semantic Meaning**: CSS `font-family: monospace` is not announced as "code" by screen readers. The `<code>` tag carries semantic meaning.

3. **Future Enhancement**: We can add ARIA attributes to the `<code>` element (like `role="code"` or custom announcements) for enhanced navigation.

### Code Formatting Approach

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| DOM Element | Keep `<code>` tag | Enables sub-control navigation |
| Selection Noise | Accept or suppress | Phase 2 will address suppression |
| Announcement | Via live region | "Code formatted [text]" / "Code removed from [text]" |

### Implementation Notes for Code

The current `AccessibleTextNode` already handles this correctly:
- `IS_CODE` is in `DOM_REQUIRED_FORMATS`
- When code format changes, `updateDOM()` returns `true` (forces DOM replacement)
- This preserves the `<code>` tag behavior

---

## Other Format Considerations

### Subscript and Superscript - Why "Affects Baseline"

| Format | CSS Equivalent | Screen Reader Behavior | Visual Concern |
|--------|---------------|----------------------|----------------|
| Subscript | `vertical-align: sub; font-size: 0.75em` | NOT announced | CSS may not perfectly match `<sub>` baseline |
| Superscript | `vertical-align: super; font-size: 0.75em` | NOT announced | CSS may not perfectly match `<sup>` baseline |

**"Affects baseline" means:**
- The CSS approximation (`vertical-align: sub/super`) positions text differently than the semantic `<sub>`/`<sup>` tags
- Browser rendering of `<sub>` and `<sup>` has built-in adjustments that CSS cannot perfectly replicate
- Line height and spacing may differ slightly

**Decision:** Keep `<sub>` and `<sup>` tags because:
1. Screen readers don't announce CSS vertical-align anyway
2. Visual fidelity is better with semantic tags
3. Mathematical/scientific content depends on precise positioning

### Highlight (`<mark>`) - Why "Possible"

| Format | CSS Equivalent | Screen Reader Behavior |
|--------|---------------|----------------------|
| Highlight | `background-color: yellow` | NOT announced |

**"Possible" means:**
- Technically we COULD use CSS `background-color` instead of `<mark>`
- CSS background is invisible to screen readers either way
- The `<mark>` tag has semantic meaning (highlighted/relevant content)

**Decision:** Keep `<mark>` tag because:
1. CSS background is equally invisible to screen readers
2. `<mark>` has semantic value for search results, annotations
3. No accessibility benefit to switching to CSS

### Summary: Format Strategy

| Format | Strategy | Why |
|--------|----------|-----|
| Bold | CSS | Full SR detection, no DOM noise |
| Italic | CSS | Full SR detection, no DOM noise |
| Underline | CSS | Full SR detection, no DOM noise |
| Strikethrough | CSS | Full SR detection, no DOM noise |
| Code | DOM (`<code>`) | Sub-control navigation, semantic meaning |
| Subscript | DOM (`<sub>`) | Visual fidelity, no CSS SR benefit |
| Superscript | DOM (`<sup>`) | Visual fidelity, no CSS SR benefit |
| Highlight | DOM (`<mark>`) | Semantic meaning, no CSS SR benefit |

---

## ARIA Annotations for Editor Features

### Overview

WAI-ARIA 1.3 (draft, but Chrome supports) introduces annotation roles that enable accessible highlights, comments, and notes. These are critical for collaborative editing features.

**References:**
- [ARIA: mark role - MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/mark_role)
- [ARIA: comment role - MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/comment_role)
- [ARIA Annotations W3C Spec](https://w3c.github.io/annotation-aria/)

### Available Annotation Roles

| Role | Purpose | Use Case |
|------|---------|----------|
| `role="mark"` | Highlighted/relevant content | User highlights, search results |
| `role="comment"` | Comment/reaction to content | Collaborative comments, feedback |
| `role="note"` | Parenthetic/ancillary content | Footnotes, side notes, metadata |

### Connecting Annotations to Content

The `aria-details` attribute links annotated content to its annotation body:

```html
<!-- Highlighted text with associated comment -->
<span role="mark" aria-details="comment-1">This text has a comment</span>

<div id="comment-1" role="comment">
  <p>This is the comment about the highlighted text</p>
  <p role="note">Author: Jane, Date: 2024-01-15</p>
</div>
```

**Key points:**
- `aria-details="id"` links annotated content to annotation body
- `aria-details` can accept multiple IDs for multiple comments on same text
- The `<mark>` element implicitly has `role="mark"` in supporting browsers
- `aria-label` and `aria-labelledby` are prohibited on `role="mark"`

### Accessibility Tree Exposure

| HTML Element | Implicit Role | Screen Reader Behavior |
|-------------|---------------|----------------------|
| `<mark>` | `mark` | Announced when "marked content" enabled in SR settings |
| `<span role="mark">` | `mark` | Same as `<mark>` |
| `<div role="comment">` | `comment` | Can be navigated to via aria-details |
| `<div role="note">` | `note` | Announced as supplementary content |

### Browser Support (as of 2024-2025)

| Browser | `role="mark"` | `role="comment"` | `aria-details` |
|---------|---------------|------------------|----------------|
| Chrome | Yes | Yes | Yes |
| Edge | Yes | Yes | Yes |
| Firefox | Partial | Partial | Yes |
| Safari | Partial | Partial | Partial |

### Screen Reader Support

| Screen Reader | `role="mark"` | `role="comment"` | `aria-details` navigation |
|---------------|---------------|------------------|--------------------------|
| NVDA | Yes (enable in settings) | Partial | Yes |
| JAWS | Varies by version | Partial | Yes |
| VoiceOver | Partial | Partial | Partial |

**Note:** Support is evolving as ARIA 1.3 finalizes. Our plugin can provide live region announcements as a fallback.

### Implementation Plan for Editor Annotations

#### Phase: Highlight/Mark Support

```typescript
// When user applies highlight
<mark aria-details="annotation-123">highlighted text</mark>

// Plugin announces via live region
announce("Highlighted: [text]");
```

#### Phase: Comment Support

```typescript
// Text with comment
<span role="mark" aria-details="comment-456">commented text</span>

// Comment panel (could be hidden or in sidebar)
<div id="comment-456" role="comment">
  <p>Comment content here</p>
  <p role="note">By: Author Name</p>
</div>

// Plugin announces
announce("Comment added to: [text]");
```

#### Phase: Note/Footnote Support

```typescript
// Text with footnote reference
<span aria-details="footnote-1">referenced text<sup>[1]</sup></span>

// Footnote content
<div id="footnote-1" role="note">
  Footnote explanation here
</div>
```

### Design Considerations

1. **Annotation Body Location**: Where do comments/notes live in the DOM?
   - Inline (immediately after annotated content)
   - End of document (traditional footnotes)
   - Separate panel (sidebar comments)

2. **Multiple Annotations**: Same text can have multiple comments
   - `aria-details="comment-1 comment-2 comment-3"`

3. **Nested Annotations**: Can highlights contain other highlights?
   - Generally avoid - can confuse navigation

4. **Visibility**: Annotation bodies can be:
   - Always visible (inline notes)
   - Hidden until focused (expandable comments)
   - In separate UI region (comment sidebar)

### Future Work

- [ ] Implement `role="mark"` for highlight formatting
- [ ] Add `aria-details` linking for comments
- [ ] Create comment node type with `role="comment"`
- [ ] Add navigation shortcuts for jumping between annotations
- [ ] Live region announcements for annotation operations
- [ ] Consider "annotation count" announcements ("3 comments on this paragraph")

---

## Code Block Accessibility (COMPLETE)

### Overview

Code blocks (created with triple backticks ```) are now fully accessible with enter/exit announcements and line number feedback.

### Implemented Features

| Feature | Announcement | Verbosity |
|---------|-------------|-----------|
| Arrow into code block | "Code block entered" | All levels |
| Arrow out of code block | "Code block exited" | All levels |
| Enter inside code block | "Blank" | Minimal |
| Enter inside code block | "Blank, line N" | Default/Verbose |
| Create code block (```) | "Code block started" | All levels |
| Delete code block | "Code block removed" | All levels |

### Implementation Details

1. **Enter/Exit Detection**: Uses `registerUpdateListener` instead of `SELECTION_CHANGE_COMMAND` because SELECTION_CHANGE doesn't fire reliably inside code blocks.

2. **Line Counting**: Counts `linebreak` nodes within the CodeNode to determine current line number.

3. **Exit Check**: When Enter is pressed, a setTimeout check verifies we're still in the code block before announcing line number (prevents double announcement on exit).

4. **Arrow Key Navigation Fix**: Modified `CodeHighlighterPrism.ts` to allow cursor to exit code blocks at boundaries (previously trapped at offset=0).

### Files Modified

- `packages/lexical-accessibility/src/LexicalAccessibilityPlugin.tsx` - Enter key handling, update listener
- `packages/lexical-accessibility/src/codeBlockConfig.ts` - Node announcement config for create/remove
- `packages/lexical-accessibility/src/useNodeRegistry.ts` - Register code block config
- `packages/lexical-code/src/CodeHighlighterPrism.ts` - Fix arrow key exit at boundaries
- `packages/lexical-code/src/CodeNode.ts` - ARIA attributes (role="group", aria-label="code block")

---

## Inline Code Accessibility (COMPLETE)

### Overview

Inline code (text formatted with backticks or Ctrl+`) now announces enter/exit transitions with verbosity-aware messages.

### Implemented Features

| Feature | Announcement | Verbosity |
|---------|-------------|-----------|
| Arrow into inline code | "Code" | Standard |
| Arrow out of inline code | "End code" | Standard |
| Arrow into inline code | "Entering code" | Verbose |
| Arrow out of inline code | "Exiting code" | Verbose |
| Arrow into/out of inline code | (no announcement) | Minimal |

### Implementation Details

1. **Detection**: Uses `IS_CODE` format flag (value 16) on TextNode to detect inline code.

2. **State Tracking**: `wasInInlineCodeRef` tracks previous state between updates.

3. **Update Listener**: Same pattern as code blocks - uses `registerUpdateListener` for reliable detection.

4. **Code Block Exclusion**: Inline code tracking is disabled when inside a code block to avoid conflicts.

### Code

```typescript
const $isInsideInlineCode = (): boolean => {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return false;

  const anchorNode = selection.anchor.getNode();
  if (!$isTextNode(anchorNode)) return false;

  return (anchorNode.getFormat() & IS_CODE) !== 0;
};
```

### Files Modified

- `packages/lexical-accessibility/src/LexicalAccessibilityPlugin.tsx` - Inline code detection and announcements
