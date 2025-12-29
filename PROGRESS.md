# Screenshot-to-Code: Claude Code SDK Integration (Rework)

**Blueprint**: `BLUEPRINT-rework-claude-code-integration-20251212.yaml`
**Created**: 2025-12-12
**Last Updated**: 2025-12-29
**Status**: Planning Complete → Ready for Phase 1 Spikes
**Workflow Tier**: Simple (main branch only)
**Tracking Method**: Document-based (PROGRESS.md + ISSUES.md)
**Architecture**: Layered (Routes → ClaudeCodeAdapter → Claude SDK → WebSocket)

---

## Project Overview

**Goal**: Replace all direct API calls (Anthropic/OpenAI/Gemini) with Claude Code SDK headless mode while preserving all 11 core features of screenshot-to-code.

**Core Objectives**:
- Replace direct API calls with Claude Code SDK (@anthropic-ai/claude-agent-sdk)
- Preserve ALL 11 features: variants, preview, history, streaming, updates, Select & Edit, etc.
- Maintain WebSocket streaming protocol (frontend unchanged)
- Implement session management for multi-turn code updates
- Achieve zero API key consumption (use Claude Code subscription)

**Features to Preserve**:
1. ✅ NUM_VARIANTS (4) - parallel variant generation
2. ✅ WebSocket streaming - real-time code chunks
3. ✅ History system - commit chain with parent references
4. ✅ Select & Edit - variant selection and updates
5. ✅ Model selection - cycle through available models
6. ✅ Image generation - DALL-E 3 / Flux Schnell
7. ✅ Video-to-code - screen recording support
8. ✅ Stack support - 6 stacks (React, Vue, Bootstrap, etc.)
9. ✅ Prompt system - create/update prompts
10. ✅ Error handling - per-variant error states
11. ✅ Debug mode - logging and inspection

---

## Milestone 1: Phase 1 - Research & Foundation (Weeks 1-2)

**Goal**: Validate Claude Code SDK capabilities, resolve architectural unknowns, establish integration patterns

**Status**: 🔴 Not Started

| ID | Epic | Features | Status |
|---|---|---|---|
| 1 | Technical Spikes | 3 | 🔴 Not Started |
| 2 | Architecture & Design | 2 | 🔴 Not Started |

### Epic 1: Technical Spikes

**Status**: 🔴 Not Started
**Priority**: CRITICAL - Must complete before implementation

#### Feature 1.1: Spike - Claude Code SDK Integration Pattern

**Complexity**: 3.5 (High)
**Estimated Days**: 3
**Status**: 🔴 Not Started
**Needs Spike**: ⚠️ Yes (Uncertainty: 5/5)

**Spike Reason**: Unknown if Python SDK exists, subprocess overhead unclear, session management pattern undefined

**Deliverables**:
- Research claude-agent-sdk availability (Python vs Node.js only)
- Validate headless mode: `claude -p 'prompt' --output-format stream-json`
- Test session resume: `claude --resume <uuid>` for multi-turn updates
- Measure subprocess overhead vs API call latency
- Document recommended integration pattern (Option A/B/C)
- Create POC: Single variant generation with streaming

**Integration Options**:
- **Option A**: Python subprocess wrapper (`claude` CLI via subprocess.Popen)
- **Option B**: Node.js bridge service (FastAPI → Express bridge)
- **Option C**: Direct Python SDK (if available)
- **Recommended**: Start with Option C, fallback to Option A

**Acceptance Criteria**:
- ✅ SDK availability confirmed
- ✅ Headless mode streaming validated
- ✅ Session resume working
- ✅ Performance benchmarked
- ✅ POC demonstrates end-to-end generation
- ✅ Uncertainty reduced: 5/5 → 2/5

#### Feature 1.2: Spike - Variant Generation Strategy

**Complexity**: 3.8 (High)
**Estimated Days**: 3
**Status**: 🔴 Not Started
**Needs Spike**: ⚠️ Yes (Uncertainty: 5/5)

**Spike Reason**: Unknown how to generate 4 concurrent variants with Claude Code. Options: multiple sessions, temperature variation, prompt engineering?

