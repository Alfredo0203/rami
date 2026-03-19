import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Returns the current user (or null for guests).
 * isGuest = true when not authenticated.
 */
export function useCurrentUser() {
  const { data: user = null, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me().catch(() => null),
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  return { user, isGuest: !isLoading && !user, isLoading };
}