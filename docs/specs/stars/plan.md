# Star Feature Implementation Plan

**Feature**: Star Relationship
**Version**: 1.0.0
**Status**: PLANNING
**Last Updated**: 2025-11-02

## Overview

This implementation plan follows **Stub-Driven TDD** methodology with three phases per task:
1. **Stub** - Create interfaces and method signatures
2. **Test** - Write comprehensive tests defining expected behavior
3. **Implement** - Replace stubs with actual logic to make tests pass

## Implementation Philosophy

### TDD Workflow Phases

#### Phase 1: Stub Creation
- Create skeleton implementations with proper method signatures
- All methods throw `new Error("Not Implemented")`
- Benefits:
  - Immediate visibility of system structure
  - Clear dependency relationships
  - Early detection of integration issues
  - Type checking works immediately

#### Phase 2: Test Writing (Red)
- Write tests defining expected behavior against stubs
- Tests fail with "Not Implemented" errors
- Benefits:
  - Documents expected behavior before implementation
  - Defines acceptance criteria through tests
  - Enables test-first development
  - Prevents over-engineering

#### Phase 3: Implementation (Green)
- Replace stubs with actual logic to make tests pass
- Benefits:
  - Clear definition of done (all tests green)
  - Confidence in correctness
  - Built-in regression prevention
  - Refactoring safety

## Domain Structure

### Single Domain: Star

The Star feature is a single domain with no sub-domains:
- **Domain**: Star relationship between users and repositories
- **Dependencies**: User entity, Repository entity (for validation)
- **Pattern**: Repository-driven access (no service layer initially)

## Task Execution Order

Tasks must be executed in dependency order:

```
1. star_schema       (Foundation - DynamoDB schema)
   ↓
2. star_entity       (Domain model - transformations)
   ↓
3. star_repository   (Data access - DynamoDB operations)
   ↓
4. star_tests        (Validation - integration testing)
   ↓
5. star_exports      (Integration - expose APIs)
```

## Task Breakdown

### Task 1: star_schema

**File**: `/Users/martinrichards/code/gh-ddb/src/repos/schema.ts`
**Type**: Schema Definition
**Order**: 1
**Dependencies**: None

#### Description
Add StarRecord entity to DynamoDB-Toolbox schema with key patterns and computed keys.

#### TDD Steps

##### Stub Phase
Define entity structure with attribute definitions and `.link()` methods for computed keys.

**Key Patterns**:
```typescript
user_name: string().required().key()
repo_owner: string().required().key()
repo_name: string().required().key()
starred_at: string().default(() => new Date().toISOString()).savedAs('starred_at')

PK: string().key().link<typeof _schema>(
  ({ user_name }) => `ACCOUNT#${user_name}`
)

SK: string().key().link<typeof _schema>(
  ({ repo_owner, repo_name, starred_at }) =>
    `STAR#${repo_owner}#${repo_name}#${starred_at}`
)

GSI1PK: string().link<typeof _schema>(
  ({ repo_owner, repo_name }) => `REPO#${repo_owner}#${repo_name}`
)

