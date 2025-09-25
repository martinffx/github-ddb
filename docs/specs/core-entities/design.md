# Core Entities Design Document

## Overview

This document outlines the architecture and implementation status for the three core entities in the GitHub DynamoDB project: **User**, **Organization**, and **Repository**. The system implements a layered architecture pattern with single-table DynamoDB design.

### Current Status: 44% Complete

The foundation is solid with a working User domain that establishes proven patterns, but Organization and Repository domains have critical implementation gaps that block completion.

**Working Components:**
- ✓ DynamoDB schema with single table design
- ✓ UserEntity with complete transformation methods
- ✓ UserRepository with full CRUD operations
- ✓ Test infrastructure with DynamoDB Local
- ✓ Comprehensive UserRepository tests
- ✓ Type-safe entity definitions using dynamodb-toolbox

**Blocking Issues:**
- ❌ OrganizationEntity missing updateOrganization method
- ❌ RepositoryEntity completely missing implementation
- ❌ OrganizationRepository listOrgs method uses incorrect QueryCommand.scan()
- ❌ RepositoryRepository completely missing
- ❌ GSI3SK timestamp generation bug in RepoRecord schema
- ❌ No test coverage for Organization/Repository domains

## Architecture Status

### Domain Implementation Matrix

| Domain | Entity | Repository | Service | Routes | Tests | Status |
|--------|--------|------------|---------|--------|-------|--------|
| User | ✓ COMPLETE | ✓ COMPLETE | ✗ Empty | ✗ Empty | ✓ COMPLETE | **REFERENCE** |
| Organization | ⚠ PARTIAL | ⚠ PARTIAL | ✗ Missing | ✗ Missing | ✗ Missing | **INCOMPLETE** |
| Repository | ✗ Missing | ✗ Missing | ✗ Missing | ✗ Missing | ✗ Missing | **NOT STARTED** |

**User Domain (Reference Implementation):**
- Status: COMPLETE - serves as the pattern other domains must follow
- Entity: All transformation methods implemented (fromRequest, fromRecord, toRecord, toResponse, updateUser)
- Repository: Full CRUD with pagination, error handling, conditional operations
- Tests: Comprehensive coverage with all CRUD operations

## Domain Models

### Entity Transformation Pattern

All entities follow the proven UserEntity transformation pattern:

```typescript
class EntityName {
  // Core transformation methods (required for all entities)
  static fromRequest(request: EntityCreateRequest): Entity
  static fromRecord(record: EntityFormatted): Entity
  toRecord(): EntityInput
  toResponse(): EntityResponse
  updateEntity(updates: UpdateEntityOpts): Entity  // MISSING in Org/Repo
}
```

### Data Models

#### User Entity (COMPLETE)
```typescript
interface UserEntity {
  username: string
  email: string
  bio?: string
  paymentPlanId?: string
  created: DateTime
  modified: DateTime
}
```

**Key Pattern:** `ACCOUNT#{username}`
**Status:** ✓ Complete reference implementation

#### Organization Entity (PARTIAL)
```typescript
interface OrganizationEntity {
  orgName: string
  description?: string
  paymentPlanId?: string
  created: DateTime
  modified: DateTime
}
```

**Key Pattern:** `ACCOUNT#{org_name}`
**Critical Gap:** Missing `updateOrganization()` method

#### Repository Entity (MISSING)
```typescript
interface RepositoryEntity {
  owner: string
  repoName: string
  description?: string
  isPrivate: boolean
  language?: string
  created: DateTime
  modified: DateTime
}
```

**Key Pattern:** `REPO#{owner}#{repo_name}`
**Status:** ❌ Completely missing implementation

## Data Persistence

### Single Table Design

**Table:** GitHubTable
**Partition Key:** PK
**Sort Key:** SK
**Billing Mode:** PAY_PER_REQUEST

