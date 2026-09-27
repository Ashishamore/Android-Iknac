import { PackageIcon } from '@phosphor-icons/react'
import { BookingFlow } from '@/components/ops/BookingFlow'
import { nav, useParams } from '@/navigation'
import { useBoardById } from '@/store/projectOps'
import { useProject } from '@/store/projects'
import { AppBar, Button, EmptyState, Screen } from '@/ui'

/** Book a project board's items: Items → Where and when → Transport → Payment → Vendor terms. */
export default function BookingFlowScreen() {
  const { id, boardId } = useParams<{ id: string; boardId: string }>()
  const project = useProject(id)
  const board = useBoardById(boardId)
  if (!project || !board) {
    return (
      <Screen header={<AppBar close title="Book items" />}>
        <EmptyState icon={PackageIcon} title="Board not found" action={<Button onClick={() => nav.pop()}>Close</Button>} />
      </Screen>
    )
  }
  return <BookingFlow project={project} board={board} lines={board.lines} />
}
