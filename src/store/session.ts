import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** The two kinds of accounts. Each has its own app and URL section. */
export type Role = 'customer' | 'owner'

export const ROLE_LABEL: Record<Role, string> = {
  customer: 'Art Director',
  owner: 'Prop Owner',
}

/** URL section of each app: /customer/… and /renter/… */
export const ROLE_BASE: Record<Role, string> = {
  customer: '/customer',
  owner: '/renter',
}

interface Account {
  /** 10-digit mobile number (null for demo accounts signed in without one). */
  phone: string | null
  /** Display name. Login doesn't ask for one yet, so a demo name is used. */
  name?: string
}

/** Placeholder names until sign-up collects a real one. */
export const DEMO_NAME: Record<Role, string> = {
  customer: 'Rohan Mehta',
  owner: 'Prop Owner',
}

interface SessionState {
  /** Signed-in accounts. You can be signed in to both sides at once. */
  accounts: Partial<Record<Role, Account>>
  /** Side used most recently — where "/" opens when signed in. */
  lastRole: Role | null
  /** App currently on screen (null = welcome / login flow). Not persisted. */
  section: Role | null
  /** Path to land on when the section changes. Not persisted. */
  entryPath: string | null

  /** Sign in to a side and open it (at `path`, if given). */
  login: (role: Role, phone: string | null, path?: string) => void
  /** Sign out of the side on screen and return to Welcome. */
  logout: () => void
  /** Show a side you're already signed in to (or the Welcome screen). */
  enter: (section: Role | null, path?: string) => void
  /** Change the display name of the account on screen. */
  setName: (name: string) => void
}

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      accounts: {},
      lastRole: null,
      section: null,
      entryPath: null,

      login: (role, phone, path) =>
        set((s) => ({
          accounts: { ...s.accounts, [role]: { phone } },
          lastRole: role,
          section: role,
          entryPath: path ?? null,
        })),
      logout: () => {
        const { section, accounts } = get()
        if (!section) return
        const rest = { ...accounts }
        delete rest[section]
        const other = (Object.keys(rest) as Role[])[0] ?? null
        set({ accounts: rest, lastRole: other, section: null, entryPath: '/' })
      },
      enter: (section, path) => set((s) => ({ section, entryPath: path ?? null, lastRole: section ?? s.lastRole })),
      setName: (name) =>
        set((s) => {
          const account = s.section ? s.accounts[s.section] : undefined
          return account && s.section ? { accounts: { ...s.accounts, [s.section]: { ...account, name } } } : {}
        }),
    }),
    {
      name: 'proto:session',
      version: 2,
      partialize: (s) => ({ accounts: s.accounts, lastRole: s.lastRole }),
      // v1 stored a single { role, phone }.
      migrate: (persisted, version) => {
        if (version < 2) {
          const old = persisted as { role?: Role | null; phone?: string | null }
          return old.role
            ? { accounts: { [old.role]: { phone: old.phone ?? null } }, lastRole: old.role }
            : { accounts: {}, lastRole: null }
        }
        return persisted as Pick<SessionState, 'accounts' | 'lastRole'>
      },
    },
  ),
)

/** Current account on screen. */
export const useAccount = () => useSession((s) => (s.section ? s.accounts[s.section] : undefined))

/** Name of the signed-in user on screen (falls back to the demo name). */
export const useDisplayName = () =>
  useSession((s) => (s.section ? (s.accounts[s.section]?.name ?? DEMO_NAME[s.section]) : ''))

/**
 * Decide what to show for the URL the app was opened with:
 *  /customer/… or /renter/…  → that app if signed in, otherwise its login first
 *  /                          → the last-used app if signed in, otherwise Welcome
 */
export function resolveStartup(): { section: Role | null; path: string } {
  const { pathname, search } = window.location
  const { accounts, lastRole } = useSession.getState()
  const first = pathname.split('/').filter(Boolean)[0]?.toLowerCase()
  const role = (Object.keys(ROLE_BASE) as Role[]).find((r) => ROLE_BASE[r].slice(1) === first)

  if (role) {
    // Canonical lowercase section (so /Renter works too).
    const rest = pathname.split('/').filter(Boolean).slice(1).join('/')
    const path = `${ROLE_BASE[role]}${rest ? `/${rest}` : ''}${search}`
    if (accounts[role]) return { section: role, path }
    return { section: null, path: `/login?role=${role}&next=${encodeURIComponent(path)}` }
  }
  if (pathname === '/' && lastRole && accounts[lastRole]) return { section: lastRole, path: ROLE_BASE[lastRole] }
  return { section: null, path: pathname + search }
}
