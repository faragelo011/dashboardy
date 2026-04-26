import statistics
import time

from app.main import app
from fastapi.testclient import TestClient


def test_health_latency_targets():
    with TestClient(app) as client:
        durations_ms: list[float] = []
        for _ in range(100):
            start = time.perf_counter()
            r = client.get("/health")
            end = time.perf_counter()
            assert r.status_code == 200
            durations_ms.append((end - start) * 1000.0)

    median_ms = statistics.median(durations_ms)
    max_ms = max(durations_ms)

    assert median_ms < 50.0, f"median too slow: {median_ms:.2f}ms"
    assert max_ms < 100.0, f"max too slow: {max_ms:.2f}ms"
