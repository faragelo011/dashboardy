import logging

from app.logging import configure_logging


def test_database_url_secret_not_written_to_logs(monkeypatch, capsys):
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql+asyncpg://probe:s3cret-do-not-leak@localhost:5432/x",
    )

    configure_logging("info")
    logging.getLogger("dashboardy.test").info("healthy startup")

    captured = capsys.readouterr()
    assert "s3cret-do-not-leak" not in captured.out
    assert "s3cret-do-not-leak" not in captured.err
