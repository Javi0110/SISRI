#!/bin/bash

echo "🧪 RIDS System - Comprehensive Test Suite"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Set exit on error
set -e

# Check if Node.js and npm are installed
echo "🔍 Checking prerequisites..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi

print_status "Node.js and npm are installed"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    print_status "Dependencies installed"
fi

# Run type checking
echo "🔍 Running TypeScript type checking..."
if npx tsc --noEmit; then
    print_status "TypeScript type checking passed"
else
    print_error "TypeScript type checking failed"
    exit 1
fi

# Run linting
echo "🧹 Running ESLint..."
if npm run lint; then
    print_status "Linting passed"
else
    print_warning "Linting issues found (not blocking)"
fi

# Run unit tests
echo "🧪 Running unit tests..."
if npm test -- --watchAll=false --coverage --passWithNoTests; then
    print_status "Unit tests passed"
else
    print_error "Unit tests failed"
    exit 1
fi

# Run integration tests
echo "🔗 Running integration tests..."
if npm test -- --watchAll=false --testPathPattern=integration --passWithNoTests; then
    print_status "Integration tests passed"
else
    print_error "Integration tests failed"
    exit 1
fi

# Check test coverage
echo "📊 Checking test coverage..."
if npm run test:coverage -- --watchAll=false --coverageReporters=text-summary --passWithNoTests; then
    print_status "Coverage report generated"
else
    print_warning "Coverage check completed with warnings"
fi

# Build the application
echo "🏗️  Building application..."
if npm run build; then
    print_status "Build successful"
else
    print_error "Build failed"
    exit 1
fi

echo ""
echo "🎉 All tests passed successfully!"
echo "📈 Coverage report available in coverage/ directory"
echo "🚀 Application is ready for deployment" 