"""
Pytest配置和共享fixtures
"""

from __future__ import annotations

import os
from typing import Generator
from unittest.mock import MagicMock

import pytest


@pytest.fixture(scope="session", autouse=True)
def setup_test_environment() -> Generator[None, None, None]:
    """设置测试环境变量"""
    # 设置测试环境变量
    os.environ["ENVIRONMENT"] = "test"
    os.environ["DEEPSEEK_API_KEY"] = "test-api-key"
    os.environ["DEEPSEEK_BASE_URL"] = "https://api.test.com"
    os.environ["BACKEND_MCP_URL"] = "http://localhost:3000"
    os.environ["AGENTSCOPE_PREFETCH_ENABLED"] = "false"

    yield

    # 清理
    for key in [
        "ENVIRONMENT",
        "DEEPSEEK_API_KEY",
        "DEEPSEEK_BASE_URL",
        "BACKEND_MCP_URL",
        "AGENTSCOPE_PREFETCH_ENABLED",
    ]:
        os.environ.pop(key, None)


@pytest.fixture
def mock_settings() -> MagicMock:
    """创建模拟的settings对象"""
    settings = MagicMock()
    settings.deepseek_config = {
        "model_name": "deepseek-chat",
        "api_key": "test-key",
        "base_url": "https://api.test.com",
        "timeout": 30,
        "stream": True,
    }
    settings.backend_mcp_url = "http://localhost:3000"
    return settings


@pytest.fixture(autouse=True)
def reset_singletons() -> Generator[None, None, None]:
    """重置单例对象（如果有的话）"""
    yield
    # 在这里重置任何单例对象


# 标记定义
def pytest_configure(config: pytest.Config) -> None:
    """配置pytest标记"""
    config.addinivalue_line("markers", "unit: 单元测试")
    config.addinivalue_line("markers", "integration: 集成测试")
    config.addinivalue_line("markers", "slow: 慢速测试")
    config.addinivalue_line("markers", "asyncio: 异步测试")