GSI1SK: string().link<typeof _schema>(
  ({ user_name, starred_at }) => `STAR#${user_name}#${starred_at}`
)
```

##### Test Phase
Verify schema validates correctly and types are exported.

**Validations**:
- Schema compiles without errors
- StarInput type includes required fields
- StarFormatted type includes all attributes and timestamps
- Key computations generate correct strings

##### Implementation Phase
Complete all attribute definitions and key computations.

**Steps**:
1. Add StarRecord entity definition to schema.ts
2. Define business attributes with proper types
3. Add computed key links for PK, SK, GSI1PK, GSI1SK
4. Export StarRecord, StarInput, StarFormatted types
5. Update GithubSchema type to include StarRecord
6. Update initializeSchema() to register StarRecord

#### Acceptance Criteria
- [ ] StarRecord entity defined with business attributes
- [ ] PK, SK, GSI1PK, GSI1SK computed keys configured correctly
- [ ] StarInput and StarFormatted types exported
- [ ] Schema compiles without TypeScript errors
- [ ] Key computations follow specified patterns
- [ ] GSI1 keys configured for reverse queries

---

### Task 2: star_entity

**File**: `/Users/martinrichards/code/gh-ddb/src/services/entities/StarEntity.ts`
**Type**: Entity/Domain Model
**Order**: 2
**Dependencies**: star_schema

#### Description
Create StarEntity with transformation methods and validation logic.

#### TDD Steps

##### Stub Phase
Create class with method signatures throwing 'Not Implemented'.

**Methods**:
```typescript
constructor(opts: StarEntityOpts)
static fromRequest(data: StarCreateRequest): StarEntity
static fromRecord(record: StarFormatted): StarEntity
toRecord(): StarInput
toResponse(): StarResponse
static validate(data: Partial<StarCreateRequest>): void
```

**Properties**:
```typescript
userName: string
repoOwner: string
repoName: string
starredAt: DateTime
```

##### Test Phase
Unit tests for each transformation method.

**Scenarios**:
- fromRequest() normalizes input and sets defaults
- fromRecord() converts snake_case to camelCase and parses dates
- toRecord() converts camelCase to snake_case and formats dates
- toResponse() returns clean JSON-serializable object
- validate() throws ValidationError for missing fields
- validate() throws ValidationError for invalid GitHub username format
- validate() throws ValidationError for invalid repository name format

##### Implementation Phase
Implement all transformation methods following ReactionEntity pattern.

**Transformations**:
- **fromRequest**: Validate input, convert snake_case to camelCase, default starredAt to DateTime.utc()
- **fromRecord**: Convert snake_case to camelCase, parse ISO 8601 starred_at to DateTime
- **toRecord**: Convert camelCase to snake_case, format DateTime to ISO 8601
- **toResponse**: Convert camelCase to snake_case, format DateTime to ISO 8601

**Validation Rules**:
- userName must be a valid GitHub username (alphanumeric, hyphens, max 39 chars)
- repoOwner must be a valid GitHub username or organization
- repoName must be a valid repository name (alphanumeric, hyphens, underscores, dots)
- starredAt must be a valid DateTime if provided

#### Acceptance Criteria
- [ ] StarEntity class created with all properties
- [ ] fromRequest() converts API input to entity with validation
- [ ] fromRecord() converts DynamoDB record to entity with DateTime parsing
- [ ] toRecord() converts entity to DynamoDB input format
- [ ] toResponse() converts entity to API response format
- [ ] validate() enforces business rules
- [ ] All transformations tested and working
- [ ] Types exported: StarEntityOpts, StarCreateRequest, StarResponse

---

### Task 3: star_repository

**File**: `/Users/martinrichards/code/gh-ddb/src/repos/StarRepository.ts`
**Type**: Repository/Data Access
**Order**: 3
**Dependencies**: star_entity, star_schema

#### Description
Create StarRepository with all data access methods using DynamoDB transactions.

#### TDD Steps

##### Stub Phase
Create class with method signatures throwing 'Not Implemented'.

**Constructor**:
```typescript
constructor(
  table: GithubTable,
  starRecord: StarRecord,
  userRecord: UserRecord,
  repoRecord: RepoRecord
)
```

**Methods**:
```typescript
async create(star: StarEntity): Promise<StarEntity>
async get(userName: string, repoOwner: string, repoName: string): Promise<StarEntity | undefined>
async delete(userName: string, repoOwner: string, repoName: string): Promise<void>
async listByUser(userName: string, options?: ListOptions): Promise<{ items: StarEntity[], offset?: string }>
async listByRepo(repoOwner: string, repoName: string, options?: ListOptions): Promise<{ items: StarEntity[], offset?: string }>
async isStarred(userName: string, repoOwner: string, repoName: string): Promise<boolean>
```

##### Test Phase
Integration tests with DynamoDB Local - write tests before implementation.

Follow ReactionRepository.test.ts pattern with beforeAll, beforeEach, afterAll setup.

**Test Scenarios**:
- create() creates star with valid user and repository
- create() fails with non-existent user (ValidationError)
- create() fails with non-existent repository (ValidationError)
- create() is idempotent for duplicate stars
- get() retrieves star by composite key
- get() returns undefined for non-existent star
- delete() removes star successfully
- delete() is idempotent for non-existent star
- listByUser() returns all repos starred by user with pagination
- listByUser() returns empty array for user with no stars
- listByRepo() returns all users who starred repo with pagination
- listByRepo() returns empty array for repo with no stars
- isStarred() returns true when star exists
- isStarred() returns false when star doesn't exist

##### Implementation Phase
Implement each method following ReactionRepository transaction patterns.

**create() Implementation**:
1. Build PutTransaction with item from star.toRecord()
2. Add condition: `{ attr: 'PK', exists: false }` for duplicate check
3. Build ConditionCheck for UserRecord existence
4. Build ConditionCheck for RepoRecord existence
5. Execute transaction with all three operations
6. Fetch created item via get() method
7. Handle TransactionCanceledException and ConditionalCheckFailedException
8. Convert errors to ValidationError with context

**get() Implementation**:
1. Use table.build(QueryCommand) with StarRecord
2. Query partition: `ACCOUNT#{userName}`
3. Query range: `begins_with STAR#{repoOwner}#{repoName}#`
4. Limit 1 (since exact timestamp unknown)
5. Return StarEntity.fromRecord() or undefined

