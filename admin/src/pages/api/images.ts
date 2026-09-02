import type { APIRoute } from 'astro';
import { put } from '@vercel/blob';

export const prerender = false;

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB por imagen
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const files = formData.getAll('files').filter((v): v is File => v instanceof File && v.size > 0);

  if (files.length === 0) {
    return new Response(JSON.stringify({ error: 'No se recibieron archivos.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const urls: string[] = [];
  const extensionByName = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    return ext && /^[a-z0-9]{1,5}$/.test(ext) ? ext : 'png';
  };

  try {
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return new Response(
          JSON.stringify({ error: `La imagen "${file.name}" supera los 8 MB.` }),
          { status: 413, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        return new Response(
          JSON.stringify({ error: `Formato no permitido para "${file.name}". Usa JPG, PNG, WebP, GIF o AVIF.` }),
          { status: 415, headers: { 'Content-Type': 'application/json' } },
        );
      }
      const safeBase = file.name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase().slice(0, 60) || 'imagen';
      const blob = await put(`productos/${safeBase}.${extensionByName(file.name)}`, file, {
        access: 'public',
        addRandomSuffix: true,
        contentType: file.type,
      });
      urls.push(blob.url);
    }
    return new Response(JSON.stringify({ urls }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[images] Error al subir:', err);
    return new Response(JSON.stringify({ error: 'No se pudo subir la imagen. Revisa que Vercel Blob esté configurado.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
