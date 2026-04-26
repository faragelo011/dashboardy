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

    tail = durations_ms[10:]
    median_ms = statistics.median(tail)
    p95_ms = statistics.quantiles(tail, n=100, method="inclusive")[94]

    assert median_ms < 50.0, f"median too slow: {median_ms:.2f}ms"
    assert p95_ms < 100.0, f"p95 too slow: {p95_ms:.2f}ms"
