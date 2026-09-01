// Estado global de UI (apertura del carrito, etc.) con nanostores.

import { atom } from 'nanostores';

export const isCartOpen = atom(false);

export function openCart() {
  isCartOpen.set(true);
}

export function closeCart() {
  isCartOpen.set(false);
}
