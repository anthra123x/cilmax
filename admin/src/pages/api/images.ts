import type { APIRoute } from 'astro';
import { put } from '@vercel/blob';

export const prerender = false;

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB por imagen
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

function realImageType(buf: Uint8Array): string | null {
  if (buf.length < 12) return null;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  // GIF: GIF87a / GIF89a
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && (buf[3] === 0x38) && (buf[4] === 0x37 || buf[4] === 0x39) && buf[5] === 0x61) return 'image/gif';
  // WebP: RIFF .... WEBP
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return 'image/webp';
  // AVIF: ISO BMFF (ftyp) — ftyp at offset 4, brand avif/avis
  const ftyp = String.fromCharCode(buf[4], buf[5], buf[6], buf[7]);
  const brand = String.fromCharCode(buf[8], buf[9], buf[10], buf[11]);
  if (ftyp === 'ftyp' && (brand === 'avif' || brand === 'avis')) return 'image/avif';
  return null;
}

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
      const bytes = new Uint8Array(await file.arrayBuffer());
      const realType = realImageType(bytes);
      if (!realType || realType !== file.type) {
        return new Response(
          JSON.stringify({ error: `"${file.name}" no es un archivo de imagen válido.` }),
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
