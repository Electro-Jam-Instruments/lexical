/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useCallback, useRef, useState} from 'react';

/**
 * Hook for announcing to screen readers
 * Clears then sets content to force re-announcement of identical messages
 */
export function useAnnounce(): {
  currentAnnouncement: string;
  announce: (message: string) => void;
} {
  const [currentAnnouncement, setCurrentAnnouncement] = useState<string>('');
  const lastMessageRef = useRef<string>('');

  const announce = useCallback((message: string) => {
    // If same message, clear first then re-set to force live region update
    if (message === lastMessageRef.current) {
      setCurrentAnnouncement('');
      requestAnimationFrame(() => {
        setCurrentAnnouncement(message);
      });
    } else {
      setCurrentAnnouncement(message);
    }
    lastMessageRef.current = message;
  }, []);

  return {
    announce,
    currentAnnouncement,
  };
}
