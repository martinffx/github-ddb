# Content Entities - Lite Spec

**Phase 2** | **Depends:** core-entities | **Feature:** content-entities

## User Story
Backend developer needs Issue, PullRequest, Comment, and Reaction entities with relationship management for GitHub data model content layer.

## Key Acceptance Criteria
- **AC-1:** Issues use `REPO#<owner>#<repo>` (PK) + `ISSUE#<000001>` (SK) with sequential numbering
- **AC-2:** PRs use `PR#<owner>#<repo>#<000001>` (PK/SK) + GSI1 for repository listing
- **AC-3:** Comments use item collections (`ISSUECOMMENT#`/`PRCOMMENT#`) with parent relationships
- **AC-4:** Reactions use polymorphic keys allowing multiple types per user per target
- **AC-5:** Forks use adjacency list + GSI2, Stars use many-to-many pattern

## Entity Keys & GSI Patterns

```
Issue:
  PK: REPO#<owner>#<repo>, SK: ISSUE#<000001>
  GSI4: Status queries (ISSUE#OPEN#<reverse>, #ISSUE#CLOSED#<padded>)

PullRequest:
  PK/SK: PR#<owner>#<repo>#<000001>
  GSI1: PR#<owner>#<repo> → PR#<000001> (repository listing)

Comments:
  IssueComment: ISSUECOMMENT#<owner>#<repo>#<num> → ISSUECOMMENT#<id>
  PRComment: PRCOMMENT#<owner>#<repo>#<num> → PRCOMMENT#<id>

Reaction:
  PK/SK: <TYPE>REACTION#<owner>#<repo>#<target>#<user>

Fork:
  PK: REPO#<orig_owner>#<orig_repo>, SK: FORK#<fork_owner>
  GSI2: Same keys for fork listing

Star:
  PK: ACCOUNT#<user>, SK: STAR#<owner>#<repo>
```

## Sequential Numbering
- **Strategy:** Atomic DynamoDB counters per repository
- **Key:** `COUNTER#<owner>#<repo>`  
- **Format:** 6-digit zero-padded (000001, 000002...)
- **Scope:** Issues and PRs share same sequence (GitHub convention)

## Core Business Rules
1. Sequential numbering: Issues/PRs per repo, starting at 1
2. Comments must reference valid parents, no orphans
3. One reaction type per user per target
4. Fork/Star relationships require valid entities
5. GSI4 required for Issue status filtering

## Implementation Sequence
1. Sequential numbering utility
2. Issue entity + GSI4 status support
3. PullRequest entity + GSI1 listing
4. Comment entities (Issue/PR) with collections
5. Reaction entity with polymorphic targeting
6. Fork entity + adjacency list + GSI2
7. Star entity + many-to-many pattern
8. Repository classes for all entities
9. Integration tests with core entities
10. End-to-end workflow testing

## Repository Operations
- **Issues:** create, get, update, delete, listByRepo, listOpen/ClosedByRepo (GSI4)
- **PRs:** create, get, update, delete, listByRepo (GSI1), getByNumber
- **Comments:** create, get, update, delete, listByParent
- **Reactions:** create, delete, listByTarget, getByUserAndTarget
- **Forks:** create, delete, listForksOfRepo (GSI2), getFork
- **Stars:** create, delete, listStarsByUser, listStargazers, isStarred

## Scope Boundaries
**Included:** All 7 content entities, repository layer, sequential numbering, GSI support, core entity integration  
**Excluded:** API layer, services, advanced PR features, notifications, search, real-time updates

## Dependencies
- **core-entities:** User and Repository entities for referential integrity
- Phase 2 builds on Phase 1 foundation