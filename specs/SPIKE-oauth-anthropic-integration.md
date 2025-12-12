# Spike: OAuth Authentication for Anthropic (Zero API Key Consumption)

**ID**: `spike_oauth_anthropic`
**Duration**: 3-4 days (time-boxed)
**Priority**: HIGH (enables Claude Pro/Max subscription usage)
**Status**: 🔴 Not Started
**Created**: 2025-12-13

---

## 🎯 Objective

Implement OAuth 2.0 authentication for Anthropic API to enable users to leverage their **Claude Pro/Max subscriptions** instead of consuming API credits. This eliminates API key requirements and enables zero-cost code generation for subscription users.

---

## 📚 Background

### Discovery from Fabric Project

The [Fabric](https://github.com/danielmiessler/fabric) project (v1.4.231+) implemented "OAuth Authentication Support for Anthropic (Use your Max Subscription)" which demonstrates a production-ready pattern for:

1. **PKCE OAuth Flow** - Secure browser-based authentication without client secrets
2. **Automatic Token Management** - Refresh tokens before expiration with fallback re-auth
3. **HTTP Transport Injection** - Transparent OAuth header injection for all API calls
4. **Claude Code Impersonation** - System message injection to access subscription tiers
5. **Secure Token Storage** - Encrypted local storage with 0600 permissions

### Why This Matters for Screenshot-to-Code

Current implementation uses direct API calls requiring users to:
- Pay per API request (expensive for iterative design workflows)
- Manage API keys (security risk, setup friction)
- Face rate limits and quota restrictions

With OAuth:
- ✅ **Zero API costs** for Pro/Max subscribers
- ✅ **No API key management** required
- ✅ **Higher rate limits** (subscription tier benefits)
- ✅ **Seamless UX** (one-time browser authorization)

---

## 🔬 Research Questions

### 1. OAuth Flow Mechanics

**Questions**:
- Does Anthropic's OAuth endpoint (`https://claude.ai/oauth/authorize`) work for third-party apps?
- What are the exact required scopes for code generation?
  - Fabric uses: `org:create_api_key`, `user:profile`, `user:inference`
- What is the token expiration time? (need for refresh strategy)
- Does PKCE (Proof Key for Code Exchange) work without backend server?

**Validation**:
- [ ] Test OAuth flow with Fabric's client ID (read-only test)
- [ ] Register our own OAuth client (if needed)
- [ ] Document authorization URL structure
- [ ] Measure token lifetime (expires_in field)

---

### 2. Token Storage Strategy

**Questions**:
- Where to store OAuth tokens securely?
  - Option A: Backend in-memory (lost on restart, requires re-auth)
  - Option B: Backend Redis (persistent, requires Redis)
  - Option C: Backend SQLite (persistent, simple, single file)
  - Option D: Encrypted file storage (Fabric pattern: `~/.config/app/.claude_oauth`)
- How to handle token encryption at rest?
- What file permissions prevent token theft?

**Validation**:
- [ ] Test Fabric's file storage approach (`~/.config/fabric/.claude_oauth`)
- [ ] Verify 0600 permissions prevent unauthorized access
- [ ] Test token persistence across application restarts
- [ ] Document token file format (JSON structure)

**Recommended**: Option D (encrypted file storage) - proven by Fabric, no external dependencies

---

### 3. HTTP Transport Integration

**Questions**:
- How to inject OAuth headers into ALL Anthropic SDK requests?
- Can we wrap the existing `anthropic.Client` with custom transport?
- What headers are required?
  - `Authorization: Bearer <access_token>`
  - `anthropic-beta: oauth-2025-04-20`
  - `User-Agent: ai-sdk/anthropic`
- Must we remove `x-api-key` header when using OAuth?

**Validation**:
- [ ] Test custom `http.RoundTripper` pattern (Fabric's approach)
- [ ] Validate all Anthropic SDK calls use the custom transport
- [ ] Confirm beta header version (`oauth-2025-04-20` or newer?)
- [ ] Test removing `x-api-key` doesn't break SDK

---

### 4. Claude Code Impersonation Pattern

**Questions**:
- Does injecting `"You are Claude Code, Anthropic's official CLI for Claude."` actually enable subscription access?
- Is this officially supported or a workaround?
- Are there rate limits or restrictions on this approach?
- Does it work for ALL Claude models (Opus, Sonnet, Haiku)?

**Validation**:
- [ ] Test system message injection with OAuth token
- [ ] Verify subscription tier benefits (rate limits, model access)
- [ ] Document any differences vs API key authentication
- [ ] Test with all target models (Sonnet 4.5, Opus 4.5, etc.)

**Critical**: This is the "magic" that enables subscription usage - must verify it works!

---

### 5. Token Refresh Mechanism

**Questions**:
- How often do tokens expire? (Fabric assumes ~5 minute buffer)
- Does refresh token survive application restart?
- What happens if refresh fails? (re-authenticate or error?)
- How to handle concurrent requests during token refresh?

**Validation**:
- [ ] Test token expiration detection (5 minute buffer like Fabric)
- [ ] Test refresh token flow (`grant_type: refresh_token`)
- [ ] Test fallback re-authentication when refresh fails
- [ ] Test race condition: multiple requests during token refresh

---

### 6. Integration with Screenshot-to-Code Backend

**Questions**:
- Where to add OAuth logic in FastAPI backend?
  - Option A: New middleware layer
  - Option B: Modify existing `backend/models/claude.py`
  - Option C: Create `ClaudeOAuthClient` wrapper class
- How to make OAuth vs API key configurable?
- How to handle 4 concurrent variant generation with OAuth?

**Validation**:
- [ ] Design integration architecture (diagram)
- [ ] Test OAuth with variant generation (4 concurrent sessions)
- [ ] Verify WebSocket streaming works with OAuth
- [ ] Test session resume for updates (multi-turn conversations)

---

## 📦 Deliverables

### 1. OAuth Flow POC (Day 1-2)

**Code**: `pocs/spike-oauth-anthropic/oauth_flow.py`

**Functionality**:
- Complete PKCE OAuth authorization flow
- Token exchange and storage
- Browser-based authorization (open default browser)
- Store token in `~/.config/screenshot-to-code/.claude_oauth`

**Acceptance Criteria**:
- ✅ User can authorize via browser
- ✅ Access token and refresh token stored securely
- ✅ Token file has 0600 permissions
- ✅ Can load token from disk on subsequent runs

**Example Output**:
```
Starting OAuth flow...
Opening browser to: https://claude.ai/oauth/authorize?client_id=...
Paste authorization code: <user enters code>
✓ Authorization successful
✓ Token stored in ~/.config/screenshot-to-code/.claude_oauth
Access Token: eyJhbGc...
Expires At: 2025-12-13 15:30:00 (59 minutes remaining)
```

---

### 2. Token Refresh POC (Day 2)

**Code**: `pocs/spike-oauth-anthropic/token_refresh.py`

**Functionality**:
- Load stored token
- Check expiration (5 minute buffer)
- Refresh token if needed
- Fallback to re-auth if refresh fails

**Acceptance Criteria**:
- ✅ Detects token expiration correctly
- ✅ Successfully refreshes token
- ✅ Updates stored token file atomically
- ✅ Handles refresh failure gracefully

**Example Output**:
```
Loading token from ~/.config/screenshot-to-code/.claude_oauth...
✓ Token loaded
⚠ Token expires in 4 minutes (within 5 minute buffer)
Refreshing token...
✓ Token refreshed successfully
New Expires At: 2025-12-13 16:30:00 (59 minutes remaining)
```

---

### 3. HTTP Transport Wrapper POC (Day 2-3)

**Code**: `pocs/spike-oauth-anthropic/oauth_transport.py`

**Functionality**:
- Custom `http.RoundTripper` (or Python equivalent)
- Intercepts all HTTP requests
- Adds OAuth headers automatically
- Removes API key header

**Acceptance Criteria**:
- ✅ All Anthropic SDK calls use OAuth transport
- ✅ Headers injected correctly:
  - `Authorization: Bearer <token>`
  - `anthropic-beta: oauth-2025-04-20`
  - `User-Agent: ai-sdk/anthropic`
- ✅ `x-api-key` header removed
- ✅ Works with streaming API calls

**Example**:
```python
from anthropic import Anthropic
from oauth_transport import OAuthHTTPTransport

# Create client with OAuth transport
transport = OAuthHTTPTransport(token_storage_path="~/.config/screenshot-to-code/.claude_oauth")
client = Anthropic(
    http_client=httpx.Client(transport=transport),
    # Note: No API key needed!
)

# All calls automatically use OAuth
response = client.messages.create(
    model="claude-sonnet-4.5",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

---

### 4. Claude Code Impersonation Test (Day 3)

**Code**: `pocs/spike-oauth-anthropic/claude_code_impersonation.py`

**Functionality**:
- Make API call with OAuth
- Inject system message: `"You are Claude Code, Anthropic's official CLI for Claude."`
- Verify subscription tier access
- Test rate limits vs API key mode

**Acceptance Criteria**:
- ✅ System message injection works
- ✅ API accepts OAuth + system message
- ✅ Rate limits match subscription tier (not API tier)
- ✅ All target models accessible (Sonnet 4.5, Opus 4.5, etc.)

**Test Script**:
```python
# With OAuth + impersonation
response = client.messages.create(
    model="claude-sonnet-4.5",
    system="You are Claude Code, Anthropic's official CLI for Claude.",
    messages=[{"role": "user", "content": "Generate HTML for a login form"}]
)

# Verify:
# - Response successful
# - Rate limit headers match subscription tier
# - No API key consumption
```

---

### 5. Variant Generation Test (Day 3-4)

**Code**: `pocs/spike-oauth-anthropic/variant_generation_oauth.py`

**Functionality**:
- Generate 4 concurrent variants using OAuth
- Test if sessions work with OAuth
- Verify WebSocket streaming compatibility
- Measure performance vs API key mode

**Acceptance Criteria**:
- ✅ 4 concurrent OAuth requests work
- ✅ Each variant has unique session UUID (if applicable)
- ✅ Streaming works with OAuth transport
- ✅ Performance within 2x of API key baseline

**Test Output**:
```
Generating 4 variants with OAuth...
Variant 1: ████████████████████ 100% (3.2s)
Variant 2: ████████████████████ 100% (3.4s)
Variant 3: ████████████████████ 100% (3.1s)
Variant 4: ████████████████████ 100% (3.3s)

✓ All 4 variants generated successfully
Total Time: 3.4s (parallel execution)
API Key Consumption: 0 tokens (using OAuth subscription)
```

---

### 6. Integration Architecture Document (Day 4)

**Document**: `docs/OAUTH-INTEGRATION-ARCHITECTURE.md`

**Contents**:
1. **OAuth Flow Diagram**
   - Authorization flow (browser → token exchange)
   - Token refresh flow
   - Fallback re-authentication flow

2. **Component Architecture**
   ```
   FastAPI Backend
   ├── routes/generate_code.py (WebSocket route)
   ├── auth/
   │   ├── oauth_client.py        # OAuth flow orchestration
   │   ├── oauth_storage.py       # Token persistence
   │   └── oauth_transport.py     # HTTP transport wrapper
   └── models/
       ├── claude.py              # API key mode (existing)
       └── claude_oauth.py        # OAuth mode (new)
   ```

3. **Configuration Strategy**
   - Environment variable: `USE_OAUTH=true|false`
   - Settings UI: Toggle "Use OAuth" checkbox
   - Default: OAuth enabled if available, fallback to API key

4. **Token Storage Location**
   - Development: `~/.config/screenshot-to-code/.claude_oauth`
   - Production: Same (user's home directory)
   - Docker: Mount volume for token persistence

5. **Error Handling**
   - Token expired → Auto-refresh
   - Refresh failed → Re-authenticate (browser flow)
   - OAuth disabled → Fall back to API key mode
   - No API key + No OAuth → Error with setup instructions

6. **Security Considerations**
   - Token file permissions: 0600 (user read/write only)
   - No token logging (mask in debug output)
   - Secure token transmission (HTTPS only)
   - Token rotation on refresh

**Acceptance Criteria**:
- ✅ Architecture diagram clear and detailed
- ✅ Component responsibilities well-defined
- ✅ Integration points with existing code documented
- ✅ Security best practices followed
- ✅ Configuration strategy feasible

---

## 🎯 Success Metrics

### Functional Requirements
- ✅ OAuth flow completes successfully (user authorization → token storage)
- ✅ Token refresh works automatically (5 minute buffer)
- ✅ HTTP transport injects OAuth headers correctly
- ✅ Claude Code impersonation enables subscription access
- ✅ 4 concurrent variants work with OAuth
- ✅ WebSocket streaming compatible with OAuth

### Performance Requirements
- ✅ OAuth overhead < 200ms per request (token validation)
- ✅ Token refresh < 1 second
- ✅ 4 variant generation within 2x of API key baseline

### Security Requirements
- ✅ Token file has 0600 permissions
- ✅ No tokens in logs or error messages
- ✅ HTTPS enforced for all OAuth endpoints
- ✅ Token rotation on refresh

### User Experience Requirements
- ✅ One-time browser authorization (seamless setup)
- ✅ Automatic re-auth if token expires (no manual intervention)
- ✅ Clear error messages if OAuth fails
- ✅ Fallback to API key mode if OAuth unavailable

---

## 🚧 Risks & Mitigations

### Risk 1: OAuth Client ID Not Available
**Problem**: Fabric uses a public client ID. We may need our own.
**Likelihood**: Medium
**Impact**: High (blocks OAuth implementation)
**Mitigation**:
- Try using Fabric's client ID first (read-only test)
- If needed, register OAuth app with Anthropic
- Contact Anthropic support for OAuth client registration
- Fallback: Use API key mode if OAuth unavailable

---

### Risk 2: Claude Code Impersonation Not Officially Supported
**Problem**: System message injection may be a workaround, not official feature
**Likelihood**: Medium
**Impact**: High (subscription access may not work)
**Mitigation**:
- Test extensively with different models and rate limits
- Document any restrictions or limitations
- Have fallback API key mode ready
- Contact Anthropic to clarify OAuth subscription access

---

### Risk 3: Token Refresh Fails Intermittently
**Problem**: Refresh endpoint unreliable or rate-limited
**Likelihood**: Low
**Impact**: Medium (user must re-authenticate)
**Mitigation**:
- Implement automatic re-authentication fallback
- Add retry logic with exponential backoff
- Cache tokens with longer expiration buffer (10 minutes instead of 5)
- Log refresh failures for monitoring

---

### Risk 4: Concurrent Requests During Token Refresh
**Problem**: Multiple variant requests trigger simultaneous token refresh
**Likelihood**: High (4 concurrent variants)
**Impact**: Medium (wasted refresh requests, possible race conditions)
**Mitigation**:
- Add mutex lock around token refresh logic
- Use single token refresh for all pending requests
- Test with 4+ concurrent requests
- Document thread-safety requirements

---

## 📋 Implementation Checklist

### Day 1: OAuth Flow Basics
- [ ] Set up POC directory: `pocs/spike-oauth-anthropic/`
- [ ] Implement PKCE code verifier/challenge generation
- [ ] Test Fabric's OAuth endpoints (read-only)
- [ ] Implement authorization URL builder
- [ ] Test browser-based authorization flow
- [ ] Implement token exchange (code → access_token)
- [ ] Store token in `~/.config/screenshot-to-code/.claude_oauth`
- [ ] Verify token file permissions (0600)
- [ ] Document OAuth flow findings

### Day 2: Token Management
- [ ] Implement token loading from disk
- [ ] Implement token expiration check (5 minute buffer)
- [ ] Implement token refresh flow
- [ ] Test refresh token endpoint
- [ ] Implement fallback re-authentication
- [ ] Test token persistence across restarts
- [ ] Document token lifecycle

### Day 3: HTTP Transport & Impersonation
- [ ] Implement custom HTTP transport wrapper
- [ ] Test header injection (Authorization, anthropic-beta, User-Agent)
- [ ] Test `x-api-key` header removal
- [ ] Integrate with Anthropic SDK
- [ ] Test Claude Code impersonation system message
- [ ] Verify subscription tier access
- [ ] Test all target models (Sonnet 4.5, Opus 4.5, etc.)
- [ ] Document transport integration

### Day 4: Variant Generation & Architecture
- [ ] Test 4 concurrent variant generation with OAuth
- [ ] Verify session UUIDs work with OAuth
- [ ] Test WebSocket streaming compatibility
- [ ] Benchmark OAuth vs API key performance
- [ ] Create integration architecture diagram
- [ ] Document component responsibilities
- [ ] Document configuration strategy
- [ ] Document security considerations
- [ ] Write final spike summary

---

## 📄 Spike Output Summary Template

```markdown
# Spike Summary: OAuth Authentication for Anthropic

**Date**: 2025-12-XX
**Duration**: X days
**Status**: ✅ Complete / ⚠️ Partial / ❌ Failed

## Key Findings

### OAuth Flow
- ✅/❌ Fabric's client ID works for third-party apps
- ✅/❌ Required scopes: [list]
- ✅/❌ Token expiration: X minutes
- ✅/❌ PKCE flow works without backend server

### Token Storage
- ✅/❌ File storage at `~/.config/screenshot-to-code/.claude_oauth` works
- ✅/❌ 0600 permissions prevent unauthorized access
- ✅/❌ Tokens persist across application restarts

### HTTP Transport
- ✅/❌ Custom transport wrapper integrates with Anthropic SDK
- ✅/❌ All required headers injected correctly
- ✅/❌ Works with streaming API calls

### Claude Code Impersonation
- ✅/❌ System message injection enables subscription access
- ✅/❌ Rate limits match subscription tier
- ✅/❌ Works for all target models

### Variant Generation
- ✅/❌ 4 concurrent variants work with OAuth
- ✅/❌ Performance within 2x of API key baseline
- ✅/❌ WebSocket streaming compatible

## Recommended Approach

[Option A/B/C with rationale]

## Implementation Estimate

- Architecture design: X days
- OAuth client implementation: X days
- HTTP transport wrapper: X days
- Backend integration: X days
- Testing & validation: X days
**Total**: X days

## Blockers / Open Questions

[List any unresolved issues]

## Next Steps

1. [Action item]
2. [Action item]
3. [Action item]
```

---

## 🔗 References

### Code Examples
- **Fabric OAuth Implementation**: `/tmp/fabric-oauth-research/internal/plugins/ai/anthropic/oauth.go`
- **Fabric Token Storage**: `/tmp/fabric-oauth-research/internal/util/oauth_storage.go`
- **Fabric Client Setup**: `/tmp/fabric-oauth-research/internal/plugins/ai/anthropic/anthropic.go`

### Documentation
- **Anthropic OAuth Docs**: https://docs.anthropic.com/en/api/oauth (if available)
- **OAuth 2.0 PKCE RFC**: https://datatracker.ietf.org/doc/html/rfc7636
- **Fabric GitHub**: https://github.com/danielmiessler/fabric

### Key Patterns Extracted
- PKCE Flow: Lines 115-203 in `oauth.go`
- Token Refresh: Lines 257-327 in `oauth.go`
- HTTP Transport: Lines 29-64 in `oauth.go`
- Claude Code Impersonation: Lines 244-253 in `anthropic.go`
- Token Storage: Lines 56-79 in `oauth_storage.go`

---

## ✅ Acceptance Criteria

This spike is complete when:

1. **OAuth Flow Validated**
   - ✅ User can authorize via browser
   - ✅ Tokens stored securely with 0600 permissions
   - ✅ Token refresh works automatically

2. **Integration Feasible**
   - ✅ Custom HTTP transport wraps Anthropic SDK
   - ✅ 4 concurrent variants work with OAuth
   - ✅ WebSocket streaming compatible

3. **Impersonation Confirmed**
   - ✅ Claude Code system message enables subscription access
   - ✅ Rate limits match subscription tier

4. **Architecture Designed**
   - ✅ Component diagram created
   - ✅ Integration points documented
   - ✅ Configuration strategy defined

5. **POC Code Complete**
   - ✅ All 5 POC scripts working
   - ✅ Code demonstrates end-to-end flow
   - ✅ Performance acceptable (< 2x baseline)

6. **Documentation Written**
   - ✅ Architecture document complete
   - ✅ Spike summary written
   - ✅ Findings documented with evidence

**Uncertainty Reduced**: 5/5 → 2/5 ✅

---

**Ready to Start**: After Phase 1 Spike 1 (SDK Integration Pattern) completes
**Blocks**: Feature 3.1 (ClaudeCodeClient implementation)
**Priority**: Can run in parallel with Spikes 1-3 from rework plan
