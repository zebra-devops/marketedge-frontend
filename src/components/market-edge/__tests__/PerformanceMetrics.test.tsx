/**
 * Integration test for PerformanceMetrics component
 * 
 * Demonstrates multi-tenant testing with API integration and different industry contexts
 */

import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { rest } from 'msw'
import { server } from '../../../__tests__/mocks/server'
import { mockHandlerUtils } from '../../../__tests__/mocks/handlers'
import { 
  renderWithProviders, 
  renderWithIndustry, 
  renderWithSubscription,
  createMockUser,
  createMockOrganization,
  waitForLoadingToFinish
} from '../../../__tests__/utils/test-utils'
import { PerformanceMetrics } from '../PerformanceMetrics'

describe('PerformanceMetrics Component', () => {
  beforeEach(() => {
    mockHandlerUtils.resetMocks()
  })

  describe('Basic Rendering', () => {
    it('renders loading state initially', () => {
      renderWithProviders(<PerformanceMetrics />)
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
      expect(screen.getByText(/loading performance metrics/i)).toBeInTheDocument()
    })

    it('displays performance metrics after loading', async () => {
      renderWithProviders(<PerformanceMetrics />)
      
      await waitForLoadingToFinish()
      
      expect(screen.getByText(/market performance/i)).toBeInTheDocument()
      expect(screen.getByText(/revenue growth/i)).toBeInTheDocument()
      expect(screen.getByText(/competitor analysis/i)).toBeInTheDocument()
    })

    it('handles API errors gracefully', async () => {
      // Mock API error
      server.use(
        rest.get('*/api/v1/market-edge/dashboard', (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({ error: 'Internal Server Error' })
          )
        })
      )

      renderWithProviders(<PerformanceMetrics />)
      
      await waitFor(() => {
        expect(screen.getByText(/failed to load performance metrics/i)).toBeInTheDocument()
      })
      
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })
  })

  describe('Multi-Tenant Industry Scenarios', () => {
    it('displays hotel-specific metrics for hotel industry', async () => {
      renderWithIndustry(<PerformanceMetrics />, 'hotel')
      
      await waitForLoadingToFinish()
      
      expect(screen.getByText(/occupancy rate/i)).toBeInTheDocument()
      expect(screen.getByText(/adr \(average daily rate\)/i)).toBeInTheDocument()
      expect(screen.getByText(/revpar/i)).toBeInTheDocument()
    })

    it('displays cinema-specific metrics for cinema industry', async () => {
      renderWithIndustry(<PerformanceMetrics />, 'cinema')
      
      await waitForLoadingToFinish()
      
      expect(screen.getByText(/ticket sales/i)).toBeInTheDocument()
      expect(screen.getByText(/box office performance/i)).toBeInTheDocument()
      expect(screen.getByText(/screening utilization/i)).toBeInTheDocument()
    })

    it('displays gym-specific metrics for gym industry', async () => {
      renderWithIndustry(<PerformanceMetrics />, 'gym')
      
      await waitForLoadingToFinish()
      
      expect(screen.getByText(/membership growth/i)).toBeInTheDocument()
      expect(screen.getByText(/facility utilization/i)).toBeInTheDocument()
      expect(screen.getByText(/member retention/i)).toBeInTheDocument()
    })

    it('displays retail-specific metrics for retail industry', async () => {
      renderWithIndustry(<PerformanceMetrics />, 'retail')
      
      await waitForLoadingToFinish()
      
      expect(screen.getByText(/sales per square foot/i)).toBeInTheDocument()
      expect(screen.getByText(/inventory turnover/i)).toBeInTheDocument()
      expect(screen.getByText(/customer conversion/i)).toBeInTheDocument()
    })

    it('displays b2b-specific metrics for b2b service industry', async () => {
      renderWithIndustry(<PerformanceMetrics />, 'b2b_service')
      
      await waitForLoadingToFinish()
      
      expect(screen.getByText(/client acquisition cost/i)).toBeInTheDocument()
      expect(screen.getByText(/monthly recurring revenue/i)).toBeInTheDocument()
      expect(screen.getByText(/churn rate/i)).toBeInTheDocument()
    })
  })

  describe('Subscription Plan Features', () => {
    it('shows basic metrics for basic subscription', async () => {
      renderWithSubscription(<PerformanceMetrics />, 'basic')
      
      await waitForLoadingToFinish()
      
      expect(screen.getByText(/basic metrics/i)).toBeInTheDocument()
      expect(screen.queryByText(/advanced analytics/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/predictive insights/i)).not.toBeInTheDocument()
    })

    it('shows enhanced metrics for professional subscription', async () => {
      renderWithSubscription(<PerformanceMetrics />, 'professional')
      
      await waitForLoadingToFinish()
      
      expect(screen.getByText(/basic metrics/i)).toBeInTheDocument()
      expect(screen.getByText(/advanced analytics/i)).toBeInTheDocument()
      expect(screen.queryByText(/predictive insights/i)).not.toBeInTheDocument()
    })

    it('shows all metrics for enterprise subscription', async () => {
      renderWithSubscription(<PerformanceMetrics />, 'enterprise')
      
      await waitForLoadingToFinish()
      
      expect(screen.getByText(/basic metrics/i)).toBeInTheDocument()
      expect(screen.getByText(/advanced analytics/i)).toBeInTheDocument()
      expect(screen.getByText(/predictive insights/i)).toBeInTheDocument()
      expect(screen.getByText(/custom reporting/i)).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('allows users to refresh metrics', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PerformanceMetrics />)
      
      await waitForLoadingToFinish()
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i })
      await user.click(refreshButton)
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
      
      await waitForLoadingToFinish()
      expect(screen.getByText(/market performance/i)).toBeInTheDocument()
    })

    it('allows users to change time period', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PerformanceMetrics />)
      
      await waitForLoadingToFinish()
      
      const periodSelector = screen.getByRole('combobox', { name: /time period/i })
      await user.selectOptions(periodSelector, '30d')
      
      await waitFor(() => {
        expect(screen.getByText(/last 30 days/i)).toBeInTheDocument()
      })
    })

    it('allows users to export data', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PerformanceMetrics />)
      
      await waitForLoadingToFinish()
      
      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)
      
      expect(screen.getByText(/export options/i)).toBeInTheDocument()
      
      const csvOption = screen.getByRole('button', { name: /export as csv/i })
      await user.click(csvOption)
      
      // Verify download was triggered (this would need to be mocked in real implementation)
      await waitFor(() => {
        expect(screen.getByText(/download started/i)).toBeInTheDocument()
      })
    })
  })

  describe('Feature Flag Integration', () => {
    it('hides advanced features when feature flags are disabled', async () => {
      mockHandlerUtils.setMockFeatureFlags({
        'market_edge_enabled': true,
        'competitive_analysis': false,
        'pricing_optimization': false
      })

      renderWithProviders(<PerformanceMetrics />)
      
      await waitForLoadingToFinish()
      
      expect(screen.getByText(/market performance/i)).toBeInTheDocument()
      expect(screen.queryByText(/competitive analysis/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/pricing optimization/i)).not.toBeInTheDocument()
    })

    it('shows all features when feature flags are enabled', async () => {
      mockHandlerUtils.setMockFeatureFlags({
        'market_edge_enabled': true,
        'competitive_analysis': true,
        'pricing_optimization': true
      })

      renderWithProviders(<PerformanceMetrics />)
      
      await waitForLoadingToFinish()
      
      expect(screen.getByText(/market performance/i)).toBeInTheDocument()
      expect(screen.getByText(/competitive analysis/i)).toBeInTheDocument()
      expect(screen.getByText(/pricing optimization/i)).toBeInTheDocument()
    })
  })

  describe('Rate Limiting Integration', () => {
    it('handles rate limit errors appropriately', async () => {
      server.use(
        rest.get('*/api/v1/market-edge/dashboard', (req, res, ctx) => {
          return res(
            ctx.status(429),
            ctx.json({
              error: 'Rate limit exceeded',
              message: 'Too many requests. Please try again later.',
            }),
            ctx.set('X-RateLimit-Limit', '5000'),
            ctx.set('X-RateLimit-Remaining', '0'),
            ctx.set('X-RateLimit-Reset', String(Date.now() + 3600))
          )
        })
      )

      renderWithProviders(<PerformanceMetrics />)
      
      await waitFor(() => {
        expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument()
        expect(screen.getByText(/please try again later/i)).toBeInTheDocument()
      })
      
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      renderWithProviders(<PerformanceMetrics />)
      
      await waitForLoadingToFinish()
      
      expect(screen.getByRole('region', { name: /performance metrics/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /refresh metrics/i })).toBeInTheDocument()
      
      const charts = screen.getAllByRole('img', { name: /performance chart/i })
      expect(charts.length).toBeGreaterThan(0)
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PerformanceMetrics />)
      
      await waitForLoadingToFinish()
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i })
      refreshButton.focus()
      
      await user.keyboard('{Enter}')
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 })
      Object.defineProperty(window, 'innerHeight', { value: 667 })
      
      renderWithProviders(<PerformanceMetrics />)
      
      await waitForLoadingToFinish()
      
      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument()
      expect(screen.queryByTestId('desktop-layout')).not.toBeInTheDocument()
    })

    it('shows full layout for desktop screens', async () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', { value: 1920 })
      Object.defineProperty(window, 'innerHeight', { value: 1080 })
      
      renderWithProviders(<PerformanceMetrics />)
      
      await waitForLoadingToFinish()
      
      expect(screen.getByTestId('desktop-layout')).toBeInTheDocument()
      expect(screen.queryByTestId('mobile-layout')).not.toBeInTheDocument()
    })
  })
})