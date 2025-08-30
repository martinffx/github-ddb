# Content Entities Implementation Tasks

## Executive Summary

**Phase 2: Advanced Content Entity System**  
Building sophisticated GitHub-like content entities with advanced DynamoDB patterns including sequential numbering, polymorphic reactions, and adjacency lists for fork relationships.

**Complexity Level:** Phase 2 - Advanced DynamoDB patterns  
**Estimated Effort:** 37-43 hours (25 hours with 4-agent parallel execution)  
**Dependencies:** Requires core-entities foundation to be fully implemented  
**Key Features:** Sequential numbering, GSI optimization, polymorphic reactions, cross-entity validation

## 5-Phase Parallel Execution Strategy

| Phase | Duration | Tasks | Agents | Focus Area | Risk Level |
|-------|----------|-------|---------|------------|------------|
| **Foundation** | 4 hours | 3 tasks | 2 agents | Sequential numbering & utilities | High |
| **Core Entities** | 4 hours | 2 tasks | 2 agents | Issues & PRs | Medium |
| **Content Expansion** | 4 hours | 4 tasks | 4 agents | Comments & relationships | Low |
| **Complex Integration** | 7 hours | 3 tasks | 2 agents | Polymorphic reactions & validation | High |
| **Testing & Polish** | 6 hours | 2 tasks | 2 agents | Integration testing & optimization | Medium |

**Total Optimized Duration:** 25 hours with 4-agent coordination

## Phase 1: Foundation Layer (4 hours)

### Task 1.1: Sequential Number Generator Service
**ID:** sequential-number-generator  
**Effort:** Large (4 hours)  
**Priority:** Critical  
**Agent:** Agent 1 (Critical Path)

#### Deliverables
- SequentialNumberGenerator class with atomic counter implementation
- Race condition handling with exponential backoff
- Counter initialization with conditional writes
- Zero-padding utility for 6-digit formatting

#### Acceptance Criteria
- Atomic increments using DynamoDB ADD operation
- Handle concurrent requests without number collisions
- Initialize counters on first repository use
- Generate sequential numbers shared between Issues and PRs
- Comprehensive test coverage for race conditions

**Blocks:** task2_1, task2_2  
**Dependencies:** core-entities

---

### Task 1.2: Comment ID Generator Utility
**ID:** comment-id-generator  
**Effort:** Small (1 hour)  
**Priority:** Medium  
**Agent:** Agent 2 (Utilities)

#### Deliverables
- CommentIdGenerator class using UUID v4 or ULID
- Unique ID generation within item collections
- Format validation utilities

#### Acceptance Criteria
- Generate unique comment identifiers
- Support both UUID v4 and ULID formats
- Validate generated ID formats
- Thread-safe generation

**Blocks:** task3_1, task3_2  
**Dependencies:** None

---

### Task 1.3: Key Generation Utilities
**ID:** key-generation-utilities  
**Effort:** Medium (1 hour)  
**Priority:** Medium  
**Agent:** Agent 2 (Utilities)

#### Deliverables
- Number padding utilities
- GSI4 key generation with reverse numbering
- Composite key generation helpers
- Polymorphic key resolution

#### Acceptance Criteria
- Zero-pad numbers to 6 digits
- Generate GSI4 keys with reverse numbering for open issues
- Create composite keys for reactions and relationships
- Validate key format consistency

**Blocks:** task2_1, task4_1  
**Dependencies:** None

## Phase 2: Core Entities (4 hours)

### Task 2.1: Issue Entity Implementation
**ID:** issue-entity-implementation  
**Effort:** Large (4 hours)  
**Priority:** High  
**Agent:** Agent 1 (Critical Path)

#### Deliverables
- IssueRecord DynamoDB-Toolbox entity
- IssueRepository with CRUD operations
- GSI4 integration for status queries
- Cross-entity validation with core entities

#### Acceptance Criteria
- Sequential numbering integration
- GSI4 population for status queries (open/closed)
- Reverse numbering for open issues (999999 - number)
- User and repository validation
- Status change updates GSI4 keys
- Complete test coverage including GSI queries

**Blocks:** task3_1, task4_1  
**Dependencies:** task1_1, task1_3

---

### Task 2.2: Pull Request Entity Implementation
**ID:** pull-request-entity-implementation  
**Effort:** Large (4 hours)  
**Priority:** High  
**Agent:** Agent 3 (PRs & Comments)

#### Deliverables
- PullRequestRecord DynamoDB-Toolbox entity
- PullRequestRepository with CRUD operations
- GSI1 integration for repository listing
- Sequential numbering shared with Issues

#### Acceptance Criteria
- Sequential numbering shared with Issues
- GSI1 population for repository queries
- Branch validation and management
- User and repository validation
- Complete test coverage including GSI queries

