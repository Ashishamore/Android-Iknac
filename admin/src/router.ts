/**
 * A small history router for the admin panel. Every path is relative to
 * BASE (/Adminpannel), e.g. navigate('/stock/l-rotary').
 */
import { useSyncExternalStore, type MouseEvent } from 'react'
import { ADMIN_BASE } from '@/lib/adminBase'

export const BASE = ADMIN_BASE

interface Location {
  path: string
  search: string
}

let current = read()
const listeners = new Set<() => void>()

function read(): Location {
  let path = window.location.pathname
  if (path.toLowerCase().startsWith(BASE.toLowerCase())) path = path.slice(BASE.length)
  path = path.replace(/\/+$/, '') || '/'
  return { path, search: window.location.search }
}

function emit() {
  current = read()
  listeners.forEach((l) => l())
}

window.addEventListener('popstate', emit)

const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useLocation() {
  return useSyncExternalStore(subscribe, () => current)
}

export const href = (to: string) => `${BASE}${to === '/' ? '/' : to}`

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const url = href(to)
  if (url === `${window.location.pathname}${window.location.search}`) return
  if (opts.replace) window.history.replaceState(null, '', url)
  else window.history.pushState(null, '', url)
  emit()
}

export const back = (fallback: string) => (window.history.length > 1 ? window.history.back() : navigate(fallback, { replace: true }))

/** Matches "/stock/:id" against a path. Returns the params, or null. */
export function match(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean)
  const s = path.split('/').filter(Boolean)
  if (p.length !== s.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(s[i])
    else if (p[i] !== s[i]) return null
  }
  return params
}

export function useQuery() {
  const { search } = useLocation()
  return new URLSearchParams(search)
}

/** For <a href> links: plain clicks navigate in-app, modified clicks open a new tab. */
export function linkProps(to: string) {
  return {
    href: href(to),
    onClick: (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      e.preventDefault()
      navigate(to)
    },
  }
}

/** The phone app's owner paths (/renter/…), e.g. in notifications, mapped to admin paths. */
export function fromOwnerPath(path: string) {
  return path.replace(/^\/renter/, '') || '/today'
}
