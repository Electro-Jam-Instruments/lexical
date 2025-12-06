/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import {$isCodeNode} from '@lexical/code';
import {$isListItemNode} from '@lexical/list';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  INDENT_CONTENT_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_TAB_COMMAND,
  LexicalNode,
  OUTDENT_CONTENT_COMMAND,
  PASTE_COMMAND,
  SELECTION_CHANGE_COMMAND,
  TextNode,
} from 'lexical';
import {useEffect, useMemo, useRef} from 'react';

import {AccessibilityLiveRegion} from './AccessibilityLiveRegion';
import {
  $createAccessibleTextNode,
  AccessibleTextNode,
} from './AccessibleTextNode';
import {
  generateFormatAnnouncement,
  generateIndentAnnouncement,
} from './announcementGenerator';
import {$insertMarkdownAtSelection} from './markdownUtils';
import {AccessibilityPluginProps, DEFAULT_CONFIG} from './types';
import {useAnnounce} from './useAnnouncementQueue';
import {nodeConfigs, useNodeRegistry} from './useNodeRegistry';

// Text format flags from Lexical
const IS_BOLD = 1;
const IS_ITALIC = 1 << 1; // 2
const IS_STRIKETHROUGH = 1 << 2; // 4
const IS_UNDERLINE = 1 << 3; // 8
const IS_CODE = 1 << 4; // 16

/**
 * AccessibilityPlugin provides screen reader announcements for markdown
 * transformations and editor operations in Lexical.
 *
 * Architecture:
 * - Node creation/deletion announcements are handled by the Node Registry pattern
 * - Each node type has a config in nodeConfigs/ that defines its announcements
 * - Format changes (bold, italic, etc.) are handled separately via update listener
 * - Indent/outdent operations are handled via command listeners
 *
 * @example
 * ```tsx
 * <LexicalComposer initialConfig={config}>
 *   <RichTextPlugin />
 *   <AccessibilityPlugin config={{ verbosity: 'standard' }} />
 * </LexicalComposer>
 * ```
 */
