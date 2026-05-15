# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| When writing Go tests, using teatest, or adding test coverage | go-testing | ~/.config/opencode/skills/go-testing/SKILL.md |
| When user asks to create a new skill, add agent instructions, or document patterns for AI | skill-creator | ~/.config/opencode/skills/skill-creator/SKILL.md |
| when implementing a change, preparing commits, splitting PRs, or planning chained or stacked PRs | work-unit-commits | ~/.config/opencode/skills/work-unit-commits/SKILL.md |
| When creating a pull request, opening a PR, or preparing changes for review | branch-pr | ~/.config/opencode/skills/branch-pr/SKILL.md |
| when drafting or posting feedback, review comments, maintainer replies, Slack messages, or GitHub comments | comment-writer | ~/.config/opencode/skills/comment-writer/SKILL.md |
| when writing guides, READMEs, RFCs, onboarding docs, architecture docs, or review-facing documentation | cognitive-doc-design | ~/.config/opencode/skills/cognitive-doc-design/SKILL.md |
| when a PR would exceed 400 changed lines, when planning chained PRs, stacked PRs, or reviewable slices | gentle-ai-chained-pr | ~/.config/opencode/skills/chained-pr/SKILL.md |
| When creating a GitHub issue, reporting a bug, or requesting a feature | issue-creation | ~/.config/opencode/skills/issue-creation/SKILL.md |
| When user says "judgment day", "judgment-day", "review adversarial", "dual review", "doble review", "juzgar", "que lo juzguen" | judgment-day | ~/.config/opencode/skills/judgment-day/SKILL.md |

## Compact Rules

Pre-digested rules per skill. Delegators copy matching blocks into sub-agent prompts as `## Project Standards (auto-resolved)`.

### go-testing
- Use table-driven tests: `struct{ name, input, expected, wantErr }` with `t.Run(tt.name, ...)` for sub-test isolation
- For Bubbletea: use `teatest.NewTestModel()` — test New + Update + View cycle
- Prefer golden files (`testdata/*.golden`) for complex string output matching
- Use `t.Cleanup()` for resource teardown, not defer in test helpers
- Mock external dependencies via interfaces, not monkey-patching
- Test error cases explicitly with `wantErr` field

### skill-creator
- Structure: `skills/{name}/SKILL.md` with YAML frontmatter (name, description with `Trigger:`, license, metadata.version)
- Include sections: When to Use (bullet points), Critical Patterns (actionable rules), optional Code Examples and Commands references
- Do NOT create a skill if: docs already exist, pattern is trivial/self-explanatory, or it's a one-off task
- Frontmatter trigger MUST describe WHEN the AI should load the skill
- Critical Patterns must be DO/DON'T rules, not general advice

### work-unit-commits
- Commit by **work unit** (deliverable behavior/fix), NOT by file type (models, then services, then tests)
- Keep tests and docs in the same commit as the code they verify
- Each commit must have one clear purpose — the repo must still make sense after that commit alone
- Rollback must be reasonable without reverting unrelated work
- Commit message explains the OUTCOME, not the file list
- If SDD tasks forecast >400-line change, group commits into chained PR slices BEFORE implementation

### branch-pr
- Every PR MUST link an approved issue (`status:approved` label) — no exceptions
- Branch naming: `type/description` where type = feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert
- Must add exactly one `type:*` label to every PR
- PR body MUST include: `Closes #N`, exactly one type checkbox, and 1-3 bullet summary
- Automated checks must pass before merge is possible
- Do NOT open a PR without an approved linked issue

### comment-writer
- Start with the actionable point — do NOT recap the whole PR before giving feedback
- Be warm and direct: sound like a thoughtful teammate, not a corporate bot
- Keep it short: 1-3 paragraphs or a tight bullet list
- Explain WHY when requesting changes — give the technical reason
- Match thread language (Rioplatense voseo for Spanish: podés, tenés, fijate, dale)
- No em dashes — use commas, periods, or parentheses instead

### cognitive-doc-design
- Lead with the answer: put the decision/action/outcome FIRST, context after
- Progressive disclosure: start with the happy path, then add details/edge cases/references
- Chunk related info into sections; use signposting headings so readers know where they are
- Prefer tables, checklists, and examples over prose that must be remembered
- Design for reviewer empathy: state what to review first, what's out of scope, link prev/next PRs

### gentle-ai-chained-pr
- MUST split when a PR exceeds **400 changed lines** (additions + deletions) unless maintainer-approved `size:exception`
- Design each PR for approximately **≤60-minute** human review
- Every chained PR MUST state: where it starts, where it ends, what came before, what comes next
- Each PR must be autonomously verifiable (CI green, one deliverable outcome, reasonable rollback)
- One deliverable work unit per PR — do NOT mix unrelated refactors/features/tests/docs
- For Feature Branch Chain: create a draft tracker PR listing every child PR and current status
- Once a chain strategy is chosen, follow it for the entire chain — do not mix patterns

### issue-creation
- MUST use a template (Bug Report or Feature Request) — blank issues are disabled
- Every issue gets `status:needs-review` automatically on creation
- A maintainer MUST add `status:approved` before any PR can be opened
- Search for duplicates BEFORE creating a new issue
- Fill ALL required fields and check pre-flight checkboxes before submitting
- Questions go to Discussions, not issues

### judgment-day
- Launch **TWO** independent blind judges via `delegate` (async, parallel) — NEVER sequential
- Neither judge knows about the other — no cross-contamination
- Orchestrator compares findings: Confirmed (found by both), Suspect A/B (found by one), Contradiction (disagree)
- Judges classify warnings: **WARNING (real)** = causes bug/data loss/security hole; **WARNING (theoretical)** = contrived scenario
- Fix agent applies corrections, then re-judge both; escalate if 2 iterations fail
- MUST resolve skills from registry before launching judges and inject matching compact rules into both judge prompts

## Project Conventions

No project convention files found (no AGENTS.md, CLAUDE.md, .cursorrules, GEMINI.md, copilot-instructions.md detected in project root).
