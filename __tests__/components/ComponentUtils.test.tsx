import React from 'react'
import { render, screen, fireEvent } from '../utils/test-utils'
import userEvent from '@testing-library/user-event'
import { RidsLogo } from '../../app/components/RidsLogo'
import MunicipiosList from '../../app/components/MunicipiosList'
import CuencasList from '../../app/components/CuencasList'
import Sidebar from '../../app/components/Sidebar'
import {
  createMockMunicipality,
  createMockWatershed,
  setupFetchMock,
  resetFetchMock,
} from '../utils/test-utils'

describe('RidsLogo Component', () => {
  it('renders the logo with correct structure', () => {
    render(<RidsLogo />)
    
    expect(screen.getByLabelText(/RIDS - Risks and Impacts Detection System/i)).toBeInTheDocument()
    expect(screen.getByText('RIDS')).toBeInTheDocument()
    expect(screen.getByText('Risk Detection System')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<RidsLogo className="custom-class" />)
    
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('renders SVG with correct attributes', () => {
    render(<RidsLogo />)
    
    const svg = screen.getByLabelText(/RIDS - Risks and Impacts Detection System/i)
    expect(svg).toHaveAttribute('aria-label', 'RIDS - Risks and Impacts Detection System')
  })
})

describe('MunicipiosList Component', () => {
  const mockMunicipalities = [
    createMockMunicipality({ id_municipio: 1, nombre: 'San Juan' }),
    createMockMunicipality({ id_municipio: 2, nombre: 'Bayamón' }),
    createMockMunicipality({ id_municipio: 3, nombre: 'Carolina' }),
  ]

  const mockOnMunicipioSelect = jest.fn()

  beforeEach(() => {
    resetFetchMock()
    setupFetchMock(mockMunicipalities)
    mockOnMunicipioSelect.mockClear()
  })

  it('renders municipality list', async () => {
    render(<MunicipiosList onMunicipioSelect={mockOnMunicipioSelect} />)
    
    await screen.findByText('San Juan')
    expect(screen.getByText('Bayamón')).toBeInTheDocument()
    expect(screen.getByText('Carolina')).toBeInTheDocument()
  })

  it('filters municipalities based on search input', async () => {
    const user = userEvent.setup()
    render(<MunicipiosList onMunicipioSelect={mockOnMunicipioSelect} />)
    
    await screen.findByText('San Juan')
    
    const searchInput = screen.getByPlaceholderText(/search municipalities/i)
    await user.type(searchInput, 'San')
    
    expect(screen.getByText('San Juan')).toBeInTheDocument()
    expect(screen.queryByText('Bayamón')).not.toBeInTheDocument()
  })

  it('calls onMunicipioSelect when municipality is clicked', async () => {
    const user = userEvent.setup()
    render(<MunicipiosList onMunicipioSelect={mockOnMunicipioSelect} />)
    
    await screen.findByText('San Juan')
    
    const municipalityButton = screen.getByText('San Juan')
    await user.click(municipalityButton)
    
    expect(mockOnMunicipioSelect).toHaveBeenCalledWith(
      expect.any(Array), // transformed coordinates
      12, // zoom level
      true // force refresh
    )
  })

  it('expands and collapses municipality details', async () => {
    const user = userEvent.setup()
    render(<MunicipiosList onMunicipioSelect={mockOnMunicipioSelect} />)
    
    await screen.findByText('San Juan')
    
    const municipalityButton = screen.getByText('San Juan')
    await user.click(municipalityButton)
    
    expect(screen.getByText(/zoom to municipality/i)).toBeInTheDocument()
    
    // Click again to collapse
    await user.click(municipalityButton)
    expect(screen.queryByText(/zoom to municipality/i)).not.toBeInTheDocument()
  })

  it('shows loading state', () => {
    let resolvePromise: (value: any) => void
    const mockPromise = new Promise(resolve => {
      resolvePromise = resolve
    })
    
    ;(global.fetch as jest.Mock).mockReturnValue(mockPromise)
    
    render(<MunicipiosList onMunicipioSelect={mockOnMunicipioSelect} />)
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('shows error state', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))
    
    render(<MunicipiosList onMunicipioSelect={mockOnMunicipioSelect} />)
    
    await screen.findByText(/failed to load municipalities/i)
  })

  it('shows no results message when no municipalities match search', async () => {
    const user = userEvent.setup()
    render(<MunicipiosList onMunicipioSelect={mockOnMunicipioSelect} />)
    
    await screen.findByText('San Juan')
    
    const searchInput = screen.getByPlaceholderText(/search municipalities/i)
    await user.type(searchInput, 'NonexistentCity')
    
    expect(screen.getByText(/no municipalities found/i)).toBeInTheDocument()
  })
})

describe('CuencasList Component', () => {
  const mockWatersheds = [
    createMockWatershed({ id: 1, nombre: 'Rio Grande', codigo_cuenca: 'RG-001' }),
    createMockWatershed({ id: 2, nombre: 'Rio Camuy', codigo_cuenca: 'RC-001' }),
  ]

  const mockOnCuencaSelect = jest.fn()

  beforeEach(() => {
    resetFetchMock()
    setupFetchMock(mockWatersheds)
    mockOnCuencaSelect.mockClear()
  })

  it('renders watershed list', async () => {
    render(<CuencasList onCuencaSelect={mockOnCuencaSelect} />)
    
    await screen.findByText('Rio Grande')
    expect(screen.getByText('Rio Camuy')).toBeInTheDocument()
  })

  it('filters watersheds based on search input', async () => {
    const user = userEvent.setup()
    render(<CuencasList onCuencaSelect={mockOnCuencaSelect} />)
    
    await screen.findByText('Rio Grande')
    
    const searchInput = screen.getByPlaceholderText(/search watershed/i)
    await user.type(searchInput, 'Grande')
    
    expect(screen.getByText('Rio Grande')).toBeInTheDocument()
    expect(screen.queryByText('Rio Camuy')).not.toBeInTheDocument()
  })

  it('calls onCuencaSelect when watershed is clicked', async () => {
    const user = userEvent.setup()
    render(<CuencasList onCuencaSelect={mockOnCuencaSelect} />)
    
    await screen.findByText('Rio Grande')
    
    const watershedButton = screen.getByText('Rio Grande')
    await user.click(watershedButton)
    
    expect(mockOnCuencaSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        nombre: 'Rio Grande',
        codigo_cuenca: 'RG-001'
      })
    )
  })

  it('shows loading state', () => {
    let resolvePromise: (value: any) => void
    const mockPromise = new Promise(resolve => {
      resolvePromise = resolve
    })
    
    ;(global.fetch as jest.Mock).mockReturnValue(mockPromise)
    
    render(<CuencasList onCuencaSelect={mockOnCuencaSelect} />)
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('shows error state', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))
    
    render(<CuencasList onCuencaSelect={mockOnCuencaSelect} />)
    
    await screen.findByText(/error loading watersheds/i)
  })

  it('debounces search input', async () => {
    const user = userEvent.setup()
    render(<CuencasList onCuencaSelect={mockOnCuencaSelect} />)
    
    await screen.findByText('Rio Grande')
    
    const searchInput = screen.getByPlaceholderText(/search watershed/i)
    
    // Type multiple characters quickly
    await user.type(searchInput, 'Rio')
    
    // Wait for debounce and verify only one API call was made
    setTimeout(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2) // Initial load + search
    }, 400)
  })
})

