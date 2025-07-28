# RIDS System - Testing Documentation

## Overview

This document outlines the comprehensive testing strategy for the RIDS (Risk and Impact Detection System) application. Our testing approach ensures 100% functionality coverage with enterprise-grade quality standards.

## 🧪 Testing Architecture

### Test Categories

1. **Unit Tests** - Individual component and function testing
2. **Integration Tests** - Component interaction and data flow testing
3. **End-to-End Tests** - Complete user workflow testing
4. **Performance Tests** - Load and responsiveness testing
5. **Accessibility Tests** - WCAG compliance and screen reader compatibility

### Coverage Goals

- **Functions**: 80% minimum coverage
- **Lines**: 80% minimum coverage
- **Branches**: 80% minimum coverage
- **Statements**: 80% minimum coverage

## 🚀 Quick Start

### Running Tests

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run comprehensive test suite (includes build and linting)
./scripts/run-tests.sh
```

### Running Specific Test Suites

```bash
# Unit tests only
npm test -- --testPathPattern="__tests__/components"

# Integration tests only
npm test -- --testPathPattern="integration"

# Specific component tests
npm test -- DataAnalytics.test.tsx

# Tests matching a pattern
npm test -- --testNamePattern="search functionality"
```

## 📁 Test Structure

```
__tests__/
├── components/           # Component unit tests
│   ├── DataAnalytics.test.tsx
│   ├── ReportForm.test.tsx
│   └── ComponentUtils.test.tsx
├── integration/          # Integration tests
│   └── AppIntegration.test.tsx
├── utils/               # Test utilities and helpers
│   └── test-utils.tsx
└── __mocks__/           # Mock files and data
```

## 🔧 Testing Technologies

- **Jest** - Testing framework
- **React Testing Library** - Component testing utilities
- **@testing-library/user-event** - User interaction simulation
- **@testing-library/jest-dom** - Custom Jest matchers

## 📊 Test Coverage Areas

### DataAnalytics Component

#### Functions Tested:
- ✅ Search functionality (event, municipality, resident, USNG)
- ✅ Data filtering and sorting
- ✅ Column visibility toggling
- ✅ Report generation
- ✅ Error handling and recovery
- ✅ Debounced search input
- ✅ Loading states
- ✅ Notification details modal
- ✅ Data expansion/collapse

#### Test Scenarios:
- **Happy Path**: Normal search and filter operations
- **Error Cases**: API failures, network errors, invalid data
- **Edge Cases**: Empty results, large datasets, malformed inputs
- **Performance**: Rendering speed with 1000+ items
- **Accessibility**: Keyboard navigation, screen reader support

### ReportForm Component

#### Functions Tested:
- ✅ Form validation (all fields)
- ✅ Dynamic field loading (municipality → barrio → sector)
- ✅ Resident management (add/remove)
- ✅ Incident management (add/remove)
- ✅ Auto-generation features (notification numbers)
- ✅ Form submission workflow
- ✅ Search functionality for existing events
- ✅ Error handling and user feedback

#### Test Scenarios:
- **Validation**: Required fields, format validation, business rules
- **Dynamic Behavior**: Cascading dropdowns, field dependencies
- **User Interactions**: Form filling, submission, error recovery
- **Data Persistence**: Form state maintenance
- **Accessibility**: ARIA labels, keyboard navigation

### Component Utilities

#### Functions Tested:
- ✅ RidsLogo rendering and props
- ✅ MunicipiosList search and selection
- ✅ CuencasList filtering and interaction
- ✅ Sidebar tab navigation
- ✅ Map integration callbacks

## 🧩 Test Utilities

### Mock Data Factories

```typescript
// Create mock event data
const mockEvent = createMockEventData({
  title: 'Hurricane Maria',
  status: 'Active'
})

// Create mock property data
const mockProperty = createMockPropertyData({
  municipality: 'San Juan',
  damages: 'Flooding'
})

// Create mock resident data
const mockResident = createMockResidentData({
  name: 'John Doe',
  age: 35
})
```

### API Mocking

```typescript
// Setup successful API response
setupFetchMock(mockData)

// Setup API error
;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))

// Reset mocks between tests
resetFetchMock()
```

### Custom Render Function

```typescript
// Render component with providers
render(<Component />)