**Blocks:** task3_2, task4_1  
**Dependencies:** task1_1, task1_3

## Phase 3: Discussion Layer (6 hours - Parallel)

### Task 3.1: Issue Comment Entity Implementation
**ID:** issue-comment-entity-implementation  
**Effort:** Medium (3 hours)  
**Priority:** Medium  
**Agent:** Agent 2 (Utilities & Comments)

#### Deliverables
- IssueCommentRecord DynamoDB-Toolbox entity
- IssueCommentRepository with item collection patterns
- Comment ID generation integration
- Parent issue validation

#### Acceptance Criteria
- Item collection implementation (shared PK)
- UUID comment ID generation
- Parent issue existence validation
- Chronological ordering in queries
- User validation for comment authors

**Blocks:** task4_1  
**Dependencies:** task2_1, task1_2

---

### Task 3.2: PR Comment Entity Implementation
**ID:** pr-comment-entity-implementation  
**Effort:** Medium (3 hours)  
**Priority:** Medium  
**Agent:** Agent 3 (PRs & Comments)

#### Deliverables
- PRCommentRecord DynamoDB-Toolbox entity
- PRCommentRepository with item collection patterns
- Shared implementation patterns with Issue Comments

#### Acceptance Criteria
- Same patterns as Issue Comments
- Parent PR existence validation
- Item collection efficiency
- Complete test coverage

**Blocks:** task4_1  
**Dependencies:** task2_2, task1_2

## Phase 4: Interaction Layer (6 hours)

### Task 4.1: Reaction Entity Implementation
**ID:** reaction-entity-implementation  
**Effort:** Large (4 hours)  
**Priority:** Medium  
**Agent:** Agent 1 (Critical Path)

#### Deliverables
- ReactionRecord DynamoDB-Toolbox entity
- ReactionRepository with polymorphic targeting
- Reaction uniqueness enforcement (one per user per target)
- Target validation across entity types

#### Acceptance Criteria
- Polymorphic targeting (Issues, PRs, Comments)
- Composite key uniqueness enforcement
- Target existence validation
- Reaction type validation (GitHub emoji set)
- Efficient aggregation queries

**Blocks:** None  
**Dependencies:** task2_1, task2_2, task3_1, task3_2, task1_3

---

### Task 4.2: Reaction Aggregation Service
**ID:** reaction-aggregation-service  
**Effort:** Medium (2 hours)  
**Priority:** Low  
**Agent:** Agent 2 (Utilities)

#### Deliverables
- ReactionAggregator class for summary calculations
- Efficient reaction counting per target
- Cache-friendly aggregation patterns

#### Acceptance Criteria
- Count reactions by type per target
- Support all GitHub reaction types
- Efficient query patterns for aggregation
- Integration with Reaction repository

**Blocks:** None  
**Dependencies:** task4_1

## Phase 5: Relationship Layer (7 hours - Parallel)

### Task 5.1: Fork Entity Implementation
**ID:** fork-entity-implementation  
**Effort:** Large (4 hours)  
**Priority:** Medium  
**Agent:** Agent 4 (Relationships)

#### Deliverables
- ForkRecord DynamoDB-Toolbox entity
- ForkRepository with adjacency list patterns
- GSI2 integration for fork tree queries
- Repository relationship validation

#### Acceptance Criteria
- Adjacency list implementation using GSI2
- Fork relationship integrity validation
- Efficient fork tree traversal
- Repository existence validation for both source/target
- Complete test coverage including tree operations

**Blocks:** None  
**Dependencies:** core-entities

---

### Task 5.2: Star Entity Implementation
**ID:** star-entity-implementation  
**Effort:** Medium (3 hours)  
**Priority:** Medium  
**Agent:** Agent 4 (Relationships)

#### Deliverables
- StarRecord DynamoDB-Toolbox entity
- StarRepository with many-to-many patterns
- Bidirectional star relationship queries
- User/repository validation

#### Acceptance Criteria
- Many-to-many relationship implementation
- Efficient user stars query
- Star uniqueness enforcement
- Repository existence validation
- User existence validation

**Blocks:** None  
**Dependencies:** core-entities

## Phase 6: Integration (10 hours)

### Task 6.1: Cross-Entity Validation Integration
**ID:** cross-entity-validation  
**Effort:** Large (3 hours)  
**Priority:** Critical  
**Agent:** Agent 1 (Critical Path)

#### Deliverables
- ContentEntityValidator class
- Integration with all content repositories
- User and repository existence validation
- Access control validation

#### Acceptance Criteria
- Validate user existence for all operations
- Validate repository existence for all operations
- Check user access permissions
- Consistent error handling across entities
- Performance optimization for validation calls

