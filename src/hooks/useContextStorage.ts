/**
 * Hook for managing business context with localStorage and AI analysis
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { BusinessContext, SavedCompany, AnalysisRequest } from '@/lib/types'
import { STORAGE_KEYS, DEFAULT_COMPANY } from '@/lib/constants'
import { normalizeUrl, generateCompanyId } from '@/lib/utils'

export function useContextStorage() {
  const [businessContext, setBusinessContext] = useState<BusinessContext>({})
  const [savedCompanies, setSavedCompanies] = useState<SavedCompany[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      // Load business context
      const storedContext = localStorage.getItem(STORAGE_KEYS.businessContext)
      if (storedContext) {
        setBusinessContext(JSON.parse(storedContext))
      } else {
        // Set default context
        const defaultContext: BusinessContext = {
          companyName: DEFAULT_COMPANY.name,
          companyWebsite: DEFAULT_COMPANY.website,
          productDescription: DEFAULT_COMPANY.description
        }
        setBusinessContext(defaultContext)
        localStorage.setItem(STORAGE_KEYS.businessContext, JSON.stringify(defaultContext))
      }

      // Load saved companies
      const storedCompanies = localStorage.getItem(STORAGE_KEYS.savedCompanies)
      if (storedCompanies) {
        setSavedCompanies(JSON.parse(storedCompanies))
      }
    } catch (error) {
      console.error('Failed to load context from localStorage:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateContext = useCallback((updates: Partial<BusinessContext>) => {
    setBusinessContext(prev => {
      const newContext = { ...prev, ...updates }
      try {
        localStorage.setItem(STORAGE_KEYS.businessContext, JSON.stringify(newContext))
      } catch (error) {
        console.error('Failed to save context:', error)
      }
      return newContext
    })
  }, [])

  const clearContext = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEYS.businessContext)
      localStorage.removeItem(STORAGE_KEYS.analyzedUrl)
      setBusinessContext({})
    } catch (error) {
      console.error('Failed to clear context:', error)
    }
  }, [])

  const analyzeWebsite = useCallback(async (url: string, apiKey?: string) => {
    const normalizedUrl = normalizeUrl(url)
    
    const analysisRequest: AnalysisRequest = {
      url: normalizedUrl,
      ...(apiKey && { apiKey })
    }

    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(analysisRequest),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to analyze website' }))
      throw new Error(error.message || error.error || 'Failed to analyze website')
    }

    const data = await response.json()

    // Map the API response to our context structure
    const contextUpdates: Partial<BusinessContext> = {
      companyName: data.company_name,
      companyWebsite: data.company_url,
      productDescription: data.description,
      targetIndustries: data.industry,
      targetAudience: data.target_audience,
      tone: data.tone,
      products: data.products?.join(', '),
      competitors: data.competitors?.join(', '),
      painPoints: data.pain_points?.join(', '),
      valuePropositions: data.value_propositions?.join(', '),
      useCases: data.use_cases?.join(', '),
      contentThemes: data.content_themes?.join(', '),
    }

    updateContext(contextUpdates)

    // Auto-save as new company profile
    if (contextUpdates.companyName) {
      const existingIndex = savedCompanies.findIndex(
        c => c.name?.toLowerCase() === contextUpdates.companyName?.toLowerCase()
      )

      const newCompany: SavedCompany = {
        id: existingIndex >= 0 ? savedCompanies[existingIndex].id : generateCompanyId(),
        name: contextUpdates.companyName,
        context: { ...businessContext, ...contextUpdates },
        createdAt: existingIndex >= 0 ? savedCompanies[existingIndex].createdAt : new Date().toISOString()
      }

      let updatedCompanies: SavedCompany[]
      if (existingIndex >= 0) {
        updatedCompanies = [...savedCompanies]
        updatedCompanies[existingIndex] = newCompany
      } else {
        updatedCompanies = [...savedCompanies, newCompany]
      }

      setSavedCompanies(updatedCompanies)
      localStorage.setItem(STORAGE_KEYS.savedCompanies, JSON.stringify(updatedCompanies))
    }

    // Store analyzed URL
    localStorage.setItem(STORAGE_KEYS.analyzedUrl, normalizedUrl)
  }, [businessContext, savedCompanies, updateContext])

  const switchToCompany = useCallback((companyId: string) => {
    const company = savedCompanies.find(c => c.id === companyId)
    if (company) {
      updateContext(company.context)
    }
  }, [savedCompanies, updateContext])

  const hasContext = Object.keys(businessContext).some(key => {
    const value = businessContext[key as keyof BusinessContext]
    return value !== undefined && value !== '' && (Array.isArray(value) ? value.length > 0 : true)
  })

  return {
    businessContext,
    updateContext,
    clearContext,
    hasContext,
    isLoading,
    savedCompanies,
    analyzeWebsite,
    switchToCompany,
  }
}