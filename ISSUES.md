# Issues & Spike Tasks

**Blueprint**: `BLUEPRINT-rework-claude-code-integration-20251212.yaml`
**Last Updated**: 2025-12-28
**Purpose**: Track spike tasks, high-uncertainty items, and blocking issues for Claude Code SDK integration

---

## Live Editor v1 - Known Issues & Next Steps

**Feature**: Live Editor panel for in-place Claude-assisted code editing
**Status**: Working with known issues

### Known Issues

#### ISSUE-LE-001: Chat Textarea Unresponsive After Hard Refresh
**Status**: 🟡 Open (manual workaround available)
**Severity**: Medium - affects UX on page reload

**Symptoms**:
- After hard refresh (Ctrl+Shift+R), the chat textarea is unclickable/unresponsive
- Issue does NOT occur on soft refresh or after tab switching

**Manual Workaround**:
1. Click "Elements" or "Settings" tab
2. Click back to "Chat" tab
3. Textarea becomes responsive

**Root Cause Hypothesis**:
- Conflict with iframe's embedded Pip chat interface on initial page load
- Radix UI Tabs initialization timing issue
- Auto tab-switching workaround (programmatic) does not work reliably

**Investigation Attempts**:
- ❌ useLayoutEffect with reflow forcing
- ❌ forceMount on TabsContent
- ❌ Controlled tabs with auto tab-switching (500ms→600ms delays)
- ❌ Moving ChatInput outside Tabs component
- ❌ CSS isolation (z-index, pointer-events, isolate)
- ❌ tabIndex={-1} on iframe

**Next Steps**:
- Investigate iframe focus/pointer-events interaction on load
- Consider lazy-loading iframe after chat initialization
- Test with non-Pip target app (isolate iframe content as cause)

---

### Completed Fixes

#### FIX-LE-001: Session ID "Invalid UUID" Error
**Status**: ✅ Fixed (2025-12-28)
**Solution**: Changed from `pf-{hash}` format to UUID v5 generation

#### FIX-LE-002: Session ID "Already in Use" Error
**Status**: ✅ Fixed (2025-12-28)
**Solution**: Include server start timestamp in session ID generation - IDs now unique per server run

#### FIX-LE-003: Message Formatting (No Line Breaks)
**Status**: ✅ Fixed (2025-12-28)
**Solution**: Added `whitespace-pre-wrap` to prose containers in ChatMessages.tsx

#### FIX-LE-004: Iframe Refresh Not Showing Changes
**Status**: ✅ Fixed (2025-12-28)
**Solution**: Changed from location.reload() to cache-busting with timestamp query param

---

### Next Steps for Live Editor v2

1. **Fix textarea responsiveness** - Priority P1
   - Root cause analysis needed
   - May require architectural changes to iframe/tabs interaction

2. **Tool activity visualization** - Priority P2
   - ToolCard component exists but needs styling/polish
   - Show file edits, searches, etc. in chat stream

3. **Multi-element selection** - Priority P2
   - Currently supports single element selection
   - Blueprint calls for persistent selection with multi-select

4. **Pip app integration testing** - Blocked
   - Requires local dev OpenBao API keys for Pip
   - See Pip issue_062

---

## Spike Tasks (CRITICAL - Must Complete Before Implementation)

Spike tasks are time-boxed research efforts to reduce uncertainty before implementing dependent features.

### Spike 1: Claude Code SDK Integration Pattern

**ID**: `spike_1_1` (Feature 1.1 in PROGRESS.md)
**Status**: 🔴 Not Started
**Duration**: 3 days (time-boxed)
**Complexity**: 3.5 (High)
**Uncertainty**: 5/5 → 2/5 (target)
**Blocks**: All of Phase 2 implementation

**Research Questions**:
1. Does a Python SDK exist for claude-agent-sdk?
   - If yes: Can we use it directly in FastAPI backend?
   - If no: Must use subprocess wrapper or Node.js bridge?

2. How does headless mode work?
   - Command: `claude -p 'prompt' --output-format stream-json`
   - Does it stream tokens progressively or dump complete response?
   - What is the JSON format structure?

3. What is subprocess overhead?
   - Latency: Time to spawn `claude` CLI process?
   - Memory: Process footprint per variant (4 concurrent processes)?
   - Comparison: vs direct API call (baseline)?

