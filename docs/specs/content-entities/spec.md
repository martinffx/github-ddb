# Content Entities Feature Specification

## Feature Overview

**Phase:** 2 - Content Layer
**Dependencies:** core-entities
**Feature ID:** content-entities
**Implementation Status:** NOT STARTED - This is a design specification for future implementation

### User Story
As a backend developer, I want to implement Issue, PullRequest, Comment, and Reaction entities with relationship management so that I can build the content layer of the GitHub data model on top of the core entities foundation.

## Implementation Status

**Current State:** This feature has NOT been implemented. The specification documents the intended design for the content entities layer, which will be built on top of the existing core entities foundation (User, Organization, Repository).

**What Exists:**
- Core entities (User, Organization, Repository) are fully implemented with the layered architecture pattern
- DynamoDB table with GSI1, GSI2, and GSI3 configured
- Entity transformation patterns (fromRequest, fromRecord, toRecord, toResponse)
- Test infrastructure with DynamoDB Local

**What Needs to be Built:**
- 7 new DynamoDB-Toolbox entity records (Issue, PullRequest, IssueComment, PRComment, Reaction, Fork, Star)
- 7 new repository classes for data access
- GSI4 must be added to the table schema for issue status queries
- Counter entity for sequential numbering
- Test files for all new entities

## Acceptance Criteria

### AC-1: Issue Entity with Sequential Numbering
**GIVEN** a repository exists
**WHEN** I create an Issue
**THEN** it uses `REPO#<owner>#<reponame>` as PK and `ISSUE#<zero_padded_number>` as SK with sequential numbering

### AC-2: PullRequest Entity with GSI1 Support
**GIVEN** a repository exists
**WHEN** I create a PullRequest
**THEN** it uses `PR#<owner>#<reponame>#<zero_padded_number>` as PK/SK and appears in GSI1 for repository PR listing

### AC-3: Comment Entities with Item Collections
**GIVEN** an Issue or PR exists
**WHEN** I add Comments
**THEN** they use item collections under `ISSUECOMMENT#` or `PRCOMMENT#` keys with proper parent relationships

### AC-4: Reaction Entity with Polymorphic Targeting
**GIVEN** any Issue, PR, or Comment exists
**WHEN** users add Reactions
**THEN** they use polymorphic composite keys allowing multiple reaction types per user per target

### AC-5: Fork and Star Relationship Management
**GIVEN** repositories exist
**WHEN** managing Forks and Stars
**THEN** they use adjacency list patterns with GSI2 for fork relationships and many-to-many for star relationships

## Business Rules

| Rule | Description | Rationale |
|------|-------------|-----------|
| BR-1 | Issue numbers must be sequential and unique per repository, generated automatically starting from 1 | Maintains GitHub-like issue numbering convention for user familiarity |
| BR-2 | PR numbers must be sequential and unique per repository, sharing the same sequence as issues | GitHub convention where PRs and issues share the same number sequence |
| BR-3 | Comments must reference valid parent Issues or PRs and cannot be orphaned | Data integrity - prevents orphaned comments that reference non-existent items |
| BR-4 | Reactions must reference valid targets (Issue/PR/Comment) and valid users, with one reaction type per user per target | Prevents duplicate reactions and ensures referential integrity |
| BR-5 | Fork relationships require both source and target repositories to exist, stored using adjacency list pattern | Referential integrity for fork relationships with efficient querying |
| BR-6 | Star relationships are many-to-many between users and repositories with timestamp tracking | Standard many-to-many pattern with audit trail for star actions |
| BR-7 | GSI4 must be populated for Issues to enable status-based queries (open vs closed) | Performance requirement for filtering issues by status |

## Technical Implementation Details

### DynamoDB Table Design

**IMPORTANT:** The existing table schema must be updated to add GSI4 before implementing content entities.

#### Required Schema Changes

Add GSI4 to the table definition in `/src/repos/schema.ts`:

```typescript
// Add to AttributeDefinitions
{ AttributeName: "GSI4PK", AttributeType: "S" },
{ AttributeName: "GSI4SK", AttributeType: "S" },

// Add to GlobalSecondaryIndexes
{
  IndexName: "GSI4",
  KeySchema: [
    { AttributeName: "GSI4PK", KeyType: "HASH" },
    { AttributeName: "GSI4SK", KeyType: "RANGE" },
  ],
  Projection: { ProjectionType: "ALL" },
}
```

And add to the Table definition:

```typescript
GSI4: {
  type: "global",
  partitionKey: { name: "GSI4PK", type: "string" },
  sortKey: { name: "GSI4SK", type: "string" },
}
```

