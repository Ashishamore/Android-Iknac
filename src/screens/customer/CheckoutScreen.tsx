import { ShoppingCartSimpleIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { BookingFlow } from '@/components/ops/BookingFlow'
import { propById } from '@/data/props'
import { lineStatus, type BoardLine } from '@/lib/ops'
import { nav, useQuery } from '@/navigation'
import { cartLines, nextRentDates, useCart } from '@/store/cart'
import { AppBar, Button, EmptyState, Screen } from '@/ui'

const ISO = /^\d{4}-\d{2}-\d{2}$/

/** "Rent now" on a listing: one prop, with the dates and quantity from the URL. */
function rentNowLine(query: URLSearchParams): BoardLine[] {
  const propId = query.get('prop') ?? ''
  if (!propById(propId)) return []
  const fallback = nextRentDates(useCart.getState().dates)
  const from = ISO.test(query.get('from') ?? '') ? query.get('from')! : fallback.from
  const to = ISO.test(query.get('to') ?? '') && query.get('to')! >= from ? query.get('to')! : from
  const qty = Math.min(20, Math.max(1, Number(query.get('qty')) || 1))
  return cartLines([{ id: `now-${propId}`, propId, from, to, qty, addedAt: Date.now() }])
}

/**
 * Direct order, no project needed: `/customer/checkout` checks out the cart,
 * `/customer/checkout?prop=…&from=…&to=…&qty=…` rents one prop straight away.
 * The order lands in My orders (`/customer/orders`).
 */
export default function CheckoutScreen() {
  const query = useQuery()
  const removeProps = useCart((s) => s.removeProps)
  // Taken once: placing the order empties the cart underneath this screen.
  const [lines] = useState(() =>
    (query.get('prop') ? rentNowLine(query) : cartLines(useCart.getState().items)).filter((l) => lineStatus(l) !== 'unavailable'),
  )

  if (!lines.length) {
    return (
      <Screen header={<AppBar close title="Checkout" />}>
        <EmptyState
          icon={ShoppingCartSimpleIcon}
          title="Nothing to check out"
          description="Add props to your cart, or pick dates they’re free on."
          action={<Button onClick={() => nav.pop()}>Close</Button>}
        />
      </Screen>
    )
  }
  return <BookingFlow project={null} board={null} lines={lines} onBooked={() => removeProps(lines.map((l) => l.propId))} />
}
