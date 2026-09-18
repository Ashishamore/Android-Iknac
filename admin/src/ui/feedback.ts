/**
 * Toasts and promise-based confirm dialogs, callable from anywhere:
 *   toast('Saved', { tone: 'success', action: { label: 'Undo', onClick } })
 *   if (await confirm({ title: 'Release ₹900?' })) …
 */
import type { Icon } from '@phosphor-icons/react'
import { create } from 'zustand'

export type ToastTone = 'neutral' | 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  text: string
  tone: ToastTone
  action?: { label: string; onClick: () => void }
}

export interface ConfirmOptions {
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  tone?: 'default' | 'danger'
  icon?: Icon
}

interface FeedbackState {
  toasts: ToastItem[]
  confirm: (ConfirmOptions & { resolve: (ok: boolean) => void }) | null
  busy: string | null
}

export const useFeedback = create<FeedbackState>()(() => ({ toasts: [], confirm: null, busy: null }))

let seq = 0

export function toast(text: string, opts: { tone?: ToastTone; action?: ToastItem['action']; duration?: number } = {}) {
  const id = ++seq
  useFeedback.setState((s) => ({ toasts: [...s.toasts.slice(-3), { id, text, tone: opts.tone ?? 'neutral', action: opts.action }] }))
  setTimeout(() => dismissToast(id), opts.duration ?? (opts.action ? 6000 : 4000))
}

export const dismissToast = (id: number) => useFeedback.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))

export function confirm(options: ConfirmOptions) {
  return new Promise<boolean>((resolve) => {
    useFeedback.setState({ confirm: { ...options, resolve } })
  })
}

export function closeConfirm(ok: boolean) {
  const c = useFeedback.getState().confirm
  useFeedback.setState({ confirm: null })
  c?.resolve(ok)
}

/** Shows a blocking "working…" overlay. Returns a function that hides it. */
export function busy(text: string) {
  useFeedback.setState({ busy: text })
  return () => useFeedback.setState({ busy: null })
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