4. How does session resume work?
   - Command: `claude --resume <uuid>`
   - Does session persist after process exit?
   - Where are sessions stored (filesystem? database?)?
   - What is session lifecycle (creation, updates, expiration)?

**Deliverables**:
1. **SDK Availability Report**
   - Python SDK: Yes/No
   - Node.js SDK: Version, installation, basic usage
   - Recommended approach: Option A/B/C with rationale

2. **Headless Mode Validation**
   - JSON format specification
   - Streaming behavior confirmation
   - Example request/response pairs

3. **Performance Benchmarks**
   - Subprocess spawn time (ms)
   - Memory per process (MB)
   - Latency comparison table:
     | Method | Time to First Token | Total Time | Memory |
     |--------|---------------------|-----------|---------|
     | Direct API | X ms | Y ms | Z MB |
     | Subprocess | X ms | Y ms | Z MB |

4. **Session Management Documentation**
   - Session creation flow
   - Resume mechanism
   - Storage location and format
   - Cleanup/expiration policies

5. **POC Implementation**
   - Single variant generation (image → HTML)
   - Streaming output to stdout
   - Session UUID stored and resumed for 2nd turn update
   - Code in `pocs/spike-1-sdk-integration/`

**Acceptance Criteria**:
- ✅ SDK availability confirmed (Python or Node.js)
- ✅ Headless mode `--output-format stream-json` working
- ✅ Session resume `--resume <uuid>` working
- ✅ Performance acceptable (within 2x of direct API)
- ✅ POC demonstrates single variant + update
- ✅ Integration pattern documented with code examples
- ✅ Uncertainty reduced from 5/5 to 2/5

**Recommended Approach**:
- Day 1: Research SDK availability, install and test basic usage
- Day 1-2: Validate headless mode streaming and JSON format
- Day 2: Benchmark subprocess overhead vs API baseline
- Day 2-3: Test session resume with multi-turn updates
- Day 3: Build POC and document findings

**Next Steps After Spike**:
- Implement Feature 2.1 (ClaudeCodeClient interface design)
- Begin Epic 3 (ClaudeCodeAdapter implementation)

---

### Spike 2: Variant Generation Strategy

**ID**: `spike_1_2` (Feature 1.2 in PROGRESS.md)
**Status**: 🔴 Not Started
**Duration**: 3 days (time-boxed)
**Complexity**: 3.8 (High)
**Uncertainty**: 5/5 → 2/5 (target)
**Dependencies**: Spike 1 (SDK integration pattern)
**Blocks**: Feature 3.3 (Variant Generation Orchestrator)

**Research Questions**:
1. How to generate 4 concurrent variants?
   - Option A: 4 separate `claude` process invocations in parallel?
   - Option B: 4 sessions with same prompt but different temperatures?
   - Option C: 4 prompts with slight variations (wording, constraints)?

2. Does temperature work in headless mode?
   - Can we pass temperature parameter to `claude` CLI?
   - Does it affect output diversity?
   - What range produces acceptable variation (0.7-1.0)?

3. How diverse are concurrent variants?
   - Original system: Uses model cycling (Claude/GPT/Gemini)
   - SDK approach: Single Claude model only
   - Question: Is temperature/prompt variation sufficient?

4. What is performance impact?
   - Latency: 4 serial generations vs 4 parallel?
   - Resource usage: 4 concurrent processes sustainable?
   - Comparison: vs current model-cycling approach?

**Deliverables**:
1. **Concurrent Execution POC**
   - 4 parallel `claude` invocations
   - Measure wall-clock time vs 4 serial
   - Validate asyncio.gather behavior
   - Code in `pocs/spike-2-variant-strategy/`

2. **Diversity Analysis**
   - Generate 4 variants with different strategies:
     - Strategy 1: Same prompt, temperature variation (0.7, 0.85, 1.0, 1.0)
     - Strategy 2: Same prompt, 4 separate sessions
     - Strategy 3: Prompt variations (e.g., "modern", "minimal", "colorful", "accessible")
   - Qualitative assessment: Are variants sufficiently different?
   - Quantitative metric: Code similarity percentage (diff analysis)