#### Key Patterns
- **Accounts:** `ACCOUNT#{name}` (for both users and organizations)
- **Repositories:** `REPO#{owner}#{repo_name}`

#### Global Secondary Indexes

| GSI | Partition Key | Sort Key | Purpose |
|-----|---------------|----------|---------|
| GSI1 | GSI1PK | GSI1SK | General queries |
| GSI2 | GSI2PK | GSI2SK | Metadata queries |
| GSI3 | GSI3PK | GSI3SK | Repository-by-owner queries |

#### Access Patterns

**Core Entity Operations (Main Table):**
- `GetItem PK=ACCOUNT#{username}, SK=ACCOUNT#{username}` - Get user
- `GetItem PK=ACCOUNT#{orgname}, SK=ACCOUNT#{orgname}` - Get organization
- `GetItem PK=REPO#{owner}#{reponame}, SK=REPO#{owner}#{reponame}` - Get repository

**Repository-by-Owner Queries (GSI3 - HAS CRITICAL BUG):**
- `Query GSI3PK=ACCOUNT#{owner}, GSI3SK begins_with '#'` - List repos by user or organization
- `Query GSI3 sort by GSI3SK (updated_at)` - Recent repositories by user or organization

**Note**: `ACCOUNT#` is a key pattern shared by both Users and Organizations - it's not a separate entity type.

**Critical Schema Bug:** RepoRecord.GSI3SK uses `DateTime.utc()` at schema definition time instead of record creation time, causing all repositories to have the same timestamp.

### Repository Pattern

UserRepository establishes the proven data access pattern:

```typescript
class EntityRepository {
  constructor(table: GithubTable, entity: EntityRecord)

  // CRUD operations following UserRepository pattern
  async createEntity(entity: Entity): Promise<Entity>
  async getEntity(key: string): Promise<Entity | undefined>
  async updateEntity(entity: Entity): Promise<Entity>
  async deleteEntity(key: string): Promise<void>
  async listEntities(limit?: number, offset?: string): Promise<EntityPage>
}
```

**Error Handling Strategy:**
- `ConditionalCheckFailedException` → `DuplicateEntityError` (create)
- `ConditionalCheckFailedException` → `EntityNotFoundError` (update)
- Cursor-based pagination with `encodePageToken/decodePageToken`

## Critical Gaps

### Phase 1: Entity Layer (IMMEDIATE)
**Priority: HIGH**

