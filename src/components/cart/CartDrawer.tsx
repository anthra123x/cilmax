// Carrito lateral (drawer) — island React.
// Muestra los artículos del carrito global, permite modificar cantidades y
// eliminar, y calcula el subtotal. El pago/checkout se integra en una
// siguiente fase.
import { useStore } from '@nanostores/react';
import { cartItems, cartSubtotal, updateQuantity, removeFromCart } from '../../lib/cart-store';
import { closeCart, isCartOpen } from '../../lib/ui-store';
import { formatPrice } from '../../lib/medusa';
import { whatsappLink, buildOrderMessage } from '../../lib/site';

export default function CartDrawer() {
  const items = useStore(cartItems);
  const isOpen = useStore(isCartOpen);
  const subtotal = useStore(cartSubtotal);
  const currency = items[0]?.currencyCode ?? 'cop';

  if (!isOpen) return null;

  return (
    <div className="cart-overlay" onClick={closeCart} role="presentation">
      <aside
        className="cart-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cart-drawer__header">
          <h2 className="cart-drawer__title">Tu carrito</h2>
          <button
            type="button"
            className="cart-drawer__close"
            onClick={closeCart}
            aria-label="Cerrar carrito"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        {items.length === 0 ? (
          <div className="cart-drawer__empty">
            <p>Tu carrito está vacío.</p>
            <p className="cart-drawer__empty-sub">
              Añade algunos productos del catálogo para empezar.
            </p>
          </div>
        ) : (
          <>
            <ul className="cart-drawer__items">
              {items.map((item) => (
                <li key={item.variantId} className="cart-item">
                  <div className="cart-item__media">
                    {item.image ? (
                      <img src={item.image} alt="" loading="lazy" />
                    ) : (
                      <span aria-hidden="true">{item.title.slice(0, 1)}</span>
                    )}
                  </div>
                  <div className="cart-item__info">
                    <a href={`/producto/${item.handle}`} onClick={closeCart}>
                      {item.title}
                    </a>
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

            <footer className="cart-drawer__footer">
              <div className="cart-drawer__subtotal">
                <span>Subtotal</span>
                <strong>{formatPrice(subtotal, currency)}</strong>
              </div>
              <p className="cart-drawer__note">
                Pedido gestionado por WhatsApp: envío, pago y disponibilidad.
              </p>
              <a
                className="btn btn--primary cart-drawer__cta"
                href={whatsappLink(buildOrderMessage(items, subtotal))}
                target="_blank"
                rel="noopener"
                onClick={closeCart}
              >
                Pedir por WhatsApp
              </a>
              <a className="cart-drawer__continue" href="/carrito" onClick={closeCart}>
                Ver el carrito completo
              </a>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
