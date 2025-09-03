# Agent Configuration

This file provides guidance for AI agents working with this repository.

## Project Overview
This is a TypeScript/Node.js project using Fastify as the web framework with Biome for linting and formatting. The project implements a DynamoDB-based data layer using the dynamodb-toolbox library.

## Development Environment
- **Package Manager**: pnpm (version 10.15.0)
- **Runtime**: Node.js with TypeScript support via tsx
- **Web Framework**: Fastify
- **Schema Validation**: Typebox
- **Testing**: Jest
- **Linting/Formatting**: Biome
- **Data Layer**: DynamoDB with dynamodb-toolbox

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
- **Formatting**: Uses tabs for indentation, double quotes for strings
- **Linting**: Biome with recommended rules enabled
- **Import Organization**: Automatically organize imports on save
- **Type Safety**: Strict TypeScript with no implicit any
- **Entity Pattern**: Domain entities with static factory methods

## Architecture Notes
- Project uses pnpm workspace configuration with specific build dependency handling
- Biome VCS integration is disabled, likely for custom git workflow
- TypeScript configuration includes strict mode and modern ES2020 target
- Entity pattern with from/to methods for data transformation
- Repository pattern for data access