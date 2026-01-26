# AgentScope Service

This folder contains the Python service described in the AgentScope upgrade plan. It houses the FastAPI application, Agent implementations, toolkit registration, and routing helpers required to bootstrap the Agent-assisted after-sales system.

## Getting started

```bash
cd agentscope-service

# Install dependencies
pip install -e ".[dev]"

# Run the service
uvicorn src.api.main:app --reload --port 5000
```

The service exposes health and API endpoints for chat, agents, and event bridging:
- `GET /health`
- `POST /api/chat/message` and `WS /api/chat/ws/{conversation_id}`
- `GET /api/agents/list`, `POST /api/agents/inspect`
- `POST /api/events/bridge`

## Development

### Code Quality Tools

This project uses modern Python development tools:

- **Ruff**: Fast Python linter and formatter
- **MyPy**: Static type checker
- **Pytest**: Testing framework with coverage reporting

### Running Tests

```bash
# Run all tests with coverage
pytest

# Run specific test file
pytest tests/test_event_bridge.py

# Run with verbose output
pytest -v

# Run without coverage
pytest --no-cov
```

### Code Formatting and Linting

```bash
# Format code with ruff
ruff format .

# Check code style
ruff check .

# Auto-fix issues
ruff check --fix .
```

### Type Checking

```bash
# Run type checking
mypy src/
```

### Pre-commit Checks

Before committing, run:

```bash
# Format, lint, type check, and test
ruff format . && ruff check --fix . && mypy src/ && pytest
```

## Project Structure

```
agentscope-service/
├── src/
│   ├── agents/          # Agent implementations
│   ├── api/             # FastAPI routes
│   ├── config/          # Configuration
│   └── utils/           # Utilities
├── tests/               # Test files
├── pyproject.toml       # Project configuration
└── README.md
```

## Testing Requirements

- Minimum test coverage: 80%
- All new features must include tests
- All agents must have unit tests
