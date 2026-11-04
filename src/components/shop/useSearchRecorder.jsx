import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function useSearchRecorder(user) {
  const queryClient = useQueryClient();

  // Solo se invoca al confirmar una búsqueda, nunca al cambiar el texto.
  const saveSearch = useCallback(async (value) => {
    const query = value.trim().replace(/\s+/g, ' ');
    if (!user?.email || !query) return;

    await base44.entities.SearchHistory.create({ user_email: user.email, query, search_count: 1 });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['search-history', user.email] }),
      queryClient.invalidateQueries({ queryKey: ['search-analytics'] }),
    ]);
  }, [user?.email, queryClient]);

  return { saveSearch };
}