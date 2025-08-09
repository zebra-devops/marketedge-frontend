'use client'

import { useAuthContext } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useQuery } from 'react-query'
import { apiService } from '@/services/api'
import { Tool, Organisation } from '@/types/api'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Button from '@/components/ui/Button'
import DashboardLayout from '@/components/layout/DashboardLayout'

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuthContext()
  const router = useRouter()

  const { data: tools, isLoading: toolsLoading } = useQuery<Tool[]>(
    'tools',
    () => apiService.get('/tools'),
    { enabled: !!user }
  )

  const { data: organisation, isLoading: orgLoading } = useQuery<Organisation>(
    'organisation',
    () => apiService.get('/organisations/current'),
    { enabled: !!user }
  )

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  if (authLoading || !user) {
    return <LoadingSpinner />
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user.first_name}!
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Access your business intelligence tools and manage your account.
          </p>
        </div>

        {orgLoading ? (
          <LoadingSpinner />
        ) : organisation ? (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Organisation Details</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="text-sm text-gray-900">{organisation.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Industry</dt>
                <dd className="text-sm text-gray-900">{organisation.industry || 'Not specified'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Subscription Plan</dt>
                <dd className="text-sm text-gray-900 capitalize">{organisation.subscription_plan}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="text-sm text-gray-900">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    organisation.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {organisation.is_active ? 'Active' : 'Inactive'}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        ) : null}

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Available Tools</h2>
          {toolsLoading ? (
            <LoadingSpinner />
          ) : tools && tools.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tools.map((tool) => (
                <div
                  key={tool.id}
                  className={`border rounded-lg p-4 ${
                    tool.has_access 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <h3 className="font-medium text-gray-900">{tool.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{tool.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-500">v{tool.version}</span>
                    {tool.has_access ? (
                      <Button size="sm">Access Tool</Button>
                    ) : (
                      <Button size="sm" variant="secondary" disabled>
                        No Access
                      </Button>
                    )}
                  </div>
                  {tool.has_access && tool.subscription_tier && (
                    <div className="mt-2">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {tool.subscription_tier}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No tools available.</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}