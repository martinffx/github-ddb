# Star Feature Implementation Tasks

## Overview

**Feature**: Star Relationships (Many-to-Many User-Repository associations)
**Total Tasks**: 4
**Total Phases**: 1 (Star Domain)
**Estimated Time**: 5.5 hours
**Approach**: Sequential TDD with integrated testing (stub → test → implement)

### Implementation Strategy

This feature implements a many-to-many relationship pattern between users and repositories using DynamoDB adjacency lists. Each task follows a strict TDD workflow where tests are **integrated into each task**, not separated. You must complete all three phases (stub, test, implement) before moving to the next task.

**Critical Path**: star_schema → star_entity → star_repository → star_exports
**Parallelization**: None (strict sequential dependencies)
**Risk Level**: Low

---

## Task Breakdown

### Task 1: star_schema (1.0 hour)

**ID**: `star_schema`
**File**: `/Users/martinrichards/code/gh-ddb/src/repos/schema.ts`
**Dependencies**: None (starting point)
**Status**: ⏳ Not Started

#### Description

Add StarRecord entity to the DynamoDB-Toolbox schema with computed key patterns for adjacency list queries. This enables efficient queries for "repos starred by user" (PK/SK) and "users who starred repo" (GSI1).

#### TDD Phases

##### Stub Phase (15 min)

Create the StarRecord entity structure with attribute definitions and `.link()` methods for computed keys.

**Actions**:
- Define StarRecord entity with business attributes
- Add `.required()` and `.key()` modifiers
- Define `.link<typeof _schema>()` methods for computed keys
- Leave implementation incomplete

**Key Patterns to Define**:
```typescript
// Business attributes
user_name: string().required().key()
repo_owner: string().required().key()
repo_name: string().required().key()
starred_at: string().default(() => new Date().toISOString()).savedAs('starred_at')

// Computed keys
PK: string().key().link<typeof _schema>(({ user_name }) => `ACCOUNT#${user_name}`)
SK: string().key().link<typeof _schema>(({ repo_owner, repo_name, starred_at }) =>
  `STAR#${repo_owner}#${repo_name}#${starred_at}`)
GSI1PK: string().link<typeof _schema>(({ repo_owner, repo_name }) =>
  `REPO#${repo_owner}#${repo_name}`)
GSI1SK: string().link<typeof _schema>(({ user_name, starred_at }) =>
  `STAR#${user_name}#${starred_at}`)
```

##### Test Phase (15 min)

Verify schema compiles and types are exported correctly.

**Test Scenarios**:
1. Schema compiles without TypeScript errors
2. StarInput type includes required fields (user_name, repo_owner, repo_name)
3. StarFormatted type includes all attributes plus timestamps (created, modified)
4. Key computations generate correct string patterns
5. Types are exported from schema.ts

**Validation Approach**:
- Run `pnpm run types` to check TypeScript compilation
- Import types in a test file to verify exports
- Manually verify key pattern strings match design

##### Implement Phase (30 min)

Complete all attribute definitions and key computations.

**Implementation Steps**:
1. Add StarRecord entity definition to schema.ts
2. Define all business attributes with proper types and modifiers
3. Add computed key links for PK, SK, GSI1PK, GSI1SK
4. Export StarRecord, StarInput, StarFormatted types
5. Update GithubSchema type to include StarRecord
6. Update initializeSchema() to register StarRecord entity
7. Verify schema compiles successfully

**Reference Pattern**: Follow CounterRecord and ReactionRecord patterns in schema.ts

#### Acceptance Criteria

- [x] StarRecord entity defined with business attributes (user_name, repo_owner, repo_name, starred_at)
- [x] PK, SK, GSI1PK, GSI1SK computed keys configured correctly
- [x] Key patterns match: PK=ACCOUNT#{user_name}, SK=STAR#{repo_owner}#{repo_name}#{starred_at}
- [x] GSI1 patterns match: GSI1PK=REPO#{repo_owner}#{repo_name}, GSI1SK=STAR#{user_name}#{starred_at}
- [x] StarInput and StarFormatted types exported
- [x] Schema compiles without TypeScript errors
- [x] All tests pass (TypeScript compilation, type exports)

---

### Task 2: star_entity (1.5 hours)

**ID**: `star_entity`
**File**: `/Users/martinrichards/code/gh-ddb/src/services/entities/StarEntity.ts`
**Dependencies**: star_schema (must complete first)
**Status**: ⏳ Not Started

#### Description

Create StarEntity domain class with transformation methods and validation logic. This entity manages all data conversions between API requests, DynamoDB records, and API responses.

#### TDD Phases

##### Stub Phase (20 min)

Create StarEntity class with method signatures throwing "Not Implemented".

**Class Structure**:
```typescript
export interface StarEntityOpts {
  userName: string;
  repoOwner: string;
  repoName: string;
  starredAt: DateTime;
}