**delete() Implementation**:
1. Call get() to retrieve exact timestamp
2. If not found, return (idempotent)
3. Use starRecord.build(DeleteItemCommand).key(...).send()
4. No error if star doesn't exist

**listByUser() Implementation**:
1. Use table.build(QueryCommand).entities(starRecord)
2. Query partition: `ACCOUNT#{userName}`
3. Query range: `begins_with STAR#`
4. Apply options: reverse (default true), limit, exclusiveStartKey
5. Map results through StarEntity.fromRecord()
6. Return items and pagination offset

**listByRepo() Implementation**:
1. Use table.build(QueryCommand).entities(starRecord)
2. Query index: GSI1
3. Query partition: `REPO#{repoOwner}#{repoName}`
4. Query range: `begins_with STAR#`
5. Apply options: reverse (default true), limit, exclusiveStartKey
6. Map results through StarEntity.fromRecord()
7. Return items and pagination offset

**isStarred() Implementation**:
1. Call get() method
2. Return `star !== undefined`

#### Acceptance Criteria
- [ ] StarRepository class created with proper constructor
- [ ] create() method with transaction validation
- [ ] get() method with query using begins_with pattern
- [ ] delete() method with idempotent behavior
- [ ] listByUser() method with pagination support
- [ ] listByRepo() method using GSI1 with pagination
- [ ] isStarred() method returning boolean
- [ ] All methods handle errors and convert to ValidationError/EntityNotFoundError
- [ ] Transaction patterns follow ReactionRepository example

---

### Task 4: star_tests

**File**: `/Users/martinrichards/code/gh-ddb/src/repos/StarRepository.test.ts`
**Type**: Integration Tests
**Order**: 4
**Dependencies**: star_repository

#### Description
Comprehensive integration tests for StarRepository with DynamoDB Local.

#### TDD Steps

##### Stub Phase
Create test file structure with describe blocks for each method.

**Test Structure**:
- beforeAll: Set up DynamoDB Local connection and initialize schema
- beforeEach: Truncate table to ensure clean state
- afterAll: Destroy database connection
- describe blocks for: create, get, delete, listByUser, listByRepo, isStarred

##### Test Phase
Write comprehensive tests for all scenarios before implementation.

**Test Cases**:

**create()**:
- should create star with valid user and repository
- should fail with non-existent user
- should fail with non-existent repository
- should be idempotent for duplicate stars
- should handle transaction errors gracefully

**get()**:
- should retrieve star by composite key
- should return undefined for non-existent star
- should handle query with begins_with pattern

**delete()**:
- should delete existing star
- should be idempotent for non-existent star
- should not throw error when star doesn't exist

**listByUser()**:
- should list all repos starred by user
- should return empty array for user with no stars
- should support pagination with limit
- should support pagination with offset
- should sort by newest first (reverse chronological)

**listByRepo()**:
- should list all users who starred repo
- should return empty array for repo with no stars
- should support pagination with limit
- should support pagination with offset
- should sort by newest first (reverse chronological)

**isStarred()**:
- should return true when star exists
- should return false when star doesn't exist

##### Implementation Phase
Execute tests against actual implementations, verify all pass.

**Setup**:
- Create test users and repositories in beforeEach
- Use actual DynamoDB Local instance
- Initialize all required entity records (StarRecord, UserRecord, RepoRecord)

**Assertions**:
- Verify returned entities have correct data
- Verify timestamps are set correctly
- Verify pagination tokens are present when needed
- Verify errors have correct types and messages
- Verify transaction atomicity

#### Acceptance Criteria
- [ ] Test file created with proper setup and teardown
- [ ] All happy path scenarios covered
- [ ] All error cases tested
- [ ] Idempotency tested for create and delete
- [ ] Pagination tested for list operations
- [ ] 100% coverage of repository methods
- [ ] Tests run against DynamoDB Local
- [ ] All tests passing

---

### Task 5: star_exports

**Files**:
- `/Users/martinrichards/code/gh-ddb/src/repos/index.ts`
- `/Users/martinrichards/code/gh-ddb/src/services/entities/index.ts`

**Type**: Export/Integration
**Order**: 5
**Dependencies**: star_repository, star_tests

#### Description
Update export files to expose StarRepository and StarEntity.

#### TDD Steps

##### Stub Phase
Add export statements with commented placeholders.

**Files to Modify**:
- src/repos/index.ts - Add StarRepository and types
- src/services/entities/index.ts - Add StarEntity and types

##### Test Phase
Verify exports are accessible and types are correct.

**Validations**:
- Import StarRepository in test file
- Import StarEntity in test file
- Import all types successfully
- TypeScript compilation succeeds
- No circular dependency warnings

##### Implementation Phase
Add actual export statements.

