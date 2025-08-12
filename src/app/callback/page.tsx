'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthContext } from '@/hooks/useAuth'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

export default function CallbackPage() {
  const [isProcessing, setIsProcessing] = useState(true)
  const { login } = useAuthContext()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const error = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')

      if (error) {
        toast.error(`Authentication error: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`)
        router.push('/login')
        return
      }

      if (!code) {
        toast.error('No authorization code received')
        router.push('/login')
        return
      }

      try {
        console.log('Processing auth code in callback:', code.substring(0, 10) + '...')
        const redirectUri = `${window.location.origin}/callback`
        await login({ code, redirect_uri: redirectUri })
        toast.success('Login successful!')
        router.push('/dashboard')
      } catch (error) {
        console.error('Login callback failed:', error)
        toast.error('Login failed. Please try again.')
        router.push('/login')
      }
    }

    handleCallback()
  }, [searchParams, router, login])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Processing authentication...</p>
      </div>
    </div>
  )
}