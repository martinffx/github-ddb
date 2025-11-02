# Content Entities - Implementation Tasks

## Status: IN PROGRESS
**Start Date:** 2025-11-01
**Target Completion:** TBD
**Current Phase:** Phase 4 - PullRequest Entity

---

## Phase 1: Schema Foundation

### Task 1.1: Add GSI4 to Table Schema
**Status:** ✅ COMPLETED
**Completed:** 2025-11-01
**File:** /Users/martinrichards/code/gh-ddb/src/repos/schema.ts
**Description:** Add GSI4 configuration for issue/PR status queries with reverse chronological ordering
**Implementation:**
- Add AttributeDefinitions for GSI4PK and GSI4SK to the schema
- Add GlobalSecondaryIndex configuration for GSI4
- Add GSI4 to Table definition with partitionKey (GSI4PK) and sortKey (GSI4SK)
- Verify table creation with new GSI4 index
**Tests:** Run existing tests to verify schema changes don't break functionality (109/109 tests must pass)
**Dependencies:** None
**Estimated:** 30 min
**Results:**
- Added GSI4PK and GSI4SK to AttributeDefinitions
- Configured GSI4 GlobalSecondaryIndex with proper KeySchema and Projection
- Added GSI4 to Table definition with string partition and sort keys
- Created comprehensive schema tests: /Users/martinrichards/code/gh-ddb/src/repos/schema.test.ts (6 new tests)
- All tests passing: 115/115 (increased from 109)
- No breaking changes to existing functionality

---

## Phase 2: Sequential Numbering

### Task 2.1: Create Counter Entity
**Status:** ✅ COMPLETED
**Completed:** 2025-11-01
**File:** /Users/martinrichards/code/gh-ddb/src/services/entities/CounterEntity.ts
**Description:** Entity for atomic sequential numbering shared between Issues and PRs
**Implementation:**
- Create CounterEntity class with standard transformation methods
- fromRecord() factory method for DynamoDB record transformation
- toRecord() serialization for database storage
- Key pattern: `COUNTER#{orgId}#{repoId}` for both PK and SK
- Include current_number attribute and updated_at timestamp
**Tests:** Create CounterEntity.test.ts with transformation and validation tests
**Dependencies:** Task 1.1
**Estimated:** 1 hour
**Results:**
- Created CounterEntity class with fromRecord() and toRecord() static methods
- Implemented key pattern generation using orgId and repoId
- Type-safe transformation between database records and domain objects
- Exports added to /Users/martinrichards/code/gh-ddb/src/services/entities/index.ts
- Counter entity record added to /Users/martinrichards/code/gh-ddb/src/repos/schema.ts
- Foundation ready for atomic increment operations in Task 2.2

### Task 2.2: Create Counter Repository
**Status:** ✅ COMPLETED
**Completed:** 2025-11-01
**File:** /Users/martinrichards/code/gh-ddb/src/repos/CounterRepository.ts
**Description:** Repository with atomic increment operation for sequential numbering
**Implementation:**
- incrementAndGet() method using DynamoDB UpdateExpression with ADD operation
- initializeCounter() for first-time counter creation with conditional write
- Handles concurrent updates atomically using DynamoDB's native operations
- Error handling for race conditions with retry logic
**Tests:** Create CounterRepository.test.ts with concurrency tests (10 parallel increments)
**Dependencies:** Task 2.1
**Estimated:** 2 hours
**Results:**
- Created CounterRepository with atomic incrementAndGet() method
- Implemented using DynamoDB UpdateCommand with if_not_exists() for initialization
- Atomic operation eliminates race conditions during concurrent access
- Created comprehensive test suite: /Users/martinrichards/code/gh-ddb/src/repos/CounterRepository.test.ts (5 new tests)
- Concurrency test validates 10 parallel increments work correctly
- Test isolation achieved using timestamp-based unique repository IDs
- All tests passing: 120/120 (increased from 115)
- Exports added to /Users/martinrichards/code/gh-ddb/src/repos/index.ts
- Sequential numbering infrastructure complete, Phase 3 unblocked

---

## Phase 3: Issue Entity