#### Entity Relationship Diagram (ERD)

The content entities build upon the core entities foundation, creating a comprehensive GitHub-like data model:

```mermaid
erDiagram
    User ||--o{ Repository : owns
    Organization ||--o{ Repository : owns
    User ||--o{ Issue : creates
    Organization ||--o{ Issue : creates
    User ||--o{ PullRequest : creates
    Organization ||--o{ PullRequest : creates
    Repository ||--o{ Issue : contains
    Repository ||--o{ PullRequest : contains
    Issue ||--o{ IssueComment : contains
    PullRequest ||--o{ PRComment : contains
    User ||--o{ IssueComment : creates
    User ||--o{ PRComment : creates
    User ||--o{ Reaction : creates
    Issue ||--o{ Reaction : receives
    PullRequest ||--o{ Reaction : receives
    IssueComment ||--o{ Reaction : receives
    PRComment ||--o{ Reaction : receives
    Repository ||--o{ Fork : source
    Repository ||--o{ Fork : target
    User ||--o{ Star : creates
    Repository ||--o{ Star : receives
    Repository ||--|| Counter : has

    User {
        string username PK
        string email
        string bio
        string payment_plan_id
    }

    Organization {
        string org_name PK
        string description
        string payment_plan_id
    }

    Repository {
        string owner PK
        string repo_name PK
        string description
        boolean is_private
        string language
    }

    Issue {
        string repo_owner PK
        string repo_name PK
        number issue_number SK
        string title
        string body
        string status
        string author FK
        string[] assignees
        string[] labels
    }

    PullRequest {
        string repo_owner PK
        string repo_name PK
        number pr_number PK
        string title
        string body
        string status
        string author FK
        string source_branch
        string target_branch
        string merge_commit_sha
    }

    IssueComment {
        string repo_owner PK
        string repo_name PK
        number issue_number PK
        string comment_id SK
        string content
        string author FK
    }

    PRComment {
        string repo_owner PK
        string repo_name PK
        number pr_number PK
        string comment_id SK
        string content
        string author FK
        string file_path
        number line_number
    }

    Reaction {
        string target_type PK
        string target_id PK
        string username PK
        string reaction_type
    }

    Fork {
        string original_owner PK
        string original_repo PK
        string fork_owner SK
        string fork_repo
    }

    Star {
        string username PK
        string repo_owner SK
        string repo_name SK
    }

    Counter {
        string repo_owner PK
        string repo_name PK
        number current_number
    }
```

#### ASCII Entity Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│      User       │     │  Organization   │     │   Repository    │
│ ACCOUNT#{name}  │     │ ACCOUNT#{name}  │     │REPO#{owner}#{n} │
└─────────┬───────┘     └─────────┬───────┘     └─────────┬───────┘
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  │ (owns)
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
          │                       ▼                       │
┌─────────▼───────┐     ┌─────────────────┐     ┌─────────▼───────┐
│     Issue       │     │   PullRequest   │     │     Comment     │
│REPO#{o}#{r}     │     │PR#{o}#{r}#{n}   │     │{TYPE}COMMENT#   │
│ISSUE#{number}   │     │PR#{o}#{r}#{n}   │     │{parent}#{id}    │
└─────────┬───────┘     └─────────┬───────┘     └─────────┬───────┘
          │                       │                       │
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  │ (targets)
                                  ▼
                        ┌─────────────────┐
                        │    Reaction     │
                        │{TYPE}REACTION#  │
                        │{target}#{user}  │
                        └─────────────────┘

┌─────────────────┐     ┌─────────────────┐
│      Fork       │     │      Star       │
│REPO#{orig}#{r}  │     │ACCOUNT#{user}   │
│FORK#{owner}     │     │STAR#{o}#{repo}  │
└─────────────────┘     └─────────────────┘
```

#### Single Table Schema

| Entity | PK Pattern | SK Pattern | GSI1 | GSI2 | GSI3 | GSI4 |
|--------|------------|------------|------|------|------|------|
| **Core Entities** | | | | | | |
| User | `ACCOUNT#{username}` | `ACCOUNT#{username}` | Same | - | Same | - |
| Organization | `ACCOUNT#{org_name}` | `ACCOUNT#{org_name}` | Same | - | Same | - |
| Repository | `REPO#{owner}#{repo}` | `REPO#{owner}#{repo}` | Same | Same | `ACCOUNT#{owner}` | - |
| **Content Entities** | | | | | | |
| Issue | `REPO#{owner}#{repo}` | `ISSUE#{number}` | - | - | - | Status queries |
| PullRequest | `PR#{owner}#{repo}#{number}` | `PR#{owner}#{repo}#{number}` | Repo listing | - | - | - |
| IssueComment | `ISSUECOMMENT#{owner}#{repo}#{issue}` | `ISSUECOMMENT#{id}` | - | - | - | - |
| PRComment | `PRCOMMENT#{owner}#{repo}#{pr}` | `PRCOMMENT#{id}` | - | - | - | - |
| Reaction | `{TYPE}REACTION#{target}#{user}` | `{TYPE}REACTION#{target}#{user}` | - | - | - | - |
| Fork | `REPO#{orig_owner}#{orig_repo}` | `FORK#{fork_owner}` | - | Fork queries | - | - |
| Star | `ACCOUNT#{username}` | `STAR#{owner}#{repo}` | - | - | - | - |
| Counter | `COUNTER#{owner}#{repo}` | `COUNTER#{owner}#{repo}` | - | - | - | - |