**src/repos/index.ts exports**:
```typescript
export { StarRepository } from './StarRepository';
export type { StarInput, StarFormatted } from './schema';
```

**src/services/entities/index.ts exports**:
```typescript
export { StarEntity } from './StarEntity';
export type { StarEntityOpts, StarCreateRequest, StarResponse } from './StarEntity';
```

#### Acceptance Criteria
- [ ] StarRepository exported from src/repos/index.ts
- [ ] StarInput and StarFormatted types exported from src/repos/index.ts
- [ ] StarEntity exported from src/services/entities/index.ts
- [ ] StarEntityOpts, StarCreateRequest, StarResponse types exported from entities index
- [ ] All exports compile without errors
- [ ] No circular dependencies introduced

---

## Estimated Complexity

**Total Tasks**: 5
**Estimated Hours**: 5.5 hours

### Breakdown
- star_schema: 1.0 hour
- star_entity: 1.0 hour
- star_repository: 2.0 hours
- star_tests: 1.0 hour
- star_exports: 0.5 hour

### Risk Level: Low

**Identified Risks**:

1. **Timestamp precision in composite keys**
   - Impact: Low
   - Risk: Rare key collisions
   - Mitigation: ISO 8601 format provides millisecond precision, statistically negligible

2. **Query without exact timestamp**
   - Impact: Low
   - Risk: Extra roundtrip for delete operation
   - Mitigation: Acceptable trade-off, limit 1 query is efficient

3. **GSI1 hot partition**
   - Impact: Medium
   - Risk: Popular repositories could throttle GSI1
   - Mitigation: DynamoDB auto-scaling handles load, monitor in production

---

## Implementation Patterns

### Entity Pattern
**Reference**: `src/services/entities/ReactionEntity.ts`

Domain entity with four transformation methods:
- `static fromRequest(data: StarCreateRequest): StarEntity`
- `static fromRecord(record: StarFormatted): StarEntity`
- `toRecord(): StarInput`
- `toResponse(): StarResponse`
- `static validate(data: Partial<StarCreateRequest>): void`

### Repository Pattern
**Reference**: `src/repos/ReactionRepository.ts`

Data access layer with DynamoDB transactions:

**Transaction Pattern**:
1. Build PutTransaction with item and conditions
2. Build ConditionCheck transactions for validation
3. Execute all transactions atomically
4. Handle errors and convert to domain exceptions

**Error Handling**:
- TransactionCanceledException → ValidationError
- ConditionalCheckFailedException → ValidationError
- DynamoDBToolboxError → ValidationError

### Schema Pattern
DynamoDB Toolbox entity definition with computed keys:
- Use `.link<typeof _schema>()` for computed PK/SK/GSI keys
- Define business attributes with `.required()` and `.key()` modifiers

---

## Dependencies

### Internal Dependencies

**User Entity**
- File: `src/repos/schema.ts` (UserRecord)
- Reason: Validate star references existing user
- Status: IMPLEMENTED

**Repository Entity**
- File: `src/repos/schema.ts` (RepoRecord)
- Reason: Validate star references existing repository
- Status: IMPLEMENTED

### External Dependencies

**dynamodb-toolbox** (v2.7.1)
- Usage: Entity definition, transactions, queries

**luxon**
- Usage: DateTime handling for starredAt

---

## Validation Rules

### Business Rules
- A user can star a repository only once (enforced by composite key)
- Stars must reference existing users and repositories (validated via transaction)
- Starring is idempotent - returns existing star if already exists
- Unstarring is idempotent - no error if already unstarred

### Input Validation
- userName must be a valid GitHub username
- repoOwner must be a valid GitHub username or organization
- repoName must be a valid repository name
- starredAt must be a valid ISO 8601 timestamp if provided

---

## Next Steps

1. **Execute tasks in dependency order**:
   - star_schema → star_entity → star_repository → star_tests → star_exports

2. **Follow TDD workflow for each task**:
   - Stub → Test → Implement

3. **Run tests after each implementation**:
   - Verify correctness
   - Ensure all tests pass

4. **Update status tracking**:
   - Update status.md to track progress through tasks
   - Mark each phase complete (stub/test/implement)

5. **Integration verification**:
   - Run full test suite after completion
   - Verify no regressions in existing features
   - Check code coverage meets standards (100% for business logic)

---

## References

- **Design Document**: `docs/specs/stars/design.md`
- **Design JSON**: `docs/specs/stars/design.json`
- **TDD Standards**: `docs/standards/tdd.md`
- **Development Practices**: `docs/standards/practices.md`
- **Entity Pattern Example**: `src/services/entities/ReactionEntity.ts`
- **Repository Pattern Example**: `src/repos/ReactionRepository.ts`
