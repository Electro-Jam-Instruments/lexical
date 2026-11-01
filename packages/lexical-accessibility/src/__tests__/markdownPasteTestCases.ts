/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Common markdown patterns from AI assistants (Claude, ChatGPT, etc.)
 * Use these to test paste-as-markdown functionality.
 *
 * To test manually:
 * 1. Copy one of these test strings
 * 2. Paste into the Lexical editor
 * 3. Verify the formatting is applied correctly
 *
 * VERIFIED WORKING (tested with Lexical playground):
 * - Bold, italic, bold+italic, inline code, strikethrough
 * - All heading levels (H1-H6)
 * - Ordered and unordered lists
 * - Code blocks with language hints
 * - Blockquotes
 * - Links
 * - Tables (pipe syntax) - Supports text formatting in cells
 *
 * NOT SUPPORTED (Lexical limitation):
 * - Task lists (checkboxes)
 * - Footnotes
 * - Highlight (==text==)
 */

export const AI_MARKDOWN_TEST_CASES = {
  // ============================================================
  // BASIC TEXT FORMATTING (ALL VERIFIED WORKING)
  // ============================================================

  boldText: `Here is some **bold text** in a sentence.`,

  italicText: `Here is some *italic text* in a sentence.`,

  boldItalic: `Here is ***bold and italic*** text together.`,

  inlineCode: `Use the \`console.log()\` function to debug.`,

  strikethrough: `This is ~~deleted~~ text.`,

  mixedFormatting: `You can combine **bold**, *italic*, and \`code\` in one paragraph.`,

  // ============================================================
  // ALL HEADING LEVELS (H1-H6) - VERIFIED WORKING
  // ============================================================

  heading1: `# Heading Level 1

This is content under H1.`,

  heading2: `## Heading Level 2

This is content under H2.`,

  heading3: `### Heading Level 3

This is content under H3.`,

  heading4: `#### Heading Level 4

This is content under H4.`,

  heading5: `##### Heading Level 5

This is content under H5.`,

  heading6: `###### Heading Level 6

This is content under H6.`,

  allHeadingLevels: `# H1 - Main Title

Introduction paragraph here.

## H2 - Major Section

Section content here.

### H3 - Subsection

Subsection content here.

#### H4 - Detail Level

Detailed content here.

##### H5 - Minor Detail

Minor detail content.

###### H6 - Smallest Heading

Smallest heading content.`,

  multipleHeadings: `# Introduction

Here's the intro paragraph.

## Getting Started

Follow these steps to begin.

### Prerequisites

Make sure you have Node.js installed.`,

  // ============================================================
  // LISTS (VERIFIED WORKING)
  // ============================================================

  unorderedList: `Here are the key points:

- First item
- Second item
- Third item`,

  orderedList: `Follow these steps:

1. Install the package
2. Configure the settings
3. Run the application`,

  nestedList: `Project structure:

- src/
  - components/
    - Button.tsx
    - Input.tsx
  - utils/
    - helpers.ts
- package.json`,

  mixedLists: `## Setup Instructions

1. Clone the repository
2. Install dependencies:
   - Run \`npm install\`
   - Or use \`yarn\`
3. Start the server`,

  // ============================================================
  // CODE BLOCKS (VERIFIED WORKING)
  // ============================================================

  codeBlockJS: `Here's an example function:

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

Call it like this: \`greet('World')\``,

  codeBlockPython: `Here's a Python example:

\`\`\`python
def calculate_sum(numbers):
    return sum(numbers)

result = calculate_sum([1, 2, 3, 4, 5])
print(f"Sum: {result}")
\`\`\``,

  codeBlockTypescript: `Create a typed function:

\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
}

function getUser(id: number): User | undefined {
  // Implementation here
}
\`\`\``,

  codeBlockBash: `Run these commands:

\`\`\`bash
npm install @lexical/react
npm run dev
\`\`\``,

  // ============================================================
  // BLOCKQUOTES (VERIFIED WORKING)
  // ============================================================

  blockquote: `As the documentation states:

> This is an important note that you should pay attention to.
> It spans multiple lines.

Keep this in mind when implementing.`,

  // ============================================================
  // TABLES (VERIFIED WORKING)
  // ============================================================

  simpleTable: `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |`,

  tableWithFormatting: `| Feature | Status | Notes |
|---------|--------|-------|
| **Bold** | *Active* | Uses \`formatting\` |
| Normal | Done | Plain text |`,

  // ============================================================
  // LINKS (VERIFIED WORKING)
  // ============================================================

  simpleLink: `Check out [the documentation](https://lexical.dev) for more info.`,

  multipleLinks: `Useful resources:

- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [MDN Web Docs](https://developer.mozilla.org)`,

  // ============================================================
  // COMPLEX AI RESPONSES (realistic examples)
  // ============================================================

  explanationResponse: `## Understanding the Problem

The issue occurs because **the event listener is not being cleaned up** when the component unmounts.

### Solution

You need to use the cleanup function in \`useEffect\`:

\`\`\`javascript
useEffect(() => {
  const handleClick = () => {
    console.log('clicked');
  };

  document.addEventListener('click', handleClick);

  // Cleanup function
  return () => {
    document.removeEventListener('click', handleClick);
  };
}, []);
\`\`\`

This ensures the listener is removed when the component is unmounted.`,

  debuggingResponse: `I found the bug! Here's what's happening:

1. The \`useState\` hook is being called **conditionally**
2. This violates the Rules of Hooks
3. React can't track the state properly

**Fix:** Move the hook call outside the conditional:

\`\`\`typescript
// Wrong
if (condition) {
  const [value, setValue] = useState(0);
}

// Correct
const [value, setValue] = useState(0);
if (condition) {
  // use value here
}
\`\`\``,

  comparisonResponse: `## Option A vs Option B

| Feature | Option A | Option B |
|---------|----------|----------|
| Speed | Fast | Moderate |
| Memory | High | Low |
| Complexity | Simple | Complex |

**Recommendation:** Use *Option A* for most cases, but consider *Option B* if memory is constrained.`,

  stepByStepResponse: `## How to Implement Authentication

### Step 1: Install Dependencies

\`\`\`bash
npm install jsonwebtoken bcrypt
\`\`\`

### Step 2: Create the Auth Middleware

\`\`\`typescript
import jwt from 'jsonwebtoken';

export function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
\`\`\`

### Step 3: Protect Your Routes

Add the middleware to routes that require authentication:

\`\`\`typescript
app.get('/api/profile', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});
\`\`\`

That's it! Your routes are now protected.`,

  errorExplanation: `## Error: "Cannot read properties of undefined"

This error means you're trying to access a property on something that is \`undefined\`.

**Common causes:**

1. **Async data not loaded yet**
   \`\`\`javascript
   // Problem: data might be undefined initially
   const name = data.user.name;

   // Solution: use optional chaining
   const name = data?.user?.name;
   \`\`\`

2. **Typo in property name**
   \`\`\`javascript
   // Problem: 'naem' instead of 'name'
   console.log(user.naem);
   \`\`\`

3. **Array index out of bounds**
   \`\`\`javascript
   const items = [1, 2, 3];
   console.log(items[10]); // undefined
   \`\`\`

> **Tip:** Always check if data exists before accessing nested properties.`,

  // ============================================================
  // REGRESSION TEST CASES (from manual testing sessions)
  // ============================================================

  /**
   * Complex document with multiple tables, bold inside table cells,
   * lists with bold text, and multiple heading levels.
   * Tests: Tables, bold in tables, lists with formatting, headings
   */
  complexTablesAndLists: `# Phase 1 Deep Analysis

## What Phase 1 Requires

| Component | Description | Implementation |
|-----------|-------------|----------------|
| Addon structure | Folder layout + manifest.ini | Create \`powerpoint-comments/addon/\` |
| App module | powerpnt.py in appModules/ | Class extending \`appModuleHandler.AppModule\` |
| COM connection | Connect to running PowerPoint | \`comtypes.client.GetActiveObject()\` |
| View detection | Read current view state | \`ActiveWindow.ViewType\` |
| View switching | Auto-switch to Normal | Set \`ViewType = 9\` |
| Event handling | Respond to focus changes | \`event_appModule_gainFocus()\` |

## Confidence Analysis by Component

### 1. Addon Structure + manifest.ini
**Confidence: 90%**

| Factor | Status |
|--------|--------|
| Folder structure documented | Yes |
| Quoting rules documented | Yes (hard-won knowledge) |
| Required fields known | Yes |
| Example template ready | Yes |

**Risk:** Smart quotes, wrong folder nesting
**Mitigation:** We have clear rules documented now

### 2. App Module Creation
**Confidence: 85%**

| Factor | Status |
|--------|--------|
| Base class known | \`appModuleHandler.AppModule\` |
| File naming | \`powerpnt.py\` (matches exe) |
| Code samples | Yes, in expert docs |

**Risk:** NVDA has its own built-in \`powerpnt.py\` - does our addon override or extend?
**Gap:** Need to verify override behavior

### 3. COM Connection with comtypes
**Confidence: 95%**

| Factor | Status |
|--------|--------|
| Library confirmed | comtypes (not pywin32) |
| Connection pattern | \`GetActiveObject("PowerPoint.Application")\` |
| Error handling pattern | try/except with reconnect |

**Risk:** COM can fail silently
**Mitigation:** We have safe_com_call wrapper pattern

### 4. View Detection + Switching
**Confidence: 90%**

| Factor | Status |
|--------|--------|
| API documented | \`ActiveWindow.ViewType\` |
| Constants known | Normal=9, SlideSorter=5, etc. |
| Set operation | \`ViewType = 9\` |

**Risk:** Edge cases (no window, slideshow mode)
**Mitigation:** Try/except wrapping

### 5. Event Handling
**Confidence: 75%**

| Factor | Status |
|--------|--------|
| Event name | \`event_appModule_gainFocus\` |
| When fired | When app gains focus |
| Code sample | Yes |

**Risk:** May not fire in all cases we need
**Gap:** Need to test actual firing behavior
**Unknown:** Is there a better event for "window activated"?

## Overall Phase 1 Confidence

| Component | Confidence |
|-----------|------------|
| Addon structure | 90% |
| App module creation | 85% |
| COM connection | 95% |
| View detection | 90% |
| Event handling | 75% |
| **Overall** | **85%** |

**Bottom line:** High confidence on core implementation. Main uncertainty is event handling timing and NVDA's existing PowerPoint support interaction.

## Identified Gaps

1. **NVDA Override Behavior** - Does our \`powerpnt.py\` replace or extend NVDA's built-in?
2. **Event Timing** - Does \`event_appModule_gainFocus\` fire reliably?
3. **Scratchpad Testing** - No documented test workflow yet
4. **Error Messages** - What does user hear when things fail?

## Proposed Sub-Agents

### 1. \`nvda-plugins\` Expert Agent
**Purpose:** NVDA addon development specialist

**Use for:**
- App module vs global plugin decisions
- Event handler selection
- NVDA API usage patterns
- Overlay class implementation
- Scratchpad testing workflow

**Knowledge base:** \`.agent/experts/nvda-plugins/\`

### 2. \`powerpoint-automation\` Expert Agent
**Purpose:** PowerPoint COM automation specialist

**Use for:**
- COM object model navigation
- View management
- Comment API access
- Error recovery patterns
- ExecuteMso commands

**Knowledge base:** \`.agent/experts/powerpoint-automation/\`

### 3. \`windows-accessibility\` Expert Agent
**Purpose:** Windows UIA and accessibility specialist

**Use for:**
- UIA element finding
- Focus management
- Comments pane navigation
- User identity detection

**Knowledge base:** \`.agent/experts/windows-accessibility/\`

### 4. \`nvda-addon-packager\` Agent (NEW - should create)
**Purpose:** Build and package NVDA addons

**Use for:**
- Creating correct folder structure
- manifest.ini generation with correct quoting
- Zip packaging to .nvda-addon
- GitHub release workflow
- Version management

**Why needed:** Packaging has specific gotchas (quoting rules, folder structure) that warrant a specialist

### 5. \`accessibility-tester\` Agent (NEW - should create)
**Purpose:** Test with screen reader users in mind

**Use for:**
- Verifying speech output
- Testing keyboard navigation
- Edge case identification
- User experience review

**Why needed:** We need to test AS a screen reader user, not just test code

## Recommended Approach for Phase 1

1. **Create addon structure first** (use \`nvda-addon-packager\` pattern)
2. **Test empty addon loads** in NVDA scratchpad
3. **Add minimal app module** with just logging
4. **Verify event_appModule_gainFocus fires**
5. **Add COM connection**
6. **Add view detection/switching**
7. **Test each step before proceeding**

## Summary

| Metric | Value |
|--------|-------|
| **Overall Confidence** | **85%** |
| **Highest Risk** | Event handling behavior |
| **Biggest Gap** | NVDA override behavior unclear |
| **Recommended Sub-Agents** | 5 (3 exist as knowledge, 2 new) |

Ready to proceed with Phase 1. Want me to start implementation or create the sub-agent definitions first?`,

  /**
   * Release notes style document with HR at start, tables, links, and lists.
   * Tests: HR (---), tables with status column, external links, ordered lists
   */
  releaseNotesWithHR: `---

# EXECUTION COMPLETE

## BRIEF SUMMARY:
All tasks completed successfully. v0.0.1-beta is live on GitHub.

## Download Link

**Direct Download:**
https://github.com/Electro-Jam-Instruments/NVDAPlugIns/releases/download/powerpoint-comments-v0.0.1-beta/powerpoint-comments-0.0.1.nvda-addon

**Release Page:**
https://github.com/Electro-Jam-Instruments/NVDAPlugIns/releases/tag/powerpoint-comments-v0.0.1-beta

## What Was Done

| Task | Status |
|------|--------|
| PowerPoint Automation agent updated | Done |
| Windows Accessibility agent updated | Done |
| Local AI Vision agent updated (marked deferred) | Done |
| Plugin files created | Done |
| Local build tested | Done (1496 bytes) |
| Committed to PPTCommentReview | Done |
| Pushed to GitHub | Done |
| Tag created and pushed | Done |
| GitHub Actions build | Success (11 seconds) |
| Release created | Success |

## To Install and Test

1. Download: Click the download link above
2. Install: Double-click the \`.nvda-addon\` file
3. Restart NVDA when prompted
4. Open PowerPoint
5. Check NVDA log (NVDA+F1) - look for "PowerPoint Comments addon initialized"
6. Test view switching:
   - Go to View > Slide Sorter
   - Alt+Tab away from PowerPoint
   - Alt+Tab back to PowerPoint
   - Should announce "Switched to Normal view"

## Branch Status

- All work is on \`PPTCommentReview\` branch
- Nothing pushed to main
- Ready to merge when you're satisfied`,

  /**
   * Short response with table containing bold and inline code in cells.
   * Tests: Tables with formatting in cells, bold, inline code, numbered lists
   */
  tableWithFormattedCells: `Yes - I recommend keeping both:

| Method | Purpose | URL |
|--------|---------|-----|
| **GitHub Releases** | Versioned archive, changelogs, for authenticated users | \`github.com/.../releases\` |
| **GitHub Pages** | Public download without login | \`electro-jam-instruments.github.io/NVDAPlugIns/\` |

**Why keep both:**
1. **Releases** - Keep historical versions, release notes, proper versioning
2. **Pages** - Simple public download for anyone (the main use case)

The workflow does both in one go - builds addon, creates release, AND deploys to Pages. No extra work.

Should I continue with deploying v0.0.5-beta to test the Pages setup?`,

  /**
   * Summary document with multiple HRs (--- and ***), table, and inline code.
   * Tests: Multiple HR variants, tables with status, code in lists, HR followed by content
   */
  multipleHRsAndTable: `# BRIEF SUMMARY:
Added Phase 2b to apply bold/italic formatting inside list items, headings, and quotes. The fix scans element-transformed nodes and applies text format transformers to their text content.

---

## SUMMARY:
The issue was that element transformers (for lists, headings, quotes) replace the paragraph node and move text content to new node structures, but the markdown syntax like \`**bold**\` was never converted. Added a new Phase 2b that runs after element transforms to process text formatting inside these nodes.

---

## DETAILS:

| File | Line | Change |
|------|------|--------|
| markdownUtils.ts | 22-23 | Added imports for \`$isListItemNode\`, \`$isHeadingNode\`, \`$isQuoteNode\` |
| markdownUtils.ts | 391-407 | Added \`$collectTextNodes()\` function to recursively collect TextNode descendants |
| markdownUtils.ts | 417-466 | Added \`$applyTextFormatsToElementTransformResults()\` function for Phase 2b |
| markdownUtils.ts | 552-554 | Added Phase 2b call after Phase 2 loop |
| paste-cursor-fix-attempts.md | 318-426 | Documented Attempt 5c with Phase 2b implementation |

---

Server is running on port 2112. You can test pasting content with:
- Lists with bold: \`1. **Releases** - description\`
- Headings with italic: \`## This is *italic* heading\`
- Quotes with formatting: \`> **Bold quote** text\`

---

Test content with HRs and a table:

---

Here's some bold text and a horizontal rule above.

***

| Feature | Status |
|---------|--------|
| Bold in lists | Fixed |
| Italic in headings | Fixed |
| Code blocks | Working |

---`,

  /**
   * Commit message style document with HR dividers, code block, lists with special chars.
   * Tests: HR (---), code block, bullet lists, paragraphs ending with underscores
   * NOTE: This test case triggered cursor position bug - cursor not at end after paste
   */
  commitMessageWithCodeBlock: `Here's the proposed commit message for your review:

---

## Proposed Commit Message

feat(accessibility): Add hybrid markdown paste with suppression support

IMPACT: Enables accessible markdown paste without spurious announcements

PROBLEM:

- Pasting markdown triggered excessive screen reader announcements
- Standard $convertFromMarkdownString corrupted cursor position
- Bold/italic not converted inside lists, headings, and quotes

CHANGES:

- Add $insertMarkdownAtSelection() with 5-phase hybrid approach:
  Phase 1: Insert raw text (preserves cursor)
  Phase 1.5: Process code blocks
  Phase 2: Apply element transforms (headings, lists, quotes, HR, tables)
  Phase 2b: Apply text formats inside element results
  Phase 3: Restore cursor position
- Add suppressionState.ts for announcement suppression during paste
- Add quoteConfig.ts and horizontalRuleConfig.ts for accessible announcements
- Update useNodeRegistry to support QuoteNode announcements
- Export $insertMarkdownAtSelection and ACCESSIBILITY_TRANSFORMERS

FILES:

- packages/lexical-accessibility/src/markdownUtils.ts (major expansion)
- packages/lexical-accessibility/src/suppressionState.ts (new)
- packages/lexical-accessibility/src/quoteConfig.ts (new)
- packages/lexical-accessibility/src/horizontalRuleConfig.ts (new)
- packages/lexical-accessibility/src/index.ts (exports)
- packages/lexical-accessibility/src/LexicalAccessibilityPlugin.tsx
- packages/lexical-accessibility/src/useNodeRegistry.ts
- packages/lexical-accessibility/README.md

KNOWN ISSUES:

- Tables render narrow in playground (CSS issue, not plugin bug)

---

Please review and let me know if you'd like any changes before I proceed with the commit.`,

  // ============================================================
  // EDGE CASES
  // ============================================================

  consecutiveParagraphs: `First paragraph with some text.

Second paragraph with more text.

Third paragraph to test spacing.`,

  mixedContentDense: `**Important:** Use \`npm install\` first, then run:
\`\`\`
npm start
\`\`\`
See [docs](https://example.com) for more.`,

  specialCharacters: `Handle these cases:

- Angle brackets: \`<div>\` and \`</div>\`
- Ampersands: \`&amp;\` becomes \`&\`
- Quotes: "double" and 'single'`,

  // ============================================================
  // COMPREHENSIVE TEST - ALL VERIFIED FEATURES
  // ============================================================

  comprehensiveTest: `# Comprehensive Markdown Test

This document tests **all verified working** markdown features.

## Text Formatting

Here's **bold text**, *italic text*, ***bold and italic***, \`inline code\`, and ~~strikethrough~~.

## All Heading Levels

### H3 Heading
#### H4 Heading
##### H5 Heading
###### H6 Heading

## Lists

### Unordered List

- Item one
- Item two
- Item three

### Ordered List

1. First step
2. Second step
3. Third step

## Code Block

\`\`\`typescript
function example(): string {
  return "Hello, World!";
}
\`\`\`

## Blockquote

> This is a blockquote.
> It can span multiple lines.

## Links

Visit [Lexical](https://lexical.dev) for documentation.

## Mixed Content

Here's a paragraph with **bold**, *italic*, and \`code\` together. Below is a list:

1. Use \`npm install\` to install
2. Run \`npm start\` to begin
3. Check the **console** for *output*

> **Note:** This combines formatting inside a blockquote.

That's the end of the test!`,
};

/**
 * These test cases document markdown features that are NOT yet supported.
 */
export const UNSUPPORTED_MARKDOWN = {
  taskList: `- [x] Completed task
- [ ] Pending task
- [ ] Another pending task`,

  footnote: `Here is a sentence with a footnote[^1].

[^1]: This is the footnote content.`,

  highlight: `This is ==highlighted== text.`,
};

/**
 * Run all test cases programmatically
 */
export function runMarkdownTests(
  insertFn: (markdown: string) => void,
): void {
  console.log('=== Running AI Markdown Test Cases ===\n');

  for (const [name, markdown] of Object.entries(AI_MARKDOWN_TEST_CASES)) {
    console.log(`Testing: ${name}`);
    console.log('Input:', markdown.substring(0, 50) + '...');
    try {
      insertFn(markdown);
      console.log('Result: SUCCESS\n');
    } catch (error) {
      console.log('Result: FAILED -', error);
    }
  }
}
