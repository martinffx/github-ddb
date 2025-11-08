# Star Feature Technical Design

## Overview

The Star feature enables many-to-many relationships between users and repositories, allowing users to "star" repositories they find interesting. This feature uses a layered architecture pattern (Router → Service → Repository → Entity → Database) with event-driven notifications.

**Architecture Pattern**: Layered Architecture with Event-Driven Microservices
**Database**: DynamoDB single-table design with dual-index access patterns
**Status**: Design Complete (v1.0.0)

## Component Architecture

### Layer Flow

```
Router (Optional API endpoints)
    ↓
Service (Direct repository access - no service layer needed initially)
    ↓
Entity (StarEntity - Domain model with transformations)
    ↓
Repository (StarRepository - DynamoDB access with transactions)
    ↓
Database (DynamoDB - GitHubTable with GSI1)
```

### Architectural Decision

This feature uses **repository-driven access** rather than a service layer because:
- Simple CRUD operations without complex business logic
- Validation requirements are straightforward (entity existence checks)
- Event publishing can be added directly to repository if needed
- Future service layer addition when notifications are implemented

## Domain Model

### StarEntity

The domain entity representing a user's star on a repository.

**Core Properties:**
```typescript
// Domain names (PascalCase)
userName: string          // GitHub username who starred
repoOwner: string         // Repository owner (user or organization)
repoName: string          // Repository name
starredAt: DateTime       // Timestamp when star was created (defaults to now)
```

### Data Transformations

#### fromRequest()
Converts API request to domain entity with validation.

**Signature:**
```typescript
static fromRequest(data: StarCreateRequest): StarEntity
```

**Input:**
```typescript
{
  user_name: string
  repo_owner: string
  repo_name: string
  // starredAt is optional - defaults to DateTime.utc()
}
```

**Flow:**
1. Validate input data
2. Create StarEntity with request values
3. Default starredAt to current UTC timestamp

#### fromRecord()
Converts DynamoDB record to domain entity.

**Signature:**
```typescript
static fromRecord(record: StarFormatted): StarEntity
```

**Notes:**
- Record includes all attributes and timestamps from DynamoDB
- Handles ISO 8601 datetime strings
- Converts snake_case from database to camelCase properties

#### toRecord()
Converts domain entity to DynamoDB record format.

**Signature:**
```typescript
toRecord(): StarInput
```

**Output:**
```typescript
{
  user_name: string
  repo_owner: string
  repo_name: string
  starred_at: string        // ISO 8601 format
}
```

**Notes:**
- Property names match DynamoDB schema (snake_case)
- Timestamps converted to ISO 8601 strings
- Consumed by PutItemCommand and UpdateItemCommand

#### toResponse()
Converts domain entity to API response format.

**Signature:**
```typescript
toResponse(): StarResponse
```

**Output:**
```typescript
{
  user_name: string
  repo_owner: string
  repo_name: string
  starred_at: string        // ISO 8601 format
}
```

### Validation Rules

**Input Validation:**
- `userName` must be a valid GitHub username format
- `repoOwner` must be a valid GitHub username or organization name
- `repoName` must be a valid repository name format
- `starredAt` must be a valid ISO 8601 timestamp if provided

**Business Rules:**
- A user can star a repository only once (enforced by composite key)
- Stars must reference existing users and repositories (validated via transaction)
- Starring is idempotent - returns existing star if already exists
- Unstarring is idempotent - no error if already unstarred

## Data Persistence

### DynamoDB Single-Table Design

**Table Name**: `GitHubTable`
**Primary Purpose**: Store all GitHub data entities with domain-driven key patterns

### Key Design

#### Main Table Access Pattern (User → Repositories)

**Purpose**: Query all repositories starred by a user

**Keys:**
```
PK:  ACCOUNT#{user_name}
SK:  STAR#{repo_owner}#{repo_name}#{starred_at}
```

