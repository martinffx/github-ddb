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

## Architecture

### Core Entities

The system is built around three foundational entities:

- **User**: Individual accounts with unique usernames
- **Organization**: Group accounts with unique organization names
- **Repository**: Code repositories owned by users or organizations

### Data Model

```
User
├── PK: ACCOUNT#{username}
├── SK: ACCOUNT#{username}
└── Attributes: email, bio, payment_plan_id

Organization
├── PK: ACCOUNT#{org_name}
├── SK: ACCOUNT#{org_name}
└── Attributes: description, payment_plan_id

Repository
├── PK: REPO#{owner}#{repo_name}
├── SK: REPO#{owner}#{repo_name}
├── GSI3PK: ACCOUNT#{owner}
├── GSI3SK: #{updated_at}
└── Attributes: description, is_private, language
```

### Technology Stack

- **Runtime**: Node.js with TypeScript
- **Web Framework**: Fastify with Swagger/OpenAPI documentation
- **Database**: AWS DynamoDB with dynamodb-toolbox
- **Testing**: Jest with DynamoDB Local
- **Validation**: TypeBox for schema validation
- **Linting/Formatting**: Biome
- **Package Manager**: pnpm

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

## API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/docs/json`

### API Endpoints

#### Users
- `POST /v1/users` - Create a new user
- `GET /v1/users/:username` - Get user by username
- `PUT /v1/users/:username` - Update user
- `DELETE /v1/users/:username` - Delete user
- `GET /v1/users` - List all users (paginated)

#### Organizations
- `POST /v1/organizations` - Create a new organization
- `GET /v1/organizations/:orgName` - Get organization by name
- `PUT /v1/organizations/:orgName` - Update organization
- `DELETE /v1/organizations/:orgName` - Delete organization
- `GET /v1/organizations` - List all organizations (paginated)

#### Repositories
- `POST /v1/repositories` - Create a new repository
- `GET /v1/repositories/:owner/:repoName` - Get repository
- `PUT /v1/repositories/:owner/:repoName` - Update repository
- `DELETE /v1/repositories/:owner/:repoName` - Delete repository
- `GET /v1/repositories` - List all repositories (paginated)
- `GET /v1/repositories/by-owner/:owner` - List repositories by owner

## Project Structure

```
github-ddb/
├── src/
│   ├── config.ts              # Application configuration
│   ├── index.ts               # Application entry point
│   ├── repos/                 # Data access layer
│   │   ├── schema.ts          # DynamoDB table & entity schemas
│   │   ├── UserRepository.ts
│   │   ├── OrganizationRepository.ts
│   │   └── RepositoryRepository.ts
│   ├── services/              # Business logic layer
│   │   ├── entities/          # Domain entities
│   │   ├── UserService.ts
│   │   ├── OrganizationService.ts
│   │   └── RepositoryService.ts
│   └── routes/                # REST API layer
│       ├── schema.ts          # API request/response schemas
│       ├── UserRoutes.ts
│       ├── OrganizationRoutes.ts
│       └── RepositoryRoutes.ts
├── docs/
│   └── specs/                 # Feature specifications
├── package.json
└── tsconfig.json
```

## Design Patterns

### Entity Pattern

All entities implement transformation methods:

```typescript
class UserEntity {
  static fromRequest(input: CreateUserInput): UserEntity
  static fromRecord(record: UserRecord): UserEntity
  toRecord(): UserRecord
  toResponse(): UserResponse
  updateUser(updates: UpdateUserInput): UserEntity
}
```

### Repository Pattern

Repositories provide data access abstraction:

```typescript
class UserRepository {
  async create(user: UserEntity): Promise<UserEntity>
  async getByUsername(username: string): Promise<UserEntity | null>
  async update(user: UserEntity): Promise<UserEntity>
  async delete(username: string): Promise<void>
  async listAll(options?: PaginationOptions): Promise<PaginatedResult<UserEntity>>
}
```

### Service Pattern

Services implement business logic and orchestration:

```typescript
class UserService {
  constructor(private userRepo: UserRepository)
  async createUser(input: CreateUserInput): Promise<UserResponse>
  async getUser(username: string): Promise<UserResponse>
  async updateUser(username: string, updates: UpdateUserInput): Promise<UserResponse>
  async deleteUser(username: string): Promise<void>
}
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

## Contributing

1. Follow the layered architecture pattern (Router → Service → Repository → Entity)
2. Write tests using TDD approach (test → implement → refactor)
3. Use TypeBox for schema validation
4. Follow the existing entity transformation patterns
5. Maintain 100% test coverage for new features

## License

MIT License - see LICENSE file for details

## Roadmap

### Phase 1: Core Entities ✅ COMPLETE
- [x] User, Organization, Repository entities
- [x] Repository layer with CRUD operations
- [x] Service layer with business logic
- [x] REST API with full validation
- [x] 108/108 tests passing

### Phase 2: Issues & Pull Requests (Planned)
- [ ] Issue entity and workflows
- [ ] Pull request entity and workflows
- [ ] Comment system
- [ ] Status tracking

### Phase 3: Reactions & Relationships (Planned)
- [ ] Reaction system
- [ ] Follow/star relationships
- [ ] Notification patterns

### Phase 4: GitHub Apps (Planned)
- [ ] GitHub App entities
- [ ] Installation management
- [ ] Webhook handling

## Documentation

For detailed specifications and implementation guides, see:
- `/docs/specs/core-entities/` - Core entities feature documentation
- `/docs/standards/` - Coding standards and architectural patterns
- Swagger UI at `/docs` when server is running

## Support

For questions or issues, please open an issue on GitHub.