export interface StarCreateRequest {
  user_name: string;
  repo_owner: string;
  repo_name: string;
  starred_at?: string;
}

export interface StarResponse {
  user_name: string;
  repo_owner: string;
  repo_name: string;
  starred_at: string;
}

export class StarEntity {
  userName: string;
  repoOwner: string;
  repoName: string;
  starredAt: DateTime;

  constructor(opts: StarEntityOpts) { throw new Error("Not Implemented"); }

  static fromRequest(data: StarCreateRequest): StarEntity {
    throw new Error("Not Implemented");
  }

  static fromRecord(record: StarFormatted): StarEntity {
    throw new Error("Not Implemented");
  }

  toRecord(): StarInput {
    throw new Error("Not Implemented");
  }

  toResponse(): StarResponse {
    throw new Error("Not Implemented");
  }

  static validate(data: Partial<StarCreateRequest>): void {
    throw new Error("Not Implemented");
  }
}
```

##### Test Phase (40 min)

Write unit tests for each transformation method **before implementing**.

**Test File**: `/Users/martinrichards/code/gh-ddb/src/services/entities/StarEntity.test.ts`

**Test Scenarios**:

1. **fromRequest() - Normalizes input and sets defaults**
   - Converts snake_case to camelCase
   - Defaults starredAt to DateTime.utc() if not provided
   - Validates required fields via validate()

2. **fromRecord() - Converts DynamoDB record to entity**
   - Converts snake_case to camelCase
   - Parses ISO 8601 starred_at string to DateTime
   - Handles all DynamoDB record attributes

3. **toRecord() - Converts entity to DynamoDB input**
   - Converts camelCase to snake_case
   - Formats DateTime to ISO 8601 string
   - Returns StarInput type

4. **toResponse() - Converts entity to API response**
   - Converts camelCase to snake_case
   - Formats DateTime to ISO 8601 string
   - Returns clean JSON-serializable object

5. **validate() - Enforces business rules**
   - Throws ValidationError for missing userName
   - Throws ValidationError for missing repoOwner
   - Throws ValidationError for missing repoName
   - Throws ValidationError for invalid GitHub username format (userName)
   - Throws ValidationError for invalid GitHub username format (repoOwner)
   - Throws ValidationError for invalid repository name format (repoName)
   - Accepts valid inputs without throwing

**Expected Test Results**: All tests should fail with "Not Implemented" errors

##### Implement Phase (30 min)

Implement all transformation methods to make tests pass.

**Implementation Guide**:

**fromRequest()**:
1. Call validate() to ensure input is valid
2. Convert snake_case to camelCase
3. Default starredAt to DateTime.utc() if not provided
4. Parse provided starred_at string to DateTime if present
5. Return new StarEntity instance

**fromRecord()**:
1. Convert snake_case to camelCase
2. Parse ISO 8601 starred_at string to DateTime
3. Return new StarEntity instance

**toRecord()**:
1. Convert camelCase to snake_case
2. Format starredAt DateTime to ISO 8601 string
3. Return StarInput object

**toResponse()**:
1. Convert camelCase to snake_case
2. Format starredAt DateTime to ISO 8601 string
3. Return StarResponse object

**validate()**:
1. Check userName is provided and valid (alphanumeric, hyphens, max 39 chars)
2. Check repoOwner is provided and valid (same rules as userName)
3. Check repoName is provided and valid (alphanumeric, hyphens, underscores, dots)
4. Throw ValidationError with descriptive message if any validation fails

**Validation Rules**:
- GitHub username: `/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/`
- Repository name: `/^[a-zA-Z0-9._-]+$/`

**Reference Pattern**: Follow ReactionEntity.ts implementation

#### Acceptance Criteria

- [x] StarEntity class created with all properties (userName, repoOwner, repoName, starredAt)
- [x] fromRequest() converts API input to entity with validation
- [x] fromRecord() converts DynamoDB record to entity with DateTime parsing
- [x] toRecord() converts entity to DynamoDB input format
- [x] toResponse() converts entity to API response format
- [x] validate() enforces business rules (required fields, format validation)
- [x] All transformations tested with comprehensive unit tests
- [x] Types exported: StarEntityOpts, StarCreateRequest, StarResponse
- [x] All tests pass

---

### Task 3: star_repository (2.5 hours)

**ID**: `star_repository`
**File**: `/Users/martinrichards/code/gh-ddb/src/repos/StarRepository.ts`
**Dependencies**: star_entity, star_schema (must complete both first)
**Status**: ⏳ Not Started

#### Description

Create StarRepository with all data access methods using DynamoDB transactions for atomic validation. Implements CRUD operations with idempotency, pagination, and transaction-based referential integrity checks.

#### TDD Phases

##### Stub Phase (30 min)

Create StarRepository class with method signatures throwing "Not Implemented".

**Class Structure**:
```typescript
export interface ListOptions {
  limit?: number;
  offset?: string;
  reverse?: boolean;
}