**Example:**
```
PK: ACCOUNT#alice
SK: STAR#torvalds#linux#2024-11-02T10:30:00.000Z
```

**Queries:**
- List repositories starred by user: `PK = ACCOUNT#{username}, SK begins_with(STAR#)`
- Check if user starred specific repo: `PK = ACCOUNT#{username}, SK begins_with(STAR#{owner}#{repo}#)`

#### GSI1 Access Pattern (Repository → Users)

**Purpose**: Query all users who starred a repository

**Keys:**
```
GSI1PK: REPO#{repo_owner}#{repo_name}
GSI1SK: STAR#{user_name}#{starred_at}
```

**Example:**
```
GSI1PK: REPO#torvalds#linux
GSI1SK: STAR#alice#2024-11-02T10:30:00.000Z
```

**Queries:**
- List stargazers of repository: `GSI1PK = REPO#{owner}#{repo}, GSI1SK begins_with(STAR#)`

### Schema Definition

**Attributes (DynamoDB Toolbox format):**

```typescript
user_name: string()
  .required()
  .key()
  // Part of main table PK computation

repo_owner: string()
  .required()
  .key()
  // Part of GSI1PK computation

repo_name: string()
  .required()
  .key()
  // Part of GSI1PK computation

starred_at: string()
  .default(() => new Date().toISOString())
  .savedAs('starred_at')
  // Timestamp - part of SK computation

// Computed Keys (automatically generated)
PK: string()
  .key()
  .link(({ user_name }) => `ACCOUNT#${user_name}`)

SK: string()
  .key()
  .link(({ repo_owner, repo_name, starred_at }) =>
    `STAR#${repo_owner}#${repo_name}#${starred_at}`
  )

GSI1PK: string()
  .link(({ repo_owner, repo_name }) => `REPO#${repo_owner}#${repo_name}`)

GSI1SK: string()
  .link(({ user_name, starred_at }) => `STAR#${user_name}#${starred_at}`)
```

## Repository Operations

### StarRepository

The data access layer managing all DynamoDB operations for stars.

**Dependencies:**
- `GithubTable` - DynamoDB table reference
- `StarRecord` - DynamoDB Toolbox entity
- `UserRecord` - For validation that user exists
- `RepoRecord` - For validation that repository exists

### Method Signatures

#### create(star: StarEntity): Promise<StarEntity>

**Purpose**: Create a star with validation that user and repository exist

**Implementation Steps:**
1. Build PutTransaction with duplicate check (`PK exists: false`)
2. Build ConditionCheck for user existence
3. Build ConditionCheck for repository existence
4. Execute transaction atomically
5. Return star entity

**Idempotency:**
- If star already exists, returns existing star instead of error
- Duplicate check uses `exists: false` condition

**Error Handling:**
```typescript
TransactionCanceledException
  → Check if duplicate (idempotent) or missing entities
ConditionalCheckFailedException
  → Convert to ValidationError with entity name

DynamoDBToolboxError
  → Convert to ValidationError with field context
```

**Example:**
```typescript
const star = StarEntity.fromRequest({
  user_name: "alice",
  repo_owner: "torvalds",
  repo_name: "linux"
});

const created = await starRepository.create(star);
// Returns StarEntity with starred_at timestamp
```

#### get(userName: string, repoOwner: string, repoName: string): Promise<StarEntity | undefined>

**Purpose**: Get a specific star relationship

**Implementation:**
1. Query with `PK = ACCOUNT#{userName}`
2. `SK begins_with(STAR#{repoOwner}#{repoName}#)`
3. Limit 1 (since exact timestamp unknown without additional query)
4. Return `StarEntity.fromRecord()` or undefined

**Why Query Instead of GetItem:**
- We don't know the exact `starred_at` timestamp without another lookup
- Query with begins_with pattern is more efficient than pre-fetching timestamp

#### delete(userName: string, repoOwner: string, repoName: string): Promise<void>

