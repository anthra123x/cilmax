// Configuración central del sitio CilMax.
//
// Punto único para datos reutilizables (contacto, WhatsApp, tiendas físicas).
// El número de WhatsApp es un placeholder configurable: cámbialo aquí o
// sobreescríbelo con la variable de entorno PUBLIC_WHATSAPP_NUMBER (formato
// internacional sin "+", p. ej. 573102458877).

import type { CartItem } from './cart-store';
import { formatPrice } from './medusa';

const whatsappNumber =
  (import.meta.env.PUBLIC_WHATSAPP_NUMBER as string | undefined) || '573000000000';

/** Construye un enlace wa.me con un texto prefijado (URL-encoded). */
export function whatsappLink(message: string): string {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export const whatsappNumberDisplay = `+${whatsappNumber.replace(/^(\d{2})(\d{3})/, '+$1 $2 ')}`;

/** Construye el mensaje de pedido por WhatsApp a partir del carrito. */
export function buildOrderMessage(items: CartItem[], subtotal: number): string {
  const currency = items[0]?.currencyCode ?? 'cop';
  const lines = items.map(
    (item, i) =>
      `${i + 1}. ${item.title}${item.variantTitle ? ` (${item.variantTitle})` : ''} × ${item.quantity} — ${formatPrice(
        item.price * item.quantity,
        item.currencyCode
      )}`
  );
  return [
    'Hola CilMax, quiero hacer el siguiente pedido:',
    '',
    ...lines,
    '',
    `Subtotal: ${formatPrice(subtotal, currency)}`,
    '',
    'Quedo atento a la confirmación del envío y el medio de pago. ¡Gracias!',
  ].join('\n');
}

export const storeInfo = {
  name: 'CilMax',
  tagline: 'Tu tienda online de confianza en Colombia.',
  email: 'hola@cilmax.co',
  whatsappNumber,
  hours: 'Lunes a viernes: 8:00 a. m. – 6:00 p. m. · Sábados: 9:00 a. m. – 2:00 p. m.',
};

export const stores = [
  {
    name: 'Tienda CilMax Bucaramanga',
    city: 'Bucaramanga',
    address: 'Calle 10a #24-03, barrio Bolívar',
    phone: '+57 315 480 4781',
    phoneRaw: '+573154804781',
    whatsapp: '573154804781',
    hours: storeInfo.hours,
  },
];
