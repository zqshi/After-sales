.PHONY: help install dev-install format lint typecheck test test-cov clean run

help:
	@echo "Available commands:"
	@echo "  make install      - Install production dependencies"
	@echo "  make dev-install  - Install development dependencies"
	@echo "  make format       - Format code with ruff"
	@echo "  make lint         - Run linting checks"
	@echo "  make typecheck    - Run type checking with mypy"
	@echo "  make test         - Run tests without coverage"
	@echo "  make test-cov     - Run tests with coverage report"
	@echo "  make clean        - Remove generated files"
	@echo "  make run          - Run the service"
	@echo "  make check        - Run all checks (format, lint, typecheck, test)"

install:
	pip install -e .

dev-install:
	pip install -e ".[dev]"

format:
	ruff format .

lint:
	ruff check .

lint-fix:
	ruff check --fix .

typecheck:
	mypy src/

test:
	pytest --no-cov

test-cov:
	pytest

clean:
	rm -rf .pytest_cache
	rm -rf .mypy_cache
	rm -rf .ruff_cache
	rm -rf htmlcov
	rm -rf .coverage
	rm -rf coverage.xml
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete

run:
	uvicorn src.api.main:app --reload --port 5000

check: format lint typecheck test-cov
	@echo "All checks passed!"
