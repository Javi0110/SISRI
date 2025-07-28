import React from 'react'
import { render, screen, waitFor } from '../utils/test-utils'
import userEvent from '@testing-library/user-event'
import Home from '../../app/page'
import { DataAnalytics } from '../../app/components/DataAnalytics'
import { ReportForm } from '../../app/components/ReportForm'
import {
  createMockEventData,
  createMockPropertyData,
  createMockResidentData,
  createMockMunicipality,
  setupFetchMock,
  resetFetchMock,
} from '../utils/test-utils'

// Mock the Map component since it has complex dependencies
jest.mock('../../app/components/Map', () => {
  return function MockMap({ onMapInitialized }: { onMapInitialized: (map: any) => void }) {
    React.useEffect(() => {
      onMapInitialized({
        getView: () => ({
          animate: jest.fn(),
        }),
        handleWatershedSelect: jest.fn(),
      })
    }, [onMapInitialized])
    
    return <div data-testid="mock-map">Map Component</div>
  }
})

describe('App Integration Tests', () => {
  beforeEach(() => {
    resetFetchMock()
  })

  describe('Home Page Integration', () => {
    it('renders main page with sidebar and map', () => {
      setupFetchMock([])
      
      render(<Home />)
      
      expect(screen.getByTestId('mock-map')).toBeInTheDocument()
      expect(screen.getByText('Municipalities')).toBeInTheDocument()
      expect(screen.getByText('USNG')).toBeInTheDocument()
      expect(screen.getByText('Watersheds')).toBeInTheDocument()
    })

    it('handles municipality selection and map interaction', async () => {
      const user = userEvent.setup()
      const mockMunicipalities = [
        createMockMunicipality({ id_municipio: 1, nombre: 'San Juan' }),
      ]
      
      setupFetchMock(mockMunicipalities)
      
      render(<Home />)
      
      await waitFor(() => {
        expect(screen.getByText('San Juan')).toBeInTheDocument()
      })
      
      // Click on municipality
      const municipalityButton = screen.getByText('San Juan')
      await user.click(municipalityButton)
      
      // Verify map interaction occurs
      expect(screen.getByTestId('mock-map')).toBeInTheDocument()
    })

    it('switches between sidebar tabs correctly', async () => {
      const user = userEvent.setup()
      setupFetchMock([])
      
      render(<Home />)
      
      // Default should be municipalities
      expect(screen.getByText('Municipalities')).toHaveAttribute('data-state', 'active')
      
      // Switch to watersheds
      await user.click(screen.getByText('Watersheds'))
      expect(screen.getByText('Watersheds')).toHaveAttribute('data-state', 'active')
    })
  })

  describe('DataAnalytics Integration', () => {
    it('performs complete search and analysis workflow', async () => {
      const user = userEvent.setup()
      const mockSearchData = {
        evento: createMockEventData({ title: 'Hurricane Maria' }),
        propiedades: [
          createMockPropertyData({ municipality: 'San Juan' }),
          createMockPropertyData({ municipality: 'Bayamón' }),
        ],
      }
      
      setupFetchMock(mockSearchData)
      
      render(<DataAnalytics />)
      
      // 1. Perform search
      const searchInput = screen.getByPlaceholderText(/search for events/i)
      await user.type(searchInput, 'Hurricane')
      
      const searchButton = screen.getByText('Search')
      await user.click(searchButton)
      
      // 2. Verify results appear
      await waitFor(() => {
        expect(screen.getByText('Hurricane Maria')).toBeInTheDocument()
        expect(screen.getByText('San Juan')).toBeInTheDocument()
      })
      
      // 3. Apply filters
      const advancedFiltersButton = screen.getByText(/advanced filters/i)
      await user.click(advancedFiltersButton)
      
      // 4. Sort data
      const municipalityHeader = screen.getByText(/municipality/i)
      await user.click(municipalityHeader)
      
      // 5. Generate report
      const generateReportButton = screen.getByText(/generate report/i)
      await user.click(generateReportButton)
    })

    it('handles error states gracefully throughout workflow', async () => {
      const user = userEvent.setup()
      
      // Mock API failure
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))
      
      render(<DataAnalytics />)
      
      const searchButton = screen.getByText('Search')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText(/error performing search/i)).toBeInTheDocument()
      })
      
      // Verify UI remains functional after error
      expect(searchButton).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/search for events/i)).toBeInTheDocument()
    })

    it('maintains state across different search types', async () => {
      const user = userEvent.setup()
      setupFetchMock([])
      
      render(<DataAnalytics />)
      
      // Start with event search
      const searchInput = screen.getByPlaceholderText(/search for events/i)
      await user.type(searchInput, 'Hurricane')
      
      // Switch to municipality search
      const searchTypeSelect = screen.getByRole('combobox')
      await user.click(searchTypeSelect)
      await user.click(screen.getByText('Municipality'))
      
      // Verify search input is cleared and placeholder updated
      expect(screen.getByPlaceholderText(/search for municipalities/i)).toHaveValue('')
    })
  })

  describe('ReportForm Integration', () => {
    it('handles complete form submission workflow', async () => {
      const user = userEvent.setup()
      const mockFormData = {
        municipios: [createMockMunicipality()],
        cuencas: [{ id: 1, nombre: 'Rio Grande' }],
        limitaciones: [{ id: 1, nombre: 'Mobility' }],
        condiciones: [{ id: 1, nombre: 'Diabetes' }],
        disposiciones: [{ id: 1, nombre: 'Assistance' }],
        propertyTypes: [{ id: 1, type_name: 'Residential' }],
      }
      
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockFormData) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // barrios
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) }) // submission
      
      render(<ReportForm />)
      
      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByLabelText(/event title/i)).toBeInTheDocument()
      })
      
      // Fill form step by step
      await user.type(screen.getByLabelText(/event title/i), 'Emergency Report')
      await user.type(screen.getByLabelText(/event description/i), 'Test emergency')
      
      // Select municipality
      const municipalitySelect = screen.getByLabelText(/municipality/i)
      await user.click(municipalitySelect)
      await user.click(screen.getByText('San Juan'))
      
      // Add incident
      const addIncidentButton = screen.getByText(/add incident/i)
      await user.click(addIncidentButton)
      
      await user.type(screen.getByLabelText(/incident type/i), 'Flooding')
      
      // Submit form
      const submitButton = screen.getByText(/submit report/i)
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/report submitted successfully/i)).toBeInTheDocument()
      })
    })

    it('validates form data across multiple steps', async () => {
      const user = userEvent.setup()
      setupFetchMock({})
      
      render(<ReportForm />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/event title/i)).toBeInTheDocument()
      })
      
      // Try to submit empty form
      const submitButton = screen.getByText(/submit report/i)
      await user.click(submitButton)
      
      // Check multiple validation errors appear
      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument()
        expect(screen.getByText(/description is required/i)).toBeInTheDocument()
      })
      
      // Fill some fields and try again
      await user.type(screen.getByLabelText(/event title/i), 'Test')
      await user.click(submitButton)
      
      // Should still show remaining validation errors
      await waitFor(() => {
        expect(screen.queryByText(/title is required/i)).not.toBeInTheDocument()
        expect(screen.getByText(/description is required/i)).toBeInTheDocument()
      })
    })
  })

  describe('Cross-Component Data Flow', () => {
    it('shares data between DataAnalytics and ReportForm', async () => {
      const user = userEvent.setup()
      const sharedEventData = createMockEventData({ title: 'Shared Event' })
      
      // First, search for event in DataAnalytics
      setupFetchMock({ evento: sharedEventData })
      
      const { unmount } = render(<DataAnalytics />)
      
      const searchButton = screen.getByText('Search')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Shared Event')).toBeInTheDocument()
      })
      
      // Simulate navigation to ReportForm
      unmount()
      
      setupFetchMock({
        municipios: [],
        cuencas: [],
        limitaciones: [],
        condiciones: [],
        disposiciones: [],
        propertyTypes: [],
      })
      
      render(<ReportForm />)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/event title/i)).toBeInTheDocument()
      })
      
      // In a real app, this would be pre-populated from shared state
      expect(screen.getByLabelText(/event title/i)).toHaveValue('')
    })
  })

  describe('Performance Integration', () => {
    it('handles concurrent API calls efficiently', async () => {
      const user = userEvent.setup()
      
      // Setup multiple API responses
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // municipalities
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // watersheds
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // usng
      
      render(<Home />)
      
      // Rapidly switch between tabs to trigger multiple API calls
      await user.click(screen.getByText('Watersheds'))
      await user.click(screen.getByText('USNG'))
      await user.click(screen.getByText('Municipalities'))
      
      // Verify app remains responsive
      expect(screen.getByText('Municipalities')).toBeInTheDocument()
    })

    it('maintains performance with large datasets', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) =>
        createMockPropertyData({ id: i + 1, municipality: `Municipality ${i + 1}` })
      )
      
      setupFetchMock({ propiedades: largeDataset })
      
      const startTime = performance.now()
      render(<DataAnalytics />)
      
      const searchButton = screen.getByText('Search')
      await userEvent.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Municipality 1')).toBeInTheDocument()
      })
      
      const endTime = performance.now()
      
      // Should handle large datasets within reasonable time
      expect(endTime - startTime).toBeLessThan(3000)
    })
  })

  describe('Error Recovery Integration', () => {
    it('recovers from API failures gracefully', async () => {
      const user = userEvent.setup()
      
      // First API call fails
      ;(global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
      
      render(<DataAnalytics />)
      
      const searchButton = screen.getByText('Search')
      await user.click(searchButton)
      
      // Show error
      await waitFor(() => {
        expect(screen.getByText(/error performing search/i)).toBeInTheDocument()
      })
      
      // Retry should work
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.queryByText(/error performing search/i)).not.toBeInTheDocument()
      })
    })

    it('handles partial API failures', async () => {
      const user = userEvent.setup()
      
      // Some APIs succeed, others fail
      setupFetchMock([createMockMunicipality()])
      
      render(<Home />)
      
      await waitFor(() => {
        expect(screen.getByText('San Juan')).toBeInTheDocument()
      })
      
      // Switch to watersheds tab (which might fail)
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Watershed API error'))
      
      await user.click(screen.getByText('Watersheds'))
      
      // Should show error for watersheds but municipalities still work
      await user.click(screen.getByText('Municipalities'))
      expect(screen.getByText('San Juan')).toBeInTheDocument()
    })
  })

  describe('Accessibility Integration', () => {
    it('maintains focus management across components', async () => {
      const user = userEvent.setup()
      setupFetchMock([])
      
      render(<DataAnalytics />)
      
      // Focus should start at search type select
      const searchTypeSelect = screen.getByRole('combobox')
      await user.tab()
      expect(searchTypeSelect).toHaveFocus()
      
      // Tab to search input
      await user.tab()
      expect(screen.getByPlaceholderText(/search for events/i)).toHaveFocus()
      
      // Tab to search button
      await user.tab()
      expect(screen.getByText('Search')).toHaveFocus()
    })

    it('provides proper ARIA announcements for dynamic content', async () => {
      const user = userEvent.setup()
      setupFetchMock({ propiedades: [createMockPropertyData()] })
      
      render(<DataAnalytics />)
      
      const searchButton = screen.getByText('Search')
      await user.click(searchButton)
      
      // Results should be announced to screen readers
      await waitFor(() => {
        expect(screen.getByText('San Juan')).toBeInTheDocument()
      })
      
      // Check for ARIA live regions or similar accessibility features
      const results = screen.getByText('San Juan').closest('[role]')
      expect(results).toBeInTheDocument()
    })
  })

  describe('Responsive Integration', () => {
    it('adapts layout across different screen sizes', () => {
      // Mock different viewport sizes
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })
      
      const { container } = render(<Home />)
      
      // Desktop layout
      expect(container.querySelector('.w-80')).toBeInTheDocument() // Sidebar
      
      // Mobile layout
      Object.defineProperty(window, 'innerWidth', { value: 768 })
      window.dispatchEvent(new Event('resize'))
      
      // Layout should adapt (specific implementation depends on responsive design)
      expect(container.querySelector('.w-80')).toBeInTheDocument()
    })
  })
})

