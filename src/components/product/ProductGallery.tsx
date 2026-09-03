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
      <style>{`/* Estilos de la galería (island React: globales para aplicar al DOM de cliente) */
.gallery {
  position: relative;
  width: 100%;
  height: 100%;
  user-select: none;
  -webkit-user-select: none;
  touch-action: pan-y;
}
.gallery__viewport {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.gallery__viewport img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  pointer-events: none;
}
.gallery__nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.85);
  color: #111827;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  transition: background 0.15s ease, color 0.15s ease, transform 0.1s ease;
  z-index: 3;
}
.gallery__nav:hover {
  background: var(--color-primary, #008a93);
  color: #fff;
}
.gallery__nav:active {
  transform: translateY(-50%) scale(0.95);
}
.gallery__nav--prev { left: var(--space-3, 16px); }
.gallery__nav--next { right: var(--space-3, 16px); }
.gallery__dots {
  position: absolute;
  bottom: var(--space-3, 16px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: var(--space-2, 8px);
  padding: 6px 10px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.75);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
  z-index: 3;
}
.gallery__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.25);
  background: transparent;
  padding: 0;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease;
}
.gallery__dot--active {
  background: var(--color-primary, #008a93);
  border-color: var(--color-primary, #008a93);
  transform: scale(1.25);
}
`}</style>
    </div>
  );
}