import { useSearchParams } from 'react-router-dom';

/**
 * Single source of truth for the acting user id, kept in the URL (?u=2)
 * so it survives navigation between Home / Ratings / Detail pages.
 * Defaults to 1.
 */
export function useUserId(): [number, (id: number) => void] {
  const [params, setParams] = useSearchParams();
  const raw = parseInt(params.get('u') || '1', 10);
  const userId = Number.isFinite(raw) && raw > 0 ? raw : 1;
  const setUserId = (id: number) => {
    const next = new URLSearchParams(params);
    next.set('u', String(id));
    setParams(next);
  };
  return [userId, setUserId];
}
