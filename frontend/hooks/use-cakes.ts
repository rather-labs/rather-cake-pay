import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CakesAPI } from '@/lib/api/cakes'
import { Cake } from '@/types/database'

export function useCakes(userId: number) {
  const [cakes, setCakes] = useState<Cake[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchCakes = useCallback(async () => {
      try {
        setLoading(true)
      setError(null)
        const supabase = createClient()
        const cakesAPI = new CakesAPI(supabase)

        const { data, error } = await cakesAPI.getUserCakes(userId)

        if (error) throw error

        setCakes(data || [])
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
  }, [userId])

  useEffect(() => {
    fetchCakes()
  }, [fetchCakes])

  return { cakes, loading, error, refresh: fetchCakes }
}
