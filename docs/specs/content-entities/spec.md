# Content Entities Feature Specification

## Feature Overview

**Phase:** 2 - Content Layer  
**Dependencies:** core-entities  
**Feature ID:** content-entities

### User Story
As a backend developer, I want to implement Issue, PullRequest, Comment, and Reaction entities with relationship management so that I can build the content layer of the GitHub data model on top of the core entities foundation.

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

### Entity Key Patterns

#### Issue Entity
```
PK: REPO#<owner>#<reponame>
SK: ISSUE#<zero_padded_number>
GSI4PK: REPO#<owner>#<reponame>
GSI4SK (open): ISSUE#OPEN#<999999_minus_number>
GSI4SK (closed): #ISSUE#CLOSED#<zero_padded_number>

Attributes: [issue_number, title, body, status, author, assignees, created_at, updated_at]
```

#### PullRequest Entity
```
PK: PR#<owner>#<reponame>#<zero_padded_number>
SK: PR#<owner>#<reponame>#<zero_padded_number>
GSI1PK: PR#<owner>#<reponame>
GSI1SK: PR#<zero_padded_number>

Attributes: [pr_number, title, body, status, author, source_branch, target_branch, created_at, updated_at]
```

#### IssueComment Entity
```
PK: ISSUECOMMENT#<owner>#<reponame>#<issue_number>
SK: ISSUECOMMENT#<comment_id>

Attributes: [comment_id, issue_number, content, author, created_at, updated_at]
```

#### PRComment Entity
```
PK: PRCOMMENT#<owner>#<reponame>#<pr_number>
SK: PRCOMMENT#<comment_id>

Attributes: [comment_id, pr_number, content, author, created_at, updated_at]
```

#### Reaction Entity
```
PK: <target_type>REACTION#<owner>#<reponame>#<target_id>#<username>
SK: <target_type>REACTION#<owner>#<reponame>#<target_id>#<username>

Attributes: [target_type, target_id, reaction_type, username, created_at]
```

#### Fork Entity
```
PK: REPO#<original_owner>#<original_repo>
SK: FORK#<fork_owner>
GSI2PK: REPO#<original_owner>#<original_repo>
GSI2SK: FORK#<fork_owner>

Attributes: [original_owner, original_repo, fork_owner, fork_repo, created_at]
```

#### Star Entity
```
PK: ACCOUNT#<username>
SK: STAR#<owner>#<reponame>

Attributes: [username, repo_owner, repo_name, created_at]
```

### Sequential Numbering Strategy

- **Strategy:** Atomic counter using DynamoDB conditional writes
- **Implementation:** Separate counter item per repository for issues/PRs
- **Key Pattern:** `COUNTER#<owner>#<reponame>`
- **Zero Padding:** 6 digits (000001, 000002, etc.)

### GSI Usage Patterns

#### GSI1 - PullRequest Repository Listing
```
Purpose: List PRs by repository
Query Pattern: GSI1PK=PR#<owner>#<repo>, sort by GSI1SK=PR#<number>
```

#### GSI2 - Fork Relationship Queries
```
Purpose: Find forks of a repository
Query Pattern: GSI2PK=REPO#<owner>#<repo>, filter GSI2SK begins_with FORK#
```

#### GSI4 - Issue Status Queries
```
Purpose: Issue status queries
Open Issues: GSI4PK=REPO#<owner>#<repo>, GSI4SK begins_with ISSUE#OPEN#
Closed Issues: GSI4PK=REPO#<owner>#<repo>, GSI4SK begins_with #ISSUE#CLOSED#
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

1. **Sequential numbering utility for issues and PRs** - Core utility for generating sequential numbers
2. **Issue entity with GSI4 status query support** - Primary content entity with status filtering
3. **PullRequest entity with GSI1 repository listing** - PR entity with repository-based queries
4. **IssueComment and PRComment entities with item collections** - Comment system for both content types
5. **Reaction entity with polymorphic targeting** - Reaction system supporting all content types
6. **Fork entity with adjacency list pattern and GSI2** - Repository relationship management
7. **Star entity with many-to-many relationship pattern** - User-repository starring system
8. **Repository classes for all content entities** - Data access layer implementation
9. **Integration tests with core entities** - Validation of cross-entity relationships
10. **End-to-end workflow testing** - Complete feature validation

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
- REST API endpoints and route handlers
- Service layer business logic and validation
- Advanced PR features (reviews, approvals, merge conflicts)
- Issue and PR templates, labels, and automation
- Notification system for content changes
- Search and full-text indexing capabilities
- Real-time updates and websocket integration

## Dependencies

- **core-entities** - Requires User and Repository entities for referential integrity
- Phase 2 implementation building on Phase 1 foundation

## Next Steps

This specification is ready for the **spec:design** phase where the technical architecture will be designed in detail, including:
- DynamoDB-Toolbox entity definitions
- Repository pattern implementation
- Sequential numbering service design
- Integration patterns with core entities