### Task 3.1: Create Issue Entity Record
**Status:** ✅ COMPLETED
**Completed:** 2025-11-02
**File:** /Users/martinrichards/code/gh-ddb/src/repos/schema.ts
**Description:** DynamoDB-Toolbox entity record definition for Issues
**Implementation:**
- Entity attributes: issue_number, title, body, status, author, assignees, labels
- link() function for key generation with zero-padded sequential numbers (6 digits)
- GSI4 keys for status queries: `ISSUE#OPEN#{999999-number}` for open, `#ISSUE#CLOSED#{number}` for closed
- PK: `REPO#{owner}#{repo}`, SK: `ISSUE#{number}`
- Include created_at and updated_at timestamps
**Tests:** Verified in IssueRepository tests
**Dependencies:** Task 1.1, Task 2.2
**Estimated:** 1 hour
**Results:**
- IssueRecord entity added to schema.ts with proper key patterns
- Implemented GSI4 reverse numbering for open issues (newest first)
- Forward numbering for closed issues (oldest first)
- Schema exports updated with IssueRecord, IssueInput, IssueFormatted types
- Verified in IssueRepository.test.ts

### Task 3.2: Create Issue Entity Class
**Status:** ✅ COMPLETED
**Completed:** 2025-11-02
**File:** /Users/martinrichards/code/gh-ddb/src/services/entities/IssueEntity.ts
**Description:** Issue entity with transformation methods and validation
**Implementation:**
- fromRequest() factory from API input with validation
- fromRecord() factory from DynamoDB record
- toRecord() serialization with key generation
- toResponse() API response format
- validate() business rules: title max 255 chars, status enum validation, author existence
**Tests:** Create IssueEntity.test.ts with transformation and validation tests
**Dependencies:** Task 3.1
**Estimated:** 2 hours
**Results:**
- Created IssueEntity with all four transformation methods
- Implemented validation for required fields and title length
- Proper handling of DynamoDB Sets for assignees and labels
- Type exports: IssueEntityOpts, IssueCreateRequest, IssueResponse
- Exports added to /Users/martinrichards/code/gh-ddb/src/services/entities/index.ts
- Tested through IssueRepository integration tests

### Task 3.3: Create Issue Repository
**Status:** ✅ COMPLETED
**Completed:** 2025-11-02
**File:** /Users/martinrichards/code/gh-ddb/src/repos/IssueRepository.ts
**Description:** Repository with CRUD and status query operations
**Implementation:**
- create() with sequential numbering via CounterRepository
- get() by repository owner/name and issue number
- update() with GSI4 key updates when status changes
- delete() soft delete operation
- list() using main table query
- listByStatus() using GSI4 for open/closed filtering
**Tests:** Create IssueRepository.test.ts with comprehensive coverage
**Dependencies:** Task 3.2
**Estimated:** 3 hours
**Results:**
- Implemented all CRUD operations with proper error handling
- Integrated CounterRepository for atomic sequential numbering
- Transaction-based create with repository existence check
- GSI4 queries for status-based filtering (open: reverse chronological, closed: chronological)
- Comprehensive test suite: /Users/martinrichards/code/gh-ddb/src/repos/IssueRepository.test.ts
- Tests cover: create, get, list, listByStatus, update, delete, concurrent operations
- All tests passing with proper cleanup
- Exports added to /Users/martinrichards/code/gh-ddb/src/repos/index.ts
- Task 3.3 complete

---

## Phase 4: PullRequest Entity

### Task 4.1: Create PullRequest Entity Record
**Status:** ✅ COMPLETED
**Completed:** 2025-11-02
**File:** /Users/martinrichards/code/gh-ddb/src/repos/schema.ts
**Description:** DynamoDB-Toolbox entity record definition for Pull Requests
**Implementation:**
- Entity attributes: pr_number, title, body, status, author, source_branch, target_branch, merge_commit_sha
- link() function for key generation with zero-padded numbers (6 digits)
- GSI1 keys for repository listing: GSI1PK/GSI1SK: `REPO#{owner}#{repo_name}`
- GSI4 keys for status-based queries: `PR#OPEN#{999999-number}` for open, `#PR#CLOSED#{number}` for closed
- PK: `REPO#{owner}#{repo_name}`, SK: `PR#{number}`
**Tests:** Verified through existing tests (all tests passing)
**Dependencies:** Task 1.1, Task 2.2
**Estimated:** 1 hour
**Results:**
- PullRequestRecord entity added to schema.ts (lines 291-345)
- Implemented PK/SK pattern matching IssueRecord: `REPO#{owner}#{repo_name}` and `PR#{number}`
- Configured GSI1PK/GSI1SK for same-item repository listing
- Configured GSI4PK/GSI4SK for status-based filtering with reverse numbering
- Zero-padded PR numbers (6 digits) matching Issue pattern
- Validation: title max 255 chars, owner/repo_name alphanumeric patterns
- PR-specific attributes: source_branch, target_branch, merge_commit_sha (optional)
- Exported PullRequestRecord, PullRequestInput, PullRequestFormatted types
- Integrated with GithubSchema type and initializeSchema() return value
- All existing tests passing (no regressions)
- TypeScript compilation successful
- Task 4.1 complete, Task 4.2 unblocked