#### Access Patterns

| Pattern | Query Type | Index | PK | SK/Filter |
|---------|------------|-------|----|---------  |
| Get issue by number | GetItem | Main | `REPO#{owner}#{repo}` | `ISSUE#{number}` |
| List repo issues | Query | Main | `REPO#{owner}#{repo}` | `begins_with(ISSUE#)` |
| List open issues | Query | GSI4 | `REPO#{owner}#{repo}` | `begins_with(ISSUE#OPEN#)` |
| List closed issues | Query | GSI4 | `REPO#{owner}#{repo}` | `begins_with(#ISSUE#CLOSED#)` |
| Get PR by number | GetItem | Main | `PR#{owner}#{repo}#{number}` | `PR#{owner}#{repo}#{number}` |
| List repo PRs | Query | GSI1 | `PR#{owner}#{repo}` | `begins_with(PR#)` |
| List issue comments | Query | Main | `ISSUECOMMENT#{owner}#{repo}#{issue}` | `begins_with(ISSUECOMMENT#)` |
| List PR comments | Query | Main | `PRCOMMENT#{owner}#{repo}#{pr}` | `begins_with(PRCOMMENT#)` |
| Get user reaction | GetItem | Main | `{TYPE}REACTION#{target}#{user}` | `{TYPE}REACTION#{target}#{user}` |
| List target reactions | Query | Main | Various | Filter on target prefix |
| List repo forks | Query | GSI2 | `REPO#{owner}#{repo}` | `begins_with(FORK#)` |
| List user stars | Query | Main | `ACCOUNT#{username}` | `begins_with(STAR#)` |

### Entity Key Patterns

#### Entity Chart

The following chart shows all content entities with their complete attribute schemas, key patterns, and relationships:

