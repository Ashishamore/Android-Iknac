import type { Transition } from 'motion/react'

/** Smooth deceleration used for screen-level transitions. */
export const EASE_SCREEN = [0.32, 0.72, 0, 1] as const
export const EASE_OUT = [0.22, 1, 0.36, 1] as const
export const EASE_EMPHASIZED = [0.2, 0, 0, 1] as const

export const T = {
  /** Screen pushed onto the stack. */
  push: { type: 'tween', ease: EASE_SCREEN, duration: 0.42 },
  /** Screen popped off the stack. */
  pop: { type: 'tween', ease: EASE_SCREEN, duration: 0.34 },
  fast: { type: 'tween', ease: EASE_OUT, duration: 0.18 },
  base: { type: 'tween', ease: EASE_OUT, duration: 0.28 },
  /** Bottom sheets. */
  sheet: { type: 'spring', stiffness: 420, damping: 40, mass: 0.9 },
  /** Small UI elements: indicators, thumbs, pills. */
  snappy: { type: 'spring', stiffness: 560, damping: 38 },
  /** Dialogs and popovers. */
  pop_in: { type: 'spring', stiffness: 520, damping: 34, mass: 0.8 },
} satisfies Record<string, Transition>
