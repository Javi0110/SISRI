# SISRI Development Guide

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

## Project Structure

```
SISRI/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── components/        # Reusable components
│   ├── analytics/         # Analytics features
│   ├── reports/           # Reporting features
│   └── lib/               # Utility functions
├── prisma/                # Database schema and migrations
├── public/                # Static assets
├── styles/                # Global styles
└── types/                 # TypeScript type definitions
```

## Development Workflow

### Database Management

#### Creating Migrations
1. Make changes to `prisma/schema.prisma`
2. Generate migration:
```bash
npx prisma migrate dev --name <migration-name>
```

#### Seeding Data
Use the seed scripts in `prisma/seeds/`:
```bash
npm run seed:properties
npm run seed:cuencas
npm run seed:incidentes
npm run seed:municipios
```

### Component Development

1. Create components in `app/components/`
2. Follow the component structure:
```typescript
// Example component structure
import { FC } from 'react'

interface ComponentProps {
  // Props definition
}

export const Component: FC<ComponentProps> = ({ prop1, prop2 }) => {
  // Component logic
  
  return (
    // JSX
  )
}
```

### API Development

1. Create API routes in `app/api/`
2. Follow the API structure:
```typescript
// Example API route
import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // API logic
    const data = await prisma.model.findMany()
    res.status(200).json(data)
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
}
```

## Testing

### Running Tests
```bash
npm test
```

### Writing Tests
1. Create test files with `.test.ts` or `.spec.ts` extension
2. Use Jest and React Testing Library
3. Follow the test structure:
```typescript
import { render, screen } from '@testing-library/react'
import { Component } from './Component'

describe('Component', () => {
  it('renders correctly', () => {
    render(<Component prop1="value" />)
    expect(screen.getByText('expected text')).toBeInTheDocument()
  })
})
```

## Code Style

### TypeScript
- Use TypeScript for all new code
- Define interfaces for props and state
- Use type inference where possible
- Avoid `any` type

### Styling
- Use Tailwind CSS for styling
- Follow the design system in `components.json`
- Use CSS modules for component-specific styles

### Naming Conventions
- Components: PascalCase
- Files: kebab-case
- Variables: camelCase
- Constants: UPPER_SNAKE_CASE
- Types/Interfaces: PascalCase with 'I' prefix

## Git Workflow

### Branching Strategy
- `main`: Production branch
- `develop`: Development branch
- `feature/*`: Feature branches
- `bugfix/*`: Bug fix branches
- `release/*`: Release branches

### Commit Messages
Follow the conventional commits format:
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation changes
- style: Code style changes
- refactor: Code refactoring
- test: Test changes
- chore: Build process or auxiliary tool changes

## Deployment

### Production Build
```bash
npm run build
```

### Deployment Steps
1. Build the application
2. Run database migrations
3. Deploy to production server
4. Verify deployment

## Troubleshooting

### Common Issues

#### Database Connection
- Check `.env` file for correct database URL
- Verify PostgreSQL is running
- Check network connectivity

#### Build Errors
- Clear `.next` directory
- Run `npm install` again
- Check for TypeScript errors

#### Runtime Errors
- Check browser console
- Review server logs
- Verify environment variables

## Performance Optimization

### Frontend
- Use React.memo for expensive components
- Implement code splitting
- Optimize images
- Use proper caching strategies

### Backend
- Implement database indexing
- Use connection pooling
- Optimize queries
- Implement caching

## Security Best Practices

### Frontend
- Sanitize user input
- Implement CSRF protection
- Use secure cookies
- Implement proper authentication

### Backend
- Validate all inputs
- Use parameterized queries
- Implement rate limiting
- Use proper error handling

## Monitoring and Logging

### Frontend
- Implement error tracking
- Use performance monitoring
- Log user interactions

### Backend
- Implement request logging
- Use error tracking
- Monitor database performance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Submit a pull request

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs) 