1. **Fix GSI3SK Timestamp Bug**
   ```typescript
   // Current (BROKEN)
   GSI3SK: string().link<typeof schema>(() => `${DateTime.utc()}`)

   // Required (FIX)
   GSI3SK: string().link<typeof schema>(() => `#${new Date().toISOString()}`)
   ```

2. **Implement RepositoryEntity (COMPLETE MISSING CLASS)**
   - Constructor with `RepositoryEntityOpts`
   - All 5 transformation methods following UserEntity pattern
   - Proper field mapping: `repo_name` → `repoName`, `is_private` → `isPrivate`

3. **Add OrganizationEntity.updateOrganization()**
   - Method signature: `updateOrganization(opts: UpdateOrganizationEntityOpts): OrganizationEntity`
   - Follow UserEntity.updateUser() immutable pattern

### Phase 2: Repository Layer (HIGH)
**Priority: HIGH**

1. **Implement RepositoryRepository (COMPLETE MISSING CLASS)**
   - Constructor: `constructor(table: GithubTable, record: RepoRecord)`
   - All CRUD methods following UserRepository pattern
   - GSI3 query methods: `listReposByOwner(owner: string)`

2. **Fix OrganizationRepository.listOrgs()**
   ```typescript
   // Current (BROKEN)
   return this.table.build(QueryCommand).scan()

   // Required (FIX)
   return this.table.build(ScanCommand)
   ```

### Phase 3: Test Coverage (MEDIUM)
**Priority: MEDIUM**

1. **OrganizationRepository.test.ts** - Follow UserRepository test pattern
2. **RepositoryRepository.test.ts** - Comprehensive CRUD and GSI tests
3. **Integration tests** for GSI3 repository queries

## Component Dependencies

### Layered Architecture Flow
```
Router → Service → Repository → Entity → Database
```

### Data Transformation Flow

**Inbound (API → Database):**
```
API Request → fromRequest() → Entity → toRecord() → DynamoDB
```

**Outbound (Database → API):**
```
DynamoDB → fromRecord() → Entity → toResponse() → API Response
```

### Implementation Dependencies

1. **Schema Bug Fix** → Required before any repository operations work
2. **RepositoryEntity Complete** → Required before RepositoryRepository
3. **Entity Pattern Consistency** → Required before service layer
4. **Repository CRUD Complete** → Required before GSI query implementation

## Implementation Roadmap

### Phase 1: Foundation Completion (IMMEDIATE)
**Target: Fix critical blocking issues**

**Tasks:**
- [ ] Fix RepoRecord.GSI3SK timestamp generation in schema.ts
- [ ] Implement complete RepositoryEntity class with all transformation methods
- [ ] Add OrganizationEntity.updateOrganization() method
- [ ] Create fixtures for RepositoryEntity and OrganizationEntity

**Success Criteria:** All entities have consistent transformation patterns

### Phase 2: Repository Completion (HIGH)
**Target: Achieve CRUD parity across all domains**

**Tasks:**
- [ ] Implement complete RepositoryRepository class with all CRUD operations
- [ ] Fix OrganizationRepository.listOrgs() to use ScanCommand
- [ ] Add GSI3 query methods for repository-by-owner patterns
- [ ] Implement proper error handling following UserRepository pattern

**Success Criteria:** All repositories have consistent CRUD patterns

### Phase 3: Test Coverage (MEDIUM)
**Target: Comprehensive test coverage**

**Tasks:**
- [ ] Create OrganizationRepository.test.ts following UserRepository test pattern
- [ ] Create RepositoryRepository.test.ts with comprehensive CRUD and GSI tests
- [ ] Add integration tests for GSI3 repository queries
- [ ] Test error handling and validation for all domains

**Success Criteria:** 100% test coverage for all repository operations

### Phase 4: Service Layer (LOW)
**Target: Business logic implementation**

**Tasks:**
- [ ] Implement UserService business logic
- [ ] Create OrganizationService and RepositoryService
- [ ] Add cross-domain business rules (e.g., repository ownership validation)

**Success Criteria:** Service layer provides business logic orchestration

## Next Actions

### Immediate (Fix Critical Blockers)
1. **Fix GSI3SK timestamp bug** in RepoRecord schema - currently breaks all temporal queries
2. **Implement RepositoryEntity** with complete transformation methods
3. **Add OrganizationEntity.updateOrganization()** method for pattern consistency

### Short-term (Complete Core Implementation)
1. **Implement RepositoryRepository** with full CRUD operations
2. **Fix OrganizationRepository.listOrgs()** scan pattern
3. **Create comprehensive test coverage** for Organization and Repository domains

### Dependencies & Blockers
- RepositoryEntity must be complete before RepositoryRepository can be implemented
- Schema timestamp bug must be fixed before any repository operations will work correctly
- Entity patterns must be consistent before service layer implementation can begin

## Architectural Decisions

### ✅ Proven Decisions
- **Single Table Design**: DynamoDB single table with composite keys working correctly
- **Entity Transformation Architecture**: UserEntity proves the pattern works effectively
- **Error Handling Strategy**: Type-safe error handling with domain-specific errors
- **Pagination Strategy**: Cursor-based pagination with encoded tokens

### ⚠️ Partial Decisions
- **GSI Design**: GSI3 designed for repository-by-owner queries, but has timestamp bug and missing implementations

The User domain serves as the complete reference implementation. All other domains must follow the exact same patterns to achieve architectural consistency and enable AI-assisted development.