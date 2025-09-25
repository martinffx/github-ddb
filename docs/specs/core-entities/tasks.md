# Core Entities Tasks

## Executive Summary
- **Total Phases**: 6 phases (Infrastructure → 3 Parallel Domains → Core Access Patterns → Integration)
- **Critical Path**: Infrastructure Fixes → Domain Completion → Core Access Patterns → Integration
- **Parallel Execution**: User, Organization, and Repository domains can run simultaneously
- **Estimated Effort**: 19 tasks across 6 phases with TDD approach

## Phase Overview

```
Infrastructure Fixes (CRITICAL)
├── Test Infrastructure
├── Schema Bugs
├── Entity Bugs
├── Import Fixes
└── Shared Utilities
    │
    ├─── User Domain ──────┐
    ├─── Organization ─────┤── Core Access Patterns ──┐
    └─── Repository ───────┘                          ├── Integration
                                                      │
                              GSI3 Repo Queries ──────┤
                              Query Optimization ─────┘
```

---

## Phase 1: Infrastructure Fixes (CRITICAL)
**Dependencies**: None | **Agent**: Coder | **Must Complete Before**: All other phases

### 🔧 Fix Test Infrastructure
- **Priority**: CRITICAL | **Order**: 1 | **Time**: 30m
- [ ] **Write Test Stub**
  - Create simple test to verify Jest can import and run
  - Identify specific configuration issues
- [ ] **Verify Test Execution**
  - Run `pnpm test` and document all errors
  - Check import resolution for DynamoDB utilities
- [ ] **Fix Configuration**
  - Update Jest config for TypeScript imports
  - Ensure DynamoDB Local test utilities work
- **Success**: Jest runs all test files without import errors

### 🔧 Fix Schema Timestamp Bug
- **Priority**: CRITICAL | **Order**: 2 | **Time**: 45m
- [ ] **Write Timestamp Test**
  - Test that GSI3SK generates unique timestamps
  - Verify different records have different GSI3SK values
- [ ] **Fix Schema Implementation**
  - Fix timestamp generation in RepoRecord schema
  - Ensure timestamps are created at record creation time
- [ ] **Verify Unique Timestamps**
  - Test multiple repository records have different GSI3SK
  - Validate temporal queries work with GSI3
- **Success**: GSI3SK generates unique timestamps for temporal queries

### 🔧 Fix User Entity Bugs
- **Priority**: CRITICAL | **Order**: 3 | **Time**: 30m
- [ ] **Write Update Date Tests**
  - Test that updateUser preserves created date
  - Test that updateUser updates modified date
- [ ] **Fix Date Preservation**
  - Fix updateUser to preserve original created date
  - Ensure modified date updates to current time
- [ ] **Verify Data Integrity**
  - Test no data corruption in update operations
  - Validate all date fields handle correctly
- **Success**: UserEntity.updateUser handles dates correctly without corruption

### 🔧 Fix Repository Imports
- **Priority**: CRITICAL | **Order**: 4 | **Time**: 15m
- [ ] **Write Import Tests**
  - Test that UserRepository imports execute
  - Verify ScanCommand is available
- [ ] **Fix Import Statements**
  - Fix UserRepository to import ScanCommand from lib-dynamodb
  - Update any other broken import statements
- [ ] **Verify Functionality**
  - Test that repository operations execute
  - Ensure pagination functionality works
- **Success**: All repository operations work without import errors

### 🔧 Create Shared Utilities
- **Priority**: HIGH | **Order**: 5 | **Time**: 60m
- [ ] **Write Utility Tests**
  - Define interfaces for validation helpers
  - Create tests for error handling patterns
- [ ] **Implement Validation Helpers**
  - Create reusable input validation functions
  - Build transformation helpers
- [ ] **Create Error Patterns**
  - Standardize error handling across domains
  - Create consistent error response formats
- **Success**: Consistent validation and error handling across all domains

---

## Phase 2-4: Domain Implementation (Parallel Execution)
**Dependencies**: Infrastructure Fixes Complete | **Agent**: Multi-agent workflow

### 👤 User Domain Completion
**Dependencies**: Infrastructure Fixes | **Priority**: HIGH | **Time**: 2h

#### 🔧 Implement User Service
- **Order**: 1 | **Time**: 60m
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

#### 🔧 Implement User Routes
- **Order**: 2 | **Time**: 60m
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

### 🏢 Organization Domain
**Dependencies**: Infrastructure Fixes | **Priority**: HIGH | **Time**: 3h

#### 🔧 Complete Organization Entity
- **Order**: 1 | **Time**: 45m
- [ ] **Write Update Method Tests**
  - Test updateOrganization method signature
  - Verify immutable update pattern
- [ ] **Implement Update Organization**
  - Add updateOrganization method following UserEntity pattern
  - Ensure proper date handling
