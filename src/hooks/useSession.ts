import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { queryClient } from '../lib/queryClient'
import { supabase } from '../lib/supabase'

export function useSession() {
  const query = useQuery({
    queryKey: ['session'],
    queryFn: async (): Promise<Session | null> => {
      const { data } = await supabase.auth.getSession()
      return data.session
    },
    staleTime: Infinity,
  })

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      queryClient.setQueryData(['session'], session)
    })

    return () => {
      data.subscription.unsubscribe()
    }
  }, [])

  return query
}
