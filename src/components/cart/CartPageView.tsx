// Vista de carrito a página completa (island React).
// Muestra los artículos del carrito global con sus cantidades y el subtotal.
// El flujo de pago/checkout (dirección, envío, pago) se integra en una
// siguiente fase.
import { useStore } from '@nanostores/react';
import { cartItems, cartSubtotal, updateQuantity, removeFromCart } from '../../lib/cart-store';
import { formatPrice } from '../../lib/medusa';
import { whatsappLink, buildOrderMessage } from '../../lib/site';

export default function CartPageView() {
  const items = useStore(cartItems);
  const subtotal = useStore(cartSubtotal);
  const currency = items[0]?.currencyCode ?? 'cop';

  if (items.length === 0) {
    return (
      <div className="cart-page cart-page--empty">
        <h1 className="cart-page__title">Tu carrito</h1>
        <p>Tu carrito está vacío.</p>
        <a href="/catalogo" className="btn btn--primary">Explorar catálogo</a>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <h1 className="cart-page__title">Tu carrito</h1>

      <div className="cart-page__layout">
        <ul className="cart-page__items">
          {items.map((item) => (
            <li key={item.variantId} className="cart-item cart-page__item">
              <div className="cart-item__media">
                {item.image ? (
                  <img src={item.image} alt="" loading="lazy" />
                ) : (
                  <span aria-hidden="true">{item.title.slice(0, 1)}</span>
                )}
              </div>
              <div className="cart-item__info">
                <a href={`/producto/${item.handle}`}>{item.title}</a>
                <span className="cart-item__variant">{item.variantTitle}</span>
                <div className="cart-item__row">
                  <div className="cart-item__qty" aria-label="Cantidad">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                      aria-label="Reducir cantidad"
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                      aria-label="Aumentar cantidad"
                    >
                      +
                    </button>
                  </div>
                  <span className="cart-item__price">
                    {formatPrice(item.price * item.quantity, item.currencyCode)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="cart-item__remove"
                onClick={() => removeFromCart(item.variantId)}
                aria-label={`Eliminar ${item.title}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>

        <aside className="cart-summary">
          <h2 className="cart-summary__title">Resumen</h2>
          <div className="cart-summary__row">
            <span>Subtotal</span>
            <strong>{formatPrice(subtotal, currency)}</strong>
          </div>
          <p className="cart-summary__note">
            El pedido se gestiona por WhatsApp. Ahí coordinamos el envío, la
            forma de pago y te confirmamos la disponibilidad.
          </p>
          <a
            className="btn btn--primary cart-summary__cta"
            href={whatsappLink(buildOrderMessage(items, subtotal))}
            target="_blank"
            rel="noopener"
          >
            Pedir por WhatsApp
          </a>
          <a href="/catalogo" className="cart-summary__continue">Seguir comprando</a>
        </aside>
      </div>
    </div>
  );
}
