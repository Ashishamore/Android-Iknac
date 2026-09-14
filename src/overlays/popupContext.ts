import type { Icon } from '@phosphor-icons/react'
import { createContext, useContext, type ReactNode } from 'react'
import type { Tone } from '@/lib/tones'

export interface ToastOptions {
  tone?: 'default' | 'success' | 'error' | 'info'
  icon?: Icon
  action?: { label: string; onClick: () => void }
  /** ms, default 2800 */
  duration?: number
}

export interface ConfirmOptions {
  title: ReactNode
  message?: ReactNode
  confirmText?: string
  cancelText?: string
  tone?: 'brand' | 'danger'
  icon?: Icon
}

export interface AlertOptions {
  title: ReactNode
  message?: ReactNode
  buttonText?: string
  tone?: Tone
  icon?: Icon
}

export interface ActionSheetOption<T extends string = string> {
  id: T
  label: string
  description?: string
  icon?: Icon
  destructive?: boolean
}

export interface ActionSheetOptions<T extends string> {
  title?: ReactNode
  description?: ReactNode
  options: ActionSheetOption<T>[]
  cancelText?: string
}

export interface PopupApi {
  /** Snackbar at the bottom of the screen. */
  toast(message: ReactNode, options?: ToastOptions): void
  /** Resolves true if the user confirms. */
  confirm(options: ConfirmOptions): Promise<boolean>
  alert(options: AlertOptions): Promise<void>
  /** Resolves with the chosen option id, or null if dismissed. */
  actionSheet<T extends string>(options: ActionSheetOptions<T>): Promise<T | null>
  /** Blocking loader. Returns a function that hides it. */
  loading(message?: string): () => void
}

export const PopupContext = createContext<PopupApi | null>(null)

/** Imperative popups: `const popup = usePopup(); if (await popup.confirm({...})) …` */
export function usePopup(): PopupApi {
  const api = useContext(PopupContext)
  if (!api) throw new Error('usePopup must be used inside <PopupProvider>')
  return api
}
