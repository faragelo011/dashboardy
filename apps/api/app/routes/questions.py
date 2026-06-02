"""Saved questions and collections routes (Feature 005).

Route handlers delegate to `app.questions.service`; authorization lives in
`app.questions.authz` / tenancy helpers - not in this module.

TODO (wire in Phase 2+ per saved-questions.openapi.yaml):

Collection routes (`/workspaces/{workspace_id}/collections`):
  - listCollections: GET /workspaces/{workspace_id}/collections
  - createCollection: POST /workspaces/{workspace_id}/collections
  - getCollection: GET /workspaces/{workspace_id}/collections/{collection_id}
  - updateCollection: PATCH /workspaces/{workspace_id}/collections/{collection_id}
  - deleteCollection: DELETE /workspaces/{workspace_id}/collections/{collection_id}

Saved question routes (`/workspaces/{workspace_id}/questions`):
  - listSavedQuestions: GET /workspaces/{workspace_id}/questions
  - createSavedQuestion: POST /workspaces/{workspace_id}/questions
  - getSavedQuestion: GET /workspaces/{workspace_id}/questions/{question_id}
  - updateSavedQuestion: PATCH /workspaces/{workspace_id}/questions/{question_id}
  - deleteSavedQuestion: DELETE /workspaces/{workspace_id}/questions/{question_id}

Clone route:
  - cloneSavedQuestion: POST /workspaces/{workspace_id}/questions/{question_id}/clone

Execute route:
  - executeSavedQuestion:
    POST /workspaces/{workspace_id}/questions/{question_id}/execute

Export route:
  - exportSavedQuestionCsv:
    GET /workspaces/{workspace_id}/questions/{question_id}/export.csv
"""

from fastapi import APIRouter

router = APIRouter(tags=["questions"])