3. **Performance Benchmarks**
   | Strategy | Wall-Clock Time | Peak Memory | Diversity Score |
   |----------|----------------|-------------|-----------------|
   | Serial generations | X s | Y MB | - |
   | Parallel (same temp) | X s | Y MB | Low/Med/High |
   | Parallel (temp variation) | X s | Y MB | Low/Med/High |
   | Parallel (prompt variation) | X s | Y MB | Low/Med/High |
   | **Current (model cycling)** | X s | Y MB | **Baseline** |

4. **Recommended Strategy**
   - Selected approach with rationale
   - Temperature/prompt templates
   - Tradeoffs documented

**Acceptance Criteria**:
- ✅ 4 concurrent variant generation working
- ✅ Diversity acceptable (subjective: "I can tell variants apart")
- ✅ Performance acceptable (within 1.5x of current approach)
- ✅ Strategy selection documented with examples
- ✅ Uncertainty reduced from 5/5 to 2/5

**Recommended Approach**:
- Day 1: Test concurrent `claude` invocations, validate asyncio.gather
- Day 1-2: Test temperature parameter, generate variants with different temps
- Day 2: Test prompt variation strategy, compare diversity
- Day 2-3: Benchmark all strategies, measure diversity qualitatively
- Day 3: Document findings and select recommended strategy

**Next Steps After Spike**:
- Implement Feature 3.3 (Variant Generation Orchestrator) using selected strategy
- Update Feature 2.1 (ClaudeCodeClient interface) with diversity parameters

---

### Spike 3: Session & State Management

**ID**: `spike_1_3` (Feature 1.3 in PROGRESS.md)
**Status**: 🔴 Not Started
**Duration**: 2 days (time-boxed)
**Complexity**: 3.2 (Medium-High)
**Uncertainty**: 4/5 → 2/5 (target)
**Dependencies**: Spike 1 (SDK integration pattern)
**Blocks**: Feature 3.2 (SessionManager implementation)

**Research Questions**:
1. Where should session UUIDs be stored?
   - Option A: Frontend state (localStorage) - simple but lost on clear
   - Option B: Backend in-memory dict - fast but lost on restart
   - Option C: Backend Redis - persistent, scalable
   - Option D: Backend SQLite - persistent, simple

2. How to map variants to sessions?
   - Option A: 1 session per variant (4 sessions per generation)
   - Option B: 1 shared session with variant metadata
   - Question: Does `claude` CLI support variant tagging?

3. What is session lifecycle?
   - Creation: When is UUID generated? (on first generation?)
   - Updates: How long does session persist? (30 min? 24 hours?)
   - Cleanup: When to garbage collect expired sessions?
   - Validation: How to detect invalid/expired session UUID?

4. How does session resume behave?
   - Does `--resume <uuid>` maintain full conversation history?
   - Can we resume after hours/days?
   - What happens if session expired?
   - Error handling: How to gracefully fail and fallback?

**Deliverables**:
1. **Session Persistence POC**
   - Test storing UUID in:
     - In-memory Python dict
     - Redis (if available)
     - SQLite database
   - Validate retrieval after process restart (Redis/SQLite only)
   - Code in `pocs/spike-3-session-management/`

2. **Session Lifecycle Validation**
   - Create session → Store UUID
   - Wait 1 hour → Resume session (validate conversation history preserved)
   - Wait 24 hours → Resume session (test expiration behavior)
   - Document observed TTL and expiration behavior

3. **Variant-to-Session Mapping Design**
   ```python
   # Option A: 1 session per variant
   {
     "generation_id": "gen_abc123",
     "variants": [
       {"variant_id": 0, "session_uuid": "uuid-1"},
       {"variant_id": 1, "session_uuid": "uuid-2"},
       {"variant_id": 2, "session_uuid": "uuid-3"},
       {"variant_id": 3, "session_uuid": "uuid-4"}
     ]
   }

   # Option B: Shared session (if supported)
   {
     "generation_id": "gen_abc123",
     "session_uuid": "uuid-shared",
     "variants": [0, 1, 2, 3]
   }
   ```

4. **Session Manager Architecture**
   - Class diagram: SessionManager, SessionStore (interface), InMemoryStore, RedisStore
   - Sequence diagram: Create → Update (resume) → Cleanup
   - Storage recommendation: In-memory for POC, Redis for production

