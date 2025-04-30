# SISRI (Sistema Integral de Seguridad y Respuesta a Incidentes)

## Overview
SISRI is a comprehensive incident management and response system designed to track, monitor, and manage incidents across different geographical locations. The system integrates geospatial data, property information, and resident data to provide a complete solution for incident management.

## Features
- Incident tracking and management
- Geospatial data visualization
- Property and resident management
- Real-time notifications
- Analytics and reporting
- USNG grid system integration

## Documentation
- [Architecture Documentation](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)
- [Development Guide](docs/DEVELOPMENT.md)

## Technology Stack
- **Frontend**: Next.js, React, TypeScript
- **UI**: Material-UI, Tailwind CSS
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Maps**: OpenLayers
- **Charts**: Recharts

## Getting Started

### Prerequisites
- Node.js 18.x or later
- PostgreSQL 14 or later
- Git

### Installation
1. Clone the repository:
```bash
git clone <repository-url>
cd SISRI
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```
Edit `.env.local` with your configuration.

4. Set up the database:
```bash
npm run db:reset
npm run db:seed
```

5. Start the development server:
```bash
npm run dev
```

## Development
See the [Development Guide](docs/DEVELOPMENT.md) for detailed information on:
- Project structure
- Development workflow
- Testing
- Code style
- Git workflow
- Deployment

## API
The API documentation is available in the [API Documentation](docs/API.md) file. It includes:
- Endpoint descriptions
- Request/response formats
- Authentication
- Error handling
- Rate limiting

## Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Submit a pull request

## License
[License information]

## Support
For support, please contact [support contact information]

## Acknowledgments
- [List of acknowledgments] 