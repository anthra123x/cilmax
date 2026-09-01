// Contador del carrito (island React). Se hidrata en el cliente y refleja
// el número de artículos en el carrito global (nanostores).
import { useStore } from '@nanostores/react';
import { cartCount } from '../../lib/cart-store';

export default function CartBadge() {
  const count = useStore(cartCount);

  return (
    <span className="cart-badge" aria-label={`${count} artículos en el carrito`}>
      {count}
    </span>
  );
}