**Deliverables**:
- Test concurrent Claude Code sessions (4 parallel invocations)
- Validate if temperature parameter works in headless mode
- Explore prompt variation strategies for diverse outputs
- Benchmark variant generation time vs current API approach
- Document recommended variant strategy with tradeoffs
- Create POC: 4 concurrent variants with different approaches

**Acceptance Criteria**:
- ✅ Concurrent session strategy validated
- ✅ Diversity approach selected (temperature/prompt/sessions)
- ✅ Performance acceptable vs current implementation
- ✅ POC demonstrates 4 diverse variants
- ✅ Uncertainty reduced: 5/5 → 2/5

#### Feature 1.3: Spike - Session & State Management

**Complexity**: 3.2 (Medium-High)
**Estimated Days**: 2
**Status**: 🔴 Not Started
**Needs Spike**: ⚠️ Yes (Uncertainty: 4/5)

**Spike Reason**: Session UUID storage strategy unclear. Frontend state? Backend DB? How to map variants to sessions?

**Deliverables**:
- Test session persistence: Store UUID, resume with update prompt
- Validate session lifecycle: Create → Update → Update → Cleanup
- Design session-to-variant mapping (1:1 or shared session?)
- Evaluate storage options: In-memory dict, Redis, SQLite
- Document session management architecture
- Create POC: Multi-turn update flow with session resume

**Acceptance Criteria**:
- ✅ Session storage strategy selected
- ✅ Session lifecycle validated
- ✅ Variant-to-session mapping designed
- ✅ POC demonstrates multi-turn updates
- ✅ Uncertainty reduced: 4/5 → 2/5

### Epic 2: Architecture & Design

**Status**: 🔴 Not Started
**Dependencies**: Epic 1 (all spikes must complete first)

#### Feature 2.1: Design Claude Code Adapter Layer

**Complexity**: 2.8 (Medium)
**Estimated Days**: 2
**Status**: 🔴 Not Started
**Dependencies**: Features 1.1, 1.2, 1.3

**Tasks**:
- Task 2.1.1: Create ClaudeCodeClient interface specification (0.5 days)
  - Define abstract interface matching existing `stream_claude_response` API signature
- Task 2.1.2: Design session manager component (1 day)
  - Session UUID storage, lifecycle hooks, cleanup policies
- Task 2.1.3: Map Claude Code JSON stream to WebSocket protocol (0.5 days)
  - Transform `--output-format stream-json` to existing MessageType format

#### Feature 2.2: Update System Architecture Documentation

**Complexity**: 1.5 (Low)
**Estimated Days**: 1
**Status**: 🔴 Not Started

**Tasks**:
- Task 2.2.1: Document new backend architecture diagram (0.5 days)
  - Routes → ClaudeCodeAdapter → Claude SDK → WebSocket
- Task 2.2.2: Update API integration decision record (0.5 days)
  - Document rationale for SDK migration, tradeoffs, rollback plan

---

## Milestone 2: Phase 2 - Core Integration (Weeks 3-5)

**Goal**: Implement Claude Code SDK adapter, replace API calls, maintain backward compatibility

**Status**: 🔴 Not Started

| ID | Epic | Features | Status |
|---|---|---|---|
| 3 | Claude Code SDK Adapter Implementation | 3 | 🔴 Not Started |
| 4 | Backend Route Refactoring | 2 | 🔴 Not Started |

### Epic 3: Claude Code SDK Adapter Implementation

**Status**: 🔴 Not Started

#### Feature 3.1: Implement ClaudeCodeClient class

**Complexity**: 3.5 (High)
**Estimated Days**: 5
**Status**: 🔴 Not Started
**Needs Decomposition**: ⚠️ Yes (High technical complexity and scope)

**Tasks**:
- Task 3.1.1: Create base ClaudeCodeClient with subprocess wrapper (2 days)
  - subprocess.Popen management, stdio streaming, process lifecycle
- Task 3.1.2: Implement JSON stream parser (1 day)
  - Parse `--output-format stream-json`, handle chunk boundaries, error states
- Task 3.1.3: Map to WebSocket MessageType protocol (1 day)
  - Transform SDK events to chunk/status/setCode/error messages
- Task 3.1.4: Add error handling and recovery (1 day)
  - Process crashes, timeout handling, graceful degradation