**Acceptance Criteria**:
- ✅ Session storage strategy selected (in-memory/Redis/SQLite)
- ✅ Session lifecycle understood (creation, TTL, expiration)
- ✅ Variant-to-session mapping designed (1:1 or shared)
- ✅ POC demonstrates: Create → Resume → Update
- ✅ Error handling for expired/invalid sessions designed
- ✅ Uncertainty reduced from 4/5 to 2/5

**Recommended Approach**:
- Day 1: Test session creation and storage (in-memory, Redis, SQLite)
- Day 1-2: Test session resume with various TTLs (1 hour, 24 hours)
- Day 2: Design variant-to-session mapping (test 1:1 vs shared if possible)
- Day 2: Document session lifecycle and recommended storage backend

**Next Steps After Spike**:
- Implement Feature 3.2 (SessionManager) using selected storage backend
- Update Feature 2.1 (ClaudeCodeClient interface) with session methods

---

## High-Risk Issues (Requires Monitoring)

### Issue 1: Subprocess Overhead May Impact Latency

**ID**: `risk_sdk_1`
**Severity**: Medium
**Affects**: Feature 3.1 (ClaudeCodeClient), Feature 3.3 (Variant Orchestrator)

**Problem**:
Spawning 4 `claude` CLI processes via subprocess.Popen may introduce latency compared to direct API calls:
- Process spawn time: ~50-200ms per process
- IPC overhead: stdio buffering, JSON parsing
- Resource usage: 4 concurrent Python subprocesses

**Risks**:
1. Time to first token increases (user perceives slowness)
2. Total generation time exceeds acceptable threshold
3. Memory usage spikes with 4 concurrent processes

**Mitigation**:
- ✅ Spike 1 benchmarks subprocess vs API baseline
- ✅ Acceptance criterion: Within 2x of direct API latency
- ⏭️ If unacceptable: Explore Node.js bridge (Option B) or keep API fallback
- ⏭️ Load testing in Phase 3 with concurrent users

**Status**: 🟡 Mitigated (spike will validate, contingency plan ready)

---

### Issue 2: Variant Diversity May Be Lower Than Current Implementation

**ID**: `risk_sdk_2`
**Severity**: Medium
**Affects**: Feature 3.3 (Variant Orchestrator), Feature 5.1 (Variant validation)

**Problem**:
Current implementation cycles through 3 models (Claude Sonnet 3.7, GPT-4o, Gemini) to generate diverse variants. SDK approach uses single Claude model only.

**Risks**:
1. All 4 variants look too similar (defeats purpose of variants)
2. User cannot find satisfactory design among similar outputs
3. Quality regression vs current implementation

**Mitigation**:
- ✅ Spike 2 tests temperature variation and prompt engineering
- ✅ Acceptance criterion: Subjective diversity assessment ("variants are distinguishable")
- ⏭️ Phase 3 validation (Feature 5.1) includes diversity testing
- ⏭️ If unacceptable: Fallback to API mode for multi-model support

**Status**: 🟡 Mitigated (spike will validate, fallback plan ready)

---

### Issue 3: Session Management Adds Complexity to Update Flow

**ID**: `risk_sdk_3`
**Severity**: Medium
**Affects**: Feature 3.2 (SessionManager), Feature 5.2 (History validation)

**Problem**:
Current API implementation is stateless - each update sends full conversation history in prompt. SDK requires session UUIDs for resuming conversations.

**Risks**:
1. Session UUID storage failures (Redis down, in-memory lost on restart)
2. Session expiration during user workflow
3. Variant-to-session mapping errors (wrong session resumed for update)
4. Increased debugging complexity (need to track session state)

**Mitigation**:
- ✅ Spike 3 validates session lifecycle and storage strategies
- ✅ Backend storage (Redis or SQLite) ensures persistence
- ⏭️ Comprehensive error handling (expired session → graceful fallback)
- ⏭️ Phase 3 testing (Feature 5.2) validates multi-turn updates
- ⏭️ Logging and monitoring for session-related errors

**Status**: 🟡 Mitigated (spike will validate, error handling planned)

---

### Issue 4: Breaking Changes to Existing Behavior

**ID**: `risk_sdk_4`
**Severity**: High (if occurs)
**Likelihood**: Low
**Affects**: All features in Phase 3

**Problem**:
Any deviation from existing WebSocket protocol or generation behavior could break frontend or change user experience.

