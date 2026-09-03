import { useEffect, useRef, useState } from 'react';

type SearchResult = {
  id: string;
  title: string;
  handle: string;
  thumbnail: string | null;
  priceFormatted: string;
  collectionTitle: string | null;
};

export default function SearchBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [empty, setEmpty] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cierra al hacer clic fuera o con Escape.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // Debounce de la búsqueda en vivo.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      setEmpty(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('error');
        const data = (await res.json()) as { results: SearchResult[] };
        setResults(data.results);
        setEmpty(data.results.length === 0);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query, open]);

  function toggle() {
    setOpen((v) => !v);
  }

  function onSelect() {
    setOpen(false);
    setQuery('');
  }

  return (
    <div className="search" ref={boxRef}>
      <button
        className="search__toggle"
        type="button"
        aria-label="Buscar productos"
        aria-expanded={open}
        onClick={toggle}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </button>

      {open && (
        <div className="search__panel" role="dialog" aria-label="Buscador">
          <input
            ref={inputRef}
            className="search__input"
            type="search"
            placeholder="Buscar productos…"
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="search__results">
            {loading && <div className="search__hint">Buscando…</div>}
            {!loading && empty && query.trim() && (
              <div className="search__hint">Sin resultados para “{query.trim()}”</div>
            )}
            {!loading &&
              results.map((r) => (
                <a
                  key={r.id}
                  className="search__result"
                  href={`/producto/${r.handle}`}
                  onClick={onSelect}
                >
                  {r.thumbnail ? (
                    <img className="search__thumb" src={r.thumbnail} alt="" loading="lazy" />
                  ) : (
                    <span className="search__thumb search__thumb--empty" aria-hidden="true" />
                  )}
                  <span className="search__meta">
                    <span className="search__title">{r.title}</span>
                    {r.collectionTitle && (
                      <span className="search__cat">{r.collectionTitle}</span>
                    )}
                  </span>
                  <span className="search__price">{r.priceFormatted}</span>
                </a>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}