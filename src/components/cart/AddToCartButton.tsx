// Botón "Añadir al carrito" (island React). Añade una variante al carrito
// global y avisa con un pequeño feedback.
import { useState } from 'react';
import { addToCart } from '../../lib/cart-store';

interface Props {
  variantId: string;
  productId: string;
  title: string;
  variantTitle: string;
  handle: string;
  image: string | null;
  price: number;
  currencyCode: string;
}

export default function AddToCartButton({
  variantId,
  productId,
  title,
  variantTitle,
  handle,
  image,
  price,
  currencyCode,
}: Props) {
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addToCart({
      variantId,
      productId,
      title,
      variantTitle,
      handle,
      image,
      price,
      currencyCode,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  }

  return (
    <button
      type="button"
      className={`add-to-cart ${added ? 'add-to-cart--added' : ''}`}
      onClick={handleAdd}
      aria-live="polite"
    >
      {added ? (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Añadido
        </>
      ) : (
        'Añadir al carrito'
      )}
    </button>
  );
}
