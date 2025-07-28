import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'

// Custom render function that includes any providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { ...options })

export * from '@testing-library/react'
export { customRender as render }

// Mock data factories
export const createMockEventData = (overrides = {}) => ({
  id: 1,
  title: 'Test Event',
  description: 'Test event description',
  date: '2024-01-15',
  type: 'Emergency',
  status: 'Active',
  usng: '19QFH1234567890',
  ...overrides,
})

export const createMockPropertyData = (overrides = {}) => ({
  id: 1,
  property_type_id: 1,
  property_type_name: 'Residential',
  damages: 'Minor flooding',
  date: '2024-01-15',
  municipality: 'San Juan',
  municipality_id: 1,
  neighborhood: 'Old San Juan',
  neighborhood_id: 1,
  sector: 'Sector A',
  sector_id: 1,
  usng: '19QFH1234567890',
  address: '123 Main St',
  notifications: [],
  residents: [],
  ...overrides,
})

export const createMockResidentData = (overrides = {}) => ({
  id: 1,
  name: 'John',
  age: 35,
  category: 'Adult',
  contact: 'john@example.com',
  property_id: 1,
  family_id: 1,
  lastname1: 'Doe',
  lastname2: 'Smith',
  sex: 'M',
  gender: 'Male',
  condition_id: null,
  limitation_id: null,
  disposition_id: null,
  limitation: null,
  limitation_description: null,
  limitation_observation: null,
  condition: null,
  condition_description: null,
  condition_observation: null,
  disposition: null,
  disposition_description: null,
  disposition_observation: null,
  family: {
    id: 1,
    surnames: 'Doe-Smith',
    description: 'Test family',
  },
  property_info: {
    id: 1,
    property_type_id: 1,
    property_type_name: 'Residential',
    municipality: 'San Juan',
    municipality_id: 1,
    neighborhood: 'Old San Juan',
    neighborhood_id: 1,
    sector: 'Sector A',
    sector_id: 1,
    usng: '19QFH1234567890',
    address: '123 Main St',
  },
  ...overrides,
})

export const createMockNotificationData = (overrides = {}) => ({
  id: 1,
  eventoId: 1,
  tipo: 'Alert',
  mensaje: 'Test notification',
  fecha_creacion: '2024-01-15T10:00:00Z',
  estado: 'Active',
  numero_notificacion: 'NOT-2024-001',
  propiedades: [],
  ...overrides,
})

export const createMockMunicipality = (overrides = {}) => ({
  id_municipio: 1,
  nombre: 'San Juan',
  barrios: [],
  ...overrides,
})

export const createMockBarrio = (overrides = {}) => ({
  id_barrio: 1,
  nombre: 'Old San Juan',
  sectores: [],
  ...overrides,
})

export const createMockSector = (overrides = {}) => ({
  id_sector: 1,
  nombre: 'Sector A',
  ...overrides,
})

export const createMockWatershed = (overrides = {}) => ({
  id: 1,
  nombre: 'Rio Grande Watershed',
  codigo_cuenca: 'RG-001',
  ...overrides,
})

// Mock API responses
export const mockFetchResponse = (data: any, ok = true, status = 200) => {
  const mockResponse = {
    ok,
    status,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
  }
  return Promise.resolve(mockResponse)
}

// Common test helpers
export const waitForLoadingToFinish = () => 
  new Promise(resolve => setTimeout(resolve, 0))

export const setupFetchMock = (mockData: any) => {
  ;(global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse(mockData))
}

export const resetFetchMock = () => {
  ;(global.fetch as jest.Mock).mockClear()
} 