export class StarRepository {
  private table: GithubTable;
  private starRecord: typeof StarRecord;
  private userRecord: typeof UserRecord;
  private repoRecord: typeof RepoRecord;

  constructor(
    table: GithubTable,
    starRecord: typeof StarRecord,
    userRecord: typeof UserRecord,
    repoRecord: typeof RepoRecord
  ) {
    this.table = table;
    this.starRecord = starRecord;
    this.userRecord = userRecord;
    this.repoRecord = repoRecord;
  }

  async create(star: StarEntity): Promise<StarEntity> {
    throw new Error("Not Implemented");
  }

  async get(
    userName: string,
    repoOwner: string,
    repoName: string
  ): Promise<StarEntity | undefined> {
    throw new Error("Not Implemented");
  }

  async delete(
    userName: string,
    repoOwner: string,
    repoName: string
  ): Promise<void> {
    throw new Error("Not Implemented");
  }

  async listByUser(
    userName: string,
    options?: ListOptions
  ): Promise<{ items: StarEntity[]; offset?: string }> {
    throw new Error("Not Implemented");
  }

  async listByRepo(
    repoOwner: string,
    repoName: string,
    options?: ListOptions
  ): Promise<{ items: StarEntity[]; offset?: string }> {
    throw new Error("Not Implemented");
  }

