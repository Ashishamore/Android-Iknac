/**
 * Native-style navigation stack, kept in sync with browser history so the
 * Android back button / gesture (and the browser back button) behave like a
 * real app:
 *
 *   back → closes the top popup → pops the top screen → returns to Home tab
 *
 * Every "back-able" layer (non-home tab, pushed screen, open popup) owns one
 * history entry. State changes are applied immediately (so animations start
 * instantly); the matching history operations are queued and run in order.
 */
import type { ComponentType } from 'react'
import type { Icon } from '@phosphor-icons/react'
import type { Flags } from '@/lib/platform'

export type Presentation = 'push' | 'modal' | 'fade'

export interface TabDef {
  id: string
  path: string
  label: string
  icon: Icon
  component: ComponentType
  /** Optional hook returning a badge count shown on the tab. */
  useBadge?: () => number | undefined
  /** Raised centre button (e.g. "Add"). */
  prominent?: boolean
  /** Hidden while a Control Centre feature flag is off (e.g. AI Studio). */
  hidden?: (flags: Flags) => boolean
}

export interface ScreenDef {
  /** Path pattern, e.g. "/projects/:id". */
  path: string
  component: ComponentType
  /** push = slide in from the right (default) · modal = slide up · fade = fade-through */
  presentation?: Presentation
}

/** A complete app: its bottom-nav tabs plus the screens that can be pushed on top. */
export interface AppConfig {
  tabs: TabDef[]
  screens: ScreenDef[]
}

export interface StackEntry {
  key: string
  /** pathname + search */
  path: string
  route: ScreenDef
  params: Record<string, string>
  query: URLSearchParams
  /** In-memory state passed with push() (not restored after a reload). */
  state?: unknown
}

export type NavAction = 'init' | 'push' | 'pop' | 'replace' | 'tab'

export interface NavSnapshot {
  activeTab: string
  stack: StackEntry[]
  action: NavAction
  /** Key of the top-most layer before the last action ("root" = tab host). */
  prevTopKey: string
}

type HistKind = 'root' | 'tab' | 'screen' | 'overlay'
interface HistItem {
  kind: HistKind
  id?: string
}
interface HistState {
  __nav: string
  idx: number
  kind: HistKind
}

export const ROOT_KEY = 'root'
const SESSION = Math.random().toString(36).slice(2, 10)

let tabs: TabDef[] = []
let screens: { def: ScreenDef; parts: string[] }[] = []
let snapshot: NavSnapshot = { activeTab: '', stack: [], action: 'init', prevTopKey: ROOT_KEY }
/** Mirror of the browser history entries owned by the app. hist[0] is the root. */
let hist: HistItem[] = [{ kind: 'root' }]
let seq = 0
const overlays = new Map<string, () => void>()
const listeners = new Set<() => void>()
const reselectListeners = new Set<(tabId: string) => void>()

/* ── History operation queue ─────────────────────────────────────────────── */

const queue: (() => void | Promise<void>)[] = []
let draining = false
let awaitingPop: (() => void) | null = null

function enqueue(op: () => void | Promise<void>) {
  queue.push(op)
  if (!draining) void drain()
}

const idleWaiters: (() => void)[] = []

async function drain() {
  draining = true
  try {
    while (queue.length) await queue.shift()!()
  } finally {
    draining = false
    idleWaiters.splice(0).forEach((resolve) => resolve())
  }
}

/**
 * Resolves once queued history operations have finished. Wait for this before
 * reloading the page — a pending history.back() would cancel the reload.
 */
export function whenHistoryIdle(): Promise<void> {
  if (!draining && !queue.length) return Promise.resolve()
  return new Promise((resolve) => idleWaiters.push(resolve))
}

const stateFor = (idx: number, kind: HistKind): HistState => ({ __nav: SESSION, idx, kind })

function histBack(n: number) {
  if (n <= 0) return
  enqueue(
    () =>
      new Promise<void>((resolve) => {
        const finish = () => {
          window.clearTimeout(timer)
          awaitingPop = null
          resolve()
        }
        const timer = window.setTimeout(finish, 800)
        awaitingPop = finish
        history.go(-n)
      }),
  )
}

function histPush(kind: HistKind, path: string) {
  const idx = hist.length - 1
  enqueue(() => history.pushState(stateFor(idx, kind), '', path))
}

function histReplace(kind: HistKind, path: string) {
  const idx = hist.length - 1
  enqueue(() => history.replaceState(stateFor(idx, kind), '', path))
}

/* ── State helpers ───────────────────────────────────────────────────────── */

interface Draft {
  stack: StackEntry[]
  activeTab: string
}