```
┌─────────────────────────────────────────────────────────────┐
│                        ISSUE ENTITY                         │
├─────────────────────────────────────────────────────────────┤
│ PK: REPO#{owner}#{repo}                                     │
│ SK: ISSUE#{number}                                          │
│ GSI4PK: REPO#{owner}#{repo}                                 │
│ GSI4SK: ISSUE#OPEN#{999999-number} | #ISSUE#CLOSED#{number} │
├─────────────────────────────────────────────────────────────┤
│ Attributes:                                                 │
│ • issue_number: number (sequential, unique per repo)       │
│ • title: string (required, max 255 chars)                  │
│ • body: string (optional, markdown content)                │
│ • status: 'open' | 'closed' (required, default: 'open')    │
│ • author: string (required, references User/Organization)   │
│ • assignees: string[] (optional, references Users)         │
│ • labels: string[] (optional)                              │
│ Note: created_at/updated_at handled by DynamoDB-Toolbox    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     PULLREQUEST ENTITY                      │
├─────────────────────────────────────────────────────────────┤
│ PK: PR#{owner}#{repo}#{number}                              │
│ SK: PR#{owner}#{repo}#{number}                              │
│ GSI1PK: PR#{owner}#{repo}                                   │
│ GSI1SK: PR#{number}                                         │
├─────────────────────────────────────────────────────────────┤
│ Attributes:                                                 │
│ • pr_number: number (sequential, shares with issues)       │
│ • title: string (required, max 255 chars)                  │
│ • body: string (optional, markdown content)                │
│ • status: 'open' | 'closed' | 'merged' (default: 'open')   │
│ • author: string (required, references User/Organization)   │
│ • source_branch: string (required)                         │
│ • target_branch: string (required, default: 'main')       │
│ • merge_commit_sha: string (optional, set when merged)     │
│ Note: created_at/updated_at handled by DynamoDB-Toolbox    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   ISSUECOMMENT ENTITY                       │
├─────────────────────────────────────────────────────────────┤
│ PK: ISSUECOMMENT#{owner}#{repo}#{issue_number}              │
│ SK: ISSUECOMMENT#{comment_id}                               │
├─────────────────────────────────────────────────────────────┤
│ Attributes:                                                 │
│ • comment_id: string (UUID, unique)                        │
│ • issue_number: number (references parent issue)           │
│ • content: string (required, markdown content)             │
│ • author: string (required, references User/Organization)   │
│ Note: created_at/updated_at handled by DynamoDB-Toolbox    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     PRCOMMENT ENTITY                        │
├─────────────────────────────────────────────────────────────┤
│ PK: PRCOMMENT#{owner}#{repo}#{pr_number}                    │
│ SK: PRCOMMENT#{comment_id}                                  │
├─────────────────────────────────────────────────────────────┤
│ Attributes:                                                 │
│ • comment_id: string (UUID, unique)                        │
│ • pr_number: number (references parent PR)                 │
│ • content: string (required, markdown content)             │
│ • author: string (required, references User/Organization)   │
│ • file_path: string (optional, for line comments)          │
│ • line_number: number (optional, for line comments)        │
│ Note: created_at/updated_at handled by DynamoDB-Toolbox    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      REACTION ENTITY                        │
├─────────────────────────────────────────────────────────────┤
│ PK: {TYPE}REACTION#{target_composite}#{username}            │
│ SK: {TYPE}REACTION#{target_composite}#{username}            │
│                                                             │
│ Where TYPE: ISSUE | PR | ISSUECOMMENT | PRCOMMENT          │
│ target_composite: {owner}#{repo}#{target_id}               │
├─────────────────────────────────────────────────────────────┤
│ Attributes:                                                 │
│ • target_type: 'issue'|'pr'|'issue_comment'|'pr_comment'   │
│ • target_id: string (issue/pr number or comment UUID)      │
│ • reaction_type: '+1'|'-1'|'laugh'|'hooray'|'confused'|    │
│                  'heart'|'rocket'|'eyes'                   │
│ • username: string (required, references User)             │
│ Note: created_at handled by DynamoDB-Toolbox               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        FORK ENTITY                          │
├─────────────────────────────────────────────────────────────┤
│ PK: REPO#{original_owner}#{original_repo}                   │
│ SK: FORK#{fork_owner}                                       │
│ GSI2PK: REPO#{original_owner}#{original_repo}               │
│ GSI2SK: FORK#{fork_owner}                                   │
├─────────────────────────────────────────────────────────────┤
│ Attributes:                                                 │
│ • original_owner: string (source repository owner)         │
│ • original_repo: string (source repository name)           │
│ • fork_owner: string (fork owner, references User/Org)     │
│ • fork_repo: string (fork repository name)                 │
│ Note: created_at handled by DynamoDB-Toolbox               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        STAR ENTITY                          │
├─────────────────────────────────────────────────────────────┤
│ PK: ACCOUNT#{username}                                      │
│ SK: STAR#{repo_owner}#{repo_name}                           │
├─────────────────────────────────────────────────────────────┤
│ Attributes:                                                 │
│ • username: string (required, references User)             │
│ • repo_owner: string (repository owner)                    │
│ • repo_name: string (repository name)                      │
│ Note: created_at handled by DynamoDB-Toolbox               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      COUNTER ENTITY                         │
├─────────────────────────────────────────────────────────────┤
│ PK: COUNTER#{owner}#{repo}                                  │
│ SK: COUNTER#{owner}#{repo}                                  │
├─────────────────────────────────────────────────────────────┤
│ Attributes:                                                 │
│ • current_number: number (atomic counter, starts at 0)     │
│ Note: updated_at handled by DynamoDB-Toolbox               │
└─────────────────────────────────────────────────────────────┘
```

### Sequential Numbering Strategy

- **Strategy:** Atomic counter using DynamoDB conditional writes
- **Implementation:** Separate counter item per repository for issues/PRs
- **Key Pattern:** `COUNTER#{owner}#{reponame}`
- **Zero Padding:** 6 digits (000001, 000002, etc.)

### GSI Usage Patterns

#### GSI1 - PullRequest Repository Listing
```
Purpose: List PRs by repository
Query Pattern: GSI1PK=PR#{owner}#{repo}, sort by GSI1SK=PR#{number}
```

#### GSI2 - Fork Relationship Queries
```
Purpose: Find forks of a repository
Query Pattern: GSI2PK=REPO#{owner}#{repo}, filter GSI2SK begins_with FORK#
```

