import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { addDays, todayISO } from '@/lib/dates'
import type { Tone } from '@/lib/tones'

export interface ShootLocation {
  id: string
  name: string
  address: string
  /** "YYYY-MM-DD", within the project's shoot dates. */
  date: string
}

export interface Project {
  id: string
  name: string
  startDate: string
  endDate: string
  /** Total budget in ₹. */
  budget: number
  locations: ShootLocation[]
  /** @deprecated Old flat shortlist; migrated into a project board (see store/projectOps). */
  shortlist?: string[]
  /** Marked as wrapped early (counts as Completed / Past). */
  wrapped?: boolean
  createdAt: number
}

export type ProjectInput = Omit<Project, 'id' | 'createdAt' | 'shortlist' | 'wrapped'>

/** Short unique id (crypto.randomUUID needs HTTPS, which LAN testing doesn't have). */
export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

/** Projects still to shoot or shooting now (their dates drive "Available on your dates"). */
export const activeProjects = (list: Project[]) => sortProjects(list).filter((p) => !p.wrapped && todayISO() <= p.endDate)

/** Upcoming / In progress / Completed, from today's date. */
export function projectStatus(p: Pick<Project, 'startDate' | 'endDate' | 'wrapped'>): { label: string; tone: Tone } {
  const today = todayISO()
  if (p.wrapped) return { label: 'Completed', tone: 'neutral' }
  if (today < p.startDate) return { label: 'Upcoming', tone: 'info' }
  if (today > p.endDate) return { label: 'Completed', tone: 'neutral' }
  return { label: 'In progress', tone: 'success' }
}

/** In progress first, then upcoming (soonest first), then completed (latest first). */
export function sortProjects(list: Project[]) {
  const rank = { 'In progress': 0, Upcoming: 1, Completed: 2 } as Record<string, number>
  return [...list].sort((a, b) => {
    const ra = rank[projectStatus(a).label]
    const rb = rank[projectStatus(b).label]
    if (ra !== rb) return ra - rb
    return ra === 2 ? b.endDate.localeCompare(a.endDate) : a.startDate.localeCompare(b.startDate)
  })
}

const sortLocations = (locations: ShootLocation[]) => [...locations].sort((a, b) => a.date.localeCompare(b.date))

function sampleProject(): Project {
  const start = addDays(todayISO(), 5)
  return {
    id: 'monsoon-ad-shoot',
    name: 'Monsoon Ad Shoot',
    startDate: start,
    endDate: addDays(start, 3),
    budget: 450000,
    locations: [
      { id: 'loc-film-city', name: 'Film City – Stage 4', address: 'Film City Road, Goregaon East, Mumbai 400065', date: start },
      {
        id: 'loc-marine-drive',
        name: 'Marine Drive promenade',
        address: 'Netaji Subhash Chandra Bose Road, Mumbai 400020',
        date: addDays(start, 2),
      },
    ],
    createdAt: Date.now(),
  }
}

/** A wrapped shoot from last month, so Past, bookings, invoices and reviews have history. */
function samplePastProject(): Project {
  const start = addDays(todayISO(), -40)
  return {
    id: 'diwali-tvc',
    name: 'Diwali Sweets TVC',
    startDate: start,
    endDate: addDays(start, 2),
    budget: 250000,
    locations: [
      {
        id: 'loc-kamalistan',
        name: 'Kamalistan Studios',
        address: 'Jogeshwari–Vikhroli Link Road, Jogeshwari East, Mumbai 400060',
        date: start,
      },
    ],
    createdAt: Date.now() - 55 * 86_400_000,
  }
}

interface ProjectsState {
  projects: Project[]
  createProject: (input: ProjectInput) => string
  updateProject: (id: string, input: ProjectInput) => void
  /** Removes a project; returns a function that puts it back (for "Undo"). */
  deleteProject: (id: string) => () => void
  setWrapped: (id: string, wrapped: boolean) => void
}

/** The art director's shoots (kept until "Reset demo"). */
export const useProjects = create<ProjectsState>()(
  persist(
    (set, get) => ({
      projects: [sampleProject(), samplePastProject()],
      createProject: (input) => {
        const id = newId()
        set((s) => ({
          projects: [
            { ...input, locations: sortLocations(input.locations), id, createdAt: Date.now() },
            ...s.projects,
          ],
        }))
        return id
      },
      updateProject: (id, input) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, ...input, locations: sortLocations(input.locations) } : p)),
        })),
      deleteProject: (id) => {
        const index = get().projects.findIndex((p) => p.id === id)
        const removed = get().projects[index]
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }))
        return () => {
          if (!removed) return
          set((s) => {
            const projects = [...s.projects]
            projects.splice(index, 0, removed)
            return { projects }
          })
        }
      },
      setWrapped: (id, wrapped) => set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, wrapped } : p)) })),
    }),
    { name: 'proto:projects', version: 1 },
  ),
)

export const useProject = (id: string | undefined) => useProjects((s) => s.projects.find((p) => p.id === id))
