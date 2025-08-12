import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { ToastProvider } from '@/components/providers/ToastProvider'
import { OrganisationProvider } from '@/components/providers/OrganisationProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Platform Wrapper - Business Intelligence Suite',
  description: 'Multi-tenant platform for business intelligence tools',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          <AuthProvider>
            <OrganisationProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </OrganisationProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}