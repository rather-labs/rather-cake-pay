import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UsersAPI } from '@/lib/api/users'
import { useUserContext } from '@/contexts/UserContext'
import type { User } from '@/types/database'

export function useCurrentUser() {
  const router = useRouter()
  const pathname = usePathname()
  const { walletAddress } = useUserContext()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const hasRedirected = useRef(false)

  useEffect(() => {
    async function checkUser() {
      try {
        setLoading(true)
        setError(null)

        // Skip check on register page to avoid redirect loop
        if (pathname === '/register') {
          setLoading(false)
          return
        }

        if (!walletAddress) {
          // No wallet connected, don't redirect - let user connect
          setLoading(false)
          return
        }

        const supabase = createClient()
        const usersAPI = new UsersAPI(supabase)

        const { data: existingUser } = await usersAPI.getUserByWalletAddress(walletAddress)

        if (!existingUser) {
          // User doesn't exist, redirect to register
          if (!hasRedirected.current && pathname !== '/register') {
            hasRedirected.current = true
            router.push('/register')
          }
          return
        }

        setUser(existingUser)
        hasRedirected.current = false // Reset on success
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    checkUser()
  }, [router, pathname, walletAddress])

  return { user, loading, error }
}

