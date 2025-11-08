# DynamoDB Toolbox Standards

This document defines patterns and best practices for using DynamoDB Toolbox v2 in this project.

## Table of Contents
- [Schema Design](#schema-design)
- [Repository Patterns](#repository-patterns)
- [Entity Integration](#entity-integration)
- [Error Handling](#error-handling)
- [Testing Patterns](#testing-patterns)
- [Best Practices](#best-practices)

## Schema Design

### Entity Definition Structure

Define entities with proper separation between business attributes and computed keys using `.and()` block.

**Reference:** `src/repos/schema.ts` - See `UserRecord`, `RepoRecord`, `IssueRecord`

**Key Concepts:**
- Business attributes (user-provided data) in main `item()` block
- Computed keys (PK, SK, GSI keys) in `.and()` block
- Use `.key()` to mark partition/sort key attributes
- Use `.link<typeof _schema>()` to compute values from other attributes
- Use `.savedAs()` when DynamoDB attribute name differs from schema name

### Key Pattern Guidelines

**Composite Keys:**
- Mark each component with `.key()` (e.g., `owner` and `repo_name`)
- Combine in PK/SK using `.link()` (e.g., `REPO#${owner}#${repo_name}`)

**Reference:** `src/repos/schema.ts:174-217` - RepoRecord composite key pattern

### Default Values and Optional Fields

**Default Values:**
- Static defaults: `.default(false)`, `.default(0)`
- Dynamic defaults: `.default(() => DateTime.utc().toISO())`
- Timestamps: Auto-added by DynamoDB Toolbox as `_ct` and `_md` (mapped to `created` and `modified`)

**Optional Fields:**
- Use `.optional()` for nullable business attributes
- Required fields use `.required()`

**Reference:** `src/repos/schema.ts:187-188` - Default values in RepoRecord

### Validation Patterns

Use `.validate()` with regex or custom functions for field validation.

**Reference:** `src/repos/schema.ts:105-117` - Username, email, repo_name validation

### Type Exports

Always export three types for each entity:
- `EntityRecord` - The entity instance type
- `EntityInput` - Type for creating/updating items (excludes computed attributes)
- `EntityFormatted` - Type for items returned from DynamoDB (includes all attributes)

**Reference:** `src/repos/schema.ts:135-137`, `218-220`, `287-289`

### GSI Design Patterns

**Same-Item GSI (Entity Lookup):**
- All keys point to same item for alternate access patterns
- **Reference:** `src/repos/schema.ts:121-132` - UserRecord GSI1

**Item Collection GSI (Parent-Child Query):**
- Group related items under parent partition
- Use timestamp in SK for temporal sorting
- **Reference:** `src/repos/schema.ts:212-215` - RepoRecord GSI3

**Status-Based GSI (Filtered Queries):**
- Compute SK based on status/state for filtered access
- Use reverse numbering for descending order
- **Reference:** `src/repos/schema.ts:274-284` - IssueRecord GSI4

### Reserved Attribute Names

**Avoid DynamoDB Reserved Words:**
- Don't use: `name`, `type`, `value`, `data`, `status`, `date`, `time`, `created`, `modified`
- Use alternatives: `repo_name`, `item_type`, `current_value`, `entity_data`

**Timestamp Attributes:**
- DynamoDB Toolbox auto-adds `_ct` (created) and `_md` (modified) in ISO 8601 format
- When querying Entity directly, these are formatted as `created`/`modified`
- When querying Table without `.entities()`, you get raw `_ct`/`_md`
- Access in entities via `DateTime.fromISO(record.created)`

**Reference:** `src/services/entities/RepositoryEntity.ts:74-75` - Timestamp parsing

## Repository Patterns

### Basic CRUD Operations

**Create (with duplicate check):**
- Use `PutItemCommand` with condition `{ attr: "PK", exists: false }`
- Return entity via `Entity.fromRecord(result.ToolboxItem)`
- **Reference:** `src/repos/UserRepository.ts:35-51`

**Get (by key):**
- Use `GetItemCommand` with `.key()`
- Return `undefined` if not found
- **Reference:** `src/repos/UserRepository.ts:53-61`

**Update (with existence check):**
- Use `PutItemCommand` with condition `{ attr: "PK", exists: true }`
- **Reference:** `src/repos/UserRepository.ts:63-80`

**Delete:**
- Use `DeleteItemCommand` with `.key()`
- **Reference:** `src/repos/UserRepository.ts:82-89`

### Query Patterns

**Query GSI with Pagination:**
- Use Table `.build(QueryCommand)` with `.entities(this.record)` for proper formatting
- Specify partition and optional range conditions
- Use `.options({ reverse: true, exclusiveStartKey, limit })`
- **Reference:** `src/repos/RepositoryRepository.ts:160-189`

**IMPORTANT:** Always use `.entities(this.record)` when querying Table directly to ensure proper attribute mapping from raw DynamoDB names (`_ct`, `_md`) to entity names (`created`, `modified`).

**Pagination Helper Functions:**
- Encode/decode LastEvaluatedKey as base64 tokens
- **Reference:** `src/repos/schema.ts:322-332`

### Atomic Operations

**Counter Increment:**
- Use `UpdateItemCommand` with `$add(1)`
- Use `.options({ returnValues: "ALL_NEW" })` to get updated value
- **Reference:** `src/repos/CounterRepository.ts:20-36`

**Atomic Update Operations:**
- `$add(n)` - Add to numeric attribute (creates with n if doesn't exist)
- `$subtract(n)` - Subtract from numeric attribute
- `$append([items])` - Append to list attribute
- `$remove()` - Remove attribute

### Transaction Patterns

**Multi-Entity Transaction (Create with Reference Check):**
- Build multiple transactions: `PutTransaction`, `ConditionCheck`
- Execute with `execute(...transactions)`
- Fetch created item after successful transaction
- **Reference:** `src/repos/RepositoryRepository.ts:54-112`

### Conditional Update Patterns

**Exists Check:**
`.options({ condition: { attr: "PK", exists: true } })`

**Not Exists Check (Prevent Duplicates):**
`.options({ condition: { attr: "PK", exists: false } })`

**Multiple Conditions:**
Use `and` or `or` arrays in condition object.

## Entity Integration

### Entity Transformation Pattern

Entities manage all data transformations between layers. Four required methods:

1. **`fromRequest(request)`** - Router → Entity (HTTP request to domain object)
2. **`fromRecord(record)`** - Repository → Entity (DynamoDB record to domain object)
3. **`toRecord()`** - Entity → Repository (domain object to DynamoDB record)
4. **`toResponse()`** - Entity → Router (domain object to HTTP response)

**Reference:** `src/services/entities/UserEntity.ts`, `RepositoryEntity.ts`, `IssueEntity.ts`

### Data Flow Through Layers

**Create/Update Flow:**
```
HTTP Request → Entity.fromRequest() → Domain Entity → entity.toRecord() →
DynamoDB Record → DynamoDB save → DynamoDB Record with timestamps →
Entity.fromRecord() → Domain Entity → entity.toResponse() → HTTP Response
```

**Get/List Flow:**
```
HTTP Request → repository.get(id) → DynamoDB Record → Entity.fromRecord() →
Domain Entity → entity.toResponse() → HTTP Response
```

### Type Safety

**Input Types (Entity → DynamoDB):**
- `EntityInput` contains only business attributes
- Excludes: PK, SK, GSI keys, created, modified

**Formatted Types (DynamoDB → Entity):**
- `EntityFormatted` contains all attributes including computed keys and timestamps

**Reference:** `src/repos/schema.ts:136-137` - UserInput/UserFormatted types

### Field Name Conventions

**Entity Layer (camelCase):**
- `repoName`, `isPrivate`, `paymentPlanId`

**Database Layer (snake_case):**
- `repo_name`, `is_private`, `payment_plan_id`

**Mapping happens in:**
- `fromRequest()` and `fromRecord()` - Convert to camelCase
- `toRecord()` and `toResponse()` - Convert to snake_case

**Reference:** `src/services/entities/RepositoryEntity.ts:63-106`

### DynamoDB Set Conversion

Convert DynamoDB Sets to/from Arrays in entity transformations:

**fromRecord:**
```typescript
assignees: Array.from(record.assignees ?? [])
```

**toRecord:**
```typescript
assignees: this.assignees.length > 0 ? this.assignees : undefined
```

**Reference:** `src/services/entities/IssueEntity.ts:58-59`, `84-85`

## Error Handling

### DynamoDB Toolbox Error Types

**ConditionalCheckFailedException:**
- Condition expressions failed (duplicate checks, existence validation)

**DynamoDBToolboxError:**
- Schema validation failures
- Contains `path` and `message` properties

**TransactionCanceledException:**
- Transaction failed - check individual transaction results

### Error Handling Pattern

Always catch and convert DynamoDB errors to domain errors:
1. Check `ConditionalCheckFailedException` → `DuplicateEntityError` or `EntityNotFoundError`
2. Check `DynamoDBToolboxError` → `ValidationError`
3. Re-throw unknown errors

**Reference:** `src/repos/UserRepository.ts:42-50`, `src/repos/RepositoryRepository.ts:83-111`

### Custom Error Types

- `DuplicateEntityError(entityType, id)` - Entity already exists
- `EntityNotFoundError(entityType, id)` - Entity not found
- `ValidationError(field, message)` - Schema/business validation failed

**Reference:** `src/shared/errors.ts`

## Testing Patterns

### Repository Test Structure

- Use `beforeAll` to initialize schema (15s timeout for DynamoDB Local)
- Use `afterAll` to cleanup DynamoDB client
- Always cleanup test data in each test
- Use unique IDs (timestamps) to avoid collisions across test runs

**Reference:** `src/repos/UserRepository.test.ts`, `RepositoryRepository.test.ts`

### Test Organization

**Three Testing Layers Only:**
1. **Repository Tests** - Data access, CRUD, queries, transactions
2. **Service Tests** - Business logic, orchestration
3. **Router Tests** - HTTP handling, validation, error responses

**Do NOT test:**
- Entity transformations in isolation (tested through Repository layer)
- Schema definitions (validated by DynamoDB Toolbox)

### Atomic Operation Tests

Test concurrent operations to verify atomicity:
- Execute operations in parallel with `Promise.all()`
- Verify no duplicates in results
- Verify correct sequential values

**Reference:** `src/repos/CounterRepository.test.ts:24-42`

### Query and Pagination Tests

**Test Sorting:**
- Create items with time delays (`setTimeout(resolve, 50)`)
- Verify order matches expected sort (newest first, etc.)
- Verify timestamps are in correct order

**Reference:** `src/repos/RepositoryRepository.test.ts:169-236`

### Test Isolation

**Use Unique IDs:**
```typescript
const testRunId = Date.now();
const username = `testuser-${testRunId}`;
```

**Always Cleanup:**
- Delete created entities in test cleanup
- Prevents test pollution and duplicate errors

## Best Practices

### When to Use UpdateItemCommand vs PutItemCommand

**Use UpdateItemCommand:**
- Atomic operations ($add, $subtract, $append)
- Partial updates without replacing entire item
- **Reference:** `src/repos/CounterRepository.ts:20-36`

**Use PutItemCommand:**
- Creating new items (with PK not exists condition)
- Replacing entire items (with PK exists condition)
- Working with Entity objects representing complete state
- **Reference:** `src/repos/UserRepository.ts:35-51`

### Single-Table Design Patterns

**Partition Key Design:**
- Use entity type prefix: `ACCOUNT#`, `REPO#`, `COUNTER#`, `ISSUE#`
- Include composite identifiers: `REPO#${owner}#${repo_name}`
- Enables filtering by prefix matching

**Sort Key Design:**
- Same as PK for single-item access: `ACCOUNT#${username}`
- Hierarchical for item collections: `METADATA`, `ISSUE#${number}`
- Timestamps for temporal sorting: ISO 8601 format

**GSI Design:**
- GSI1/GSI2: Alternate access patterns for same entity
- GSI3: Parent-child relationships with temporal sorting
- GSI4: Status-based or filtered queries
- Keep GSI keys sparse (only items that need indexing)

### Atomic Counter Pattern

**Schema Requirements:**
- Use `number().required().default(0)` for counter field
- SK can be static: `string().key().default("METADATA")`

**Implementation:**
- Use `UpdateItemCommand` with `$add(1)`
- DynamoDB guarantees atomicity (no race conditions)
- Auto-creates counter with initial value if doesn't exist
- Returns new value in single round-trip

**Reference:** `src/repos/schema.ts:222-240`, `src/repos/CounterRepository.ts`

### Schema Initialization

Initialize DynamoDB client with proper marshall options:
- `removeUndefinedValues: true` - Remove undefined values
- `convertEmptyValues: false` - Don't convert empty strings to null

**Reference:** `src/repos/schema.ts:300-320`

### Performance Considerations

**Query vs Scan:**
- Always use Query when partition key is known
- Avoid Scan operations in production code
- Use GSIs to enable query access patterns

**Pagination:**
- Limit result sets with `.options({ limit: n })`
- Use exclusiveStartKey for pagination
- Encode LastEvaluatedKey as opaque token for clients

**Projection:**
- Current implementation uses `ProjectionType: "ALL"` for GSIs
- Consider `KEYS_ONLY` or specific attributes for large items

### Repository Constructor Pattern

**Single Entity:**
- Pass only the entity record
- **Reference:** `src/repos/UserRepository.ts:16-20`

**Multiple Entities (for references):**
- Pass Table instance for cross-entity queries
- Pass related Entity instances for transaction checks
- Keep repositories focused on their primary entity
- **Reference:** `src/repos/RepositoryRepository.ts:38-52`

## Common Pitfalls

### Don't Mix Input and Formatted Types

**Wrong:** Using `EntityInput` with `fromRecord()` (Input doesn't have timestamps)

**Right:** Use `EntityFormatted` for data from DynamoDB, `EntityInput` for data to DynamoDB

### Don't Forget Conditional Checks

**Wrong:** `PutItemCommand` without conditions (overwrites existing items)

**Right:** Always use `{ attr: "PK", exists: false }` for creates, `exists: true` for updates

### Don't Return Raw DynamoDB Records

**Wrong:** Returning `result.Item` directly from repository

**Right:** Return `Entity.fromRecord(result.Item)` or `undefined`

### Don't Query Table Without .entities()

**Wrong:** `table.build(QueryCommand).query(...).send()` - Returns raw DynamoDB attributes

**Right:** `table.build(QueryCommand).entities(this.record).query(...).send()` - Formats through schema

**Reference:** `src/repos/RepositoryRepository.ts:166-179`

### Always Clean Up Test Data

**Wrong:** Creating entities in tests without cleanup (leaves data in DynamoDB)

**Right:** Always delete created entities after test completes

## References

- **DynamoDB Toolbox Documentation:** https://dynamodb-toolbox.com
- **AWS DynamoDB Best Practices:** https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html
- **Project Schema:** `src/repos/schema.ts`
- **Example Repositories:** `src/repos/*Repository.ts`
- **Entity Examples:** `src/services/entities/*Entity.ts`
- **Test Examples:** `src/repos/*.test.ts`
