# SISRI System Architecture Documentation

## Overview
SISRI (Sistema Integral de Seguridad y Respuesta a Incidentes) is a Next.js-based web application designed for incident management and response. The system integrates geospatial data, property information, and resident data to provide comprehensive incident tracking and management capabilities.

## Technology Stack

### Frontend
- **Framework**: Next.js 14.2.16
- **UI Components**: 
  - Material-UI (MUI) v6.4.8
  - Radix UI components
  - Tailwind CSS for styling
- **State Management**: React Hooks
- **Form Handling**: React Hook Form with Zod validation
- **Maps**: OpenLayers (ol)
- **Charts**: Recharts

### Backend
- **Runtime**: Node.js
- **Database**: PostgreSQL
- **ORM**: Prisma 6.5.0
- **API**: Next.js API Routes

### Development Tools
- TypeScript 5.8.2
- Tailwind CSS 3.4.17
- PostCSS
- ESLint

## Database Schema

### Core Models

#### Location-based Models
1. **municipio** (Municipality)
   - Basic information about municipalities
   - Contains barrios (neighborhoods)
   - Has geospatial coordinates

2. **barrio** (Neighborhood)
   - Subdivision of municipalities
   - Contains sectors
   - Linked to properties and residents

3. **sector** (Sector)
   - Subdivision of neighborhoods
   - Contains properties and residents

4. **usngsquare** (USNG Grid Square)
   - Military grid reference system squares
   - Contains geospatial data
   - Links to properties, residents, and events

#### Property and Resident Models
1. **propiedades_existentes** (Existing Properties)
   - Property information
   - Location data
   - Links to residents and affected events

2. **habitantes** (Residents)
   - Resident information
   - Demographic data
   - Location associations

#### Incident Management Models
1. **eventos** (Events)
   - Incident tracking
   - Status management
   - Location and property associations

2. **incidentes** (Incidents)
   - Detailed incident information
   - Event associations

3. **notificacion** (Notifications)
   - Event notifications
   - Status tracking

4. **propiedades_afectadas** (Affected Properties)
   - Join table for events and properties
   - Damage tracking

#### Environmental Models
1. **cuenca** (Watershed)
   - Watershed information
   - Location data
   - Event associations

## Application Structure

### Frontend Organization
```
app/
├── api/           # API routes
├── components/    # Reusable components
├── analytics/     # Analytics features
├── reports/       # Reporting features
├── lib/           # Utility functions
└── types/         # TypeScript type definitions
```

### Key Features
1. **Geospatial Visualization**
   - Map-based interface using OpenLayers
   - USNG grid system integration
   - Location-based data visualization

2. **Incident Management**
   - Event tracking and monitoring
   - Property damage assessment
   - Resident impact tracking

3. **Notification System**
   - Real-time notifications
   - Status updates
   - Event alerts

4. **Data Analytics**
   - Incident reporting
   - Impact analysis
   - Trend visualization

## Development Workflow

### Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Database setup:
   ```bash
   npm run db:reset
   npm run db:seed
   ```

3. Development server:
   ```bash
   npm run dev
   ```

### Database Management
- **Reset Database**: `npm run db:reset`
- **Seed Database**: `npm run db:seed`
- **Fresh Start**: `npm run db:fresh`

### Deployment
```bash
npm run deploy
```

## Environment Configuration
Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `DIRECT_URL`: Direct database connection URL
- Additional configuration in `.env` and `.env.local`

## Security Considerations
1. Environment variables are used for sensitive configuration
2. Database access is managed through Prisma ORM
3. API routes are protected through Next.js middleware

## Performance Optimization
1. Server-side rendering with Next.js
2. Optimized database queries through Prisma
3. Efficient geospatial data handling
4. Caching strategies for frequently accessed data

## Future Improvements
1. Enhanced real-time capabilities
2. Advanced analytics features
3. Mobile application development
4. Integration with external emergency services 