// Caja de compra del producto (island React).
// Permite seleccionar variante y añadirla al carrito. Muestra precio según
// la variante elegida y su disponibilidad.
import { useState } from 'react';
import type { ProductData } from '../../lib/medusa';
import { formatPrice } from '../../lib/medusa';
import { addToCart } from '../../lib/cart-store';

interface Props {
  product: ProductData;
}

export default function ProductBuyBox({ product }: Props) {
  const [selectedId, setSelectedId] = useState(product.variants[0]?.id ?? '');
  const [added, setAdded] = useState(false);

  const variant = product.variants.find((v) => v.id === selectedId) ?? product.variants[0];
  if (!variant) return null;

  const outOfStock = variant.inventoryQuantity <= 0;

  function handleAdd() {
    addToCart({
      variantId: variant.id,
      productId: product.id,
      title: product.title,
      variantTitle: variant.title,
      handle: product.handle,
      image: product.images[0]?.url ?? product.thumbnail,
      price: variant.amount,
      currencyCode: variant.currencyCode,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="buy-box">
      <p className="buy-box__price">{formatPrice(variant.amount, variant.currencyCode)}</p>

      {product.variants.length > 1 && (
        <div className="buy-box__variants">
          <span className="buy-box__label">Variante</span>
          <div className="buy-box__options" role="group" aria-label="Seleccionar variante">
            {product.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                className={`buy-box__option ${v.id === selectedId ? 'buy-box__option--active' : ''}`}
                onClick={() => setSelectedId(v.id)}
                aria-pressed={v.id === selectedId}
              >
                {v.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {outOfStock ? (
        <button type="button" className="add-to-cart" disabled>
          Sin stock
        </button>
      ) : (
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
      )}

      <p className="buy-box__hint">
        {outOfStock
          ? 'Este producto está agotado temporalmente.'
          : `En stock · ${variant.inventoryQuantity} unidades disponibles`}
      </p>
    </div>
  );
}
