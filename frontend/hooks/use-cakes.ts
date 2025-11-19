import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CakesAPI } from '@/lib/api/cakes'
import { Cake } from '@/types/database'

export function useCakes(userId: number) {
  const [cakes, setCakes] = useState<Cake[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchCakes() {
      try {
        setLoading(true)
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
    }

    fetchCakes()
  }, [userId])

  return { cakes, loading, error }
}