### Task 4.2: Create PullRequest Entity Class
**Status:** PENDING
**File:** /Users/martinrichards/code/gh-ddb/src/services/entities/PullRequestEntity.ts
**Description:** Pull Request entity with transformation methods
**Implementation:**
- fromRequest() factory with validation
- fromRecord() factory from database
- toRecord() serialization with composite keys
- toResponse() API format
- validate() business rules: branch validation, status enum, merge_commit_sha only when merged
**Tests:** Create PullRequestEntity.test.ts
**Dependencies:** Task 4.1
**Estimated:** 2 hours

### Task 4.3: Create PullRequest Repository
**Status:** PENDING
**File:** /Users/martinrichards/code/gh-ddb/src/repos/PullRequestRepository.ts
**Description:** Repository with CRUD and repository listing operations
**Implementation:**
- create() with sequential numbering shared with Issues
- get() by composite key
- update() with status transitions
- delete() soft delete
- listByRepository() using GSI1
- getByNumber() helper method
**Tests:** Create PullRequestRepository.test.ts
**Dependencies:** Task 4.2
**Estimated:** 3 hours

---

## Phase 5: Comment Entities

### Task 5.1: Create IssueComment Entity
**Status:** PENDING
**Files:**
  - /Users/martinrichards/code/gh-ddb/src/repos/schema.ts (record)
  - /Users/martinrichards/code/gh-ddb/src/services/entities/IssueCommentEntity.ts (entity)
  - /Users/martinrichards/code/gh-ddb/src/repos/IssueCommentRepository.ts (repository)
**Description:** Complete IssueComment implementation with item collection pattern
**Implementation:**
- Record: PK: `ISSUECOMMENT#{owner}#{repo}#{issue}`, SK: `ISSUECOMMENT#{id}`
- Entity: fromRequest, fromRecord, toRecord, toResponse, validate
- Repository: create with UUID generation, get, update, delete, listByIssue
- Validate parent issue exists before creating comment
**Tests:** Create IssueCommentEntity.test.ts and IssueCommentRepository.test.ts
**Dependencies:** Task 3.3
**Estimated:** 4 hours

### Task 5.2: Create PRComment Entity
**Status:** PENDING
**Files:**
  - /Users/martinrichards/code/gh-ddb/src/repos/schema.ts (record)
  - /Users/martinrichards/code/gh-ddb/src/services/entities/PRCommentEntity.ts (entity)
  - /Users/martinrichards/code/gh-ddb/src/repos/PRCommentRepository.ts (repository)
**Description:** Complete PRComment implementation with item collection pattern
**Implementation:**
- Record: PK: `PRCOMMENT#{owner}#{repo}#{pr}`, SK: `PRCOMMENT#{id}`
- Entity: Include file_path and line_number for inline comments
- Repository: Same as IssueComment with PR parent validation
- Validate parent PR exists before creating comment
**Tests:** Create PRCommentEntity.test.ts and PRCommentRepository.test.ts
**Dependencies:** Task 4.3
**Estimated:** 4 hours

---

## Phase 6: Relationship Entities

### Task 6.1: Create Reaction Entity
**Status:** PENDING
**Files:**
  - /Users/martinrichards/code/gh-ddb/src/repos/schema.ts (record)
  - /Users/martinrichards/code/gh-ddb/src/services/entities/ReactionEntity.ts (entity)
  - /Users/martinrichards/code/gh-ddb/src/repos/ReactionRepository.ts (repository)
**Description:** Polymorphic reaction system supporting Issues, PRs, and Comments
**Implementation:**
- Record: Composite key pattern `{TYPE}REACTION#{owner}#{repo}#{target}#{user}`
- Entity: Support target types (ISSUE, PR, ISSUECOMMENT, PRCOMMENT)
- Repository: create with uniqueness constraint, delete, listByTarget, getByUserAndTarget
- Validate target existence based on target_type
**Tests:** Create ReactionEntity.test.ts and ReactionRepository.test.ts with polymorphic tests
**Dependencies:** Task 5.2
**Estimated:** 4 hours

