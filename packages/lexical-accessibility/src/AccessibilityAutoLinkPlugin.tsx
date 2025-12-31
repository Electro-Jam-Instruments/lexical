/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {AccessibilityConfig} from './types';

import {AutoLinkPlugin} from '@lexical/react/LexicalAutoLinkPlugin';
import * as React from 'react';
import {useCallback, useRef} from 'react';

import {AccessibilityLiveRegion} from './AccessibilityLiveRegion';
import {generateLinkAnnouncement} from './announcementGenerator';

/**
 * URL regex pattern that matches:
 * - http:// or https:// URLs
 * - www. URLs (will be prefixed with https://)
 */
const URL_REGEX =
  /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

/**
 * Email regex pattern
 */
const EMAIL_REGEX =
  /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;

/**
 * Type for link matcher results
 */
export interface LinkMatcherResult {
  index: number;
  length: number;
  text: string;
  url: string;
  attributes?: {
    rel?: string;
    target?: string;
  };
}

/**
 * Type for link matcher functions
 */
export type LinkMatcher = (text: string) => LinkMatcherResult | null;

/**
 * Creates a URL matcher function
 */
function createUrlMatcher(): LinkMatcher {
  return (text: string): LinkMatcherResult | null => {
    const match = URL_REGEX.exec(text);
    if (match === null) {
      return null;
    }
    const fullMatch = match[0];
    return {
      index: match.index,
      length: fullMatch.length,
      text: fullMatch,
      url: fullMatch.startsWith('http') ? fullMatch : `https://${fullMatch}`,
    };
  };
}

/**
 * Creates an email matcher function
 */
function createEmailMatcher(): LinkMatcher {
  return (text: string): LinkMatcherResult | null => {
    const match = EMAIL_REGEX.exec(text);
    if (match === null) {
      return null;
    }
    const fullMatch = match[0];
    return {
      index: match.index,
      length: fullMatch.length,
      text: fullMatch,
      url: `mailto:${fullMatch}`,
    };
  };
}

/**
 * Default matchers for URLs and emails
 */
export const DEFAULT_LINK_MATCHERS: LinkMatcher[] = [
  createUrlMatcher(),
  createEmailMatcher(),
];

export interface AccessibilityAutoLinkPluginProps {
  /**
   * Custom matchers to use. Defaults to URL and email matchers.
   */
  matchers?: LinkMatcher[];
  /**
   * Verbosity level for announcements. Defaults to 'standard'.
   */
  verbosity?: AccessibilityConfig['verbosity'];
  /**
   * Whether to announce link changes. Defaults to true.
   */
  announceLinks?: boolean;
}

/**
 * Pre-configured AutoLink plugin for accessibility.
 *
 * Automatically converts bare URLs and email addresses into links.
 * Works with pasted content and typed text.
 * Announces link creation and removal to screen readers.
 *
 * @example
 * ```tsx
 * import { AccessibilityAutoLinkPlugin } from '@lexical/accessibility';
 *
 * // Use with default URL and email matchers
 * <AccessibilityAutoLinkPlugin />
 *
 * // Or provide custom matchers
 * <AccessibilityAutoLinkPlugin matchers={myCustomMatchers} />
 *
 * // Control verbosity
 * <AccessibilityAutoLinkPlugin verbosity="verbose" />
 * ```
 */
export function AccessibilityAutoLinkPlugin({
  matchers = DEFAULT_LINK_MATCHERS,
  verbosity = 'standard',
  announceLinks = true,
}: AccessibilityAutoLinkPluginProps): React.ReactElement {
  const [announcement, setAnnouncement] = React.useState<string>('');
  const lastAnnouncementRef = useRef<string>('');

  const handleChange = useCallback(
    (url: string | null, prevUrl: string | null) => {
      if (!announceLinks) {
        return;
      }

      let message: string | null = null;

      if (url !== null && prevUrl === null) {
        // Link created
        message = generateLinkAnnouncement(true, verbosity, url);
      } else if (url === null && prevUrl !== null) {
        // Link removed
        message = generateLinkAnnouncement(false, verbosity, prevUrl);
      }
      // If both are non-null, it's a URL change - we could announce that too
      // but for now we'll skip it as it's less common

      if (message) {
        // Force re-announcement if same message
        if (message === lastAnnouncementRef.current) {
          setAnnouncement('');
          requestAnimationFrame(() => {
            setAnnouncement(message);
          });
        } else {
          setAnnouncement(message);
        }
        lastAnnouncementRef.current = message;
      }
    },
    [announceLinks, verbosity],
  );

  return (
    <>
      <AutoLinkPlugin matchers={matchers} onChange={handleChange} />
      {announceLinks && <AccessibilityLiveRegion announcement={announcement} />}
    </>
  );
}
