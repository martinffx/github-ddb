# Agent Configuration

This file provides guidance for AI agents working with this repository.

## Project Overview
This is a TypeScript/Node.js project using Fastify as the web framework with Biome for linting and formatting. The project implements a DynamoDB-based data layer using the dynamodb-toolbox library.

## Development Environment
- **Package Manager**: pnpm (version 10.18.2)
- **Runtime**: Node.js with TypeScript support via tsx
- **Web Framework**: Fastify
- **Schema Validation**: Typebox
- **Testing**: Jest
- **Linting/Formatting**: Biome
- **Data Layer**: DynamoDB with dynamodb-toolbox v2.7.1

## Common Commands
- `pnpm install` - Install dependencies
- `pnpm run build` - Compile TypeScript to JavaScript
- `pnpm run dev` - Run development server with hot reload
- `pnpm run test` - Run tests
- `pnpm run test:watch` - Run tests in watch mode
- `pnpm run test:coverage` - Run tests with coverage report
- `pnpm run format` - Format code with Biome
- `pnpm run lint` - Lint code with Biome
- `pnpm run types` - Check TypeScript types
- `pnpm run docker` - Start Docker services

## Code Standards
- **Formatting**: Uses tabs for indentation, double quotes for strings (see `docs/standards/style.md`)
- **Linting**: Biome with recommended rules enabled
- **Import Organization**: Automatically organize imports on save
- **Type Safety**: Strict TypeScript with no implicit any
- **Entity Pattern**: Domain entities with static factory methods for data transformation
- **DynamoDB Toolbox**: See `docs/standards/ddb.md` for schema design, repository patterns, and best practices
- **Testing**: Test-Driven Development approach - see `docs/standards/tdd.md`
- **Development Practices**: See `docs/standards/practices.md` for workflows and conventions
- **Technical Standards**: See `docs/standards/tech.md` for architecture and technology choices

## Architecture Notes
- **Layered Architecture**: Router → Service → Repository → Entity → Database
- **Domain-Driven Design**: Entities manage all data transformations (fromRequest, toRecord, toResponse, validate)
- **Repository Pattern**: DynamoDB access abstracted through repositories using dynamodb-toolbox
- **Single-Table Design**: All entities share one DynamoDB table with PK/SK patterns
- **Entity Transformations**:
  - `fromRequest()` - API request to Entity
  - `toRecord()` - Entity to DynamoDB record (InputItem)
  - `fromRecord()` - DynamoDB record to Entity (FormattedItem)
  - `toResponse()` - Entity to API response
- Project uses pnpm workspace configuration with specific build dependency handling
- Biome VCS integration is disabled, likely for custom git workflow
- TypeScript configuration includes strict mode and modern ES2020 target