**Risks**:
1. Frontend components break due to unexpected message format
2. Variant grid layout breaks due to different data structure
3. History system breaks due to session management changes
4. Preview rendering breaks due to different code format

**Mitigation**:
- ✅ Feature 4.1.3 explicitly preserves existing WebSocket protocol
- ✅ Feature 4.1.4 adds backward compatibility toggle (SDK vs API mode)
- ✅ Phase 3 (Epic 5) validates ALL 11 core features end-to-end
- ✅ Comprehensive testing before production deployment
- ⏭️ Rollback plan: Environment flag to revert to API mode

**Status**: 🟢 Well-mitigated (strict compatibility requirements, extensive testing, rollback ready)

---

## Blocked Features (Awaiting Spikes)

### Epic 2: Architecture & Design

**Status**: 🔴 BLOCKED - Awaiting All 3 Spikes
**Unblocks When**: Spikes 1, 2, 3 complete (5-8 days total)

**Dependencies**:
- Feature 2.1 (Adapter Layer) depends on Spike 1 + Spike 3
- Feature 2.2 (Architecture Docs) depends on all spikes

**Time to Unblock**: 5-8 days (spikes can run in parallel)

---

### Epic 3: Claude Code SDK Adapter Implementation

**Status**: 🔴 BLOCKED - Awaiting All 3 Spikes
**Unblocks When**: Epic 2 complete (architecture designed)

**Dependencies**:
- Feature 3.1 (ClaudeCodeClient) depends on Spike 1
- Feature 3.2 (SessionManager) depends on Spike 3
- Feature 3.3 (Variant Orchestrator) depends on Spike 2

**Time to Unblock**: 5-8 days (spikes) + 2 days (architecture design) = 7-10 days

---

### Epic 4: Backend Route Refactoring

**Status**: 🔴 BLOCKED - Awaiting Epic 3
**Unblocks When**: Epic 3 complete (adapter implementation done)

**Dependencies**:
- Feature 4.1 (WebSocket route) depends on ClaudeCodeClient, SessionManager, Variant Orchestrator
- Feature 4.2 (Configuration) can start after Epic 3

**Time to Unblock**: 7-10 days (Epic 2-3 dependencies)

---

## Decision Log

### Decision 1: Three Spike Tasks Required Before Implementation

**Made**: 2025-12-12 (during blueprint planning)
**Decision**: Three spike tasks must complete in Phase 1 before any Phase 2 implementation
**Rationale**: High uncertainty (UA ≥4) in SDK integration, variant strategy, session management; 5-8 day research time-box prevents scope creep and validates feasibility
**Owner**: Project architect
**Status**: ✅ Accepted

---

### Decision 2: Preserve All 11 Core Features of Original screenshot-to-code

**Made**: 2025-12-12 (strategic pivot)
**Decision**: The rework must preserve ALL 11 features from original screenshot-to-code (variants, history, Select & Edit, etc.)
**Rationale**: Previous rewrite removed critical features. User feedback: "this was wrong. we need to preserve the core of screenshot-to-code and improve on it"
**Owner**: Product owner
**Status**: ✅ Accepted

---

### Decision 3: Backward Compatibility Toggle for Safety

**Made**: 2025-12-12 (risk mitigation)
**Decision**: Add USE_CLAUDE_CODE_SDK environment flag to switch between SDK and legacy API modes
**Rationale**: Allows rollback if SDK approach has issues; enables gradual migration; reduces deployment risk
**Owner**: Engineering team
**Status**: ✅ Accepted

---

## Summary

**Total Spike Tasks**: 3 🔴 **ALL PENDING**
**Total High-Risk Issues**: 4 (all mitigated with architecture, monitoring pending)
**Blocked Epics**: 3 (Epics 2, 3, 4 awaiting spike completion)
**Ready-to-Implement Features**: 0 (must complete spikes first)

**Critical Path Impact**: All implementation work blocked until 3 spikes complete (~5-8 days if run in parallel)

**Next Steps**:
1. ⏭️ Start Spike 1: Claude Code SDK Integration Pattern (3 days)
2. ⏭️ Start Spike 2: Variant Generation Strategy (3 days, parallel with Spike 1)
3. ⏭️ Start Spike 3: Session & State Management (2 days, parallel with Spikes 1-2)
4. ⏭️ Review spike findings and proceed with Epic 2 (Architecture & Design)