### Task 6.2: Create Fork Entity
**Status:** PENDING
**Files:**
  - /Users/martinrichards/code/gh-ddb/src/repos/schema.ts (record)
  - /Users/martinrichards/code/gh-ddb/src/services/entities/ForkEntity.ts (entity)
  - /Users/martinrichards/code/gh-ddb/src/repos/ForkRepository.ts (repository)
**Description:** Fork relationship using adjacency list pattern with GSI2
**Implementation:**
- Record: PK: `REPO#{original}#{repo}`, SK: `FORK#{fork_owner}`, GSI2 for queries
- Entity: original_owner, original_repo, fork_owner, fork_repo
- Repository: create, delete, listForksOfRepo using GSI2, getFork
- Validate both source and target repositories exist
**Tests:** Create ForkEntity.test.ts and ForkRepository.test.ts
**Dependencies:** Task 6.1
**Estimated:** 3 hours

### Task 6.3: Create Star Entity
**Status:** PENDING
**Files:**
  - /Users/martinrichards/code/gh-ddb/src/repos/schema.ts (record)
  - /Users/martinrichards/code/gh-ddb/src/services/entities/StarEntity.ts (entity)
  - /Users/martinrichards/code/gh-ddb/src/repos/StarRepository.ts (repository)
**Description:** Many-to-many star relationship between users and repositories
**Implementation:**
- Record: PK: `ACCOUNT#{username}`, SK: `STAR#{owner}#{repo}`
- Entity: username, repo_owner, repo_name
- Repository: create, delete, listStarsByUser, isStarred
- Validate user and repository existence
**Tests:** Create StarEntity.test.ts and StarRepository.test.ts
**Dependencies:** Task 6.2
**Estimated:** 3 hours

---

## Phase 7: Integration & Testing

### Task 7.1: Cross-Entity Validation Tests
**Status:** PENDING
**File:** /Users/martinrichards/code/gh-ddb/src/repos/__tests__/integration/content-entities.test.ts
**Description:** Integration tests validating relationships between content and core entities
**Implementation:**
- Test Issue creation validates User and Repository existence
- Test Comment creation validates parent Issue/PR existence
- Test Reaction creation validates target entity existence
- Test Fork creation validates both repositories exist
- Test Star creation validates User and Repository existence
- Test sequential numbering shared between Issues and PRs
- Test concurrent operations and race conditions
**Tests:** New integration test suite
**Dependencies:** All Phase 1-6 tasks
**Estimated:** 2 hours

### Task 7.2: End-to-End Workflow Tests
**Status:** PENDING
**File:** /Users/martinrichards/code/gh-ddb/src/repos/__tests__/e2e/content-workflow.test.ts
**Description:** Complete feature workflow validation from creation to querying
**Implementation:**
- Test full Issue workflow: create → comment → react → update status → query by status
- Test full PR workflow: create → comment → merge → query by repository
- Test Fork workflow: create fork → list forks → validate fork tree
- Test Star workflow: star repo → list user stars → check is starred
- Test GSI4 status queries for open/closed issues
- Test GSI1 repository PR listing
- Test GSI2 fork adjacency queries
**Tests:** New end-to-end test suite
**Dependencies:** Task 7.1
**Estimated:** 2 hours

---

## Summary

**Total Tasks:** 17
**Completed:** 7
**In Progress:** 0
**Pending:** 10
**Total Estimated Time:** ~35 hours
**Elapsed Time:** ~6.5 hours
**Remaining Time:** ~28.5 hours

---

## Implementation Notes

- **TDD Approach:** Write test → Write code → Refactor for every task
- **Reference Implementations:** Use UserEntity, OrganizationEntity, RepositoryEntity, and IssueEntity as patterns
- **Layered Architecture:** Follow Router → Service → Repository → Entity → Database pattern
- **Sequential Dependencies:** Tasks must be completed in order within each phase
- **Test Coverage:** Maintain 100% coverage for all repository and entity classes
- **Atomic Operations:** Counter increment uses DynamoDB's atomic UpdateExpression with if_not_exists()
- **Key Patterns:** Follow established patterns from design.md for all entity keys
- **GSI Usage:** GSI4 for issue/PR status, GSI1 for PR listing, GSI2 for fork relationships