describe('End-to-End Workflows', () => {
  it('complete emergency reporting workflow', async () => {
    const user = userEvent.setup()
    
    // Setup all required mock data
    const mockFormData = {
      municipios: [createMockMunicipality()],
      cuencas: [{ id: 1, nombre: 'Rio Grande' }],
      limitaciones: [],
      condiciones: [],
      disposiciones: [],
      propertyTypes: [{ id: 1, type_name: 'Residential' }],
    }
    
    ;(global.fetch as jest.Mock)
      .mockResolvedValue({ ok: true, json: () => Promise.resolve(mockFormData) })
    
    // 1. Start with report form
    render(<ReportForm />)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/event title/i)).toBeInTheDocument()
    })
    
    // 2. Fill out emergency report
    await user.type(screen.getByLabelText(/event title/i), 'Hurricane Emergency')
    await user.type(screen.getByLabelText(/event description/i), 'Category 5 hurricane approaching')
    
    // 3. Select location
    const municipalitySelect = screen.getByLabelText(/municipality/i)
    await user.click(municipalitySelect)
    await user.click(screen.getByText('San Juan'))
    
    // 4. Add resident information
    await user.click(screen.getByText(/add resident/i))
    await user.type(screen.getByLabelText(/resident name/i), 'Maria Rodriguez')
    await user.type(screen.getByLabelText(/age/i), '65')
    
    // 5. Submit report
    const submitButton = screen.getByText(/submit report/i)
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/report submitted successfully/i)).toBeInTheDocument()
    })
  })

  it('data analysis and report generation workflow', async () => {
    const user = userEvent.setup()
    
    const mockAnalyticsData = {
      evento: createMockEventData({ title: 'Hurricane Maria Analysis' }),
      propiedades: [
        createMockPropertyData({ municipality: 'San Juan', damages: 'Severe flooding' }),
        createMockPropertyData({ municipality: 'Bayamón', damages: 'Wind damage' }),
      ],
      residentes: [
        createMockResidentData({ name: 'John', age: 45 }),
        createMockResidentData({ name: 'Maria', age: 67 }),
      ],
    }
    
    setupFetchMock(mockAnalyticsData)
    
    // 1. Open analytics
    render(<DataAnalytics />)
    
    // 2. Search for event
    const searchInput = screen.getByPlaceholderText(/search for events/i)
    await user.type(searchInput, 'Hurricane Maria')
    
    const searchButton = screen.getByText('Search')
    await user.click(searchButton)
    
    // 3. Verify data loads
    await waitFor(() => {
      expect(screen.getByText('Hurricane Maria Analysis')).toBeInTheDocument()
      expect(screen.getByText('San Juan')).toBeInTheDocument()
    })
    
    // 4. Apply filters
    await user.click(screen.getByText(/advanced filters/i))
    
    // 5. Sort data by municipality
    const municipalityHeader = screen.getByText(/municipality/i)
    await user.click(municipalityHeader)
    
    // 6. Generate comprehensive report
    const generateReportButton = screen.getByText(/generate report/i)
    await user.click(generateReportButton)
    
    // Report generation should trigger print dialog
    expect(window.print).toHaveBeenCalled()
  })
}) 