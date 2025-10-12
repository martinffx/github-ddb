# Core Entities Tasks

## Executive Summary
- **Total Phases**: 6 phases (Infrastructure → 3 Parallel Domains → Core Access Patterns → Integration)
- **Critical Path**: Infrastructure Fixes → Domain Completion → Core Access Patterns → Integration
- **Parallel Execution**: User, Organization, and Repository domains can run simultaneously
- **Estimated Effort**: 19 tasks across 6 phases with TDD approach
- **Current Progress**:
  - Phase 1 (Infrastructure): **100% Complete** ✅
  - Phase 2-4 (Domains): **~30% Complete** 🚧
  - Phase 5 (Core Access Patterns): **~25% Complete** 🚧
  - Phase 6 (Integration): **0% Complete** ⏳

## Current Status (as of 2025-10-12)

### ✅ Completed (Phase 1 - Infrastructure)
All critical infrastructure issues resolved. Test suite fully operational (21/21 tests passing).

### 🚧 In Progress (Phase 2-4 - Domain Implementation)
- Entity and Repository layers: **Complete** for all 3 domains
- Service layer: **Not started** for all domains
- Route layer: **Not started** for all domains

### ⏳ Next Steps
1. Implement Service layer for User domain (60m)
2. Implement Routes for User domain (60m)
3. Parallel: Implement Services for Organization & Repository domains

---

## Phase Overview

```
Infrastructure Fixes (CRITICAL) ✅ COMPLETE
├── Test Infrastructure ✅
├── Schema Bugs ✅
├── Entity Bugs ✅
├── Import Fixes ✅
└── Shared Utilities ✅
    │
    ├─── User Domain (50%) ──────┐
    ├─── Organization (40%) ─────┤── Core Access Patterns (25%) ──┐
    └─── Repository (45%) ───────┘                                 ├── Integration (0%)
                                                                   │
                              GSI3 Repo Queries (25%) ─────────────┤
                              Query Optimization (0%) ─────────────┘
```

---

## Phase 1: Infrastructure Fixes (CRITICAL) ✅ COMPLETE
**Dependencies**: None | **Agent**: Coder | **Status**: 100% Complete

### ✅ Fix Test Infrastructure - COMPLETE
- **Priority**: CRITICAL | **Order**: 1 | **Time**: 30m | **Status**: ✅ Done
- [x] **Write Test Stub**
  - Created test infrastructure across all domains
  - Verified Jest imports and execution
- [x] **Verify Test Execution**
  - All 21 tests passing successfully
  - DynamoDB utilities working correctly
- [x] **Fix Configuration**
  - Jest config updated for TypeScript
  - DynamoDB Local test utilities operational
- **Success**: ✅ All test files run without import errors (21/21 passing)

### ✅ Fix Schema Timestamp Bug - COMPLETE
- **Priority**: CRITICAL | **Order**: 2 | **Time**: 45m | **Status**: ✅ Done
- [x] **Write Timestamp Test**
  - Tests verify unique GSI3SK generation
  - Validation of temporal query support
- [x] **Fix Schema Implementation**
  - Changed GSI3SK from `.link()` to `.default(() => DateTime.utc().toISO())`
  - Generates unique timestamps at record creation time
  - File: src/repos/schema.ts:196-198
- [x] **Verify Unique Timestamps**
  - Multiple records confirmed to have unique GSI3SK values
  - Temporal queries validated
- **Success**: ✅ GSI3SK generates unique timestamps for temporal queries

### ✅ Fix User Entity Bugs - COMPLETE
- **Priority**: CRITICAL | **Order**: 3 | **Time**: 30m | **Status**: ✅ Done
- [x] **Write Update Date Tests**
  - Tests validate created date preservation
  - Tests verify modified date updates
- [x] **Fix Date Preservation**
  - Fixed UserEntity.updateUser to preserve `created` date
  - Updated to set `modified` date to DateTime.utc()
  - File: src/services/entities/UserEntity.ts:92-93
- [x] **Verify Data Integrity**
  - No data corruption in update operations
  - All date fields handle correctly
- **Success**: ✅ UserEntity.updateUser handles dates correctly without corruption

### ✅ Fix Repository Imports - COMPLETE
- **Priority**: CRITICAL | **Order**: 4 | **Time**: 15m | **Status**: ✅ Done
- [x] **Write Import Tests**
  - Tests verify repository imports execute
  - ScanCommand availability confirmed
