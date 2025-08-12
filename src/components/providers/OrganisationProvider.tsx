'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { Organisation, IndustryOption } from '@/types/api'
import { apiService } from '@/services/api'
import { useAuthContext } from '@/hooks/useAuth'

interface OrganisationContextType {
  // Current user's organisation
  currentOrganisation: Organisation | null
  
  // All organisations (Super Admin only)
  allOrganisations: Organisation[]
  
  // Available industries
  availableIndustries: IndustryOption[]
  
  // Organizations user has access to
  accessibleOrganisations: Organisation[]
  
  // Loading states
  isLoadingCurrent: boolean
  isLoadingAll: boolean
  isLoadingIndustries: boolean
  isLoadingAccessible: boolean
  isSwitching: boolean
  
  // Actions
  refreshCurrentOrganisation: () => Promise<void>
  refreshAllOrganisations: () => Promise<void>
  createOrganisation: (data: any) => Promise<Organisation>
  switchOrganisation: (orgId: string) => Promise<void>
  refreshAccessibleOrganisations: () => Promise<void>
  
  // Utilities
  canManageOrganisations: boolean
  isSuperAdmin: boolean
}

const OrganisationContext = createContext<OrganisationContextType | undefined>(undefined)

export const useOrganisationContext = (): OrganisationContextType => {
  const context = useContext(OrganisationContext)
  if (!context) {
    throw new Error('useOrganisationContext must be used within an OrganisationProvider')
  }
  return context
}

interface OrganisationProviderProps {
  children: React.ReactNode
}

export const OrganisationProvider: React.FC<OrganisationProviderProps> = ({ children }) => {
  const { user, isAuthenticated, hasRole } = useAuthContext()
  
  const [currentOrganisation, setCurrentOrganisation] = useState<Organisation | null>(null)
  const [allOrganisations, setAllOrganisations] = useState<Organisation[]>([])
  const [availableIndustries, setAvailableIndustries] = useState<IndustryOption[]>([])
  const [accessibleOrganisations, setAccessibleOrganisations] = useState<Organisation[]>([])
  
  const [isLoadingCurrent, setIsLoadingCurrent] = useState(false)
  const [isLoadingAll, setIsLoadingAll] = useState(false)
  const [isLoadingIndustries, setIsLoadingIndustries] = useState(false)
  const [isLoadingAccessible, setIsLoadingAccessible] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)

  const isSuperAdmin = hasRole('admin') // In this system, admin role can create organisations
  const canManageOrganisations = isSuperAdmin

  // Load selected organization from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedOrgId = localStorage.getItem('selectedOrganisationId')
      if (savedOrgId && currentOrganisation?.id !== savedOrgId) {
        // Will be loaded when organizations are fetched
      }
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated && user) {
      // Always load industries
      loadAvailableIndustries()
      
      // Load accessible organizations for all users
      refreshAccessibleOrganisations()
      
      // Load current organisation for regular users
      if (!isSuperAdmin) {
        refreshCurrentOrganisation()
      }
      
      // Load all organisations for super admins
      if (isSuperAdmin) {
        refreshAllOrganisations()
      }
    }
  }, [isAuthenticated, user, isSuperAdmin])

  const loadAvailableIndustries = async () => {
    try {
      setIsLoadingIndustries(true)
      const industries = await apiService.getAvailableIndustries()
      setAvailableIndustries(industries)
    } catch (error) {
      console.error('Failed to load industries:', error)
    } finally {
      setIsLoadingIndustries(false)
    }
  }

  const refreshCurrentOrganisation = async () => {
    if (!isAuthenticated) return

    try {
      setIsLoadingCurrent(true)
      const organisation = await apiService.getCurrentOrganisation()
      setCurrentOrganisation(organisation)
    } catch (error) {
      console.error('Failed to load current organisation:', error)
      setCurrentOrganisation(null)
    } finally {
      setIsLoadingCurrent(false)
    }
  }

  const refreshAllOrganisations = async () => {
    if (!isSuperAdmin || !isAuthenticated) return

    try {
      setIsLoadingAll(true)
      const organisations = await apiService.getAllOrganisations()
      setAllOrganisations(organisations)
    } catch (error) {
      console.error('Failed to load all organisations:', error)
      setAllOrganisations([])
    } finally {
      setIsLoadingAll(false)
    }
  }

  const createOrganisation = async (data: any): Promise<Organisation> => {
    if (!isSuperAdmin) {
      throw new Error('Only Super Admins can create organisations')
    }

    try {
      const newOrganisation = await apiService.createOrganisation(data)
      
      // Refresh the list after creation
      await refreshAllOrganisations()
      await refreshAccessibleOrganisations()
      
      return newOrganisation
    } catch (error) {
      console.error('Failed to create organisation:', error)
      throw error
    }
  }

  const refreshAccessibleOrganisations = async () => {
    if (!isAuthenticated) return

    try {
      setIsLoadingAccessible(true)
      
      // For Super Admin, accessible orgs are all orgs
      if (isSuperAdmin) {
        const organisations = await apiService.getAllOrganisations()
        setAccessibleOrganisations(organisations)
      } else {
        // For regular users, get organizations they have access to
        const organisations = await apiService.getUserAccessibleOrganisations()
        setAccessibleOrganisations(organisations)
      }
    } catch (error) {
      console.error('Failed to load accessible organisations:', error)
      setAccessibleOrganisations([])
    } finally {
      setIsLoadingAccessible(false)
    }
  }

  const switchOrganisation = async (orgId: string) => {
    if (!isAuthenticated) return

    try {
      setIsSwitching(true)
      
      // Validate user has access to this organization
      const hasAccess = accessibleOrganisations.some(org => org.id === orgId)
      if (!hasAccess) {
        throw new Error('You do not have access to this organization')
      }

      // Clear any cached data from previous organization context
      if (typeof window !== 'undefined') {
        // Clear any organization-specific cache keys
        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && (key.includes('org_') || key.includes('tenant_'))) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
      }

      // Set the new organization context
      const targetOrg = accessibleOrganisations.find(org => org.id === orgId)
      if (targetOrg) {
        setCurrentOrganisation(targetOrg)
        
        // Persist selection
        if (typeof window !== 'undefined') {
          localStorage.setItem('selectedOrganisationId', orgId)
        }

        // Update API service organization context
        apiService.setOrganizationContext(orgId)

        // Audit log the organization switch
        try {
          await apiService.logOrganizationSwitch(orgId)
        } catch (auditError) {
          console.warn('Failed to log organization switch:', auditError)
          // Don't fail the switch if audit logging fails
        }

        // Trigger data refresh for current page
        window.dispatchEvent(new CustomEvent('organizationChanged', { 
          detail: { organizationId: orgId, organization: targetOrg } 
        }))
      }
    } catch (error) {
      console.error('Failed to switch organisation:', error)
      throw error
    } finally {
      setIsSwitching(false)
    }
  }

  const contextValue: OrganisationContextType = {
    currentOrganisation,
    allOrganisations,
    availableIndustries,
    accessibleOrganisations,
    isLoadingCurrent,
    isLoadingAll,
    isLoadingIndustries,
    isLoadingAccessible,
    isSwitching,
    refreshCurrentOrganisation,
    refreshAllOrganisations,
    createOrganisation,
    switchOrganisation,
    refreshAccessibleOrganisations,
    canManageOrganisations,
    isSuperAdmin
  }

  return (
    <OrganisationContext.Provider value={contextValue}>
      {children}
    </OrganisationContext.Provider>
  )
}