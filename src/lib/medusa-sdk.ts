// Inicialización del SDK de Medusa (Store API) y detección de configuración.
//
// El SDK se usa:
//  - En el servidor (build/ISR) para prerenderizar catálogo y productos.
//  - En el cliente (islands) para el carrito.
//
// Solo se instancia cuando hay URL y publishable key configuradas. En caso
// contrario, `isConfigured()` devuelve false y la capa de datos (medusa.ts)
// usa el fallback local.

import Medusa from '@medusajs/js-sdk';

const backendUrl = import.meta.env.PUBLIC_MEDUSA_BACKEND_URL as string | undefined;
const publishableKey = import.meta.env.PUBLIC_MEDUSA_PUBLISHABLE_KEY as
  | string
  | undefined;
const countryCode = (import.meta.env.PUBLIC_DEFAULT_COUNTRY as string | undefined) || 'co';

/** true si hay backend y clave de venta configurados. */
export function isConfigured(): boolean {
  return Boolean(backendUrl && publishableKey);
}

export function getDefaultCountry(): string {
  return countryCode;
}

export const sdk = isConfigured()
  ? new Medusa({
      baseUrl: backendUrl!,
      debug: import.meta.env.DEV,
      publishableKey,
    })
  : null;

/** Devuelve la instancia del SDK o lanza si no hay backend configurado.
 *  Usar solo tras comprobar `isConfigured()`. */
export function getStoreSdk(): Medusa {
  if (!sdk) {
    throw new Error('Medusa SDK no está configurado. Revisa PUBLIC_MEDUSA_BACKEND_URL.');
  }
  return sdk;
}

export { backendUrl };