#### GSI4 - Issue Status Queries
```
Purpose: Issue status queries
Open Issues: GSI4PK=REPO#{owner}#{repo}, GSI4SK begins_with ISSUE#OPEN#
Closed Issues: GSI4PK=REPO#{owner}#{repo}, GSI4SK begins_with #ISSUE#CLOSED#
```

### Repository Operations

#### Issue Repository
- `create` - Create new issue with sequential numbering
- `get` - Retrieve issue by repository and number
- `update` - Update issue properties
- `delete` - Remove issue (soft delete)
- `listByRepo` - List all issues for repository
- `listOpenByRepo` - List open issues using GSI4
- `listClosedByRepo` - List closed issues using GSI4

#### PullRequest Repository
- `create` - Create new PR with sequential numbering
- `get` - Retrieve PR by composite key
- `update` - Update PR properties
- `delete` - Remove PR (soft delete)
- `listByRepo` - List PRs using GSI1
- `getByNumber` - Get PR by repository and number

#### Comment Repositories (Issue & PR)
- `create` - Create comment with parent validation
- `get` - Retrieve specific comment
- `update` - Update comment content
- `delete` - Remove comment
- `listByParent` - List all comments for parent item

#### Reaction Repository
- `create` - Add reaction with uniqueness constraint
- `delete` - Remove specific user reaction
- `listByTarget` - Get all reactions for target
- `getByUserAndTarget` - Check user's reaction on target

#### Fork Repository
- `create` - Create fork relationship
- `delete` - Remove fork relationship
- `listForksOfRepo` - List all forks using GSI2
- `getFork` - Get specific fork relationship

#### Star Repository
- `create` - Create star relationship
- `delete` - Remove star relationship
- `listStarsByUser` - List user's starred repositories
- `listStargazersByRepo` - List users who starred repository
- `isStarred` - Check if user starred repository

### Entity Transformation Methods

All content entities implement the standard transformation interface:

- `fromRequest()` - Convert API input to entity format with validation
- `toRecord()` - Convert to DynamoDB record format with key generation
- `toResponse()` - Convert to API output format with computed fields
- `validate()` - Input validation and business rules enforcement

## Implementation Sequence

1. **Add GSI4 to table schema** - Update schema.ts to include GSI4 configuration
2. **Sequential numbering utility** - Implement atomic counter for issues and PRs
3. **Issue entity with GSI4 status query support** - Primary content entity with status filtering
4. **PullRequest entity with GSI1 repository listing** - PR entity with repository-based queries
5. **IssueComment and PRComment entities with item collections** - Comment system for both content types
6. **Reaction entity with polymorphic targeting** - Reaction system supporting all content types
7. **Fork entity with adjacency list pattern and GSI2** - Repository relationship management
8. **Star entity with many-to-many relationship pattern** - User-repository starring system
9. **Repository classes for all content entities** - Data access layer implementation
10. **Integration tests with core entities** - Validation of cross-entity relationships
11. **End-to-end workflow testing** - Complete feature validation

## Scope

### Included Features
- Issue DynamoDB-Toolbox entity with sequential numbering and GSI4 status queries
- PullRequest DynamoDB-Toolbox entity with composite keys and GSI1 repository listing
- IssueComment entity with item collection pattern under Issues
- PRComment entity with item collection pattern under PullRequests
- Reaction entity with polymorphic targeting supporting Issues, PRs, and Comments
- Fork relationship entity using adjacency list pattern with GSI2
- Star relationship entity using many-to-many pattern
- Repository classes for all content entities with specialized query methods
- Sequential number generation utilities for Issues and PRs
- GSI4 implementation for issue status queries
- Integration with existing core entities (User, Repository)

### Excluded Features
- REST API endpoints and route handlers (will be added in subsequent phase)
- Service layer business logic and validation (will be added after repositories)
- Advanced PR features (reviews, approvals, merge conflicts)
- Issue and PR templates, labels, and automation
- Notification system for content changes
- Search and full-text indexing capabilities
- Real-time updates and websocket integration

## Dependencies

- **core-entities** - Requires User and Repository entities for referential integrity (✅ IMPLEMENTED)
- Phase 2 implementation building on Phase 1 foundation

## Next Steps

This specification is ready for the **spec:implement** phase where the entities will be created following the established patterns from core-entities:

1. Add GSI4 to table schema
2. Create entity records in `/src/repos/schema.ts`
3. Create entity classes in `/src/services/entities/`
4. Create repository classes in `/src/repos/`
5. Write comprehensive tests following the UserRepository.test.ts pattern
6. Validate against the design.md technical specifications