// Wait for async operations
await waitFor(() => {
  expect(screen.getByText('Expected Text')).toBeInTheDocument()
})
```

## 🎯 Best Practices

### Writing Tests

1. **Arrange, Act, Assert** pattern
2. **Test behavior, not implementation**
3. **Use descriptive test names**
4. **Mock external dependencies**
5. **Test error scenarios**
6. **Keep tests independent**

### Example Test Structure

```typescript
describe('Component Name', () => {
  beforeEach(() => {
    resetFetchMock()
  })

  describe('Feature Group', () => {
    it('should handle specific scenario correctly', async () => {
      // Arrange
      const mockData = createMockData()
      setupFetchMock(mockData)
      
      // Act
      render(<Component />)
      await user.click(screen.getByText('Button'))
      
      // Assert
      expect(screen.getByText('Expected Result')).toBeInTheDocument()
    })
  })
})
```

### Testing Guidelines

1. **Test user interactions** as they would actually use the app
2. **Use semantic queries** (`getByLabelText`, `getByRole`, `getByText`)
3. **Avoid implementation details** (CSS classes, internal state)
4. **Test accessibility features** (ARIA labels, keyboard navigation)
5. **Mock external services** (APIs, third-party libraries)

## 🚨 Error Testing

### API Error Scenarios

- Network failures
- 404 Not Found responses
- 500 Server errors
- Malformed JSON responses
- Timeout errors

### User Input Validation

- Required field validation
- Format validation (dates, emails, phone numbers)
- Business rule validation
- XSS prevention
- SQL injection prevention

### Edge Cases

- Empty datasets
- Very large datasets (1000+ items)
- Rapid user interactions
- Concurrent API calls
- Browser compatibility

## 📈 Performance Testing

### Metrics Tracked

- Component render time
- Search response time
- Large dataset handling
- Memory usage patterns

### Performance Tests

```typescript
it('handles large datasets efficiently', async () => {
  const largeDataset = Array.from({ length: 1000 }, createMockData)
  
  const startTime = performance.now()
  render(<Component data={largeDataset} />)
  const endTime = performance.now()
  
  expect(endTime - startTime).toBeLessThan(2000) // 2 second limit
})
```

## ♿ Accessibility Testing

### WCAG Compliance

- Keyboard navigation support
- Screen reader compatibility
- Color contrast requirements
- Focus management
- ARIA attributes

### Accessibility Tests

```typescript
it('supports keyboard navigation', async () => {
  render(<Component />)
  
  await user.tab()
  expect(screen.getByRole('button')).toHaveFocus()
  
  await user.keyboard('{Enter}')
  expect(mockCallback).toHaveBeenCalled()
})
```

## 🔄 Continuous Integration

### Test Pipeline

1. **Dependency Installation**
2. **TypeScript Type Checking**
3. **ESLint Code Quality**
4. **Unit Test Execution**
5. **Integration Test Execution**
6. **Coverage Report Generation**
7. **Build Verification**

### Coverage Reports

Coverage reports are generated in multiple formats:
- **HTML**: `coverage/lcov-report/index.html`
- **JSON**: `coverage/coverage-final.json`
- **LCOV**: `coverage/lcov.info`

## 🐛 Debugging Tests

### Common Issues

1. **Async operations not awaited**
   ```typescript
   // ❌ Wrong
   render(<Component />)
   expect(screen.getByText('Text')).toBeInTheDocument()
   
   // ✅ Correct
   render(<Component />)
   await waitFor(() => {
     expect(screen.getByText('Text')).toBeInTheDocument()
   })
   ```

2. **Missing act() wrapper for state updates**
   ```typescript
   // ❌ Wrong
   fireEvent.click(button)
   
   // ✅ Correct
   await act(async () => {
     fireEvent.click(button)
   })
   ```

3. **Not cleaning up between tests**
   ```typescript
   afterEach(() => {
     jest.clearAllMocks()
     cleanup()
   })
   ```

### Debug Commands

```bash
# Run tests in debug mode
npm test -- --verbose

# Run specific test file
npm test -- DataAnalytics.test.tsx --verbose

# Debug with Node.js debugger
node --inspect-brk node_modules/.bin/jest --runInBand
```

## 📋 Test Checklist

### Before Committing

- [ ] All tests pass locally
- [ ] Coverage thresholds met
- [ ] No console errors or warnings
- [ ] TypeScript compilation successful
- [ ] ESLint passes
- [ ] Manual testing of changed features

### Code Review

- [ ] Tests cover new functionality
- [ ] Tests follow best practices
- [ ] Mock data is realistic
- [ ] Error cases are tested
- [ ] Accessibility considerations included

## 🎓 Training Resources

### Learning Resources

- [React Testing Library Documentation](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

### Internal Documentation

- [Component Architecture](./ARCHITECTURE.md)
- [API Documentation](./API.md)
- [Development Guidelines](./DEVELOPMENT.md)

## 🤝 Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Ensure all tests pass
3. Add integration tests for complex features
4. Update this documentation if needed
5. Verify coverage thresholds are met

## 📞 Support

For testing questions or issues:

- Review this documentation
- Check existing test examples
- Ask team members during code review
- Create issues for testing infrastructure problems

---

**Remember**: Good tests are an investment in code quality, maintainability, and team confidence. They serve as living documentation and safety nets for refactoring. 