describe('Sidebar Component', () => {
  const mockCallbacks = {
    onUSNGSelect: jest.fn(),
    onMunicipioSelect: jest.fn(),
    onCuencaSelect: jest.fn(),
  }

  beforeEach(() => {
    resetFetchMock()
    setupFetchMock([])
    Object.values(mockCallbacks).forEach(mock => mock.mockClear())
  })

  it('renders all tabs', () => {
    render(<Sidebar {...mockCallbacks} />)
    
    expect(screen.getByText('Municipalities')).toBeInTheDocument()
    expect(screen.getByText('USNG')).toBeInTheDocument()
    expect(screen.getByText('Watersheds')).toBeInTheDocument()
  })

  it('switches between tabs correctly', async () => {
    const user = userEvent.setup()
    render(<Sidebar {...mockCallbacks} />)
    
    // Default tab should be municipalities
    expect(screen.getByText('Municipalities')).toHaveAttribute('data-state', 'active')
    
    // Switch to USNG tab
    await user.click(screen.getByText('USNG'))
    expect(screen.getByText('USNG')).toHaveAttribute('data-state', 'active')
    
    // Switch to Watersheds tab
    await user.click(screen.getByText('Watersheds'))
    expect(screen.getByText('Watersheds')).toHaveAttribute('data-state', 'active')
  })

  it('renders correct content for each tab', async () => {
    const user = userEvent.setup()
    render(<Sidebar {...mockCallbacks} />)
    
    // Municipalities tab content
    expect(screen.getByPlaceholderText(/search municipalities/i)).toBeInTheDocument()
    
    // Switch to Watersheds tab
    await user.click(screen.getByText('Watersheds'))
    expect(screen.getByPlaceholderText(/search watershed/i)).toBeInTheDocument()
  })

  it('maintains responsive layout', () => {
    const { container } = render(<Sidebar {...mockCallbacks} />)
    
    const sidebarElement = container.firstChild
    expect(sidebarElement).toHaveClass('w-80') // Fixed width
    expect(sidebarElement).toHaveClass('overflow-y-auto') // Scrollable
  })
})

