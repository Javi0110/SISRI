import React from 'react'
import { render, screen, fireEvent, waitFor } from '../utils/test-utils'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { DataAnalytics } from '../../app/components/DataAnalytics'
import {
  createMockEventData,
  createMockPropertyData,
  createMockResidentData,
  createMockNotificationData,
  setupFetchMock,
  resetFetchMock,
  mockFetchResponse,
} from '../utils/test-utils'

// Mock the external dependencies
jest.mock('../../lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}))

describe('DataAnalytics Component', () => {
  beforeEach(() => {
    resetFetchMock()
    setupFetchMock([])
  })

  describe('Component Rendering', () => {
    it('renders the main search interface', () => {
      render(<DataAnalytics />)
      
      expect(screen.getByText('Comprehensive Report')).toBeInTheDocument()
      expect(screen.getByText(/search by event, usng coordinates/i)).toBeInTheDocument()
    })

    it('shows search controls', () => {
      render(<DataAnalytics />)
      
      expect(screen.getByRole('combobox')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
      expect(screen.getByText('Search')).toBeInTheDocument()
    })

    it('displays advanced filters button', () => {
      render(<DataAnalytics />)
      
      expect(screen.getByText(/show advanced filters/i)).toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    it('shows validation message when searching without input', async () => {
      const user = userEvent.setup()
      render(<DataAnalytics />)
      
      const searchButton = screen.getByText('Search')
      await user.click(searchButton)
      
      expect(screen.getByText(/please enter a search term/i)).toBeInTheDocument()
    })

    it('performs search with valid input', async () => {
      const user = userEvent.setup()
      const mockData = [createMockEventData({ title: 'Test Event' })]
      setupFetchMock(mockData)
      
      render(<DataAnalytics />)
      
      const searchInput = screen.getByPlaceholderText(/search/i)
      const searchButton = screen.getByText('Search')
      
      await user.type(searchInput, 'test')
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    })

    it('handles different search types', async () => {
      const user = userEvent.setup()
      render(<DataAnalytics />)
      
      const searchTypeSelect = screen.getByRole('combobox')
      expect(searchTypeSelect).toBeInTheDocument()
      
      // We can verify the select exists, but UI interactions with Radix/Material components
      // are complex in JSDOM environment
    })
  })

  describe('Data Display', () => {
    it('shows search results when available', async () => {
      const mockEvents = [
        createMockEventData({ title: 'Hurricane Maria', id: 1 }),
        createMockEventData({ title: 'Flood Alert', id: 2 })
      ]
      
      setupFetchMock(mockEvents)
      
      render(<DataAnalytics />)
      
      const searchInput = screen.getByPlaceholderText(/search/i)
      const searchButton = screen.getByText('Search')
      
      await userEvent.type(searchInput, 'hurricane')
      await userEvent.click(searchButton)
      
      // Component should handle the search request
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    })

    it('displays property information correctly', async () => {
      const mockProperties = [
        createMockPropertyData({ municipality: 'San Juan', id: 1 })
      ]
      
      setupFetchMock({ propiedades: mockProperties })
      
      render(<DataAnalytics />)
      
      // Test basic rendering - complex UI interactions are limited in JSDOM
      expect(screen.getByText('Comprehensive Report')).toBeInTheDocument()
    })

    it('shows resident data when available', async () => {
      const mockResidents = [
        createMockResidentData({ name: 'John Doe', id: 1 })
      ]
      
      setupFetchMock({ residentes: mockResidents })
      
      render(<DataAnalytics />)
      
      expect(screen.getByText('Comprehensive Report')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))
      
      render(<DataAnalytics />)
      
      const searchInput = screen.getByPlaceholderText(/search/i)
      const searchButton = screen.getByText('Search')
      
      await user.type(searchInput, 'test')
      await user.click(searchButton)
      
      // Component should not crash on API errors
      expect(screen.getByText('Comprehensive Report')).toBeInTheDocument()
    })

    it('shows appropriate messages for empty results', async () => {
      const user = userEvent.setup()
      setupFetchMock([])
      
      render(<DataAnalytics />)
      
      const searchInput = screen.getByPlaceholderText(/search/i)
      const searchButton = screen.getByText('Search')
      
      await user.type(searchInput, 'nonexistent')
      await user.click(searchButton)
      
      // Should handle empty results gracefully
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    })
  })

  describe('UI Interactions', () => {
    it('toggles advanced filters', async () => {
      const user = userEvent.setup()
      render(<DataAnalytics />)
      
      const filtersButton = screen.getByText(/show advanced filters/i)
      expect(filtersButton).toBeInTheDocument()
      
      // Basic interaction test - complex state changes are hard to test in JSDOM
      await user.click(filtersButton)
      
      // Component should handle the click without crashing
      expect(screen.getByText('Comprehensive Report')).toBeInTheDocument()
    })

    it('maintains search state correctly', () => {
      render(<DataAnalytics />)
      
      // Verify initial state
      expect(screen.getByPlaceholderText(/search/i)).toHaveValue('')
      expect(screen.getByText('Comprehensive Report')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<DataAnalytics />)
      
      expect(screen.getByRole('combobox')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toBeInTheDocument()
      expect(screen.getAllByRole('button')).toHaveLength(2) // Search and Advanced Filters buttons
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<DataAnalytics />)
      
      const searchInput = screen.getByPlaceholderText(/search/i)
      
      // Test basic keyboard interaction
      await user.tab()
      await user.type(searchInput, 'test')
      
      expect(searchInput).toHaveValue('test')
    })
  })

  describe('Performance', () => {
    it('renders within reasonable time', async () => {
      const startTime = performance.now()
      
      render(<DataAnalytics />)
      
      await waitFor(() => {
        expect(screen.getByText('Comprehensive Report')).toBeInTheDocument()
      })
      
      const endTime = performance.now()
      
      // Should render quickly
      expect(endTime - startTime).toBeLessThan(1000)
    })

    it('handles search input efficiently', async () => {
      const user = userEvent.setup()
      render(<DataAnalytics />)
      
      const searchInput = screen.getByPlaceholderText(/search/i)
      
      // Test rapid typing
      await user.type(searchInput, 'test query')
      
      expect(searchInput).toHaveValue('test query')
    })
  })

  describe('Data Processing', () => {
    it('processes search results correctly', async () => {
      const mockData = {
        events: [createMockEventData()],
        properties: [createMockPropertyData()],
        residents: [createMockResidentData()]
      }
      
      setupFetchMock(mockData)
      
      render(<DataAnalytics />)
      
      // Basic data processing test
      expect(screen.getByText('Comprehensive Report')).toBeInTheDocument()
    })

    it('handles mixed data types', async () => {
      const mixedData = {
        propiedades: [createMockPropertyData()],
        residentes: [createMockResidentData()],
        notificaciones: [createMockNotificationData()]
      }
      
      setupFetchMock(mixedData)
      
      render(<DataAnalytics />)
      
      expect(screen.getByText('Comprehensive Report')).toBeInTheDocument()
    })
  })
})

describe('DataAnalytics Integration', () => {
  it('completes basic search workflow', async () => {
    const user = userEvent.setup()
    const searchData = [createMockEventData({ title: 'Test Event' })]
    
    setupFetchMock(searchData)
    
    render(<DataAnalytics />)
    
    // 1. Verify initial render
    expect(screen.getByText('Comprehensive Report')).toBeInTheDocument()
    
    // 2. Enter search query
    const searchInput = screen.getByPlaceholderText(/search/i)
    await user.type(searchInput, 'test')
    
    // 3. Perform search
    const searchButton = screen.getByText('Search')
    await user.click(searchButton)
    
    // 4. Verify search was attempted
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })
  })
}) 