import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function useSearchRecorder(inputValue, user) {
  const queryClient = useQueryClient();
  const lastSearch = useRef({ key: '', submitted: false });
  const editSearch = useCallback(() => {
    lastSearch.current = { key: '', submitted: false };
  }, []);
  const saveSearch = useCallback(async (value, source = 'blur') => {
    const query = value.trim().replace(/\s+/g, ' ');
    if (!user?.email || !query) return;
    const key = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const previous = lastSearch.current;
    if (previous.key === key && (source !== 'submit' || !previous.submitted)) {
      if (source === 'submit') previous.submitted = true;
      return;
    }
    const attempt = { key, submitted: source === 'submit' };
    lastSearch.current = attempt;
    let saved = false;
    try {
      // Un registro inmutable por búsqueda: su fecha y su conteo no se sobrescriben.
      await base44.entities.SearchHistory.create({ user_email: user.email, query, search_count: 1 });
      saved = true;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['search-history', user.email] }),
        queryClient.invalidateQueries({ queryKey: ['search-analytics'] }),
      ]);
    } finally {
      if (!saved && lastSearch.current === attempt) editSearch();
    }
  }, [user?.email, queryClient, editSearch]);

  useEffect(() => {
    if (inputValue.trim().length < 2) return;
    const timer = setTimeout(() => { void saveSearch(inputValue, 'auto'); }, 1000);
    return () => clearTimeout(timer);
  }, [inputValue, saveSearch]);

  return { saveSearch, editSearch };
}