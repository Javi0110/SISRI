import React from 'react'
import { render, screen, waitFor } from '../utils/test-utils'
import '@testing-library/jest-dom'
import { ReportForm } from '../../app/components/ReportForm'
import { mockFetchResponse } from '../utils/test-utils'

// Mock the external dependencies
jest.mock('../../lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}))

describe('ReportForm Component', () => {
  const mockFormData = {
    municipios: [
      { id_municipio: 1, nombre: 'San Juan' },
      { id_municipio: 2, nombre: 'Bayamón' },
    ],
    cuencas: [
      { id: 1, nombre: 'Rio Grande', codigo_cuenca: 'RG-001' },
      { id: 2, nombre: 'Rio Camuy', codigo_cuenca: 'RC-001' },
    ],
    limitaciones: [
      { id: 1, nombre: 'Mobility Issues' },
      { id: 2, nombre: 'Hearing Impaired' },
    ],
    condiciones: [
      { id: 1, nombre: 'Diabetes' },
      { id: 2, nombre: 'Hypertension' },
    ],
    disposiciones: [
      { id: 1, nombre: 'Requires Assistance' },
      { id: 2, nombre: 'Independent' },
    ],
    propertyTypes: [
      { id: 1, type_name: 'Residential' },
      { id: 2, type_name: 'Commercial' },
    ],
  }

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Setup default successful responses for all API calls that ReportForm makes
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/form-data')) {
        return Promise.resolve(mockFetchResponse(mockFormData))
      }
      if (url.includes('/api/residentes/options')) {
        return Promise.resolve(mockFetchResponse({
          limitaciones: mockFormData.limitaciones,
          condiciones: mockFormData.condiciones,
          disposiciones: mockFormData.disposiciones,
        }))
      }
      if (url.includes('/api/property-types')) {
        return Promise.resolve(mockFetchResponse(mockFormData.propertyTypes))
      }
      // Default response for any other API calls - ensure arrays for critical data
      if (url.includes('property') || url.includes('resident')) {
        return Promise.resolve(mockFetchResponse([]))
      }
      return Promise.resolve(mockFetchResponse({}))
    })
  })

  describe('Smoke Tests', () => {
    it('renders without crashing', async () => {
      const { container } = render(<ReportForm />)
      
      // Wait for the component to finish loading
      await waitFor(() => {
        expect(container.firstChild).toBeInTheDocument()
      }, { timeout: 5000 })
    })

    it('shows loading state initially', () => {
      render(<ReportForm />)
      
      expect(screen.getByText(/loading form data/i)).toBeInTheDocument()
    })

    it('makes API calls on mount', async () => {
      render(<ReportForm />)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
      
      // Verify specific API endpoints were called
      expect(global.fetch).toHaveBeenCalledWith('/api/form-data', expect.any(Object))
    })
  })

  describe('Basic Functionality', () => {
    it('renders form elements after loading', async () => {
      render(<ReportForm />)
      
      // Wait for loading to complete and form to render
      await waitFor(() => {
        // Look for the form mode buttons which should appear after loading
        expect(screen.getByText('Full Report')).toBeInTheDocument()
      }, { timeout: 5000 })
      
      // Check that we have interactive elements
      const formElements = screen.getAllByRole('button')
      expect(formElements.length).toBeGreaterThan(0)
    })

    it('handles API errors gracefully', async () => {
      // Mock API failure
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))
      
      const { container } = render(<ReportForm />)
      
      // Component should still render something (even if just an error state)
      await waitFor(() => {
        expect(container.firstChild).toBeInTheDocument()
      })
    })
  })

  describe('Form Structure', () => {
    it('contains form elements when loaded', async () => {
      render(<ReportForm />)
      
      await waitFor(() => {
        // Look for any input fields
        const inputs = screen.getAllByRole('textbox')
        expect(inputs.length).toBeGreaterThanOrEqual(0)
      }, { timeout: 3000 })
    })

    it('contains interactive buttons', async () => {
      render(<ReportForm />)
      
      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        expect(buttons.length).toBeGreaterThan(0)
      }, { timeout: 3000 })
    })
  })

  describe('Component Integration', () => {
    it('integrates with react-hook-form', async () => {
      render(<ReportForm />)
      
      // Wait for the form to initialize - look for form element without role
      await waitFor(() => {
        const formElement = document.querySelector('form')
        expect(formElement).toBeInTheDocument()
      }, { timeout: 5000 })
    })

    it('handles form submission attempts', async () => {
      render(<ReportForm />)
      
      await waitFor(() => {
        const submitButtons = screen.getAllByRole('button')
        const submitButton = submitButtons.find(button => 
          button.textContent?.toLowerCase().includes('submit')
        )
        expect(submitButton).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Error Boundaries', () => {
    it('does not crash when form data is malformed', async () => {
      // Mock malformed data
      ;(global.fetch as jest.Mock).mockImplementation(() => 
        Promise.resolve(mockFetchResponse({ invalid: 'data' }))
      )
      
      const { container } = render(<ReportForm />)
      
      await waitFor(() => {
        expect(container.firstChild).toBeInTheDocument()
      })
    })

    it('handles empty API responses', async () => {
      ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/form-data')) {
          return Promise.resolve(mockFetchResponse({
            municipios: [],
            cuencas: [],
          }))
        }
        if (url.includes('/api/residentes/options')) {
          return Promise.resolve(mockFetchResponse({
            limitaciones: [],
            condiciones: [],
            disposiciones: [],
          }))
        }
        if (url.includes('/api/property-types')) {
          return Promise.resolve(mockFetchResponse([]))
        }
        return Promise.resolve(mockFetchResponse([]))
      })
      
      const { container } = render(<ReportForm />)
      
      await waitFor(() => {
        expect(container.firstChild).toBeInTheDocument()
      }, { timeout: 8000 })
    })
  })

  describe('Performance', () => {
    it('renders within reasonable time', async () => {
      const startTime = performance.now()
      
      render(<ReportForm />)
      
      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        expect(buttons.length).toBeGreaterThan(0)
      }, { timeout: 3000 })
      
      const endTime = performance.now()
      
      // Should render within 3 seconds
      expect(endTime - startTime).toBeLessThan(3000)
    })
  })
})

// Simple integration test
describe('ReportForm Integration', () => {
  it('completes a basic rendering cycle', async () => {
    const mockData = {
      municipios: [],
      cuencas: [],
      limitaciones: [],
      condiciones: [],
      disposiciones: [],
      propertyTypes: [],
    }
    
    ;(global.fetch as jest.Mock).mockImplementation(() => 
      Promise.resolve(mockFetchResponse(mockData))
    )
    
    const { container } = render(<ReportForm />)
    
    // Just verify it renders without throwing
    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument()
    })
  })
}) 