# Technology Standards

## Architecture Pattern
**Layered Architecture** with clear separation of concerns:
```
API Layer (Fastify)
    ↓
Service Layer (Business Logic)
    ↓
Repository Layer (Data Access)
    ↓
DynamoDB
```

## Technology Stack
- **Database**: DynamoDB with single table design
- **ORM**: DynamoDB-Toolbox for type-safe schema definitions
- **API Framework**: Fastify with TypeScript
- **Testing**: Jest with DynamoDB Local
- **Validation**: TypeBox schemas
- **Linting**: Biome

## DynamoDB Design Patterns
- **Single Table**: All entities in `GitHubTable` with composite keys
- **Item Collections**: Related items share partition keys
- **Overloaded Attributes**: `ACCOUNT#` prefix for Users/Organizations
- **Sparse GSIs**: Only items with indexed attributes appear in GSIs
- **Zero-Padding**: Numeric values padded for lexicographic sorting

## Entity Transformation Pattern
All entities implement standardized transformations:
- `fromRequest()` - Convert API input to entity format
- `toRecord()` - Convert to DynamoDB record format
- `toResponse()` - Convert to API output format
- `validate()` - Input validation and business rules