const draft = (): Draft => ({ stack: snapshot.stack, activeTab: snapshot.activeTab })

export const topKeyOf = (s: NavSnapshot) =>
  s.stack.length ? s.stack[s.stack.length - 1].key : ROOT_KEY

/** Key of the layer the user is looking at (a pushed screen or the active tab). */
export const focusedKeyOf = (s: NavSnapshot) =>
  s.stack.length ? s.stack[s.stack.length - 1].key : `tab:${s.activeTab}`

function commit(d: Draft, action: NavAction) {
  if (d.stack === snapshot.stack && d.activeTab === snapshot.activeTab) return
  snapshot = { stack: d.stack, activeTab: d.activeTab, action, prevTopKey: topKeyOf(snapshot) }
  listeners.forEach((l) => l())
}

/** Undo the top-most history item in the model (not in the browser). */
function unwindOne(d: Draft) {
  if (hist.length <= 1) return
  const item = hist.pop()!
  if (item.kind === 'overlay' && item.id) {
    const close = overlays.get(item.id)
    overlays.delete(item.id)
    close?.()
  } else if (item.kind === 'screen') {
    d.stack = d.stack.slice(0, -1)
  } else if (item.kind === 'tab') {
    d.activeTab = tabs[0].id
  }
}

function unwindWhile(d: Draft, kinds: HistKind[]) {
  let n = 0
  while (hist.length > 1 && kinds.includes(hist[hist.length - 1].kind)) {
    unwindOne(d)
    n++
  }
  return n
}

const split = (p: string) => p.split('/').filter(Boolean)
const samePath = (a: string, b: string) => split(a).join('/') === split(b).join('/')

function createEntry(path: string, state?: unknown): StackEntry | null {
  const url = new URL(path, window.location.origin)
  const segs = split(url.pathname)
  for (const s of screens) {
    if (s.parts.length !== segs.length) continue
    const params: Record<string, string> = {}
    const ok = s.parts.every((p, i) => {
      if (p.startsWith(':')) {
        params[p.slice(1)] = decodeURIComponent(segs[i])
        return true
      }
      return p === segs[i]
    })
    if (ok) {
      return {
        key: `s${++seq}`,
        path: url.pathname + url.search,
        route: s.def,
        params,
        query: url.searchParams,
        state,
      }
    }
  }
  return null
}

function currentPath() {
  const top = snapshot.stack[snapshot.stack.length - 1]
  return top ? top.path : (tabs.find((t) => t.id === snapshot.activeTab)?.path ?? '/')
}

/* ── Browser back / forward ──────────────────────────────────────────────── */

function onPopState(e: PopStateEvent) {
  if (awaitingPop) {
    awaitingPop()
    return
  }
  const st = e.state as HistState | null
  if (!st || st.__nav !== SESSION) {
    // An entry from before this page load — settle on the root.
    const d = draft()
    unwindWhile(d, ['overlay', 'screen', 'tab'])
    commit(d, 'pop')
    history.replaceState(stateFor(0, 'root'), '', tabs[0].path)
    return
  }
  const delta = hist.length - 1 - st.idx
  if (delta > 0) {
    const d = draft()
    for (let i = 0; i < delta; i++) unwindOne(d)
    commit(d, 'pop')
  } else if (delta < 0) {
    // Android has no "forward" — undo it.
    histBack(-delta)
  }
}

/* ── Public API ──────────────────────────────────────────────────────────── */

function applyConfig(config: AppConfig) {
  tabs = config.tabs
  screens = config.screens.map((def) => ({ def, parts: split(def.path) }))
}

/**
 * Where a URL lands in the current app: a tab, or a screen opened on top of
 * Home (so Back from a deep link goes to Home, like a native app).
 */
function landingFor(path: string) {
  const url = new URL(path, window.location.origin)
  const tab = tabs.find((t) => samePath(t.path, url.pathname))
  if (tab) return { activeTab: tab.id, tab: tab.id === tabs[0].id ? null : tab, entry: null }
  return { activeTab: tabs[0].id, tab: null, entry: createEntry(url.pathname + url.search) }
}

/** Start navigation for an app, at `path` (defaults to the current URL). */
export function initNavigation(config: AppConfig, path = window.location.pathname + window.location.search) {
  applyConfig(config)
  const land = landingFor(path)

  hist = [{ kind: 'root' }]
  history.replaceState(stateFor(0, 'root'), '', tabs[0].path)
  if (land.tab) {
    hist.push({ kind: 'tab' })
    history.pushState(stateFor(1, 'tab'), '', land.tab.path)
  } else if (land.entry) {
    hist.push({ kind: 'screen' })
    history.pushState(stateFor(1, 'screen'), '', land.entry.path)
  }
  snapshot = { activeTab: land.activeTab, stack: land.entry ? [land.entry] : [], action: 'init', prevTopKey: ROOT_KEY }
  window.addEventListener('popstate', onPopState)
}

