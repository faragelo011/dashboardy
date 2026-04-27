import os
import socket
import subprocess
import time
from pathlib import Path


def _unused_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def test_api_exits_fast_when_database_url_missing():
    api_dir = Path(__file__).resolve().parents[1]
    env = os.environ.copy()
    env["SUPABASE_JWKS_URL"] = "https://example.invalid/.well-known/jwks.json"
    env["SUPABASE_JWT_ISSUER"] = "https://example.invalid/auth/v1"
    env.pop("DATABASE_URL", None)

    start = time.perf_counter()
    proc = subprocess.Popen(
        [
            "uv",
            "run",
            "uvicorn",
            "app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(_unused_port()),
        ],
        cwd=api_dir,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    try:
        _stdout, stderr = proc.communicate(timeout=6)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.communicate()
        raise AssertionError("API did not exit within 6 seconds") from None

    elapsed = time.perf_counter() - start
    assert elapsed < 5
    assert proc.returncode != 0
    assert "Missing required environment variable: DATABASE_URL" in stderr
    assert "Traceback" not in stderr
    assert "ValidationError" not in stderr
