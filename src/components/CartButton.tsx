import { ShoppingCartSimpleIcon } from '@phosphor-icons/react'
import { nav } from '@/navigation'
import { useCartCount } from '@/store/cart'
import { IconButton } from '@/ui'

/** App bar button that opens the cart, with the number of props in it. */
export function CartButton({ variant }: { variant?: 'ghost' | 'surface' }) {
  const count = useCartCount()
  return (
    <IconButton
      icon={ShoppingCartSimpleIcon}
      label={count ? `Cart, ${count} prop${count === 1 ? '' : 's'}` : 'Cart'}
      variant={variant}
      badge={count}
      onClick={() => nav.push('/customer/cart')}
    />
  )
}
