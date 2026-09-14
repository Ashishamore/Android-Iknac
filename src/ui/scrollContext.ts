import { motionValue, type MotionValue } from 'motion/react'
import { createContext, useContext } from 'react'

/** Scroll position of the enclosing <Screen>, for scroll-linked effects. */
export const ScrollYContext = createContext<MotionValue<number>>(motionValue(0))

export const useScrollY = () => useContext(ScrollYContext)