**Blocks:** None  
**Dependencies:** task2_1, task2_2, task3_1, task3_2, task4_1, task5_1, task5_2

---

### Task 6.2: Integration Test Suite
**ID:** integration-test-suite  
**Effort:** Large (5 hours)  
**Priority:** High  
**Agent:** Agent 1 (Critical Path)

#### Deliverables
- Comprehensive integration tests with core entities
- Sequential numbering concurrency tests
- Cross-entity validation tests
- GSI query performance tests

#### Acceptance Criteria
- Sequential numbering race conditions
- GSI query patterns (GSI1, GSI2, GSI4)
- Cross-entity validation scenarios
- Item collection performance
- Polymorphic reaction targeting
- Fork tree construction
- Many-to-many relationship integrity

**Blocks:** None  
**Dependencies:** task6_1

---

### Task 6.3: Content Entity Factory Classes
**ID:** content-entity-factories  
**Effort:** Medium (2 hours)  
**Priority:** Medium  
**Agent:** Agent 2 (Utilities)

#### Deliverables
- Factory classes for all content entities
- Realistic test data generation
- Integration with existing test infrastructure

#### Acceptance Criteria
- IssueFactory with sequential numbering
- PullRequestFactory with branch management
- Comment factories with parent relationships
- ReactionFactory with polymorphic targeting
- Fork and Star factories with relationship validation

**Blocks:** None  
**Dependencies:** task2_1, task2_2, task3_1, task3_2, task4_1, task5_1, task5_2

## GSI Optimization Strategy

### GSI1: Repository-based Queries
- **Purpose:** List PRs by repository
- **Pattern:** `PK=REPO#{repoId}, SK=PR#{number}`
- **Use Case:** Repository dashboard, PR listings

### GSI2: Fork Relationship Adjacency Lists
- **Purpose:** Fork tree traversal and queries
- **Pattern:** `GSI2PK=FORK#{parentRepoId}, GSI2SK=CHILD#{childRepoId}`
- **Use Case:** Fork networks, upstream/downstream relationships

### GSI4: Issue Status Optimization
- **Purpose:** Open issue listings with reverse chronological order
- **Pattern:** `GSI4PK=REPO#{repoId}#STATUS#{status}, GSI4SK={reverseNumber}`
- **Reverse Numbering:** Open issues use `999999 - number` for newest-first sorting
- **Use Case:** Issue triage, status-based filtering

## Polymorphic Reaction System Design

### Target Types
- **Issues:** `ISSUE#{repoId}#{number}`
- **Pull Requests:** `PR#{repoId}#{number}`
- **Issue Comments:** `ISSUE_COMMENT#{repoId}#{number}#{commentId}`
- **PR Comments:** `PR_COMMENT#{repoId}#{number}#{commentId}`

### Composite Key Structure
- **PK:** `REACTION#{targetType}#{targetId}`
- **SK:** `USER#{userId}#{reactionType}`
- **Uniqueness:** One reaction per user per target

### Validation Chain
1. Target existence validation
2. User authorization check
3. Reaction type validation (GitHub emoji set)
4. Uniqueness enforcement

## Agent Coordination Guidelines

### 4-Agent Parallel Execution
- **Agent 1 (Critical Path):** Sequential focus on blocking tasks
- **Agent 2 (Utilities & Comments):** Support utilities and comment entities
- **Agent 3 (PRs & Comments):** Pull request and related comment implementation
- **Agent 4 (Relationships):** Fork and star relationship entities

### Coordination Checkpoints
- **Hour 4:** Sequential generator validation before entity creation
- **Hour 8:** Issue entity completion enables comment development
- **Hour 12:** Core entities complete, enable polymorphic reactions
- **Hour 19:** All entities ready for cross-validation integration
- **Hour 25:** Full integration testing and optimization

### Communication Protocol
1. **Blocker Resolution:** Immediate notification on critical path delays
2. **Interface Contracts:** Early API definition sharing between agents
3. **Test Data Sharing:** Common factory usage for integration testing
4. **GSI Pattern Consistency:** Shared key generation utilities usage

## Next Actions

1. **Verify Core-Entities Completion:** Ensure all foundation entities are implemented and tested
2. **Initialize Development Environment:** Set up parallel development branches for agent coordination  
3. **Start Critical Path:** Begin with task1_1 (Sequential Number Generator) as highest priority
4. **Establish Agent Communication:** Set up shared interface contracts and test data patterns

**Critical Success Factors:**
- Sequential numbering must be bulletproof for data integrity
- GSI patterns must be consistent for optimal query performance
- Cross-entity validation must be comprehensive for data consistency
- Agent coordination must be tight to prevent integration conflicts