  async isStarred(
    userName: string,
    repoOwner: string,
    repoName: string
  ): Promise<boolean> {
    throw new Error("Not Implemented");
  }
}
```

##### Test Phase (60 min)

Write integration tests with DynamoDB Local **before implementing methods**.

**Test File**: `/Users/martinrichards/code/gh-ddb/src/repos/StarRepository.test.ts`

**Test Setup** (follow ReactionRepository.test.ts pattern):
- beforeAll: Initialize DynamoDB Local, create table, seed test users and repos
- beforeEach: Clear star records (preserve user/repo fixtures)
- afterAll: Cleanup DynamoDB Local resources

**Test Scenarios**:

1. **create() - Creates star with valid user and repository**
   - Create star relationship
   - Verify star is persisted and retrievable via get()
   - Verify timestamps are set correctly

2. **create() - Fails with non-existent user (ValidationError)**
   - Attempt to create star with invalid userName
   - Expect ValidationError with context

3. **create() - Fails with non-existent repository (ValidationError)**
   - Attempt to create star with invalid repoOwner/repoName
   - Expect ValidationError with context

4. **create() - Is idempotent for duplicate stars**
   - Create same star twice
   - Second attempt should succeed (or not throw)
   - Verify only one star exists

5. **get() - Retrieves star by composite key**
   - Create star
   - Retrieve with userName, repoOwner, repoName
   - Verify returned entity matches created star

6. **get() - Returns undefined for non-existent star**
   - Query with valid but non-existent composite key
   - Verify returns undefined (not error)

7. **delete() - Removes star successfully**
   - Create star
   - Delete star
   - Verify get() returns undefined after deletion

8. **delete() - Is idempotent for non-existent star**
   - Delete non-existent star
   - Should not throw error

9. **listByUser() - Returns all repos starred by user with pagination**
   - Create multiple stars for same user
   - Query with pagination options (limit, offset)
   - Verify correct items returned in reverse chronological order

10. **listByUser() - Returns empty array for user with no stars**
    - Query user with no stars
    - Verify returns empty items array

11. **listByRepo() - Returns all users who starred repo with pagination**
    - Create multiple stars for same repo
    - Query GSI1 with pagination options
    - Verify correct items returned in reverse chronological order

12. **listByRepo() - Returns empty array for repo with no stars**
    - Query repo with no stars
    - Verify returns empty items array

13. **isStarred() - Returns true when star exists**
    - Create star
    - Verify isStarred() returns true

14. **isStarred() - Returns false when star doesn't exist**
    - Verify isStarred() returns false for non-existent star

**Expected Test Results**: All tests should fail with "Not Implemented" errors

##### Implement Phase (60 min)

Implement all methods following ReactionRepository transaction patterns.

**create() Implementation** (20 min):
1. Build PutTransaction with item from `star.toRecord()`
2. Add condition: `{ attr: 'PK', exists: false }` for duplicate prevention
3. Build ConditionCheck for UserRecord existence (PK=ACCOUNT#{userName}, SK=ACCOUNT#{userName})
4. Build ConditionCheck for RepoRecord existence (PK=REPO#{repoOwner}#{repoName}, SK=REPO#{repoOwner}#{repoName})
5. Execute `table.build(ExecuteTransactionCommand).transactions([...]).send()`
6. Fetch created item via `get()` method
7. Handle TransactionCanceledException and ConditionalCheckFailedException
8. Convert errors to ValidationError with descriptive context

**get() Implementation** (10 min):
1. Use `table.build(QueryCommand).entities(starRecord)`
2. Query partition: `ACCOUNT#{userName}`
3. Query range: `begins_with STAR#{repoOwner}#{repoName}#`
4. Set limit: 1 (exact timestamp unknown, but pattern unique enough)
5. Execute query
6. Return `StarEntity.fromRecord(result.Items[0])` or undefined

**delete() Implementation** (10 min):
1. Call `get()` to retrieve exact timestamp
2. If star not found, return early (idempotent)
3. Use `starRecord.build(DeleteItemCommand).key({...}).send()`
4. No error handling needed (delete is idempotent)

**listByUser() Implementation** (10 min):
1. Use `table.build(QueryCommand).entities(starRecord)`
2. Query partition: `ACCOUNT#{userName}`
3. Query range: `begins_with STAR#`
4. Apply options: `reverse: options?.reverse ?? true`, `limit`, `exclusiveStartKey` from offset
5. Execute query
6. Map results: `Items.map(item => StarEntity.fromRecord(item))`
7. Return `{ items, offset: LastEvaluatedKey ? encodeOffset(LastEvaluatedKey) : undefined }`

**listByRepo() Implementation** (10 min):
1. Use `table.build(QueryCommand).entities(starRecord).options({ index: 'GSI1' })`
2. Query partition: `REPO#{repoOwner}#{repoName}`
3. Query range: `begins_with STAR#`
4. Apply options: `reverse: options?.reverse ?? true`, `limit`, `exclusiveStartKey` from offset
5. Execute query
6. Map results: `Items.map(item => StarEntity.fromRecord(item))`
7. Return `{ items, offset: LastEvaluatedKey ? encodeOffset(LastEvaluatedKey) : undefined }`

**isStarred() Implementation** (5 min):
1. Call `get(userName, repoOwner, repoName)`
2. Return `star !== undefined`

**Error Handling Pattern**:
```typescript
catch (err) {
  if (err instanceof TransactionCanceledException) {
    // Parse cancellation reasons to determine which validation failed
    throw new ValidationError("User or repository not found");
  }
  if (err instanceof ConditionalCheckFailedException) {
    throw new ValidationError("Star already exists");
  }
  throw err;
}
```

**Reference Pattern**: Follow ReactionRepository.ts transaction implementation

