# Code Style Standards

## File Organization
```
src/
├── repos/             # Data access layer, DynamoDB-Toolbox scheme
├── services/          # Business logic services
├── api/               # Fastify route handlers
├── types/             # Typebox Schema
```

## Naming Conventions
- **Repos**: PascalCase with Repository suffix (e.g., `UserRepository`),
  - **Entities**: PascalCase (e.g., `UserEntity`, `RepositoryEntity`)
  - **Repositories**: PascalCase with Repository suffix (e.g., `UserRepository`),
- **Services**: PascalCase with Service suffix (e.g., `UserService`)
- **Routes**: PascalCase files (e.g., `UserRoutes.ts`)
- **Types**: PascalCase interfaces (e.g., `CreateUserRequest`)

## DynamoDB-Toolbox Patterns
- Entity schemas define all attributes with proper types
- DDB Toolbox Entities are Records to us as to not get confused with our domian entities
- Use composite keys following the ERD design
- GSI attributes only defined for entities that use them
- Validation rules embedded in entity schemas
- Transformation methods as entity methods

## Testing Strategy
- Tests for all entities, repositories, services, and Routers
  - Router test from request to mocked service
  - Service test to mocked repo
  - Repo test against local ddb
  - no need for explicit entities testing as this will be covered in the other test cases
- Use Jest to mock
- Test data factories for consistent test objects