- [x] **Fix Import Statements**
  - Fixed ConditionalCheckFailedException import ordering
  - Updated error handling in all repositories
  - Files: UserRepository.ts, OrganizationRepository.ts, RepositoryRepository.ts
- [x] **Verify Functionality**
  - All repository operations execute successfully
  - Pagination functionality working
- **Success**: ✅ All repository operations work without import errors

### ✅ Create Shared Utilities - COMPLETE
- **Priority**: HIGH | **Order**: 5 | **Time**: 60m | **Status**: ✅ Done
- [x] **Write Utility Tests**
  - Error handling test interfaces defined
  - Validation helper patterns established
- [x] **Implement Validation Helpers**
  - Standardized validation across domains
  - Transformation helpers implemented
- [x] **Create Error Patterns**
  - ValidationError, DuplicateEntityError, EntityNotFoundError
  - Consistent error handling across all repositories
  - File: src/shared/errors.ts
- **Success**: ✅ Consistent validation and error handling across all domains

---

## Phase 2-4: Domain Implementation (Parallel Execution) 🚧 ~35% COMPLETE
**Dependencies**: Infrastructure Fixes Complete ✅ | **Agent**: Multi-agent workflow

### 👤 User Domain Completion - 50% COMPLETE
**Dependencies**: Infrastructure Fixes ✅ | **Priority**: HIGH | **Time**: 2h remaining

#### ✅ User Entity - COMPLETE
- [x] All transformation methods implemented
- [x] Update methods handle dates correctly
- [x] Validation logic complete

#### ✅ User Repository - COMPLETE
- [x] Full CRUD operations implemented
- [x] Error handling standardized
- [x] Scan and pagination working

#### ⏳ Implement User Service - NOT STARTED
- **Order**: 1 | **Time**: 60m | **Status**: ⏳ Next Priority
- [ ] **Write Service Interface Test**
  - Define UserService public methods
  - Test business logic interfaces
- [ ] **Implement Business Logic**
  - Create UserService class with repository orchestration
  - Add user management business rules
- [ ] **Add Validation and Errors**
  - Implement business validation rules
  - Use shared error handling patterns
- **Success**: UserService orchestrates repository operations with business validation

#### ⏳ Implement User Routes - NOT STARTED
- **Order**: 2 | **Time**: 60m | **Status**: ⏳ Blocked by Service
- [ ] **Write Route Tests**
  - Test all CRUD HTTP endpoints
  - Verify request/response validation
- [ ] **Implement HTTP Handlers**
  - Create Fastify route handlers
  - Connect routes to UserService
- [ ] **Add Request Validation**
  - Implement TypeBox schema validation
  - Add HTTP status code handling
- **Success**: Complete User REST API with validation following REST conventions

### 🏢 Organization Domain - 40% COMPLETE
**Dependencies**: Infrastructure Fixes ✅ | **Priority**: HIGH | **Time**: 2h 15m remaining

#### ✅ Complete Organization Entity - COMPLETE
- **Order**: 1 | **Time**: 45m | **Status**: ✅ Done
- [x] **Write Update Method Tests**
  - updateOrganization method signature tested
  - Immutable update pattern verified
- [x] **Implement Update Organization**
  - Added updateOrganization method following UserEntity pattern
  - Proper date handling implemented
- [x] **Verify Immutable Pattern**
  - Updates return new instances
  - Original objects remain unchanged
- **Success**: ✅ OrganizationEntity has complete CRUD methods matching UserEntity

#### ✅ Fix Organization Repository - COMPLETE
- **Order**: 2 | **Time**: 60m | **Status**: ✅ Done
- [x] **Write Repository Tests**
  - All CRUD operations tested
  - Scan implementation verified
- [x] **Fix Scan Implementation**
  - ScanCommand import fixed
  - Error handling standardized
- [x] **Complete CRUD Operations**
  - All methods follow UserRepository pattern
  - Consistent error handling added
- **Success**: ✅ OrganizationRepository follows UserRepository patterns exactly

#### ⏳ Implement Organization Service - NOT STARTED
- **Order**: 3 | **Time**: 60m | **Status**: ⏳ Next Priority
- [ ] **Write Service Tests**
  - Test business logic interfaces
  - Test cross-domain validation scenarios
- [ ] **Implement Business Logic**
  - Create OrganizationService with repository orchestration
  - Add organization management rules
