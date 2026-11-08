'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from './api';
import type { User } from '@nexus/shared';
export function useAuth() {
  const client = useQueryClient();
  const router = useRouter();
  const query = useQuery({
    queryKey: ['auth'],
    queryFn: () => api.get<{ user: User }>('/auth/me'),
    retry: false,
    staleTime: 60_000,
  });
  async function logout() {
    await api.post('/auth/logout');
    client.clear();
    router.replace('/login');
  }
  return {
    user: query.data?.user,
    isLoading: query.isLoading,
    error: query.error,
    logout,
    refetch: query.refetch,
  };
}
