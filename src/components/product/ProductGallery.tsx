// Galería de imágenes del producto. Si hay más de una imagen muestra
// flechas (PC) y permite deslizar con el dedo (móvil). Con una sola imagen
// se limita a mostrar la foto sin controles.
import { useRef, useState } from 'react';

interface Props {
  images: { url: string }[];
  title: string;
}

const SWIPE_THRESHOLD = 40;

export default function ProductGallery({ images, title }: Props) {
  const urls = images.map((i) => i.url).filter(Boolean);
  const [active, setActive] = useState(0);

  // Sin imágenes: el padre muestra el placeholder.
  if (urls.length === 0) return null;

  const multi = urls.length > 1;
  const trackRef = useRef<HTMLDivElement>(null);
  const downX = useRef<number | null>(null);

  function go(delta: number) {
    setActive((prev) => (prev + delta + urls.length) % urls.length);
  }

  function onPointerStart(e: React.PointerEvent) {
    downX.current = e.clientX;
  }

  function onPointerMove(e: React.PointerEvent) {
    if (downX.current === null) return;
    const dx = e.clientX - downX.current;
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      go(dx < 0 ? 1 : -1);
      downX.current = null;
    }
  }

  function onPointerEnd() {
    downX.current = null;
  }

  const primary = urls[active];

  return (
    <div
      className="gallery"
      onPointerDown={multi ? onPointerStart : undefined}
      onPointerMove={multi ? onPointerMove : undefined}
      onPointerUp={multi ? onPointerEnd : undefined}
      onPointerLeave={multi ? onPointerEnd : undefined}
    >
      <div className="gallery__viewport" ref={trackRef}>
        <img
          src={primary}
          alt={title}
          fetchPriority={active === 0 ? 'high' : 'auto'}
        />

        {multi && (
          <>
            <button
              type="button"
              className="gallery__nav gallery__nav--prev"
              aria-label="Imagen anterior"
              onClick={() => go(-1)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
                strokeLinejoin="round" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              className="gallery__nav gallery__nav--next"
              aria-label="Imagen siguiente"
              onClick={() => go(1)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
                strokeLinejoin="round" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>

            <div className="gallery__dots" role="tablist" aria-label="Imágenes del producto">
              {urls.map((u, i) => (
                <button
                  key={u}
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  aria-label={`Imagen ${i + 1}`}
                  className={`gallery__dot ${i === active ? 'gallery__dot--active' : ''}`}
                  onClick={() => setActive(i)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}