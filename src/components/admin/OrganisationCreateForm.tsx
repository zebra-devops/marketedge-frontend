'use client'

import { useState, useEffect } from 'react'
import { OrganisationCreate, IndustryOption } from '@/types/api'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { apiService } from '@/services/api'
import { CheckIcon } from '@heroicons/react/24/outline'

interface OrganisationCreateFormProps {
  onSuccess?: (organisation: any) => void
  onCancel?: () => void
}

export function OrganisationCreateForm({ onSuccess, onCancel }: OrganisationCreateFormProps) {
  const [formData, setFormData] = useState<OrganisationCreate & { applications: string[] }>({
    name: '',
    industry_type: '',
    subscription_plan: 'basic',
    sic_code: '',
    admin_email: '',
    admin_first_name: '',
    admin_last_name: '',
    applications: ['market_edge'], // Default to Market Edge
  })

  const [industries, setIndustries] = useState<IndustryOption[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingIndustries, setLoadingIndustries] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Applications configuration
  const applications = [
    {
      id: 'market_edge',
      name: 'Market Edge',
      description: 'Competitive Intelligence & Market Analysis',
      color: 'from-blue-500 to-green-500',
      defaultForIndustries: ['cinema_exhibition', 'accommodation', 'fitness', 'retail_trade', 'business_services']
    },
    {
      id: 'causal_edge',
      name: 'Causal Edge',
      description: 'Business Process & Causal Analysis',
      color: 'from-orange-500 to-red-500',
      defaultForIndustries: ['cinema_exhibition', 'accommodation', 'business_services']
    },
    {
      id: 'value_edge',
      name: 'Value Edge',
      description: 'Value Engineering & ROI Analysis',
      color: 'from-purple-500 to-teal-500',
      defaultForIndustries: ['cinema_exhibition', 'accommodation', 'business_services']
    }
  ]

  // SIC codes for different industries (focusing on cinema for Odeon demo)
  const sicCodes: Record<string, { code: string; description: string }[]> = {
    cinema: [
      { code: '59140', description: 'Cinema exhibition and operation' },
      { code: '7832', description: 'Motion picture theaters, except drive-in' },
      { code: '7833', description: 'Drive-in motion picture theaters' },
      { code: '7841', description: 'Video tape rental' },
      { code: '5735', description: 'Record and prerecorded tape stores' },
    ],
    hotel: [
      { code: '7011', description: 'Hotels and motels' },
      { code: '7021', description: 'Rooming and boarding houses' },
      { code: '7041', description: 'Organization hotels and lodging houses' },
    ],
    gym: [
      { code: '7991', description: 'Physical fitness facilities' },
      { code: '7997', description: 'Membership sports and recreation clubs' },
      { code: '7999', description: 'Amusement and recreation services' },
    ],
    b2b: [
      { code: '7389', description: 'Business services' },
      { code: '7372', description: 'Prepackaged software' },
      { code: '8742', description: 'Management consulting services' },
    ],
    retail: [
      { code: '5399', description: 'Miscellaneous general merchandise stores' },
      { code: '5411', description: 'Grocery stores' },
      { code: '5944', description: 'Jewelry stores' },
    ],
  }

  useEffect(() => {
    fetchIndustries()
  }, [])

  const fetchIndustries = async () => {
    try {
      setLoadingIndustries(true)
      const data = await apiService.getAvailableIndustries()
      setIndustries(data)
    } catch (err: any) {
      console.error('Error fetching industries:', err)
      setError(err.response?.data?.detail || 'Failed to load industries')
    } finally {
      setLoadingIndustries(false)
    }
  }

  const handleInputChange = (field: keyof (OrganisationCreate & { applications: string[] }), value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }))
    }

    // Auto-select applications and SIC code based on industry
    if (field === 'industry_type') {
      // Auto-select SIC code for cinema (Odeon demo)
      if (value === 'cinema_exhibition') {
        setFormData(prev => ({ ...prev, sic_code: '59140' }))
      }
      
      // Auto-select recommended applications for this industry
      const recommendedApps = applications
        .filter(app => app.defaultForIndustries.includes(value))
        .map(app => app.id)
      
      setFormData(prev => ({ ...prev, applications: recommendedApps }))
    }
  }

  const handleApplicationToggle = (appId: string) => {
    const currentApps = formData.applications || []
    if (currentApps.includes(appId)) {
      setFormData(prev => ({ ...prev, applications: currentApps.filter(id => id !== appId) }))
    } else {
      setFormData(prev => ({ ...prev, applications: [...currentApps, appId] }))
    }
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.name.trim()) {
      errors.name = 'Organisation name is required'
    }

    if (!formData.industry_type) {
      errors.industry_type = 'Industry type is required'
    }

    if (!formData.admin_email.trim()) {
      errors.admin_email = 'Admin email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.admin_email)) {
      errors.admin_email = 'Please enter a valid email address'
    }

    if (!formData.admin_first_name.trim()) {
      errors.admin_first_name = 'Admin first name is required'
    }

    if (!formData.admin_last_name.trim()) {
      errors.admin_last_name = 'Admin last name is required'
    }

    if (!formData.applications || formData.applications.length === 0) {
      errors.applications = 'At least one application must be selected'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const organisation = await apiService.createOrganisation(formData)
      onSuccess?.(organisation)
    } catch (err: any) {
      console.error('Error creating organisation:', err)
      setError(err.response?.data?.detail || 'Failed to create organisation')
    } finally {
      setLoading(false)
    }
  }

  const getAvailableSicCodes = () => {
    return sicCodes[formData.industry_type] || []
  }

  if (loadingIndustries) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
        <span className="ml-2">Loading industries...</span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Create New Organisation</h2>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Organisation Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Organisation Details</h3>
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Organisation Name *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  validationErrors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter organisation name"
              />
              {validationErrors.name && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="industry_type" className="block text-sm font-medium text-gray-700 mb-1">
                Industry Type *
              </label>
              <select
                id="industry_type"
                value={formData.industry_type}
                onChange={(e) => handleInputChange('industry_type', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  validationErrors.industry_type ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select an industry</option>
                {industries.map((industry) => (
                  <option key={industry.value} value={industry.value}>
                    {industry.label}
                  </option>
                ))}
              </select>
              {validationErrors.industry_type && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.industry_type}</p>
              )}
            </div>

            {formData.industry_type && (
              <div>
                <label htmlFor="sic_code" className="block text-sm font-medium text-gray-700 mb-1">
                  SIC Code
                </label>
                <select
                  id="sic_code"
                  value={formData.sic_code}
                  onChange={(e) => handleInputChange('sic_code', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select SIC Code (optional)</option>
                  {getAvailableSicCodes().map((sic) => (
                    <option key={sic.code} value={sic.code}>
                      {sic.code} - {sic.description}
                    </option>
                  ))}
                </select>
                {formData.industry_type === 'cinema' && formData.sic_code === '59140' && (
                  <p className="text-sm text-green-600 mt-1">
                    Perfect for Odeon cinema! This SIC code is specifically for cinema exhibition and operation.
                  </p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="subscription_plan" className="block text-sm font-medium text-gray-700 mb-1">
                Subscription Plan
              </label>
              <select
                id="subscription_plan"
                value={formData.subscription_plan}
                onChange={(e) => handleInputChange('subscription_plan', e.target.value as 'basic' | 'professional' | 'enterprise')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="basic">Basic</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>

          {/* Admin User Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Organisation Admin</h3>
            
            <div>
              <label htmlFor="admin_email" className="block text-sm font-medium text-gray-700 mb-1">
                Admin Email *
              </label>
              <input
                type="email"
                id="admin_email"
                value={formData.admin_email}
                onChange={(e) => handleInputChange('admin_email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  validationErrors.admin_email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="admin@example.com"
              />
              {validationErrors.admin_email && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.admin_email}</p>
              )}
            </div>

            <div>
              <label htmlFor="admin_first_name" className="block text-sm font-medium text-gray-700 mb-1">
                Admin First Name *
              </label>
              <input
                type="text"
                id="admin_first_name"
                value={formData.admin_first_name}
                onChange={(e) => handleInputChange('admin_first_name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  validationErrors.admin_first_name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter first name"
              />
              {validationErrors.admin_first_name && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.admin_first_name}</p>
              )}
            </div>

            <div>
              <label htmlFor="admin_last_name" className="block text-sm font-medium text-gray-700 mb-1">
                Admin Last Name *
              </label>
              <input
                type="text"
                id="admin_last_name"
                value={formData.admin_last_name}
                onChange={(e) => handleInputChange('admin_last_name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  validationErrors.admin_last_name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter last name"
              />
              {validationErrors.admin_last_name && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.admin_last_name}</p>
              )}
            </div>
          </div>
        </div>

        {/* Application Selection */}
        <div className="mt-8 border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Application Access</h3>
          <p className="text-sm text-gray-600 mb-4">
            Select which applications this organization will have access to:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {applications.map((app) => {
              const isSelected = formData.applications?.includes(app.id) || false
              const isRecommended = formData.industry_type && app.defaultForIndustries.includes(formData.industry_type)
              
              return (
                <div
                  key={app.id}
                  className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleApplicationToggle(app.id)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${app.color} flex items-center justify-center flex-shrink-0`}>
                      <CheckIcon className="h-5 w-5 text-white" />
                    </div>
                    <h5 className="font-medium text-gray-900">{app.name}</h5>
                    {isSelected && (
                      <div className="ml-auto">
                        <CheckIcon className="h-5 w-5 text-blue-600" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{app.description}</p>
                  
                  {isRecommended && (
                    <span className="absolute top-2 right-2 bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                      Recommended
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          
          {validationErrors.applications && (
            <p className="text-sm text-red-600 mt-2">{validationErrors.applications}</p>
          )}
        </div>

        <div className="mt-8 flex justify-end space-x-3">
          {onCancel && (
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          )}
          
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <LoadingSpinner className="w-4 h-4 mr-2" />
                Creating...
              </>
            ) : (
              'Create Organisation'
            )}
          </Button>
        </div>
      </div>
    </form>
  )
}