- [ ] **Verify Immutable Pattern**
  - Test that updates return new instances
  - Validate original objects remain unchanged
- **Success**: OrganizationEntity has complete CRUD methods matching UserEntity

#### 🔧 Fix Organization Repository
- **Order**: 2 | **Time**: 60m
- [ ] **Write Repository Tests**
  - Test all CRUD operations
  - Verify scan implementation works
- [ ] **Fix Scan Implementation**
  - Replace QueryCommand.scan with ScanCommand in listOrgs
  - Fix any other repository pattern issues
- [ ] **Complete CRUD Operations**
  - Ensure all methods follow UserRepository pattern
  - Add consistent error handling
- **Success**: OrganizationRepository follows UserRepository patterns exactly

#### 🔧 Implement Organization Service
- **Order**: 3 | **Time**: 60m
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

#### 🔧 Implement Organization Routes
- **Order**: 4 | **Time**: 60m
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

### 📁 Repository Domain
**Dependencies**: Infrastructure Fixes | **Priority**: HIGH | **Time**: 4h

#### 🔧 Implement Repository Entity
- **Order**: 1 | **Time**: 90m
- [ ] **Write Entity Tests**
  - Test all 5 transformation methods
  - Test field mapping (repo_name ↔ repoName, is_private ↔ isPrivate)
- [ ] **Implement Transformation Methods**
  - fromRequest, fromRecord, toRecord, toResponse, updateRepository
  - Follow UserEntity pattern exactly
- [ ] **Add Validation Logic**
  - Add repository field validation
  - Ensure proper data type handling
- **Success**: Complete RepositoryEntity with all transformation methods

#### 🔧 Implement Repository Repository
- **Order**: 2 | **Time**: 90m
- [ ] **Write Repository Tests**
  - Test full CRUD operations
  - Test GSI3 query methods
- [ ] **Implement CRUD Operations**
  - Follow UserRepository pattern exactly
  - Add all basic repository operations
- [ ] **Add GSI3 Queries**
  - Implement listReposByOwner using GSI3
  - Add repository-by-owner query patterns
- **Success**: Full CRUD with GSI3 query support

#### 🔧 Implement Repository Service
- **Order**: 3 | **Time**: 60m
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

#### 🔧 Implement Repository Routes
- **Order**: 4 | **Time**: 60m
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

## Phase 5: Core Access Patterns
**Dependencies**: Repository Domain Complete | **Priority**: HIGH | **Time**: 2h

### 🔍 Implement GSI3 Repo Queries
- **Order**: 1 | **Time**: 75m
- [ ] **Write GSI3 Query Tests**
  - Test Query GSI3PK=ACCOUNT#{owner}, GSI3SK begins_with '#'
  - Verify repository listing by user or organization works
- [ ] **Implement Repo By Owner Queries**
  - Create listReposByOwner using GSI3 index
  - Add proper error handling for query operations
- [ ] **Add Temporal Sorting**
  - Implement recent repositories sorted by updated_at
  - Add pagination support for repository listings
- **Success**: GSI3 repository-by-owner queries work with temporal sorting and pagination

### ⚡ Optimize Core Query Patterns
- **Order**: 2 | **Time**: 45m
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

## Phase 6: Domain Integration
**Dependencies**: All 3 domains + Core Access Patterns complete | **Priority**: MEDIUM | **Time**: 2h

### 🔗 Implement Cross-Domain Validation
- **Order**: 1 | **Time**: 45m
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

### 🧪 Add Integration Tests
- **Order**: 2 | **Time**: 45m
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

### ⚡ Implement GSI3 Queries
- **Order**: 3 | **Time**: 30m
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

### Infrastructure Quality Gates
- ✅ 100% of test files run without errors
- ✅ No data corruption in entity update operations
- ✅ GSI3 temporal queries work correctly

### Domain Completion Quality Gates
- ✅ All domains follow identical Entity → Repository → Service → Router patterns
- ✅ 100% test coverage for all CRUD operations
- ✅ All domains expose complete REST APIs

### Integration Quality Gates
- ✅ Business rules span domains correctly
- ✅ Cross-domain data remains consistent
- ✅ GSI3 queries perform efficiently

---

## Agent Assignment Strategy

- **Coder Agent**: Infrastructure fixes, entity implementation
- **Architect Agent**: Service and router layer design
- **Context Agent**: Cross-domain integration and validation
- **Scaffold Agent**: Test file creation and structure setup

## Time Estimates
- **Phase 1 (Infrastructure)**: 3 hours (sequential)
- **Phase 2-4 (Domains)**: 3 hours (parallel execution)
- **Phase 5 (Core Access Patterns)**: 2 hours (sequential)
- **Phase 6 (Integration)**: 2 hours (sequential)
- **Total**: 10 hours with parallel execution strategy