- [ ] **Add Cross-Domain Validation**
  - Integrate with user ownership validation
  - Add business rules for organization management
- **Success**: OrganizationService manages organizations with user integration

#### ⏳ Implement Organization Routes - NOT STARTED
- **Order**: 4 | **Time**: 60m | **Status**: ⏳ Blocked by Service
- [ ] **Write Route Tests**
  - Test organization CRUD endpoints
  - Test ownership validation
- [ ] **Implement HTTP Handlers**
  - Create organization REST endpoints
  - Connect to OrganizationService
- [ ] **Add Auth Validation**
  - Implement organization ownership validation
  - Ensure consistent API patterns
- **Success**: Organization REST API with ownership validation

### 📁 Repository Domain - 45% COMPLETE
**Dependencies**: Infrastructure Fixes ✅ | **Priority**: HIGH | **Time**: 2h remaining

#### ✅ Implement Repository Entity - COMPLETE
- **Order**: 1 | **Time**: 90m | **Status**: ✅ Done
- [x] **Write Entity Tests**
  - All 5 transformation methods tested
  - Field mapping verified (repo_name ↔ repoName, is_private ↔ isPrivate)
- [x] **Implement Transformation Methods**
  - fromRequest, fromRecord, toRecord, toResponse, updateRepository
  - Following UserEntity pattern exactly
- [x] **Add Validation Logic**
  - Repository field validation added
  - Proper data type handling ensured
- **Success**: ✅ Complete RepositoryEntity with all transformation methods

#### ✅ Implement Repository Repository - COMPLETE
- **Order**: 2 | **Time**: 90m | **Status**: ✅ Done
- [x] **Write Repository Tests**
  - Full CRUD operations tested
  - GSI3 query methods verified
- [x] **Implement CRUD Operations**
  - Following UserRepository pattern exactly
  - All basic repository operations added
- [x] **Add GSI3 Queries**
  - Implemented listReposByOwner using GSI3 (listByOwner method)
  - Repository-by-owner query patterns added
- **Success**: ✅ Full CRUD with GSI3 query support

#### ⏳ Implement Repository Service - NOT STARTED
- **Order**: 3 | **Time**: 60m | **Status**: ⏳ Next Priority
- [ ] **Write Service Tests**
  - Test business logic interfaces
  - Test ownership validation scenarios
- [ ] **Implement Business Logic**
  - Create RepositoryService with repository orchestration
  - Add repository management rules
- [ ] **Add Ownership Validation**
  - Validate repository ownership
  - Integrate with organization/user domains
- **Success**: RepositoryService with cross-domain ownership validation

#### ⏳ Implement Repository Routes - NOT STARTED
- **Order**: 4 | **Time**: 60m | **Status**: ⏳ Blocked by Service
- [ ] **Write Route Tests**
  - Test repository CRUD endpoints
  - Test GSI3 listing endpoints
- [ ] **Implement HTTP Handlers**
  - Create repository REST endpoints
  - Add repository listing by owner
- [ ] **Add Ownership Auth**
  - Implement ownership authorization
  - Add repository operation permissions
- **Success**: Repository REST API with GSI3 listing and ownership auth

---

## Phase 5: Core Access Patterns - 25% COMPLETE
**Dependencies**: Repository Domain Complete | **Priority**: HIGH | **Time**: 1h 15m remaining

### 🔍 Implement GSI3 Repo Queries - 25% COMPLETE
- **Order**: 1 | **Time**: 75m remaining | **Status**: 🚧 Partially Complete
- [x] **Write GSI3 Query Tests** (Partial)
  - Basic listByOwner tests implemented in RepositoryRepository.test.ts
  - Additional temporal sorting tests needed
- [x] **Implement Repo By Owner Queries** (Partial)
  - listByOwner method implemented in RepositoryRepository
  - Uses GSI3 index with proper query structure
- [ ] **Add Temporal Sorting**
  - Implement recent repositories sorted by updated_at
  - Add pagination support for repository listings
- **Success**: GSI3 repository-by-owner queries work with temporal sorting and pagination

### ⏳ Optimize Core Query Patterns - NOT STARTED
- **Order**: 2 | **Time**: 45m | **Status**: ⏳ Blocked by Query Completion
- [ ] **Write Performance Tests**
  - Benchmark core entity operations (GetItem, Query)
  - Set performance targets for each access pattern
- [ ] **Benchmark Core Queries**
  - Measure and document query performance characteristics
  - Identify bottlenecks in GSI3 query operations
