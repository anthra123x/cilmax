/**
 * Tests de integración del endpoint POST /api/reviews.
 *
 * El módulo de base de datos se mockea para aislar la lógica del handler:
 * no se toca la BD real. Reproduce el caso reportado: un productId que ya no
 * existe en el catálogo debe responder 400 "Producto inválido." y no un 500.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../pages/api/reviews';

const { insertQuery, isErpEnabledMock, postWebActionMock } = vi.hoisted(() => ({
  insertQuery: vi.fn(),
  isErpEnabledMock: vi.fn(() => false),
  postWebActionMock: vi.fn(),
}));

vi.mock('../../lib/db', () => ({
  getDb: () => ({ query: insertQuery }),
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
  insertQuery.mockReset();
  isErpEnabledMock.mockReset();
  isErpEnabledMock.mockReturnValue(false);
  postWebActionMock.mockReset();
});

describe('POST /api/reviews', () => {
  it('rechaza con 400 una reseña para un producto que no existe en la BD', async () => {
    // Existencia: 0 filas -> el producto no existe.
    insertQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await post(VALID_BODY);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe('Producto inválido.');
  });

  it('guarda la reseña cuando el producto existe', async () => {
    insertQuery
      .mockResolvedValueOnce({ rows: [{ ok: 1 }], rowCount: 1 }) // existencia
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // insert
    const res = await post(VALID_BODY);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(insertQuery).toHaveBeenCalledTimes(2);
  });

  it('responde ok y NO guarda nada cuando el honeypot anti-spam viene lleno', async () => {
    const res = await post({ ...VALID_BODY, website: 'http://spam.example' });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(insertQuery).not.toHaveBeenCalled();
  });

  it('rechaza calificación fuera de rango (1-5) con 400', async () => {
    const res = await post({ ...VALID_BODY, calificacion: 9 });
    expect(res.status).toBe(400);
    expect(insertQuery).not.toHaveBeenCalled();
  });

  it('rechaza comentario vacío con 400', async () => {
    const res = await post({ ...VALID_BODY, comentario: '   ' });
    expect(res.status).toBe(400);
    expect(insertQuery).not.toHaveBeenCalled();
  });

  it('responde 500 genérico cuando la base de datos falla', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    insertQuery.mockRejectedValueOnce(new Error('db caída'));
    const res = await post({ ...VALID_BODY, productId: 'prod_x' });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('No se pudo enviar la reseña. Intenta de nuevo.');
    errorSpy.mockRestore();
  });

  it('rechaza productId vacío con 400', async () => {
    const res = await post({ ...VALID_BODY, productId: '  ' });
    expect(res.status).toBe(400);
    expect(insertQuery).not.toHaveBeenCalled();
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

describe('POST /api/reviews con el catálogo sobre el ERP', () => {
  beforeEach(() => {
    isErpEnabledMock.mockReturnValue(true);
  });

  it('escribe la reseña en el ERP (productId del ERP) y no toca Neon', async () => {
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
    expect(insertQuery).not.toHaveBeenCalled();
  });

  it('propaga el error del ERP como 400', async () => {
    postWebActionMock.mockResolvedValue({ ok: false, error: 'Producto inválido.' });
    const res = await post(VALID_BODY);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe('Producto inválido.');
    expect(insertQuery).not.toHaveBeenCalled();
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