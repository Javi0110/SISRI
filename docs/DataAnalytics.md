# DataAnalytics Component Documentation

## Overview
The `DataAnalytics` component is a comprehensive data visualization and search interface that allows users to search and view detailed information about events, properties, and residents based on different search criteria.

## Features
- Search functionality for events, USNG coordinates, and municipalities
- Detailed property information display
- Expandable resident information
- Status indicators and badges
- Responsive table layout

## Component Structure

### Interfaces
```typescript
type SearchType = 'evento' | 'usng' | 'municipio';

interface EventData {
  id: number;
  titulo: string;
  descripcion: string;
  fecha: string;
  tipo: string;
  estado: string;
  usng: string | null;
}

interface PropertyData {
  id: number;
  tipo: string;
  daños: string | null;
  fecha: string | null;
  municipio: string;
  barrio: string;
  sector: string;
  usng: string;
  habitantes: ResidentData[];
}

interface ResidentData {
  id: number;
  nombre: string;
  edad: number;
  categoria: string;
  limitacion: string;
  condicion: string;
  disposicion: string;
  propiedad_id: number;
}

interface ReportData {
  searchType: SearchType;
  evento?: EventData | null;
  usngQuery?: string;
  municipioQuery?: string;
  propiedades: PropertyData[];
}
```

### State Management
- `searchType`: Current search type ('evento', 'usng', 'municipio')
- `searchQuery`: User input for search
- `loading`: Loading state indicator
- `error`: Error message state
- `reportData`: Fetched data from API
- `expandedProperties`: Tracks expanded property rows

### Key Functions

#### handleSearch()
- Makes API call to `/api/analytics/comprehensive-report`
- Handles search validation and error states
- Updates report data on successful search

#### toggleProperty(propertyId: number)
- Toggles the expansion state of property details
- Manages the expandedProperties state

#### getStatusColor(status: string)
- Returns appropriate color classes based on status
- Supports 'active', 'resolved', and default states

#### getSearchPlaceholder()
- Returns appropriate placeholder text based on search type

#### renderHeader()
- Renders different header layouts based on search type
- Displays event details, USNG coordinates, or municipality information

## Usage Example

```tsx
<DataAnalytics />
```

## API Integration
The component integrates with the following API endpoint:
- POST `/api/analytics/comprehensive-report`
  - Request body: `{ searchType: SearchType, searchQuery: string }`
  - Returns: `ReportData`

## UI Components Used
- Card
- Button
- Input
- Select
- Badge
- Table

## Dependencies
- React
- Lucide Icons
- Custom UI components from the project

## Error Handling
- Input validation for empty search queries
- API error handling
- Loading states
- Error message display

## Styling
- Uses Tailwind CSS for styling
- Responsive design
- Consistent spacing and layout
- Status-based color coding

## Best Practices
1. Always validate search input before making API calls
2. Handle loading and error states appropriately
3. Use TypeScript interfaces for type safety
4. Implement proper error boundaries
5. Follow accessibility guidelines 