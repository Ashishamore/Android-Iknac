export type Tone = 'brand' | 'neutral' | 'success' | 'danger' | 'warning' | 'info'

/** Soft background + coloured foreground (icon tiles, tags, alerts). */
export const TONE_SOFT: Record<Tone, string> = {
  brand: 'bg-accent-soft text-accent-soft-fg',
  neutral: 'bg-surface-2 text-fg-2',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
  info: 'bg-info-soft text-info',
}

/** Solid fill (badges, progress bars, dots). */
export const TONE_SOLID: Record<Tone, string> = {
  brand: 'bg-accent',
  neutral: 'bg-subtle',
  success: 'bg-success',
  danger: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-info',
}
