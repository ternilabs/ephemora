import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import type { BootstrapResponse } from '../types/bootstrap'

export function useBootstrap() {
  return useQuery({
    queryKey: ['bootstrap'],
    queryFn: () => apiFetch<BootstrapResponse>('/bootstrap'),
    staleTime: 30_000,
  })
}
