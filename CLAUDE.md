# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a TypeScript/Node.js project using Fastify as the web framework with Biome for linting and formatting. The project appears to be in early development stages.

## Development Environment
- **Package Manager**: pnpm (version 10.15.0)
- **Runtime**: Node.js with TypeScript support via tsx
- **Web Framework**: Fastify
- **Schema Validation**: Typebox
- **Testing**: Jest
- **Linting/Formatting**: Biome

## Common Commands
- `pnpm install` - Install dependencies
- `npx biome check` - Run linter and formatter checks
- `npx biome check --write` - Run linter and formatter with auto-fixes
- `npx biome format --write .` - Format all files
- `npx tsx <file.ts>` - Run TypeScript files directly
- `npm test` - Run tests (currently not configured)

## Code Standards
- **Formatting**: Uses tabs for indentation, double quotes for strings
- **Linting**: Biome with recommended rules enabled
- **Import Organization**: Automatically organize imports on save

## Architecture Notes
- Project uses pnpm workspace configuration with specific build dependency handling
- Biome VCS integration is disabled, likely for custom git workflow
- TypeScript configuration not yet present - may need tsconfig.json for IDE support