/**
 * Switch to a different app (e.g. after login / logout), optionally landing on
 * `path`. Clears the back stack, so Back can't return into the previous app.
 */
export function resetNavigation(config: AppConfig, path?: string) {
  const depth = hist.length - 1
  applyConfig(config)
  overlays.clear()
  const land = landingFor(path ?? tabs[0].path)

  hist = [{ kind: 'root' }]
  histBack(depth)
  enqueue(() => history.replaceState(stateFor(0, 'root'), '', tabs[0].path))
  if (land.tab) {
    hist.push({ kind: 'tab' })
    histPush('tab', land.tab.path)
  } else if (land.entry) {
    hist.push({ kind: 'screen' })
    histPush('screen', land.entry.path)
  }
  snapshot = { activeTab: land.activeTab, stack: land.entry ? [land.entry] : [], action: 'init', prevTopKey: ROOT_KEY }
  listeners.forEach((l) => l())
}

function warnUnknown(path: string) {
  console.warn(`[nav] No screen is registered for "${path}". Add it to src/app/routes.tsx.`)
}

export const nav = {
  /** Open a screen on top of the current one. */
  push(path: string, opts?: { state?: unknown }) {
    const entry = createEntry(path, opts?.state)
    if (!entry) return warnUnknown(path)
    const d = draft()
    histBack(unwindWhile(d, ['overlay']))
    d.stack = [...d.stack, entry]
    hist.push({ kind: 'screen' })
    histPush('screen', entry.path)
    commit(d, 'push')
  },

  /** Swap the top screen for another (e.g. form → success). */
  replace(path: string, opts?: { state?: unknown }) {
    if (!snapshot.stack.length) return nav.push(path, opts)
    const entry = createEntry(path, opts?.state)
    if (!entry) return warnUnknown(path)
    const d = draft()
    histBack(unwindWhile(d, ['overlay']))
    d.stack = [...d.stack.slice(0, -1), entry]
    histReplace('screen', entry.path)
    commit(d, 'replace')
  },

  /** System back: close the top popup, else pop a screen, else go to the Home tab. */
  back(): boolean {
    if (hist.length <= 1) return false
    const d = draft()
    unwindOne(d)
    histBack(1)
    commit(d, 'pop')
    return true
  },

  /** Pop the top screen (closing any popups above it). */
  pop() {
    if (!snapshot.stack.length) return
    const d = draft()
    const n = unwindWhile(d, ['overlay'])
    unwindOne(d)
    histBack(n + 1)
    commit(d, 'pop')
  },

  /** Close every pushed screen and return to the tabs. */
  popToRoot() {
    const d = draft()
    histBack(unwindWhile(d, ['overlay', 'screen']))
    commit(d, 'pop')
  },

  /** Switch bottom-nav tab (closes pushed screens). Re-tapping the active tab scrolls it to top. */
  switchTab(id: string) {
    const tab = tabs.find((t) => t.id === id)
    if (!tab) return
    if (id === snapshot.activeTab && !snapshot.stack.length && !overlays.size) {
      reselectListeners.forEach((l) => l(id))
      return
    }
    const d = draft()
    let n = unwindWhile(d, ['overlay', 'screen'])
    const onTabEntry = hist[hist.length - 1].kind === 'tab'
    if (id === tabs[0].id) {
      if (onTabEntry) {
        hist.pop()
        n++
      }
      histBack(n)
    } else {
      histBack(n)
      if (onTabEntry) histReplace('tab', tab.path)
      else {
        hist.push({ kind: 'tab' })
        histPush('tab', tab.path)
      }
    }
    d.activeTab = id
    commit(d, 'tab')
  },
}

/** Popups call this so the system back closes them. Returns an id for unregisterOverlay. */
export function registerOverlay(onBack: () => void): string {
  const id = `o${++seq}`
  overlays.set(id, onBack)
  hist.push({ kind: 'overlay', id })
  histPush('overlay', currentPath())
  return id
}

export function unregisterOverlay(id: string) {
  overlays.delete(id)
  const i = hist.findIndex((h) => h.id === id)
  if (i < 0) return // already consumed by a back press
  hist.splice(i, 1)
  histBack(1)
}

export const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export const getSnapshot = () => snapshot
export const getTabs = () => tabs

export const onTabReselect = (l: (tabId: string) => void) => {
  reselectListeners.add(l)
  return () => {
    reselectListeners.delete(l)
  }
}
