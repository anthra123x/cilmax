// Island de opiniones/calificaciones de producto. Recibe del SSR la lista
// inicial de reseñas y el promedio; al enviar el formulario hace POST a
// /api/reviews y actualiza la lista y el promedio sin recargar la página.

import { useState, useMemo, type FormEvent } from 'react';

interface Review {
  id: string;
  productId: string;
  nombre: string;
  correo: string | null;
  calificacion: number;
  comentario: string;
  createdAt: string;
}

interface Props {
  productId: string;
  productTitle: string;
  reviews: Review[];
  avg: number | null;
  count: number;
}

const STARS = [1, 2, 3, 4, 5];

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span
      className="stars"
      role="img"
      aria-label={`${value} de 5 estrellas`}
      style={{ '--stars-size': `${size}px` } as React.CSSProperties}
    >
      {STARS.map((s) => (
        <span key={s} className={s <= Math.round(value) ? 'star star--on' : 'star'}>&#9733;</span>
      ))}
    </span>
  );
}

function Initial({ name }: { name: string }) {
  const letter = (name || '?').trim().charAt(0).toUpperCase();
  return <span className="review__avatar">{letter}</span>;
}

function Histogram({ reviews }: { reviews: Review[] }) {
  const dist = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    for (const r of reviews) {
      if (r.calificacion >= 1 && r.calificacion <= 5) counts[r.calificacion - 1]++;
    }
    const max = Math.max(...counts, 1);
    return [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: counts[star - 1],
      pct: (counts[star - 1] / max) * 100,
    }));
  }, [reviews]);

  return (
    <div className="histogram">
      {dist.map((d) => (
        <div className="histogram__row" key={d.star}>
          <span className="histogram__label">{d.star}&#9733;</span>
          <div className="histogram__track">
            <div className="histogram__fill" style={{ width: `${d.pct}%` }} />
          </div>
          <span className="histogram__count">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ProductReviews({ productId, productTitle, reviews: initial, avg: initialAvg, count: initialCount }: Props) {
  const [reviews, setReviews] = useState<Review[]>(initial);
  const [avg, setAvg] = useState<number | null>(initialAvg);
  const [count, setCount] = useState(initialCount);
  const [stars, setStars] = useState(5);
  const [status, setStatus] = useState('');
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const website = String(data.get('website') ?? '');
    const nombre = String(data.get('nombre') ?? '').trim();
    const correo = String(data.get('correo') ?? '').trim();
    const comentario = String(data.get('comentario') ?? '').trim();

    if (!nombre) {
      setStatus('error|Escribe tu nombre para publicar.');
      return;
    }
    if (!comentario) {
      setStatus('error|Escribe un comentario para publicar.');
      return;
    }

    setStatus('loading|Enviando…');
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: window.location.origin },
        body: JSON.stringify({
          productId,
          nombre,
          correo: correo || null,
          calificacion: stars,
          comentario,
          website,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || 'No se pudo publicar la opinión.');

      const nuevo: Review = {
        id: crypto.randomUUID(),
        productId,
        nombre,
        correo: correo || null,
        calificacion: stars,
        comentario,
        createdAt: new Date().toISOString(),
      };
      const nuevaLista = [nuevo, ...reviews];
      setReviews(nuevaLista);
      setCount(nuevaLista.length);
      const suma = nuevaLista.reduce((acc, r) => acc + r.calificacion, 0);
      setAvg(Math.round((suma / nuevaLista.length) * 10) / 10);
      setSent(true);
      setStatus('ok|¡Gracias! Tu opinión fue publicada.');
      form.reset();
      setStars(5);
    } catch (err) {
      setStatus(`error|${err instanceof Error ? err.message : 'No se pudo publicar la opinión.'}`);
    }
  }

  return (
    <section className="reviews">
      <h2 className="reviews__title">Opiniones de clientes</h2>

      {count > 0 ? (
        <div className="reviews__summary">
          <div className="reviews__score">
            <span className="reviews__avg">{avg != null ? avg.toLocaleString('es-CO') : '—'}</span>
            {avg != null && <Stars value={avg} size={20} />}
            <span className="reviews__count">
              {count} {count === 1 ? 'opinión' : 'opiniones'}
            </span>
          </div>
          <Histogram reviews={reviews} />
        </div>
      ) : (
        <p className="reviews__empty">Aún no hay opiniones. Sé el primero en calificar.</p>
      )}

      {reviews.length > 0 && (
        <div className="reviews__list">
          {reviews.map((r) => (
            <article className="review" key={r.id}>
              <div className="review__head">
                <Initial name={r.nombre} />
                <div className="review__meta">
                  <span className="review__name">{r.nombre}</span>
                  <Stars value={r.calificacion} size={13} />
                </div>
                <time className="review__date">{formatDate(r.createdAt)}</time>
              </div>
              <p className="review__body">{r.comentario}</p>
            </article>
          ))}
        </div>
      )}

      {!sent ? (
        <form className="review-form" onSubmit={onSubmit}>
          <h3 className="review-form__title">Califica este producto</h3>
          <div className="review-form__stars" role="radiogroup" aria-label="Calificación">
            {STARS.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={stars === s}
                aria-label={`${s} estrella${s > 1 ? 's' : ''}`}
                className={s <= stars ? 'star star--on' : 'star'}
                onClick={() => setStars(s)}
              >
                &#9733;
              </button>
            ))}
            <span className="review-form__stars-label">{stars} de 5</span>
          </div>
          <div className="review-form__fields">
            <div className="review-form__row">
              <label className="field">
                <span className="field__label">Nombre *</span>
                <input className="field__input" name="nombre" type="text" required maxLength={120} />
              </label>
              <label className="field">
                <span className="field__label">Correo</span>
                <input className="field__input" name="correo" type="email" maxLength={254} />
              </label>
            </div>
            <label className="field">
              <span className="field__label">Comentario *</span>
              <textarea className="field__input field__textarea" name="comentario" rows={3} required maxLength={2000} />
            </label>
            <input name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="review-form__honeypot" />
          </div>
          {status.startsWith('error|') && <p className="review-form__status review-form__status--error">{status.slice(6)}</p>}
          {status.startsWith('loading|') && <p className="review-form__status">{status.slice(8)}</p>}
          <button className="btn btn--primary" type="submit">Publicar opinión</button>
        </form>
      ) : (
        <div className="review-form__done-card">
          <p className="review-form__done">Tu opinión quedó publicada. ¡Gracias!</p>
        </div>
      )}
    </section>
  );
}