**Purpose**: Remove a star (idempotent)

**Implementation:**
1. Call `get()` to retrieve exact timestamp
2. If not found, return (idempotent)
3. DeleteItem with full key including timestamp

**Idempotency:**
- If star doesn't exist, silently succeeds
- No error thrown for non-existent stars

#### listByUser(userName: string, options?: ListOptions): Promise<{ items: StarEntity[], offset?: string }>

**Purpose**: List all repositories a user has starred

**Query Pattern:**
```
Index: Main Table
PK: ACCOUNT#{userName}
SK begins_with: STAR#
Sort: Reverse (newest first)
```

**Implementation:**
1. Query main table with partition key
2. Apply reverse sort and pagination options
3. Map results through `StarEntity.fromRecord()`
4. Return with pagination token

**Options:**
```typescript
{
  limit?: number           // Max items to return
  reverse?: boolean        // Default: true (newest first)
  exclusiveStartKey?: string  // Pagination token
}
```

#### listByRepo(repoOwner: string, repoName: string, options?: ListOptions): Promise<{ items: StarEntity[], offset?: string }>

**Purpose**: List all users who starred a repository (stargazers)

**Query Pattern:**
```
Index: GSI1
GSI1PK: REPO#{repoOwner}#{repoName}
GSI1SK begins_with: STAR#
Sort: Reverse (newest first)
```

**Implementation:**
1. Query GSI1 with partition key
2. Apply reverse sort and pagination options
3. Map results through `StarEntity.fromRecord()`
4. Return with pagination token

**Use Cases:**
- Showing stargazer list on repository page
- Star activity timeline
- Trending repositories by recent star activity

#### isStarred(userName: string, repoOwner: string, repoName: string): Promise<boolean>

**Purpose**: Check if a user has starred a repository

**Implementation:**
1. Call `get()` method
2. Return `star !== undefined`

**Performance:**
- O(1) operation with limit 1 on query
- Minimal resource consumption

## Implementation Files

### StarEntity.ts
**Location**: `src/services/entities/StarEntity.ts`
**Responsibilities**:
- Domain model representation
- Data transformation between layers (fromRequest, toRecord, fromRecord, toResponse)
- Business rule validation
- Type safety enforcement

**Types to Export**:
```typescript
StarEntityOpts         // Constructor options
StarCreateRequest      // API input type
StarResponse          // API output type
StarEntity            // Main domain class
```

**Pattern Reference**: See `src/services/entities/IssueEntity.ts` for transformation examples

### StarRepository.ts
**Location**: `src/repos/StarRepository.ts`
**Responsibilities**:
- DynamoDB data access layer
- Transaction management for atomic operations
- Query execution with multiple patterns
- Error handling and conversion

**Methods** (see Repository Operations section above):
- `create(star)`
- `get(userName, repoOwner, repoName)`
- `delete(userName, repoOwner, repoName)`
- `listByUser(userName, options?)`
- `listByRepo(repoOwner, repoName, options?)`
- `isStarred(userName, repoOwner, repoName)`

**Pattern Reference**: See `src/repos/IssueRepository.ts` for transaction patterns

### schema.ts Modifications
**Location**: `src/repos/schema.ts` (existing file)
**Modifications**:
- Add `StarRecord` entity definition
- Add `StarInput` type (for create/update)
- Add `StarFormatted` type (for query results)
- Update `GithubSchema` type to include StarRecord
- Update `initializeSchema()` to register StarRecord

**Exports**:
```typescript
StarRecord      // DynamoDB Toolbox entity
StarInput       // Type for put operations
StarFormatted   // Type for query results
```

### StarRepository.test.ts
**Location**: `src/repos/StarRepository.test.ts`
**Focus**: Integration testing with DynamoDB Local
**Test Coverage** (see Testing Strategy section)

## Testing Strategy