#### Acceptance Criteria

- [x] StarRepository class created with constructor accepting table and entity records
- [x] create() method with transaction validation (user and repo existence)
- [x] create() is idempotent for duplicate stars
- [x] get() method with query using begins_with pattern
- [x] delete() method with idempotent behavior
- [x] listByUser() method with pagination support (limit, offset, reverse)
- [x] listByRepo() method using GSI1 with pagination
- [x] isStarred() method returning boolean
- [x] All methods handle errors and convert to ValidationError/EntityNotFoundError
- [x] Transaction patterns follow ReactionRepository example
- [x] All integration tests pass with DynamoDB Local

---

### Task 4: star_exports (0.5 hours)

**ID**: `star_exports`
**Files**:
- `/Users/martinrichards/code/gh-ddb/src/repos/index.ts`
- `/Users/martinrichards/code/gh-ddb/src/services/entities/index.ts`

**Dependencies**: star_repository (must complete first)
**Status**: ⏳ Not Started

#### Description

Update export files to expose StarRepository and StarEntity for external use. Ensures types and classes are properly exported without introducing circular dependencies.

#### TDD Phases

##### Stub Phase (5 min)

Add commented export placeholders to index files.

**Actions**:
- Add placeholder comments in `src/repos/index.ts`
- Add placeholder comments in `src/services/entities/index.ts`

```typescript
// src/repos/index.ts
// export { StarRepository } from './StarRepository';
// export type { StarInput, StarFormatted } from './schema';

// src/services/entities/index.ts
// export { StarEntity } from './StarEntity';
// export type { StarEntityOpts, StarCreateRequest, StarResponse } from './StarEntity';
```

##### Test Phase (10 min)

Verify exports are accessible and types resolve correctly.

**Test Approach**:
1. Create temporary test file to import exports
2. Verify StarRepository imports successfully
3. Verify StarEntity imports successfully
4. Verify all types import successfully
5. Run TypeScript compilation: `pnpm run types`
6. Check for circular dependency warnings

**Test Script**:
```typescript
// Temporary verification file
import { StarRepository } from './repos';
import type { StarInput, StarFormatted } from './repos';
import { StarEntity } from './services/entities';
import type { StarEntityOpts, StarCreateRequest, StarResponse } from './services/entities';

// TypeScript will validate types exist and are correct
const _typeCheck: StarInput = null as any;
```

##### Implement Phase (15 min)

Add actual export statements and verify no issues.

**Implementation Steps**:

1. **Update src/repos/index.ts**:
   ```typescript
   export { StarRepository } from './StarRepository';
   export type { StarInput, StarFormatted } from './schema';
   ```

2. **Update src/services/entities/index.ts**:
   ```typescript
   export { StarEntity } from './StarEntity';
   export type {
     StarEntityOpts,
     StarCreateRequest,
     StarResponse
   } from './StarEntity';
   ```

3. **Verify compilation**:
   ```bash
   pnpm run types
   ```

4. **Check for circular dependencies**:
   - Review import chains
   - Verify no warnings in build output

5. **Run full test suite**:
   ```bash
   pnpm run test
   ```

#### Acceptance Criteria

- [x] StarRepository exported from src/repos/index.ts
- [x] StarInput and StarFormatted types exported from src/repos/index.ts
- [x] StarEntity exported from src/services/entities/index.ts
- [x] StarEntityOpts, StarCreateRequest, StarResponse types exported from src/services/entities/index.ts
- [x] All exports compile without TypeScript errors
- [x] No circular dependencies introduced
- [x] Full test suite passes

---

## Execution Strategy

### Critical Path

All tasks must execute sequentially due to strict dependencies:

1. **star_schema** → Provides types for star_entity
2. **star_entity** → Provides domain model for star_repository
3. **star_repository** → Provides implementation for star_exports
4. **star_exports** → Completes feature implementation

**No parallelization possible** - each task strictly depends on previous task outputs.

### TDD Workflow Integration

Each task follows a three-phase TDD approach where **tests are integrated**, not separated:

#### Phase 1: Stub (Create Structure)
- Define interfaces, classes, and method signatures
- Use `throw new Error("Not Implemented")` for all methods
- Verify TypeScript compilation succeeds
- **Benefit**: Immediate visibility of system structure and dependencies