#### Feature 3.2: Implement SessionManager

**Complexity**: 2.8 (Medium)
**Estimated Days**: 3
**Status**: 🔴 Not Started

**Tasks**:
- Task 3.2.1: Create session storage backend (1 day)
  - In-memory dict or Redis, UUID generation, TTL policies
- Task 3.2.2: Implement session resume logic (1.5 days)
  - `claude --resume <uuid>` invocation, state validation
- Task 3.2.3: Add session cleanup and monitoring (0.5 days)
  - Garbage collection, max session limits, health checks

#### Feature 3.3: Variant Generation Orchestrator

**Complexity**: 3.2 (Medium-High)
**Estimated Days**: 4
**Status**: 🔴 Not Started

**Tasks**:
- Task 3.3.1: Implement parallel variant spawner (2 days)
  - asyncio.gather with 4 ClaudeCodeClient instances, variant indexing
- Task 3.3.2: Apply variant diversity strategy (1.5 days)
  - Temperature variation, prompt engineering, or separate sessions based on spike findings
- Task 3.3.3: Aggregate variant results and stream to frontend (0.5 days)
  - Collect completions, send variantComplete messages, handle partial failures

### Epic 4: Backend Route Refactoring

**Status**: 🔴 Not Started

#### Feature 4.1: Refactor generate_code.py WebSocket route

**Complexity**: 3.8 (High)
**Estimated Days**: 5
**Status**: 🔴 Not Started
**Needs Decomposition**: ⚠️ Yes (High risk and testing complexity - critical path)

**Tasks**:
- Task 4.1.1: Replace ModelSelectionStage with ClaudeCodeClient (2 days)
  - Remove stream_claude_response/stream_openai_response calls, inject ClaudeCodeClient
- Task 4.1.2: Update PipelineContext for session management (1 day)
  - Add session_ids field, track variant-to-session mapping
- Task 4.1.3: Preserve existing WebSocket protocol (1 day)
  - Ensure chunk/status/setCode messages unchanged for frontend compatibility
- Task 4.1.4: Add backward compatibility toggle (1 day)
  - Environment flag to switch between SDK and legacy API calls for testing

#### Feature 4.2: Update configuration management

**Complexity**: 2.0 (Low)
**Estimated Days**: 2
**Status**: 🔴 Not Started

**Tasks**:
- Task 4.2.1: Add USE_CLAUDE_CODE_SDK environment flag (0.5 days)
- Task 4.2.2: Remove API key requirements when SDK enabled (0.5 days)
- Task 4.2.3: Add Claude CLI path configuration (0.5 days)
- Task 4.2.4: Update settings UI for SDK mode (0.5 days)

---

## Milestone 3: Phase 3 - Feature Preservation & Testing (Weeks 6-7)

**Goal**: Validate all 11 core features work with Claude Code SDK, fix regressions

**Status**: 🔴 Not Started

| ID | Epic | Features | Status |
|---|---|---|---|
| 5 | Feature Validation | 8 | 🔴 Not Started |
| 6 | End-to-End Testing | 2 | 🔴 Not Started |

### Epic 5: Feature Validation

**Status**: 🔴 Not Started

#### Feature 5.1: Validate variant system (NUM_VARIANTS=4)

**Complexity**: 2.5 (Medium)
**Estimated Days**: 3
**Status**: 🔴 Not Started

**Tasks**:
- Task 5.1.1: Test 4 parallel variant generation (1 day)
- Task 5.1.2: Validate variant keyboard shortcuts (Alt+1/2/3/4) (0.5 days)
- Task 5.1.3: Test variant error handling (1 day)
- Task 5.1.4: Verify variant grid layouts (2x2) (0.5 days)

#### Feature 5.2: Validate history & update system

**Complexity**: 3.0 (Medium)
**Estimated Days**: 4
**Status**: 🔴 Not Started

**Tasks**:
- Task 5.2.1: Test commit chain creation (1.5 days)
- Task 5.2.2: Validate session resume for updates (1.5 days)
- Task 5.2.3: Test history navigation (0.5 days)
- Task 5.2.4: Verify history persistence across sessions (0.5 days)