### Integration Testing with DynamoDB Local

All repository tests run against DynamoDB Local to ensure actual DynamoDB compatibility.

### Test Scenarios

#### Happy Path
- Star a repository as a user
- Retrieve the star relationship
- List user's starred repositories
- List repository stargazers
- Check if user has starred repository
- Unstar a repository

**Assertions:**
- Star created with correct timestamp
- Retrieved star matches created data
- Pagination works correctly
- Star list ordered by date (newest first)
- Check returns true when starred, false when not

#### Validation & Error Cases
- Create star with non-existent user (should fail)
- Create star with non-existent repository (should fail)
- Invalid input format (should throw ValidationError)

**Assertions:**
- TransactionCanceledException caught and handled
- ValidationError thrown with correct field context
- Error message is clear and helpful

#### Idempotency
- Create duplicate star (should return existing)
- Delete non-existent star (should succeed)
- Delete already deleted star (should succeed)

**Assertions:**
- Second create returns same star data
- No error thrown on repeated delete
- Operations are safe to retry

#### Pagination
- List 100+ starred repositories with pagination
- Use pagination token to continue query
- Verify all results are returned across pages

**Assertions:**
- First page returns max items
- Pagination token present when more results exist
- Final page has no pagination token
- No duplicate items across pages

#### Concurrency
- Multiple parallel star operations on same repository
- Multiple parallel delete operations
- Concurrent create and delete on same star

**Assertions:**
- All operations succeed atomically
- No race conditions or duplicates
- Order is preserved in sorted results

### Test Structure Pattern

Follow the pattern from existing tests:

```typescript
describe('StarRepository', () => {
  let repository: StarRepository;
  let table: GithubTable;

  beforeAll(async () => {
    // Set up DynamoDB Local connection
    // Initialize table with all entities
  });

  describe('create', () => {
    it('should create a star with valid user and repository', async () => {
      // Create user and repo first
      // Create star
      // Verify returned star has correct data and timestamp
    });

    it('should fail with non-existent user', async () => {
      // Attempt create with invalid user
      // Expect ValidationError
    });

    it('should be idempotent for duplicate stars', async () => {
      // Create star twice
      // Verify second call returns existing star
    });
  });

  describe('listByUser', () => {
    it('should list user starred repos with pagination', async () => {
      // Create multiple stars
      // Query with limit
      // Verify count and pagination token
    });
  });

  // ... other test suites
});
```

## Key Design Decisions

### 1. Timestamp in Composite Key

**Decision**: Include `starred_at` timestamp in both SK and GSI1SK

**Rationale**:
- Enables natural chronological sorting
- Allows reverse sort for "newest first" without additional computation
- Prevents key collisions (multiple stars at same second is statistically insignificant)
- Supports time-range queries if needed in future

**Trade-off**: Must query instead of GetItem to retrieve exact timestamp

### 2. No Service Layer (Initially)

**Decision**: Route directly from repository to entity, skip service layer

**Rationale**:
- Simple CRUD with minimal business logic
- Validation is straightforward entity existence checks
- Reduces architectural overhead
- Service layer easily added later when notifications needed

**Trigger for Service Layer Addition**:
- Star notifications implementation
- Star count aggregation across repositories
- Rate limiting per user
- Promotional logic (trending stars)

### 3. Separate Queries for Get and Delete

**Decision**: Query with begins_with pattern instead of GetItem for `get()`

**Rationale**:
- DynamoDB GetItem requires exact key
- We don't store timestamp separately before delete
- Query with limit 1 is optimal for "does this star exist" checks
- Aligns with "check if starred" use case

**Alternative Considered**: Store star without timestamp in SK, use separate timestamp attribute
- Rejected: Adds storage overhead and complexity
- Current approach cleaner with no downsides

### 4. Idempotent Create and Delete

**Decision**: Create returns existing if duplicate, delete succeeds if not found

