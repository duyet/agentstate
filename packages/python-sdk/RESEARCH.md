# Python SDK Research Report

## Executive Summary

A Python SDK for AgentState is highly feasible and can be implemented by following patterns from the TypeScript SDK and industry-standard Python SDKs (OpenAI, Anthropic). The implementation should use **httpx** for HTTP requests with both sync and async support, **pydantic** for type-safe models, and **hatchling** as the build backend. The package name `agentstate` is already taken on PyPI, so alternative names should be considered.

## Existing SDK Analysis

### TypeScript SDK (`packages/sdk/src/index.ts`)

**Current functionality:**
- Conversation CRUD (create, get, list, update, delete)
- Message operations (append, list)
- AI features (generate title, generate follow-ups)
- Export conversations
- External ID lookups
- Bearer token authentication
- Custom error class with status code and machine-readable error code

**Key patterns to mirror:**
- Simple, intuitive client class with configuration object
- Single private `request()` method handling auth headers
- Type-safe models with TypeScript interfaces
- Pagination support (cursor-based with `limit`, `cursor`, `next_cursor`)
- Snake_case API field names (consistent with Python convention)
- Error class that captures status code, error code, and message

### Industry Reference SDKs

**OpenAI Python SDK** (`openai/openai-python`):
- Uses httpx for HTTP requests
- Provides both sync (`OpenAI`) and async (`AsyncOpenAI`) clients
- Comprehensive exception hierarchy with specific error types
- Automatic retry logic with exponential backoff
- Rich documentation and examples

**Anthropic Python SDK** (`anthropics/anthropic-sdk-python`):
- httpx + pydantic for type safety
- Both sync and async client variants
- Exception hierarchy mapping HTTP status codes to specific exceptions
- Build tool: hatchling
- pyproject.toml for modern Python packaging
- Type hints with strict mode enabled
- Comprehensive test suite with pytest

## Package Structure Recommendation

```
packages/python-sdk/
├── src/
│   └── agentstate/
│       ├── __init__.py
│       ├── _client.py         # Main AgentState client
│       ├── _async_client.py   # AsyncAgentState client
│       ├── _models.py         # Pydantic models (Conversation, Message, etc.)
│       ├── _exceptions.py     # Exception hierarchy
│       ├── _types.py          # Type aliases and utilities
│       └── _version.py        # Version string
├── tests/
│   ├── __init__.py
│   ├── test_client.py         # Unit tests for sync client
│   ├── test_async_client.py   # Unit tests for async client
│   ├── test_models.py         # Model validation tests
│   └── conftest.py            # pytest fixtures
├── examples/
│   ├── basic_usage.py
│   ├── async_usage.py
│   └── error_handling.py
├── pyproject.toml
├── README.md
├── CHANGELOG.md
├── LICENSE
└── RESEARCH.md                # This file
```

### Build Tool: Hatchling

**Rationale:**
- Modern, fast build backend (used by Anthropic SDK)
- Simple configuration via pyproject.toml
- Excellent support for src-layout packages
- Built-in pyproject.toml reading for README

### Core Dependencies

```toml
dependencies = [
    "httpx>=0.25.0,<1",           # HTTP client with async support
    "pydantic>=2.0,<3",            # Type-safe data validation
    "typing-extensions>=4.10,<5",  # For older Python versions
]

requires-python = ">=3.8"
```

### Development Dependencies

```toml
[dependency-groups]
dev = [
    "pytest>=7.0",
    "pytest-asyncio>=0.21",
    "respx>=0.20",                # httpx mocking
    "pyright>=1.1",
    "ruff>=0.1",
    "mypy>=1.0",
]
```

## Implementation Plan

### Phase 1: Foundation (1-2 days)
1. Set up package structure with src-layout
2. Configure pyproject.toml with hatchling
3. Create exception hierarchy mirroring API error codes
4. Implement Pydantic models for API resources
5. Set up pytest with respx for mocking

### Phase 2: Core Client (2-3 days)
1. Implement base HTTP client with httpx
2. Add authentication (Bearer token header)
3. Add error handling with custom exceptions
4. Add retry logic with exponential backoff
5. Add timeout configuration

### Phase 3: API Methods (2-3 days)
1. Conversation CRUD operations
2. Message operations (append, list)
3. AI features (generate title, follow-ups)
4. Export functionality
5. Tag management

### Phase 4: Async Client (1-2 days)
1. Create AsyncAgentState class
2. Implement all sync methods as async
3. Add context manager support
4. Test async patterns

### Phase 5: Testing & Documentation (1-2 days)
1. Comprehensive unit tests with respx mocks
2. Integration tests against local API
3. Type checking with pyright (strict mode)
4. Docstrings for all public methods
5. Usage examples

## Key Decisions Needed

### 1. Package Name on PyPI

**Status:** The name `agentstate` is already taken on PyPI.

**Options:**
- `agentstate-py` (clear Python indicator)
- `agentstate-sdk` (SDK-suffixed)
- `agentstate-client` (client-focused)
- `python-agentstate` (language-prefixed)

**Recommendation:** Use `agentstate-py` for clarity and avoid confusion with existing packages.

### 2. Sync vs Async Support

**Recommendation:** Provide both sync (`AgentState`) and async (`AsyncAgentState`) clients from the start. This matches industry standards (OpenAI, Anthropic) and provides flexibility for different use cases.