#### Feature 5.3: Validate WebSocket streaming

**Complexity**: 2.3 (Low-Medium)
**Estimated Days**: 2
**Status**: 🔴 Not Started

**Tasks**:
- Task 5.3.1: Test real-time chunk streaming (1 day)
- Task 5.3.2: Validate status messages (0.5 days)
- Task 5.3.3: Test WebSocket error recovery (0.5 days)

#### Feature 5.4: Validate Select & Edit mode

**Complexity**: 2.8 (Medium)
**Estimated Days**: 3
**Status**: 🔴 Not Started

**Tasks**:
- Task 5.4.1: Test element selection and highlighting (1 day)
- Task 5.4.2: Validate element HTML injection into prompt (1 day)
- Task 5.4.3: Test update generation with selected element (1 day)

#### Feature 5.5: Validate preview system

**Complexity**: 2.3 (Low-Medium)
**Estimated Days**: 2
**Status**: 🔴 Not Started

**Tasks**:
- Task 5.5.1: Test live HTML rendering in iframe (1 day)
- Task 5.5.2: Validate responsive viewport controls (0.5 days)
- Task 5.5.3: Test preview/code toggle (0.5 days)

#### Feature 5.6: Validate framework support

**Complexity**: 2.5 (Medium)
**Estimated Days**: 2
**Status**: 🔴 Not Started

**Tasks**:
- Task 5.6.1: Test all 6 framework outputs (React, Vue, Bootstrap, Ionic, SVG, HTML/Tailwind) (1.5 days)
- Task 5.6.2: Validate framework switching (0.5 days)

#### Feature 5.7: Validate image generation

**Complexity**: 2.0 (Low)
**Estimated Days**: 2
**Status**: 🔴 Not Started

**Tasks**:
- Task 5.7.1: Test DALL-E 3 integration (1 day)
- Task 5.7.2: Test Flux Schnell integration (1 day)

#### Feature 5.8: Validate video-to-code pipeline

**Complexity**: 2.5 (Medium)
**Estimated Days**: 2
**Status**: 🔴 Not Started

**Tasks**:
- Task 5.8.1: Test screen recording upload (1 day)
- Task 5.8.2: Validate frame extraction and processing (1 day)

### Epic 6: End-to-End Testing

**Status**: 🔴 Not Started

#### Feature 6.1: Integration test suite

**Complexity**: 2.8 (Medium)
**Estimated Days**: 3
**Status**: 🔴 Not Started

**Tasks**:
- Task 6.1.1: Create full workflow tests (create → update → update) (1.5 days)
- Task 6.1.2: Add error scenario tests (1 day)
- Task 6.1.3: Performance regression tests (0.5 days)

#### Feature 6.2: User acceptance testing

**Complexity**: 2.3 (Low-Medium)
**Estimated Days**: 2
**Status**: 🔴 Not Started

**Tasks**:
- Task 6.2.1: Manual testing with real screenshots (1 day)
- Task 6.2.2: Document known issues and edge cases (1 day)

---

## Milestone 4: Phase 4 - Documentation & Deployment (Week 8)

**Goal**: Prepare for production deployment

**Status**: 🔴 Not Started

| ID | Epic | Features | Status |
|---|---|---|---|
| 7 | Documentation | 2 | 🔴 Not Started |
| 8 | Deployment & Release | 2 | 🔴 Not Started |

### Epic 7: Documentation

**Status**: 🔴 Not Started

#### Feature 7.1: Update user documentation

**Complexity**: 2.0 (Low)
**Estimated Days**: 2
**Status**: 🔴 Not Started

**Tasks**:
- Task 7.1.1: Update installation guide for SDK requirements (0.5 days)
- Task 7.1.2: Update environment configuration docs (0.5 days)
- Task 7.1.3: Create migration guide from API to SDK (0.5 days)
- Task 7.1.4: Update troubleshooting guide (0.5 days)

#### Feature 7.2: Create architecture documentation

**Complexity**: 2.5 (Medium)
**Estimated Days**: 2
**Status**: 🔴 Not Started

**Tasks**:
- Task 7.2.1: Document ClaudeCodeClient architecture (1 day)
- Task 7.2.2: Document session management design (0.5 days)
- Task 7.2.3: Document variant generation strategy (0.5 days)

