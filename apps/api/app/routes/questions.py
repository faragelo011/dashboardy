"""Saved questions and collections routes (Feature 005).

Route handlers delegate to `app.questions.service`; authorization lives in
`app.questions.authz` / tenancy helpers - not in this module.

TODO (wire in Phase 2+ per saved-questions.openapi.yaml; paths are relative
to the `/workspaces/{workspace_id}` router prefix registered in main.py):

Collection routes:
  - listCollections: GET /collections
  - createCollection: POST /collections
  - getCollection: GET /collections/{collection_id}
  - updateCollection: PATCH /collections/{collection_id}
  - deleteCollection: DELETE /collections/{collection_id}

Saved question routes:
  - listSavedQuestions: GET /questions
  - createSavedQuestion: POST /questions
  - getSavedQuestion: GET /questions/{question_id}
  - updateSavedQuestion: PATCH /questions/{question_id}
  - deleteSavedQuestion: DELETE /questions/{question_id}

Clone route:
  - cloneSavedQuestion: POST /questions/{question_id}/clone

Execute route:
  - executeSavedQuestion: POST /questions/{question_id}/execute

Export route:
  - exportSavedQuestionCsv: GET /questions/{question_id}/export.csv
"""

from fastapi import APIRouter

router = APIRouter(tags=["questions"])