### 3. Type Validation Approach

**Options:**
- **Pydantic v2:** Full validation, JSON schema generation, but adds dependency
- **TypedDict:** Zero-runtime-cost, but no validation
- **dataclasses:** Built-in, but limited validation

**Recommendation:** Use Pydantic v2 for runtime type safety and automatic validation. The dependency is already minimal and widely adopted.

### 4. Retry Strategy

**Options:**
- **httpx built-in:** Limited retry support
- **tenacity:** Feature-rich but adds dependency
- **Custom implementation:** Full control

**Recommendation:** Implement custom retry logic using exponential backoff for 429 (rate limit), 500, 502, 503, 504 status codes. Keep it simple without external dependencies.

### 5. Testing Approach

**Unit Tests:**
- Use `respx` for httpx request mocking
- Mock API responses with realistic fixtures
- Test error handling paths

**Integration Tests:**
- Use `pytest-asyncio` for async tests
- Test against local API with test API key
- Mark with `@pytest.mark.integration` to skip in CI if needed

## Estimated Effort

| Phase | Tasks | Time Estimate |
|-------|-------|---------------|
| Phase 1: Foundation | Package setup, models, exceptions | 1-2 days |
| Phase 2: Core Client | HTTP client, auth, error handling | 2-3 days |
| Phase 3: API Methods | All API endpoints | 2-3 days |
| Phase 4: Async Client | Async variants | 1-2 days |
| Phase 5: Testing & Docs | Tests, docstrings, examples | 1-2 days |
| **Total** | | **7-12 days** |

**Note:** This is for a single developer working full-time. Parallel work could reduce timeline.

## Risks & Considerations

### Technical Risks

1. **API Compatibility**
   - Risk: API changes during SDK development
   - Mitigation: Use specific API version endpoint, validate against OpenAPI spec

2. **Type Mismatches**
   - Risk: TypeScript/Python type differences (e.g., unions)
   - Mitigation: Careful type mapping, comprehensive validation tests

3. **Async Complexity**
   - Risk: Async bugs, connection pool issues
   - Mitigation: Extensive async testing, follow httpx async patterns

4. **PyPI Namespace**
   - Risk: Desired package names taken
   - Mitigation: Already identified `agentstate` is taken; use alternatives

### Operational Risks

1. **Maintenance Burden**
   - Risk: SDK drifts from API changes
   - Mitigation: Document release process, automated API compatibility tests

2. **Documentation Updates**
   - Risk: Docs become outdated
   - Mitigation: Docstrings as source of truth, examples in same repo

3. **Versioning Strategy**
   - Risk: Breaking changes cause user issues
   - Mitigation: Semantic versioning, clear changelog

### Python-Specific Considerations

1. **Python Version Support**
   - Support Python 3.8+ to match major cloud providers
   - Use typing-extensions for older versions

2. **Type Checking**
   - Enable pyright strict mode for maximum type safety
   - Use mypy as alternative for wider compatibility

3. **Code Quality**
   - Use Ruff for fast linting and formatting
   - Pre-commit hooks for automated checks

## References

### Official Documentation
- [Python Packaging User Guide](https://packaging.python.org/)
- [Pydantic v2 Documentation](https://docs.pydantic.dev/)
- [httpx Documentation](https://www.python-httpx.org/)
- [Hatchling User Guide](https://hatch.pypa.io/latest/)

### Example SDKs
- [OpenAI Python SDK](https://github.com/openai/openai-python)
- [Anthropic Python SDK](https://github.com/anthropics/anthropic-sdk-python)
- [LangChain](https://github.com/langchain-ai/langchain)

### AgentState Resources
- [AgentState API Reference](../../docs/api-reference.md)
- [TypeScript SDK Source](../sdk/src/index.ts)
- [Integration Guide](../../docs/integration.md)

## Next Steps

1. **Decision on Package Name** - Choose and register PyPI name
2. **Create Repository** - Set up `packages/python-sdk/` with initial structure
3. **Set Up CI/CD** - Configure GitHub Actions for testing and publishing
4. **Begin Implementation** - Start with Phase 1 (Foundation)

## Appendix: API Method Coverage

The Python SDK should implement the following methods to match TypeScript SDK parity:

### Conversations
- ✅ `create_conversation(external_id, title, metadata, messages)`
- ✅ `get_conversation(id)`
- ✅ `get_conversation_by_external_id(external_id)`
- ✅ `list_conversations(limit, cursor, order)`
- ✅ `update_conversation(id, title, metadata)`
- ✅ `delete_conversation(id)`
- ✅ `search_conversations(query, limit, cursor)`
- ✅ `bulk_delete_conversations(ids)`

### Messages
- ✅ `append_messages(conversation_id, messages)`
- ✅ `list_messages(conversation_id, limit, after)`

### AI Features
- ✅ `generate_title(conversation_id)`
- ✅ `generate_follow_ups(conversation_id)`

### Export
- ✅ `export_conversations(ids)`

### Tags (Future Enhancement)
- ⏳ `list_tags()`
- ⏳ `get_conversation_tags(conversation_id)`
- ⏳ `add_tags(conversation_id, tags)`
- ⏳ `remove_tag(conversation_id, tag)`

---

**Document Version:** 1.0
**Last Updated:** 2026-03-18
**Status:** Research Complete - Ready for Implementation