### Epic 8: Deployment & Release

**Status**: 🔴 Not Started

#### Feature 8.1: Create deployment configuration

**Complexity**: 2.3 (Low-Medium)
**Estimated Days**: 2
**Status**: 🔴 Not Started

**Tasks**:
- Task 8.1.1: Update Dockerfile for Claude CLI (1 day)
- Task 8.1.2: Update docker-compose.yml (0.5 days)
- Task 8.1.3: Create production deployment guide (0.5 days)

#### Feature 8.2: Release preparation

**Complexity**: 2.0 (Low)
**Estimated Days**: 2
**Status**: 🔴 Not Started

**Tasks**:
- Task 8.2.1: Write changelog for SDK integration (0.5 days)
- Task 8.2.2: Create release announcement (0.5 days)
- Task 8.2.3: Tag release version (v2.0.0) (0.5 days)
- Task 8.2.4: Update hosted version (screenshottocode.com) (0.5 days)

---

## Summary by Phase

| Phase | Timeline | Epics | Features | Tasks | Avg Complexity | Blockers |
|-------|----------|-------|----------|-------|----------------|----------|
| 1 | Weeks 1-2 | 2 | 5 | 3 spikes + 5 tasks | 2.5 (Medium) | None |
| 2 | Weeks 3-5 | 2 | 5 | 15 tasks | 2.8 (Medium) | Phase 1 complete |
| 3 | Weeks 6-7 | 2 | 10 | 20 tasks | 2.5 (Medium) | Phase 2 complete |
| 4 | Week 8 | 2 | 4 | 11 tasks | 2.1 (Low-Medium) | Phase 3 complete |

**Total Work**: 4 milestones, 8 epics, 24 features, 49 tasks (including 3 spikes)

---

## Key Dependencies & Critical Path

### Critical Path
1. **Phase 1 Spikes** (Features 1.1, 1.2, 1.3) → MUST complete before any implementation
2. **Epic 1 → Epic 2** (Spikes → Architecture design)
3. **Epic 2 → Epic 3** (Architecture → Implementation)
4. **Epic 3 → Epic 4** (Adapter implementation → Route refactoring)
5. **Epic 4 → Epic 5** (Backend complete → Feature validation)
6. **Epic 5 → Epic 6** (Feature validation → E2E testing)
7. **Epic 6 → Epic 7-8** (Testing complete → Documentation & deployment)

### Parallel Execution Opportunities
- **Phase 1**: All 3 spikes can run in parallel (3 agents)
- **Epic 2**: Features 2.1 and 2.2 can run in parallel (2 agents)
- **Epic 3**: Features 3.1, 3.2, 3.3 can start in parallel after interfaces defined
- **Epic 5**: Most feature validation tasks can run in parallel (8 agents)

---

## Risks & Mitigations

### Risk 1: Claude Code SDK subprocess overhead may be slower than direct API calls
**Severity**: Medium | **Likelihood**: Medium
**Mitigation**: Benchmark early in Phase 1 spike. If unacceptable, explore Node.js bridge (Option B) or keep API as fallback mode.

### Risk 2: Variant generation diversity may be lower with single Claude model
**Severity**: Medium | **Likelihood**: High
**Mitigation**: Phase 1 spike will test temperature variation and prompt engineering. Document acceptable diversity threshold.

### Risk 3: Session management adds complexity to update flow
**Severity**: Medium | **Likelihood**: Medium
**Mitigation**: Phase 1 spike validates session lifecycle. Add comprehensive tests in Phase 3.

### Risk 4: Breaking changes to existing API behavior
**Severity**: High | **Likelihood**: Low
**Mitigation**: Backward compatibility toggle (Task 4.1.4) allows rollback. Preserve exact WebSocket protocol.

---

## Next Steps

1. ✅ Blueprint created and complexity assessed
2. ✅ Translated to PROGRESS.md tracking
3. ⏭️ Create ISSUES.md for spike details
4. ⏭️ Archive blueprint to specs/archive/
5. ⏭️ Commit tracking documents
6. ⏭️ **Start Phase 1 Spike 1: Claude Code SDK Integration Pattern**