export function AccessibilityPlugin({
  config = {},
}: AccessibilityPluginProps): JSX.Element {
  const [editor] = useLexicalComposerContext();

  const mergedConfig = useMemo(
    () => ({...DEFAULT_CONFIG, ...config}),
    [config],
  );

  const {currentAnnouncement, announce} = useAnnounce();

  const previousFormatsRef = useRef(new Map<string, number>());
  const isIndentOperationRef = useRef(false);
  const isEnterOnEmptyRef = useRef(false);
  const wasInCodeBlockRef = useRef(false);
  const wasInInlineCodeRef = useRef(false);

  useNodeRegistry({
    announce,
    configs: mergedConfig.announceStructural ? nodeConfigs : [],
    editor,
    enabled: mergedConfig.enabled,
    isEnterOnEmptyRef,
    isIndentOperationRef,
    verbosity: mergedConfig.verbosity,
  });

  // CSS-based formatting: Transform TextNodes into AccessibleTextNodes
  // This prevents DOM node replacement for bold/italic/underline/strikethrough,
  // eliminating "selected/unselected" announcements from screen readers
  //
  // NOTE: Users must add AccessibleTextNode to their editor config nodes array:
  // nodes: [AccessibleTextNode, ...]
  // Or use the replace pattern:
  // nodes: [{ replace: TextNode, with: () => new AccessibleTextNode('') }, ...]
  useEffect(() => {
    if (!mergedConfig.enabled || !mergedConfig.useCSSFormatting) {
      return;
    }

    // Check if AccessibleTextNode is registered
    if (!editor.hasNode(AccessibleTextNode)) {
      if (__DEV__) {
        console.warn(
          'AccessibilityPlugin: useCSSFormatting is enabled but AccessibleTextNode is not registered. ' +
            'Add AccessibleTextNode to your editor config nodes array for CSS-based formatting to work.',
        );
      }
      return;
    }

    // Transform regular TextNodes into AccessibleTextNodes
    const unregisterTransform = editor.registerNodeTransform(
      TextNode,
      (node) => {
        // Only transform base TextNode, not subclasses (including AccessibleTextNode)
        if (node.getType() === 'text') {
          const accessibleNode = $createAccessibleTextNode(
            node.getTextContent(),
          );
          accessibleNode.setFormat(node.getFormat());
          accessibleNode.setDetail(node.getDetail());
          accessibleNode.setMode(node.getMode());
          accessibleNode.setStyle(node.getStyle());
          node.replace(accessibleNode);
        }
      },
    );

    return () => {
      unregisterTransform();
    };
  }, [editor, mergedConfig.enabled, mergedConfig.useCSSFormatting]);

  useEffect(() => {
    if (!mergedConfig.enabled) {
      return;
    }

    const previousFormats = previousFormatsRef.current;

    // Initialize code block and inline code state on mount
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const anchorNode = selection.anchor.getNode();

        // Check for code block
        let node: LexicalNode | null = anchorNode;
        while (node !== null) {
          if ($isCodeNode(node)) {
            wasInCodeBlockRef.current = true;
            break;
          }
          node = node.getParent();
        }
        if (node === null) {
          wasInCodeBlockRef.current = false;
        }

        // Check for inline code
        if ($isTextNode(anchorNode)) {
          wasInInlineCodeRef.current = (anchorNode.getFormat() & IS_CODE) !== 0;
        } else {
          wasInInlineCodeRef.current = false;
        }
      } else {
        wasInCodeBlockRef.current = false;
        wasInInlineCodeRef.current = false;
      }
    });

    const $getSelectedListItemLevel = (): number | undefined => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        return undefined;
      }

      const anchorNode = selection.anchor.getNode();
      let node: ReturnType<typeof anchorNode.getParent> | typeof anchorNode =
        anchorNode;
      while (node !== null) {
        if ($isListItemNode(node)) {
          return node.getIndent();
        }
        node = node.getParent();
      }
      return undefined;
    };

    const $isInsideCodeBlock = (): boolean => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        return false;
      }

      const anchorNode = selection.anchor.getNode();
      let node: LexicalNode | null = anchorNode;
      while (node !== null) {
        if ($isCodeNode(node)) {
          return true;
        }
        node = node.getParent();
      }
      return false;
    };

    const $isInsideInlineCode = (): boolean => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        return false;
      }

      const anchorNode = selection.anchor.getNode();
      if (!$isTextNode(anchorNode)) {
        return false;
      }

      // Check if the text node has the code format flag
      return (anchorNode.getFormat() & IS_CODE) !== 0;
    };

    const unregisterBackspace = editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      () => false,
      COMMAND_PRIORITY_LOW,
    );

    const unregisterEnter = editor.registerCommand(
      KEY_ENTER_COMMAND,
      () => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const anchorNode = selection.anchor.getNode();

          // Check if we're inside a code block
          if ($isInsideCodeBlock()) {
            // Count current line number by counting line breaks before cursor
            let codeNode: LexicalNode | null = anchorNode;
            while (codeNode !== null && !$isCodeNode(codeNode)) {
              codeNode = codeNode.getParent();
            }

            if (codeNode && $isCodeNode(codeNode)) {
              const children = codeNode.getChildren();
              let lineNumber = 1;

              for (const child of children) {
                if (child.getKey() === anchorNode.getKey()) {
                  break;
                }
                // Count line breaks to determine current line
                if (child.getType() === 'linebreak') {
                  lineNumber++;
                }
              }

              // After Enter, we'll be on the next line (which is blank)
              const newLineNumber = lineNumber + 1;
              setTimeout(() => {
                // Only announce if we're still in a code block
                // (Enter at end of code block exits, handled by update listener)
                editor.getEditorState().read(() => {
                  if ($isInsideCodeBlock()) {
                    // Announce based on verbosity level
                    if (mergedConfig.verbosity === 'minimal') {
                      announce('Blank');
                    } else {
                      // default and verbose
                      announce(`Blank, line ${newLineNumber}`);
                    }
                  }
                });
              }, 10);
            }
            return false;
          }

          // Handle list items
          let listItemNode:
            | ReturnType<typeof anchorNode.getParent>
            | typeof anchorNode = anchorNode;
          while (listItemNode !== null && !$isListItemNode(listItemNode)) {
            listItemNode = listItemNode.getParent();
          }

          if (listItemNode && $isListItemNode(listItemNode)) {
            const textContent = listItemNode.getTextContent().trim();
            const isEmpty = textContent.length === 0;
            const indentLevel = listItemNode.getIndent();

            if (isEmpty && indentLevel > 0) {
              isEnterOnEmptyRef.current = true;
              setTimeout(() => {
                isEnterOnEmptyRef.current = false;
              }, 50);
            }
          }
        }

        return false;
      },
      COMMAND_PRIORITY_LOW,
    );

    const unregisterTab = editor.registerCommand(
      KEY_TAB_COMMAND,
      () => false,
      COMMAND_PRIORITY_LOW,
    );

    const unregisterIndent = editor.registerCommand(
      INDENT_CONTENT_COMMAND,
      () => {
        isIndentOperationRef.current = true;

        const currentLevel = $getSelectedListItemLevel();
        const newLevel =
          currentLevel !== undefined ? currentLevel + 1 : undefined;

        setTimeout(() => {
          isIndentOperationRef.current = false;
        }, 50);

        if (mergedConfig.announceStructural) {
          const message = generateIndentAnnouncement(
            'indent',
            mergedConfig.verbosity,
            newLevel,
          );
          announce(message);
        }
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );

    const unregisterOutdent = editor.registerCommand(
      OUTDENT_CONTENT_COMMAND,
      () => {
        isIndentOperationRef.current = true;

        const currentLevel = $getSelectedListItemLevel();
        const newLevel =
          currentLevel !== undefined
            ? Math.max(0, currentLevel - 1)
            : undefined;

        setTimeout(() => {
          isIndentOperationRef.current = false;
        }, 50);

        if (mergedConfig.announceStructural) {
          const message = generateIndentAnnouncement(
            'outdent',
            mergedConfig.verbosity,
            newLevel,
          );
          announce(message);
        }
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );

    // ACCESSIBILITY FIX: Intercept INSERT_PARAGRAPH_COMMAND for empty nested list items
    // and dispatch OUTDENT_CONTENT_COMMAND instead. This makes Enter behave like Backspace
    // (updating nodes instead of creating/destroying), preventing NVDA from announcing "out of list".
    const unregisterInsertParagraph = editor.registerCommand(
      INSERT_PARAGRAPH_COMMAND,
      () => {
        const selection = $getSelection();
        if ($isRangeSelection(selection) && selection.isCollapsed()) {
          const anchorNode = selection.anchor.getNode();

          let listItemNode:
            | ReturnType<typeof anchorNode.getParent>
            | typeof anchorNode = anchorNode;
          while (listItemNode !== null && !$isListItemNode(listItemNode)) {
            listItemNode = listItemNode.getParent();
          }

          if (listItemNode && $isListItemNode(listItemNode)) {
            const childrenSize = listItemNode.getChildrenSize();
            const textContent = listItemNode.getTextContent().trim();
            const isEmpty = childrenSize === 0 || textContent.length === 0;
            const indent = listItemNode.getIndent();

            if (isEmpty && indent > 0) {
              editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
              return true;
            }
          }
        }
        return false;
      },
      COMMAND_PRIORITY_HIGH,
    );

    // SELECTION_CHANGE_COMMAND - not used for code block tracking
    // because it doesn't fire reliably inside code blocks
    // Keeping registration but empty - code block tracking is in update listener
    const unregisterSelectionChange = editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );

    // Smart Paste as Markdown
    // - Ctrl+Shift+V always parses as markdown (explicit override)
    // - Normal Ctrl+V uses smart detection:
    //   - If HTML has rich formatting (strong, em, h1, etc.) → use default paste
    //   - If HTML is just structural (div, span, p) → parse as markdown
    //   - If no HTML → parse as markdown
    const hasRichFormatting = (html: string): boolean => {
      // Tags that indicate actual formatting worth preserving
      const richPatterns = [
        /<(strong|b|em|i|u|s|strike|del|mark)\b/i, // Text formatting
        /<(h[1-6])\b/i, // Headings
        /<(ul|ol|li)\b/i, // Lists
        /<(pre|code)\b/i, // Code
        /<(blockquote)\b/i, // Quotes
        /<a\s+href/i, // Links with href
      ];
      return richPatterns.some((p) => p.test(html));
    };

    const unregisterPaste = editor.registerCommand(
      PASTE_COMMAND,
      (event: ClipboardEvent) => {
        const clipboardData = event.clipboardData;
        if (!clipboardData) {
          return false;
        }

        const plainText = clipboardData.getData('text/plain');
        if (!plainText) {
          return false;
        }

        const htmlText = clipboardData.getData('text/html');

        // Ctrl+Shift+V: Always parse as markdown (explicit override)
        if (event.shiftKey) {
          event.preventDefault();
          editor.update(() => {
            $insertMarkdownAtSelection(plainText);
          });
          return true;
        }

        // Smart detection for normal Ctrl+V:
        // If no HTML or HTML has no rich formatting → parse as markdown
        if (!htmlText || !hasRichFormatting(htmlText)) {
          event.preventDefault();
          editor.update(() => {
            $insertMarkdownAtSelection(plainText);
          });
          return true;
        }

        // HTML has rich formatting → let default handler use it
        return false;
      },
      COMMAND_PRIORITY_CRITICAL, // Higher priority than default paste handler
    );

    const unregisterUpdate = editor.registerUpdateListener(
      ({editorState, dirtyLeaves}) => {
        // Track code block and inline code enter/exit via update listener
        // SELECTION_CHANGE_COMMAND doesn't fire reliably inside code blocks
        editorState.read(() => {
          if (mergedConfig.announceStructural) {
            // Track code block transitions
            const isInCodeBlock = $isInsideCodeBlock();
            const wasInCodeBlock = wasInCodeBlockRef.current;

            // Announce code block transitions
            if (wasInCodeBlock && !isInCodeBlock) {
              announce('Code block exited');
            } else if (!wasInCodeBlock && isInCodeBlock) {
              announce('Code block entered');
            }

            wasInCodeBlockRef.current = isInCodeBlock;

            // Track inline code transitions (only when not in code block)
            // Inline code detection is based on the IS_CODE format flag on TextNode
            if (!isInCodeBlock) {
              const isInInlineCode = $isInsideInlineCode();
              const wasInInlineCode = wasInInlineCodeRef.current;

              // Announce inline code transitions with verbosity awareness
              if (wasInInlineCode && !isInInlineCode) {
                // Exiting inline code
                if (mergedConfig.verbosity === 'verbose') {
                  announce('Exiting code');
                } else if (mergedConfig.verbosity === 'standard') {
                  announce('End code');
                }
                // minimal: no announcement
              } else if (!wasInInlineCode && isInInlineCode) {
                // Entering inline code
                if (mergedConfig.verbosity === 'verbose') {
                  announce('Entering code');
                } else if (mergedConfig.verbosity === 'standard') {
                  announce('Code');
                }
                // minimal: no announcement
              }

              wasInInlineCodeRef.current = isInInlineCode;
            } else {
              // Reset inline code state when inside code block
              wasInInlineCodeRef.current = false;
            }
          }
        });

        if (!mergedConfig.announceFormats) {
          return;
        }

        editorState.read(() => {
          dirtyLeaves.forEach((leafKey) => {
            const node = $getNodeByKey(leafKey);
            if (!node || !$isTextNode(node)) {
              return;
            }

            const key = node.getKey();
            const currentFormat = node.getFormat();
            const previousFormat = previousFormats.get(key) || 0;

            const addedFormats = currentFormat & ~previousFormat;
            const removedFormats = previousFormat & ~currentFormat;

            const textContent = node.getTextContent();

            if (addedFormats & IS_BOLD) {
              announce(
                generateFormatAnnouncement(
                  'bold',
                  true,
                  mergedConfig.verbosity,
                  textContent,
                ),
              );
            }
            if (addedFormats & IS_ITALIC) {
              announce(
                generateFormatAnnouncement(
                  'italic',
                  true,
                  mergedConfig.verbosity,
                  textContent,
                ),
              );
            }
            if (addedFormats & IS_CODE) {
              announce(
                generateFormatAnnouncement(
                  'code',
                  true,
                  mergedConfig.verbosity,
                  textContent,
                ),
              );
            }
            if (addedFormats & IS_UNDERLINE) {
              announce(
                generateFormatAnnouncement(
                  'underline',
                  true,
                  mergedConfig.verbosity,
                  textContent,
                ),
              );
            }
            if (addedFormats & IS_STRIKETHROUGH) {
              announce(
                generateFormatAnnouncement(
                  'strikethrough',
                  true,
                  mergedConfig.verbosity,
                  textContent,
                ),
              );
            }

            if (removedFormats & IS_BOLD) {
              announce(
                generateFormatAnnouncement(
                  'bold',
                  false,
                  mergedConfig.verbosity,
                  textContent,
                ),
              );
            }
            if (removedFormats & IS_ITALIC) {
              announce(
                generateFormatAnnouncement(
                  'italic',
                  false,
                  mergedConfig.verbosity,
                  textContent,
                ),
              );
            }
            if (removedFormats & IS_CODE) {
              announce(
                generateFormatAnnouncement(
                  'code',
                  false,
                  mergedConfig.verbosity,
                  textContent,
                ),
              );
            }
            if (removedFormats & IS_UNDERLINE) {
              announce(
                generateFormatAnnouncement(
                  'underline',
                  false,
                  mergedConfig.verbosity,
                  textContent,
                ),
              );
            }
            if (removedFormats & IS_STRIKETHROUGH) {
              announce(
                generateFormatAnnouncement(
                  'strikethrough',
                  false,
                  mergedConfig.verbosity,
                  textContent,
                ),
              );
            }

            previousFormats.set(key, currentFormat);
          });
        });
      },
    );

    return () => {
      unregisterBackspace();
      unregisterEnter();
      unregisterTab();
      unregisterIndent();
      unregisterOutdent();
      unregisterInsertParagraph();
      unregisterSelectionChange();
      unregisterPaste();
      unregisterUpdate();
    };
  }, [editor, mergedConfig, announce]);

  return <AccessibilityLiveRegion announcement={currentAnnouncement} />;
}
