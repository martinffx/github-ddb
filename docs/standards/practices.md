# Development Practices

## Test-Driven Development
1. **Write Test First** - Define the expected behavior
2. **Write Minimal Code** - Make the test pass
3. **Refactor** - Improve code while keeping tests green

## Development Workflow
1. **Record Definition** - Define DynamoDB-Toolbox entity schema
2. **Repository Layer** - Implement data access methods
3. **Service Layer** - Add business logic and validation
4. **API Layer** - Create Fastify route handlers
5. **Integration Tests** - End-to-end API testing

## DynamoDB Testing
- Use DynamoDB Local for integration tests
- Mock repositories for unit testing domain logic
- Test all access patterns defined in the ERD
- Validate GSI queries work correctly

## Commands
- `pnpm test` - Run all tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm dev` - Start development server
- `pnpm format` - Format code
- `pnpm lint` - lint code
- `pnpm typecheck` - typecheck code

## Quality Standards
- 100% test coverage for business logic
- All access patterns tested with real DynamoDB queries
- Type safety maintained throughout all layers
- Performance testing for complex queries
