import uuid

from app.main import app
from fastapi.testclient import TestClient


def test_correlation_id_echoes_valid_uuidv4():
    cid = "3fa85f64-5717-4562-b3fc-2c963f66afa6"

    with TestClient(app) as client:
        r = client.get("/health", headers={"X-Correlation-ID": cid})

    assert r.status_code == 200
    assert r.headers["X-Correlation-ID"] == str(uuid.UUID(cid))


def test_correlation_id_generated_when_missing():
    with TestClient(app) as client:
        r = client.get("/health")

    assert r.status_code == 200
    uuid.UUID(r.headers["X-Correlation-ID"])  # raises if invalid