#### Phase 2: Test (Define Behavior)
- Write comprehensive tests defining expected behavior
- All tests should fail with "Not Implemented" errors
- Document edge cases and error scenarios
- **Benefit**: Clear acceptance criteria before writing implementation

#### Phase 3: Implement (Make Tests Pass)
- Replace stubs with actual logic
- Run tests continuously until all pass
- Refactor while keeping tests green
- **Benefit**: Clear definition of done (all tests green)

### Blocking Dependencies

```
star_schema (no blockers)
    ↓
star_entity (blocked by: star_schema)
    ↓
star_repository (blocked by: star_entity, star_schema)
    ↓
star_exports (blocked by: star_repository)
```

### Risk Mitigation

#### Schema Risk (Low Impact)
**Risk**: Timestamp precision in composite keys causing rare collisions
**Mitigation**: ISO 8601 format provides millisecond precision, statistically negligible
**Action**: Verify computed key patterns match existing patterns (Counter, Reaction) before implementing entity

#### Entity Risk (Medium Impact)
**Risk**: Validation logic is complex with GitHub username rules
**Mitigation**: Write comprehensive validation tests first, reference GitHub documentation
**Action**: Start with validation tests, verify error messages are clear and actionable

#### Repository Risk (High Impact)
**Risk**: Transaction pattern is critical for data integrity
**Mitigation**: Start with create() method tests, verify error handling thoroughly
**Action**: Test all transaction scenarios (success, user not found, repo not found, duplicate star)

#### Integration Risk (Medium Impact)
**Risk**: Query without exact timestamp requires extra roundtrip for delete
**Mitigation**: Acceptable trade-off, limit 1 query is efficient
**Action**: Run full test suite after each task completion to catch integration issues early

#### GSI Hot Partition Risk (Low Impact - Production)
**Risk**: GSI1 hot partition for popular repositories
**Mitigation**: DynamoDB auto-scaling handles load, monitor in production
**Action**: Add CloudWatch alarms for GSI1 throttling in production environment

### Recommended Workflow

1. **Execute tasks strictly in order** - Cannot skip or reorder due to dependencies
2. **Complete all three TDD phases** - Do not move to next task until current task's tests are green
3. **Run full test suite after each task** - Catch integration issues early
4. **Update status.md after each task** - Track progress and blockers
5. **Reference existing patterns** - Follow ReactionEntity and ReactionRepository implementations
6. **Commit after each task** - Maintain clean git history with working code at each commit

### Time Estimates

| Task | Stub | Test | Implement | Total |
|------|------|------|-----------|-------|
| star_schema | 15 min | 15 min | 30 min | 1.0 hour |
| star_entity | 20 min | 40 min | 30 min | 1.5 hours |
| star_repository | 30 min | 60 min | 60 min | 2.5 hours |
| star_exports | 5 min | 10 min | 15 min | 0.5 hours |
| **Total** | **70 min** | **125 min** | **135 min** | **5.5 hours** |

---

## Progress Tracking

### Overall Status

- [ ] **Star Domain** (0/4 tasks completed)
  - [ ] star_schema - ⏳ Not Started
  - [ ] star_entity - ⏳ Not Started
  - [ ] star_repository - ⏳ Not Started
  - [ ] star_exports - ⏳ Not Started

### Task Checklist

#### 1. star_schema
- [ ] **Stub Phase**
  - [ ] Define StarRecord entity structure
  - [ ] Add business attribute definitions
  - [ ] Add computed key `.link()` methods
  - [ ] Verify TypeScript compilation
- [ ] **Test Phase**
  - [ ] Verify schema compiles without errors
  - [ ] Verify StarInput type exports correctly
  - [ ] Verify StarFormatted type exports correctly
  - [ ] Verify key patterns match design
- [ ] **Implement Phase**
  - [ ] Complete all attribute definitions
  - [ ] Implement all computed key links
  - [ ] Update GithubSchema type
  - [ ] Update initializeSchema()
  - [ ] All tests pass

#### 2. star_entity
- [ ] **Stub Phase**
  - [ ] Create StarEntity class with properties
  - [ ] Add method signatures (fromRequest, fromRecord, toRecord, toResponse, validate)
  - [ ] Verify TypeScript compilation
