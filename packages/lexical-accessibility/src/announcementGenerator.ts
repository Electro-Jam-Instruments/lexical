/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {AccessibilityConfig} from './types';

type Verbosity = NonNullable<AccessibilityConfig['verbosity']>;

/**
 * Generates announcement messages based on transformation type and verbosity level
 */
export function generateHeadingAnnouncement(
  level: string,
  verbosity: Verbosity,
): string {
  // Handle paragraph (level 0 or empty)
  if (!level || level === '0' || level === 'paragraph') {
    switch (verbosity) {
      case 'minimal':
        return 'Paragraph';
      case 'standard':
        return 'Changed to paragraph';
      case 'verbose':
        return 'Changed to paragraph';
      default:
        return 'Changed to paragraph';
    }
  }

  switch (verbosity) {
    case 'minimal':
      return `Heading ${level}`;
    case 'standard':
      return `Heading level ${level}`;
    case 'verbose':
      return `Changed to heading level ${level}`;
    default:
      return `Heading level ${level}`;
  }
}

export function generateListAnnouncement(
  listType: 'bullet' | 'number' | 'check',
  verbosity: Verbosity,
  isNewList: boolean = false,
  isDeleted: boolean = false,
  itemCount?: number,
): string {
  const typeLabels = {
    bullet: 'Bulleted',
    check: 'Checklist',
    number: 'Numbered',
  };

  const label = typeLabels[listType] || 'List';

  if (isDeleted) {
    switch (verbosity) {
      case 'minimal':
        return 'List removed';
      case 'standard':
        return 'List removed';
      case 'verbose':
        return 'Removed list formatting';
      default:
        return 'List removed';
    }
  }

  if (isNewList) {
    const countText = itemCount !== undefined ? `, ${itemCount} items` : '';
    switch (verbosity) {
      case 'minimal':
        return label;
      case 'standard':
        return `${label} list${countText}`;
      case 'verbose':
        return itemCount !== undefined
          ? `Created ${label.toLowerCase()} list with ${itemCount} items`
          : `Created ${label.toLowerCase()} list`;
      default:
        return `${label} list${countText}`;
    }
  }

  switch (verbosity) {
    case 'minimal':
      return label;
    case 'standard':
      return `${label} list item`;
    case 'verbose':
      return `Created ${label.toLowerCase()} list item`;
    default:
      return `${label} list item`;
  }
}

export function generateIndentAnnouncement(
  direction: 'indent' | 'outdent',
  verbosity: Verbosity,
  level?: number,
): string {
  const action = direction === 'indent' ? 'Indented' : 'Outdented';

  // Level is 0-based from getIndent(), add 1 for human-readable
  const displayLevel = level !== undefined ? level + 1 : undefined;

  switch (verbosity) {
    case 'minimal':
      return action;
    case 'standard':
      return displayLevel !== undefined ? `${action} ${displayLevel}` : action;
    case 'verbose':
      return displayLevel !== undefined
        ? `${action} to level ${displayLevel}`
        : action;
    default:
      return displayLevel !== undefined ? `${action} ${displayLevel}` : action;
  }
}

export function generateFormatAnnouncement(
  format: string,
  applied: boolean,
  verbosity: Verbosity,
  text?: string,
): string {
  // Word count thresholds by verbosity level
  const wordThresholds: Record<Verbosity, number> = {
    minimal: 12,
    standard: 3,
    verbose: 10,
  };
  const wordThreshold = wordThresholds[verbosity] || 3;

  // Format verbs by verbosity
  const formatVerbs: Record<
    string,
    {
      applied: {minimal: string; standard: string; verbose: string};
      removed: {minimal: string; standard: string; verbose: string};
    }
  > = {
    bold: {
      applied: {
        minimal: 'Bold',
        standard: 'Bolded',
        verbose: 'Bolded selected text:',
      },
      removed: {
        minimal: 'Unbold',
        standard: 'Removed bold',
        verbose: 'Removed bold formatting from:',
      },
    },
    code: {
      applied: {minimal: 'Code', standard: 'Code', verbose: 'Code formatted'},
      removed: {
        minimal: 'Code removed',
        standard: 'Removed code',
        verbose: 'Removed code formatting from:',
      },
    },
    italic: {
      applied: {
        minimal: 'Italic',
        standard: 'Italicized',
        verbose: 'Italicized selected text:',
      },
      removed: {
        minimal: 'Unitalic',
        standard: 'Removed italic',
        verbose: 'Removed italic formatting from:',
      },
    },
    strikethrough: {
      applied: {
        minimal: 'Strikethrough',
        standard: 'Strikethrough',
        verbose: 'Strikethrough applied to:',
      },
      removed: {
        minimal: 'Unstrikethrough',
        standard: 'Removed strikethrough',
        verbose: 'Removed strikethrough from:',
      },
    },
    underline: {
      applied: {
        minimal: 'Underline',
        standard: 'Underlined',
        verbose: 'Underlined text:',
      },
      removed: {
        minimal: 'Ununderline',
        standard: 'Removed underline',
        verbose: 'Removed underline from:',
      },
    },
  };

  const verbs = formatVerbs[format] || {
    applied: {
      minimal: format,
      standard: `${format} applied`,
      verbose: `${format} applied to:`,
    },
    removed: {
      minimal: `Un${format}`,
      standard: `Removed ${format}`,
      verbose: `Removed ${format} from:`,
    },
  };
  const verb = applied ? verbs.applied[verbosity] : verbs.removed[verbosity];

  // If we have text, announce with word count for longer selections
  if (text && text.trim().length > 0) {
    const words = text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    const wordCount = words.length;
    if (wordCount > wordThreshold) {
      return `${verb} ${wordCount} words`;
    }
    return `${verb} ${text.trim()}`;
  }

  // Fallback if no text - just return the verb
  return verb;
}

export function mergeFormatAnnouncements(announcements: string[]): string {
  if (announcements.length === 0) {
    return '';
  }
  if (announcements.length === 1) {
    return announcements[0];
  }

  // Join with "and" for the last item
  const allButLast = announcements.slice(0, -1);
  const last = announcements[announcements.length - 1];

  return `${allButLast.join(', ')} and ${last}`;
}

/**
 * Generates announcement for link creation/removal
 */
export function generateLinkAnnouncement(
  created: boolean,
  verbosity: Verbosity,
  url?: string,
): string {
  // Extract domain or readable portion from URL for verbose announcements
  const getReadableUrl = (fullUrl: string): string => {
    try {
      // Handle mailto: links
      if (fullUrl.startsWith('mailto:')) {
        return fullUrl.replace('mailto:', '');
      }
      // Extract domain from URL
      const urlObj = new URL(fullUrl);
      return urlObj.hostname.replace(/^www\./, '');
    } catch {
      // If URL parsing fails, return as-is but truncate if too long
      return fullUrl.length > 30 ? fullUrl.substring(0, 30) + '...' : fullUrl;
    }
  };

  if (created) {
    switch (verbosity) {
      case 'minimal':
        return 'Link';
      case 'standard':
        return 'Linked';
      case 'verbose':
        return url ? `Linked: ${getReadableUrl(url)}` : 'Linked';
      default:
        return 'Linked';
    }
  } else {
    switch (verbosity) {
      case 'minimal':
        return 'Unlink';
      case 'standard':
        return 'Removed link';
      case 'verbose':
        return url
          ? `Removed link from: ${getReadableUrl(url)}`
          : 'Removed link';
      default:
        return 'Removed link';
    }
  }
}
