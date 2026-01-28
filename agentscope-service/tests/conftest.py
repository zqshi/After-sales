import os


def _apply_cov_override(config) -> None:
    value = os.getenv("COV_FAIL_UNDER")
    if value is None:
        return
    try:
        config.option.cov_fail_under = int(value)
    except ValueError:
        return


def pytest_configure(config) -> None:
    """Allow overriding coverage threshold via env for local runs."""
    _apply_cov_override(config)


def pytest_sessionstart(session) -> None:
    """Re-apply coverage override after plugins initialize."""
    _apply_cov_override(session.config)
