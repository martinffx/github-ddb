# github-ddb

A GitHub-inspired data model implementation using DynamoDB single-table design with Fastify REST APIs.

## Overview

This project implements a scalable backend for a GitHub-like system using AWS DynamoDB's single-table design pattern. It provides a complete data layer and REST API for managing core entities: Users, Organizations, and Repositories.

## Features

- **Single Table Design**: Optimized DynamoDB schema with composite keys and GSI indexes
- **Type-Safe APIs**: Full TypeScript implementation with runtime validation using TypeBox
- **Domain-Driven Design**: Clean entity transformation patterns (fromRequest → toRecord → toResponse)
- **Layered Architecture**: Router → Service → Repository → Entity → Database
- **Comprehensive Testing**: 108 tests with full coverage across all layers
- **DynamoDB Toolbox**: Leverages dynamodb-toolbox for type-safe DynamoDB operations

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 10.18.2+
- Docker (for local DynamoDB)
- AWS credentials (for production)

### Installation

```bash
# Install dependencies
pnpm install

# Start local DynamoDB
pnpm run docker

# Set up environment variables
cp .env.example .env
cp .test.env.example .test.env
```

### Environment Configuration

Create `.env` file with:

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
DYNAMODB_ENDPOINT=http://localhost:8000  # For local development
TABLE_NAME=github-data
```

### Running the Application

```bash
# Development mode with hot reload
pnpm run dev

# Build for production
pnpm run build

# Run tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Generate coverage report
pnpm run test:coverage

# Type checking
pnpm run types

# Linting and formatting
pnpm run lint
pnpm run format
```

## Development

### Running Tests

```bash
# Run all tests
pnpm test

# Watch mode for TDD
pnpm run test:watch

# Coverage report
pnpm run test:coverage
```

### Code Quality

```bash
# Type checking
pnpm run types

# Linting
pnpm run lint

# Formatting
pnpm run format
```

## DynamoDB Local

For local development, the project uses DynamoDB Local via Docker:

```bash
# Start DynamoDB Local
pnpm run docker

# DynamoDB Local is available at:
# http://localhost:8000
```

## License

MIT License - see LICENSE file for details
