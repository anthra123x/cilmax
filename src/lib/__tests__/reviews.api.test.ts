/**
 * Tests de integración del endpoint POST /api/reviews.
 *
 * La escritura es 100% delegada al ERP (/api/web/reviews): se mockea
 * store-client para aislar la lógica del handler (validación + honeypot).
 * No hay base de datos en el storefront.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../pages/api/reviews';

const { isErpEnabledMock, postWebActionMock } = vi.hoisted(() => ({
  isErpEnabledMock: vi.fn(() => true),
  postWebActionMock: vi.fn(),
}));

vi.mock('../../lib/store-client', () => ({
  isErpEnabled: isErpEnabledMock,
  postWebAction: postWebActionMock,
}));

const VALID_BODY = {
  productId: 'prod_existente',
  nombre: 'Cliente Test',
  correo: 'cliente@test.co',
  calificacion: 5,
  comentario: 'Muy buen producto.',
};

function post(body: unknown) {
  return POST({
    request: new Request('http://127.0.0.1:4321/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  } as any);
}

beforeEach(() => {
  postWebActionMock.mockReset();
  isErpEnabledMock.mockReset();
  isErpEnabledMock.mockReturnValue(true);
});

describe('POST /api/reviews', () => {
  it('responde 503 cuando el catálogo no está sobre el ERP', async () => {
    isErpEnabledMock.mockReturnValue(false);
    const res = await post(VALID_BODY);
    expect(res.status).toBe(503);
    expect(postWebActionMock).not.toHaveBeenCalled();
  });

  it('responde ok y NO escribe nada cuando el honeypot anti-spam viene lleno', async () => {
    const res = await post({ ...VALID_BODY, website: 'http://spam.example' });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(postWebActionMock).not.toHaveBeenCalled();
  });

  it('rechaza calificación fuera de rango (1-5) con 400', async () => {
    const res = await post({ ...VALID_BODY, calificacion: 9 });
    expect(res.status).toBe(400);
    expect(postWebActionMock).not.toHaveBeenCalled();
  });

  it('rechaza comentario vacío con 400', async () => {
    const res = await post({ ...VALID_BODY, comentario: '   ' });
    expect(res.status).toBe(400);
    expect(postWebActionMock).not.toHaveBeenCalled();
  });

  it('rechaza productId vacío con 400', async () => {
    const res = await post({ ...VALID_BODY, productId: '  ' });
    expect(res.status).toBe(400);
    expect(postWebActionMock).not.toHaveBeenCalled();
  });

  it('rechaza nombre demasiado largo con 400', async () => {
    const res = await post({ ...VALID_BODY, nombre: 'x'.repeat(121) });
    expect(res.status).toBe(400);
  });

  it('rechaza correo demasiado largo con 400', async () => {
    const res = await post({ ...VALID_BODY, correo: `${'a'.repeat(250)}@x.co` });
    expect(res.status).toBe(400);
  });

  it('rechaza correo con formato inválido con 400', async () => {
    const res = await post({ ...VALID_BODY, correo: 'no-es-un-correo' });
    expect(res.status).toBe(400);
  });

  it('rechaza comentario demasiado largo con 400', async () => {
    const res = await post({ ...VALID_BODY, comentario: 'x'.repeat(2001) });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/reviews sobre el ERP', () => {
  it('escribe la reseña en el ERP (productId del ERP)', async () => {
    postWebActionMock.mockResolvedValue({ ok: true });
    const res = await post(VALID_BODY);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(postWebActionMock).toHaveBeenCalledWith('/api/web/reviews', {
      productId: 'prod_existente',
      name: 'Cliente Test',
      email: 'cliente@test.co',
      rating: 5,
      comment: 'Muy buen producto.',
    });
  });

  it('envía correo null cuando no se pasó correo', async () => {
    postWebActionMock.mockResolvedValue({ ok: true });
    await post({ ...VALID_BODY, correo: '' });
    expect(postWebActionMock).toHaveBeenCalledWith('/api/web/reviews', {
      productId: 'prod_existente',
      name: 'Cliente Test',
      email: null,
      rating: 5,
      comment: 'Muy buen producto.',
    });
  });

  it('propaga el error del ERP como 400', async () => {
    postWebActionMock.mockResolvedValue({ ok: false, error: 'Producto inválido.' });
    const res = await post(VALID_BODY);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe('Producto inválido.');
  });

  it('responde 500 genérico si el ERP está caído', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    postWebActionMock.mockRejectedValue(new Error('ERP caído'));
    const res = await post(VALID_BODY);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('No se pudo enviar la reseña. Intenta de nuevo.');
    errorSpy.mockRestore();
  });
});