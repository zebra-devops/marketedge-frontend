'use client'

import { useEffect } from 'react'
import { useAuthContext } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { CogIcon, ArrowPathIcon, ChartPieIcon, DocumentTextIcon } from '@heroicons/react/24/outline'

export default function CausalEdgePage() {
  const { isAuthenticated, isLoading, user, hasPermission } = useAuthContext()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    } else if (!isLoading && isAuthenticated && !hasPermission('read:causal_edge')) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, hasPermission, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  if (!isAuthenticated || !hasPermission('read:causal_edge')) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
              <CogIcon className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Causal Edge</h1>
              <p className="text-gray-600">Business Process & Causal Analysis</p>
            </div>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-6 mb-8">
          <div className="flex items-center gap-3 mb-3">
            <ArrowPathIcon className="h-6 w-6 text-orange-600" />
            <h2 className="text-lg font-semibold text-orange-900">
              Welcome to Causal Edge
            </h2>
          </div>
          <p className="text-orange-800 mb-4">
            Discover the underlying cause-and-effect relationships driving your business performance. 
            Causal Edge helps you identify what truly impacts your bottom line and make data-driven decisions.
          </p>
          <div className="text-sm text-orange-700">
            <strong>Coming Soon:</strong> Advanced causal analysis tools for business optimization
          </div>
        </div>

        {/* Feature Preview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Causal Analysis */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <ArrowPathIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Causal Analysis</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Identify the root causes behind business performance changes and understand 
              what actions drive real results.
            </p>
            <div className="text-sm text-gray-500">
              • Root cause identification
              <br />
              • Impact measurement
              <br />
              • Actionable insights
            </div>
          </div>

          {/* Process Optimization */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <CogIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Process Optimization</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Analyze business processes to identify bottlenecks, inefficiencies, 
              and optimization opportunities.
            </p>
            <div className="text-sm text-gray-500">
              • Workflow analysis
              <br />
              • Bottleneck identification
              <br />
              • Efficiency recommendations
            </div>
          </div>

          {/* Performance Attribution */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <ChartPieIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Performance Attribution</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Understand which factors contribute most to your success and 
              quantify their individual impact.
            </p>
            <div className="text-sm text-gray-500">
              • Factor analysis
              <br />
              • Impact quantification
              <br />
              • Performance drivers
            </div>
          </div>
        </div>

        {/* Demo Status */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <DocumentTextIcon className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Development Status</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Current Phase</h4>
              <p className="text-gray-600 text-sm">
                Foundation development and demo preparation for Odeon Cinema stakeholder presentation.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Next Release</h4>
              <p className="text-gray-600 text-sm">
                Post-demo expansion will include industry-specific causal analysis tools 
                tailored for cinema operations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}