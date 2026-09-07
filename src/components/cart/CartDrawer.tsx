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
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ width: 18, height: 18 }}>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
                </svg>
                Comprar ahora
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