- [ ] **Test Phase**
  - [ ] Write fromRequest() tests (7 scenarios)
  - [ ] Write fromRecord() tests (3 scenarios)
  - [ ] Write toRecord() tests (3 scenarios)
  - [ ] Write toResponse() tests (3 scenarios)
  - [ ] Write validate() tests (7 scenarios)
  - [ ] All tests fail with "Not Implemented"
- [ ] **Implement Phase**
  - [ ] Implement fromRequest() method
  - [ ] Implement fromRecord() method
  - [ ] Implement toRecord() method
  - [ ] Implement toResponse() method
  - [ ] Implement validate() method with GitHub username rules
  - [ ] All tests pass

#### 3. star_repository
- [ ] **Stub Phase**
  - [ ] Create StarRepository class with constructor
  - [ ] Add method signatures (create, get, delete, listByUser, listByRepo, isStarred)
  - [ ] Verify TypeScript compilation
- [ ] **Test Phase**
  - [ ] Setup DynamoDB Local test environment
  - [ ] Write create() tests (4 scenarios)
  - [ ] Write get() tests (2 scenarios)
  - [ ] Write delete() tests (2 scenarios)
  - [ ] Write listByUser() tests (2 scenarios)
  - [ ] Write listByRepo() tests (2 scenarios)
  - [ ] Write isStarred() tests (2 scenarios)
  - [ ] All tests fail with "Not Implemented"
- [ ] **Implement Phase**
  - [ ] Implement create() with transaction validation
  - [ ] Implement get() with begins_with query
  - [ ] Implement delete() with idempotency
  - [ ] Implement listByUser() with pagination
  - [ ] Implement listByRepo() with GSI1 pagination
  - [ ] Implement isStarred() method
  - [ ] All tests pass

#### 4. star_exports
- [ ] **Stub Phase**
  - [ ] Add commented export placeholders to repos/index.ts
  - [ ] Add commented export placeholders to entities/index.ts
- [ ] **Test Phase**
  - [ ] Create temporary test file
  - [ ] Verify StarRepository import works
  - [ ] Verify StarEntity import works
  - [ ] Verify all type imports work
  - [ ] Run TypeScript compilation
  - [ ] Check for circular dependencies
- [ ] **Implement Phase**
  - [ ] Add actual exports to repos/index.ts
  - [ ] Add actual exports to entities/index.ts
  - [ ] Verify TypeScript compilation succeeds
  - [ ] Run full test suite
  - [ ] All tests pass

---

## Definition of Done

A task is considered **complete** when:

1. ✅ All three TDD phases completed (stub, test, implement)
2. ✅ All acceptance criteria met
3. ✅ All tests pass (`pnpm run test`)
4. ✅ TypeScript compilation succeeds (`pnpm run types`)
5. ✅ Code follows project conventions (Biome formatting)
6. ✅ No new TypeScript errors or warnings
7. ✅ Full test suite still passes (no regressions)
8. ✅ Status updated in `docs/specs/stars/status.md`

---

## References

### Implementation Patterns
- **Entity Pattern**: `src/services/entities/ReactionEntity.ts`
- **Repository Pattern**: `src/repos/ReactionRepository.ts`
- **Schema Pattern**: `src/repos/schema.ts` (CounterRecord, ReactionRecord)
- **Test Pattern**: `src/repos/ReactionRepository.test.ts`

### Standards
- **DynamoDB Toolbox**: `docs/standards/ddb.md`
- **TDD Approach**: `docs/standards/tdd.md`
- **Development Practices**: `docs/standards/practices.md`
- **Technical Standards**: `docs/standards/tech.md`

### External Dependencies
- **dynamodb-toolbox**: v2.7.1 (Entity definition, transactions, queries)
- **luxon**: DateTime handling for starredAt timestamps

---

## Next Steps

1. Review this task document thoroughly
2. Execute tasks in order: star_schema → star_entity → star_repository → star_exports
3. Follow TDD workflow: stub → test → implement for each task
4. Update `docs/specs/stars/status.md` after each task completion
5. Commit working code after each task (keep git history clean)
6. Run full test suite after completing all tasks
7. Update feature status to "IMPLEMENTED" in status.md
