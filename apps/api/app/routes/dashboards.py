"""Dashboard routes (Feature 006).

Route groups from specs/006-dashboard-builder/contracts/dashboards.openapi.yaml:
- List/create dashboard: GET/POST /workspaces/{workspace_id}/dashboards
- Get/patch/delete dashboard: GET/PATCH/DELETE /workspaces/{workspace_id}/dashboards/{dashboard_id}
- Clone: POST /workspaces/{workspace_id}/dashboards/{dashboard_id}/clone
- Widget execute: POST /workspaces/{workspace_id}/dashboards/{dashboard_id}/widgets/{widget_id}/execute
- Table export: GET /workspaces/{workspace_id}/dashboards/{dashboard_id}/widgets/{widget_id}/export.csv
"""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(tags=["dashboards"])