- [ ] **Optimize Query Operations**
  - Ensure GSI3 queries are cost-effective
  - Optimize repository-by-owner query performance
- **Success**: Core entity operations meet performance benchmarks with optimized costs

---

## Phase 6: Domain Integration - 0% COMPLETE
**Dependencies**: All 3 domains + Core Access Patterns complete | **Priority**: MEDIUM | **Time**: 2h

### ⏳ Implement Cross-Domain Validation - NOT STARTED
- **Order**: 1 | **Time**: 45m | **Status**: ⏳ Blocked by Services
- [ ] **Write Integration Tests**
  - Test repository ownership across user/org domains
  - Test organization membership validation
- [ ] **Implement Cross-Domain Rules**
  - Add repository ownership validation
  - Add organization membership business rules
- [ ] **Add Consistency Checks**
  - Ensure data consistency across domains
  - Add validation for cross-domain operations
- **Success**: Repository ownership validated across user/org domains

### ⏳ Add Integration Tests - NOT STARTED
- **Order**: 2 | **Time**: 45m | **Status**: ⏳ Blocked by Cross-Domain Validation
- [ ] **Write Integration Test Suite**
  - Create end-to-end workflow tests
  - Test complete user → org → repo flows
- [ ] **Test Cross-Domain Flows**
  - Test user creates org, org owns repo workflows
  - Test permission and ownership chains
- [ ] **Verify Data Consistency**
  - Test data remains consistent across operations
  - Validate GSI queries work correctly
- **Success**: Complete end-to-end tests for all workflows

### ⏳ Implement GSI3 Queries - NOT STARTED
- **Order**: 3 | **Time**: 30m | **Status**: ⏳ Blocked by Integration Tests
- [ ] **Write GSI3 Tests**
  - Test efficient repository listing by owner
  - Test pagination and sorting
- [ ] **Implement Query Methods**
  - Optimize listReposByOwner performance
  - Add recent repositories sorted by updated_at
- [ ] **Optimize Performance**
  - Add pagination support for large result sets
  - Ensure query efficiency
- **Success**: Efficient GSI3 repository queries with pagination

---

## Success Criteria

### Infrastructure Quality Gates ✅ COMPLETE
- ✅ 100% of test files run without errors (21/21 passing)
- ✅ No data corruption in entity update operations
- ✅ GSI3 temporal queries work correctly

### Domain Completion Quality Gates 🚧 IN PROGRESS
- ✅ All domains follow identical Entity → Repository patterns
- 🚧 Services and Routes layers not started
- ✅ Repository layer has 100% test coverage
- ⏳ REST APIs not yet implemented

### Integration Quality Gates ⏳ NOT STARTED
- ⏳ Business rules span domains correctly
- ⏳ Cross-domain data remains consistent
- 🚧 GSI3 queries partially implemented

---

## Recommended Next Actions

### Immediate Priority (Next 2-3 hours)
1. **Implement UserService** (/spec:implement core-entities "Implement User Service")
   - 60 minutes estimated
   - Unblocks User Routes implementation

2. **Implement User Routes** (/spec:implement core-entities "Implement User Routes")
   - 60 minutes estimated
   - Completes User domain (first full vertical slice)

3. **Implement OrganizationService** (Can run in parallel)
   - 60 minutes estimated
   - Unblocks Organization Routes

### Medium Priority (Next 4-6 hours)
4. Complete Repository Service layer
5. Complete all Route layers
6. Finish GSI3 query implementation with pagination

### Lower Priority (Final 2 hours)
7. Cross-domain integration and validation
8. End-to-end integration tests
9. Performance optimization

---

## Agent Assignment Strategy

- **Coder Agent**: Service and Route implementation (currently needed)
- **Architect Agent**: Cross-domain integration design
- **Context Agent**: Integration validation patterns
- **Scaffold Agent**: Test file creation for services/routes

## Time Estimates
- **Phase 1 (Infrastructure)**: ✅ 3 hours COMPLETE
- **Phase 2-4 (Domains)**: 🚧 4-5 hours remaining (parallel execution)
- **Phase 5 (Core Access Patterns)**: 🚧 1.5 hours remaining
- **Phase 6 (Integration)**: ⏳ 2 hours remaining
- **Total Remaining**: ~7 hours with parallel execution strategy
- **Original Estimate**: 10 hours
- **Progress**: ~30% complete by task count, ~40% by foundation work