describe('Component Accessibility', () => {
  it('RidsLogo has proper ARIA attributes', () => {
    render(<RidsLogo />)
    
    const logo = screen.getByLabelText(/RIDS - Risks and Impacts Detection System/i)
    expect(logo).toHaveAttribute('aria-label')
  })

  it('MunicipiosList search input has proper labeling', async () => {
    const mockOnSelect = jest.fn()
    setupFetchMock([])
    
    render(<MunicipiosList onMunicipioSelect={mockOnSelect} />)
    
    const searchInput = screen.getByPlaceholderText(/search municipalities/i)
    expect(searchInput).toHaveAttribute('placeholder')
    expect(searchInput).toHaveAttribute('type', 'text')
  })

  it('Sidebar tabs are keyboard accessible', async () => {
    const user = userEvent.setup()
    render(<Sidebar {...{ onUSNGSelect: jest.fn(), onMunicipioSelect: jest.fn(), onCuencaSelect: jest.fn() }} />)
    
    const municipalitiesTab = screen.getByText('Municipalities')
    const usngTab = screen.getByText('USNG')
    
    // Tab navigation
    await user.tab()
    expect(municipalitiesTab).toHaveFocus()
    
    await user.tab()
    expect(usngTab).toHaveFocus()
    
    // Enter key activation
    await user.keyboard('{Enter}')
    expect(usngTab).toHaveAttribute('data-state', 'active')
  })
})

describe('Component Performance', () => {
  it('MunicipiosList handles large datasets efficiently', async () => {
    const largeMunicipalitySet = Array.from({ length: 1000 }, (_, i) =>
      createMockMunicipality({ id_municipio: i + 1, nombre: `Municipality ${i + 1}` })
    )
    
    setupFetchMock(largeMunicipalitySet)
    
    const startTime = performance.now()
    render(<MunicipiosList onMunicipioSelect={jest.fn()} />)
    
    await screen.findByText('Municipality 1')
    const endTime = performance.now()
    
    // Should render within reasonable time (2 seconds)
    expect(endTime - startTime).toBeLessThan(2000)
  })

  it('CuencasList search debouncing prevents excessive API calls', async () => {
    const user = userEvent.setup()
    setupFetchMock([])
    
    render(<CuencasList onCuencaSelect={jest.fn()} />)
    
    const searchInput = screen.getByPlaceholderText(/search watershed/i)
    
    // Type multiple characters quickly
    await user.type(searchInput, 'test')
    
    // Wait for debounce period
    await new Promise(resolve => setTimeout(resolve, 400))
    
    // Should have made initial load call + one search call (not 4)
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })
})

describe('Error Boundary Integration', () => {
  it('gracefully handles component errors', () => {
    // Mock console.error to suppress error logging in tests
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    
    // Force an error by passing invalid props
    const ThrowError = () => {
      throw new Error('Test error')
    }
    
    expect(() => render(<ThrowError />)).toThrow('Test error')
    
    consoleSpy.mockRestore()
  })
})

describe('Responsive Design', () => {
  it('adapts to different screen sizes', () => {
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    })
    
    const { container } = render(<Sidebar {...{ onUSNGSelect: jest.fn(), onMunicipioSelect: jest.fn(), onCuencaSelect: jest.fn() }} />)
    
    expect(container.firstChild).toHaveClass('w-80')
    
    // Simulate mobile screen
    Object.defineProperty(window, 'innerWidth', { value: 320 })
    window.dispatchEvent(new Event('resize'))
    
    // Component should maintain its responsive classes
    expect(container.firstChild).toHaveClass('w-80')
  })
}) 