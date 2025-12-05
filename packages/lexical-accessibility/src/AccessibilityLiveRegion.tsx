/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

interface AccessibilityLiveRegionProps {
  announcement: string;
}

/**
 * ARIA live region component for screen reader announcements.
 * Visually hidden but accessible to screen readers.
 */
export function AccessibilityLiveRegion({
  announcement,
}: AccessibilityLiveRegionProps): JSX.Element {
  return (
    <div
      role="status"
      aria-live="assertive"
      aria-atomic="true"
      style={{
        height: '1px',
        left: '-10000px',
        overflow: 'hidden',
        position: 'absolute',
        width: '1px',
      }}>
      {announcement}
    </div>
  );
}
