// Botón del carrito que abre el drawer (island React).
import { useStore } from '@nanostores/react';
import { cartCount } from '../../lib/cart-store';
import { openCart } from '../../lib/ui-store';

export default function CartButton() {
  const count = useStore(cartCount);

  return (
    <button
      type="button"
      className="cart-button"
      onClick={openCart}
      aria-label={`Abrir carrito, ${count} artículos`}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      <span className="cart-button__badge">{count}</span>
    </button>
  );
}
