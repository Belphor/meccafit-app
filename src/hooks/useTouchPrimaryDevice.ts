"use client";

import { useEffect, useState } from "react";

/** Celular / touch primário — independente de largura (landscape, Pro Max, etc.). */
const TOUCH_PRIMARY_MEDIA = "(hover: none) and (pointer: coarse)";
const TOUCH_COARSE_MEDIA = "(pointer: coarse)";
const NARROW_TOUCH_MEDIA = "(max-width: 1023px)";

export function detectTouchPrimaryDevice(): boolean {
  if (typeof window === "undefined") return false;

  if (window.matchMedia(TOUCH_PRIMARY_MEDIA).matches) return true;

  const coarse = window.matchMedia(TOUCH_COARSE_MEDIA).matches;
  const narrow = window.matchMedia(NARROW_TOUCH_MEDIA).matches;
  const hasTouchPoints = navigator.maxTouchPoints > 0;

  return coarse && (narrow || hasTouchPoints);
}

export function useTouchPrimaryDevice(): boolean {
  const [isTouchPrimary, setIsTouchPrimary] = useState(false);

  useEffect(() => {
    const media = [
      window.matchMedia(TOUCH_PRIMARY_MEDIA),
      window.matchMedia(TOUCH_COARSE_MEDIA),
      window.matchMedia(NARROW_TOUCH_MEDIA),
    ];

    const sync = () => setIsTouchPrimary(detectTouchPrimaryDevice());
    sync();

    for (const query of media) {
      query.addEventListener("change", sync);
    }
    window.addEventListener("orientationchange", sync);

    return () => {
      for (const query of media) {
        query.removeEventListener("change", sync);
      }
      window.removeEventListener("orientationchange", sync);
    };
  }, []);

  return isTouchPrimary;
}