**Rationale**:
- Matches GitHub API behavior
- Safer for network retries
- Simplifies client code (no need for special error handling)
- Prevents cascading errors in dependent systems

### 5. GSI1 for Reverse Access Pattern

**Decision**: Dedicated GSI1 for "repository → stargazers" queries

**Rationale**:
- Separate partition key (REPO#) from main table (ACCOUNT#)
- Enables efficient queries by repository without full table scan
- Allows independent sorting and pagination per repository
- Follows DynamoDB best practice for multiple access patterns

**Cost**: Extra GSI but enables key access pattern (stargazers list)

### 6. Validation via Transaction

**Decision**: Validate user and repository existence within PutTransaction

**Rationale**:
- Atomic operation - no race condition between validation and insert
- Single roundtrip to DynamoDB
- Leverages DynamoDB Toolbox transaction support
- Follows established pattern from IssueRepository

**Flow**:
1. PutTransaction for star (with duplicate check)
2. ConditionCheck for user existence
3. ConditionCheck for repository existence
4. All succeed or all fail atomically

## Dependencies

### Internal Dependencies

**User Entity** (`UserRecord`)
- **Reason**: Validate star references existing user
- **Status**: IMPLEMENTED
- **Used In**: `create()` method for ConditionCheck

**Repository Entity** (`RepoRecord`)
- **Reason**: Validate star references existing repository
- **Status**: IMPLEMENTED
- **Used In**: `create()` method for ConditionCheck

### External Dependencies

**dynamodb-toolbox** (v2.7.1)
- **Usage**: Entity definition, key computation, DynamoDB operations
- **Specific Features**:
  - Entity schema with `.link()` for computed keys
  - PutTransaction, ConditionCheck, QueryCommand, DeleteItemCommand
  - Transaction execution via `execute()`
  - Error handling with exception types

**luxon**
- **Usage**: DateTime handling for `starredAt` timestamp
- **Specific Features**:
  - `DateTime.utc()` for timestamp generation
  - `DateTime.fromISO()` for parsing database timestamps
  - `.toISO()` for serialization to ISO 8601 format

### Infrastructure Dependencies

**DynamoDB Table**
- **Name**: GitHubTable
- **Status**: EXISTS (shared across all entities)
- **Table Config**: Single-table design with composite keys

**Global Secondary Index**
- **Name**: GSI1
- **Keys**:
  - Partition Key: GSI1PK
  - Sort Key: GSI1SK
- **Purpose**: Repository → stargazers queries
- **Status**: CONFIGURED

## Events

### Published Events

#### STAR_CREATED
**Trigger**: After successful star creation
**Payload**:
```typescript
{
  user_name: string
  repo_owner: string
  repo_name: string
  starred_at: string      // ISO 8601
}
```

**Use Cases**:
- Notify user of successful action
- Update star counts
- Trigger recommendation engine
- Analytics and tracking

#### STAR_REMOVED
**Trigger**: After successful star deletion
**Payload**:
```typescript
{
  user_name: string
  repo_owner: string
  repo_name: string
}
```

**Use Cases**:
- Update star counts
- Update user's starred list
- Analytics tracking

**Implementation Note**: Event publishing can be added directly to repository methods when event system is implemented.

### Future Event Subscriptions

**USER_DELETED**
- Clean up all stars by deleted user
- Decrement star counts for affected repositories

**REPOSITORY_DELETED**
- Clean up all stars on deleted repository
- Remove from all users' star lists

## Performance Characteristics

### Query Complexity

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Create Star | O(1) | Direct PutTransaction with condition check |
| Get Star | O(1) | Query with limit 1 on partition key |
| Delete Star | O(1) | Query to get key + DeleteItem |
| List by User | O(n) | Query on partition key, n = user's star count |
| List by Repo | O(n) | Query on GSI1 partition key, n = repo's star count |
| Check if Starred | O(1) | Query with limit 1 |

### Scalability Characteristics

**Partition Distribution**:
- Main table: Distributed by user (`ACCOUNT#` partition)
  - Each user's stars isolated in own partition
  - Handles high star volume for popular repositories
  - Scales horizontally with user base

- GSI1: Distributed by repository (`REPO#` partition)
  - Each repository's stargazers isolated in partition
  - Handles high star count for popular repositories
  - Scales horizontally with repository count

**Pagination**:
- All list operations support pagination
- Prevents large result sets consuming bandwidth
- Enables efficient pagination UI in clients

### Optimization Opportunities

**Future Considerations**:
- Cache star counts at repository level (using Counter pattern)
- Batch star operations for bulk imports
- Denormalize star counts in RepoRecord for analytics
- Archive old stars if needed for compliance

## Security Considerations

### Authorization Rules

**Write Operations** (create/delete):
- Users can only star/unstar repositories (public action)
- Cannot forge stars for other users
- Username comes from authenticated context, not request

**Read Operations** (list/get):
- Star relationships are public (like GitHub)
- Anyone can list who starred a repository
- Anyone can list what a user has starred

### Validation Requirements

**Input Validation**:
- Validate user exists in user record
- Validate repository exists in repository record
- Sanitize input to prevent injection (handled by DynamoDB schema)

**Business Rule Enforcement**:
- Prevent duplicate stars (via transaction condition)
- Prevent stars on non-existent entities (via ConditionCheck)
- Maintain referential integrity through transactions

### Data Exposure Risks

**Minimal Risk** - Stars are public data
**Considerations**:
- Don't expose internal partition keys in API responses
- Use proper authorization context for write operations
- Implement rate limiting if needed in future

## Implementation Sequence

### Phase 1: Schema & Entity (Step 1-2)
1. Add `StarRecord` to `src/repos/schema.ts`
   - Define entity with key patterns
   - Export StarInput and StarFormatted types

2. Create `src/services/entities/StarEntity.ts`
   - Implement domain entity with transformations
   - Add validation logic

### Phase 2: Repository (Step 3)
3. Create `src/repos/StarRepository.ts`
   - Implement all methods with transaction logic
   - Add error handling

### Phase 3: Testing & Integration (Step 4-6)
4. Write `src/repos/StarRepository.test.ts`
   - Comprehensive integration tests
   - All scenarios covered (happy path, errors, idempotency, pagination, concurrency)

5. Update `src/repos/schema.ts`
   - Add StarRecord to GithubSchema type
   - Register in initializeSchema()

6. Update `src/repos/index.ts`
   - Export StarRepository class
   - Export types (StarInput, StarFormatted, StarEntity)

### Estimated Effort
**Total**: 4-6 hours
- Schema & Entity: 1 hour
- Repository: 1.5-2 hours
- Tests: 1.5-2 hours
- Integration: 30 minutes

### Implementation Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Timestamp precision in SK | Rare key collisions | ISO 8601 format provides microsecond precision |
| Query without exact key | Extra roundtrip for delete | Acceptable trade-off, limit 1 is efficient |
| Concurrent deletes race | Could delete wrong key if timestamp matches | Statistically negligible, timestamps include milliseconds |
| GSI1 hot partition | High star count repos could throttle | DynamoDB auto-scaling should handle, monitor in production |

## References

### Related Patterns in Codebase
- **Entity Pattern**: See `src/services/entities/IssueEntity.ts`
- **Repository Pattern**: See `src/repos/IssueRepository.ts`
- **Schema Definition**: See `src/repos/schema.ts` for key computation examples
- **Testing Pattern**: See `src/repos/IssueRepository.test.ts`

### DynamoDB Toolbox Documentation
- Entity schema and key computation
- Transaction patterns (PutTransaction, ConditionCheck, execute)
- Query and delete operations

### Business Context
See `docs/specs/stars/spec.md` for feature requirements and user stories.
