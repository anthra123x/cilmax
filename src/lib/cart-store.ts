// Carrito global cliente-side con nanostores.
//
// Persiste en localStorage y sincroniza entre pestañas. Funciona con los
// datos del catálogo (reales de Medusa o de ejemplo). Las operaciones de
// carrito de Medusa (crear cart, regiones, envío) se integran en la fase
// de checkout.

import { atom, computed, onMount } from 'nanostores';

export interface CartItem {
  variantId: string;
  productId: string;
  title: string;
  variantTitle: string;
  handle: string;
  image: string | null;
  price: number;
  currencyCode: string;
  quantity: number;
}

/** ID de la clave en localStorage. */
const STORAGE_KEY = 'cilmax-cart';

export const cartItems = atom<CartItem[]>([]);

// ---- Derivados ----
export const cartCount = computed(cartItems, (items) =>
  items.reduce((sum, item) => sum + item.quantity, 0)
);

export const cartSubtotal = computed(cartItems, (items) =>
  items.reduce((sum, item) => sum + item.price * item.quantity, 0)
);

// ---- Persistencia ----
function loadFromStorage(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* almacenamiento no disponible: se ignora */
  }
}

onMount(cartItems, () => {
  cartItems.set(loadFromStorage());

  // Sincronizar entre pestañas.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cartItems.set(loadFromStorage());
    }
  };
  window.addEventListener('storage', onStorage);

  return () => window.removeEventListener('storage', onStorage);
});

// ---- Operaciones ----
export function addToCart(item: Omit<CartItem, 'quantity'> & { quantity?: number }) {
  const qty = item.quantity ?? 1;
  const current = cartItems.get();
  const existing = current.find((it) => it.variantId === item.variantId);

  let next: CartItem[];
  if (existing) {
    next = current.map((it) =>
      it.variantId === item.variantId
        ? { ...it, quantity: Math.min(it.quantity + qty, 99) }
        : it
    );
  } else {
    next = [...current, { ...item, quantity: qty }];
  }

  cartItems.set(next);
  saveToStorage(next);
}

export function removeFromCart(variantId: string) {
  const next = cartItems.get().filter((it) => it.variantId !== variantId);
  cartItems.set(next);
  saveToStorage(next);
}

export function updateQuantity(variantId: string, quantity: number) {
  const next = cartItems
    .get()
    .map((it) =>
      it.variantId === variantId
        ? { ...it, quantity: Math.max(0, Math.min(quantity, 99)) }
        : it
    )
    .filter((it) => it.quantity > 0);
  cartItems.set(next);
  saveToStorage(next);
}

export function clearCart() {
  cartItems.set([]);
  saveToStorage([]);
}
