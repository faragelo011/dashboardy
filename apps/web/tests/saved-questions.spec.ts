import { expect, test, type BrowserContext } from "@playwright/test";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

const workspaceId = "00000000-0000-4000-8000-000000000001";
const THREE_MINUTES_MS = 3 * 60 * 1000;

type MockCollection = {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  sort_order: number;
  permission: "view" | "edit";
  created_at: string;
  updated_at: string;
};

type MockQuestion = {
  id: string;
  collection_id: string;
  title: string;
  description: string | null;
  permission: "view" | "edit";
  can_export: boolean;
  sql_text: string;
  parameters: Array<{
    name: string;
    type: "string" | "number" | "boolean" | "date";
    required: boolean;
    label?: string | null;
    default?: string | number | boolean | null;
  }>;
  created_at: string;
  updated_at: string;
};

function json(res: ServerResponse, body: unknown, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

function meResponse() {
  return {
    user: {
      id: "00000000-0000-4000-8000-000000000010",
      email: "analyst@example.com",
    },
    current_workspace: {
      tenant_id: "00000000-0000-4000-8000-000000000020",
      workspace_id: workspaceId,
      workspace_name: "Acme Workspace",
      role: "analyst",
      membership_status: "active",
    },
    workspaces: [
      {
        tenant_id: "00000000-0000-4000-8000-000000000020",
        workspace_id: workspaceId,
        workspace_name: "Acme Workspace",
        role: "analyst",
        membership_status: "active",
      },
    ],
  };
}

function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += String(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw || "{}") as T);
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

async function startMockApi(): Promise<Server> {
  let nextId = 1;
  const collections: MockCollection[] = [];
  const questions: MockQuestion[] = [];

  const nextUuid = () => {
    const suffix = String(nextId++).padStart(12, "0");
    return `00000000-0000-4000-8000-${suffix}`;
  };

  const now = () => new Date().toISOString();

  const toSummary = (question: MockQuestion) => ({
    id: question.id,
    collection_id: question.collection_id,
    title: question.title,
    description: question.description,
    permission: question.permission,
    can_export: question.can_export,
    created_at: question.created_at,
    updated_at: question.updated_at,
  });

  const toInternalDetail = (question: MockQuestion) => ({
    ...toSummary(question),
    detail_level: "internal" as const,
    parameters: question.parameters,
    sql_text: question.sql_text,
  });

  const executeResponse = (cacheHit: boolean) => ({
    columns: [{ name: "revenue" }],
    rows: [[42]],
    meta: {
      status: "ok",
      duration_ms: 1,
      row_count: 1,
      truncated: false,
      cache_hit: cacheHit,
      error_code: null,
    },
  });

  const server = createServer(async (req, res) => {
    const url = req.url ?? "";
    const method = req.method ?? "GET";

    if (url === "/me" && method === "GET") {
      json(res, meResponse());
      return;
    }

    if (url === `/workspaces/${workspaceId}/collections`) {
      if (method === "GET") {
        json(res, { collections });
        return;
      }
      if (method === "POST") {
        const body = await readJsonBody<{ name: string; sort_order?: number }>(req);
        const timestamp = now();
        const collection: MockCollection = {
          id: nextUuid(),
          workspace_id: workspaceId,
          name: body.name,
          slug: slugify(body.name),
          sort_order: body.sort_order ?? 0,
          permission: "edit",
          created_at: timestamp,
          updated_at: timestamp,
        };
        collections.push(collection);
        json(res, collection, 201);
        return;
      }
    }

    const questionsMatch = url.match(
      new RegExp(`^/workspaces/${workspaceId}/questions(?:\\?.*)?$`),
    );
    if (questionsMatch && method === "GET") {
      json(res, { questions: questions.map(toSummary) });
      return;
    }

    if (url === `/workspaces/${workspaceId}/questions` && method === "POST") {
      const body = await readJsonBody<{
        collection_id: string;
        title: string;
        description?: string | null;
        sql_text: string;
        parameters: MockQuestion["parameters"];
      }>(req);
      const timestamp = now();
      const question: MockQuestion = {
        id: nextUuid(),
        collection_id: body.collection_id,
        title: body.title,
        description: body.description ?? null,
        permission: "edit",
        can_export: true,
        sql_text: body.sql_text,
        parameters: body.parameters ?? [],
        created_at: timestamp,
        updated_at: timestamp,
      };
      questions.push(question);
      json(res, toInternalDetail(question), 201);
      return;
    }

    const questionDetailMatch = url.match(
      new RegExp(`^/workspaces/${workspaceId}/questions/([^/?]+)$`),
    );
    if (questionDetailMatch && method === "GET") {
      const questionId = questionDetailMatch[1];
      const question = questions.find((item) => item.id === questionId);
      if (!question) {
        json(res, { error_code: "question_not_found", message: "Not found." }, 404);
        return;
      }
      json(res, toInternalDetail(question));
      return;
    }

    const executeMatch = url.match(
      new RegExp(`^/workspaces/${workspaceId}/questions/([^/]+)/execute$`),
    );
    if (executeMatch && method === "POST") {
      const body = await readJsonBody<{ bypass_cache?: boolean }>(req);
      json(res, executeResponse(!body.bypass_cache));
      return;
    }

    const cloneMatch = url.match(
      new RegExp(`^/workspaces/${workspaceId}/questions/([^/]+)/clone$`),
    );
    if (cloneMatch && method === "POST") {
      const sourceId = cloneMatch[1];
      const source = questions.find((item) => item.id === sourceId);
      if (!source) {
        json(res, { error_code: "question_not_found", message: "Not found." }, 404);
        return;
      }
      const body = await readJsonBody<{ target_collection_id: string; title?: string | null }>(
        req,
      );
      const timestamp = now();
      const cloned: MockQuestion = {
        ...source,
        id: nextUuid(),
        collection_id: body.target_collection_id,
        title: body.title?.trim() || `${source.title} (copy)`,
        created_at: timestamp,
        updated_at: timestamp,
      };
      questions.push(cloned);
      json(res, toInternalDetail(cloned), 201);
      return;
    }

    const exportMatch = url.match(
      new RegExp(`^/workspaces/${workspaceId}/questions/([^/]+)/export\\.csv`),
    );
    if (exportMatch && method === "GET") {
      res.writeHead(200, { "Content-Type": "text/csv" });
      res.end("revenue\n42\n");
      return;
    }

    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve) => server.listen(4010, "127.0.0.1", resolve));
  return server;
}

async function stopMockApi(server: Server) {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
}

async function setSupabaseSessionCookie(context: BrowserContext) {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
  const session = {
    access_token: "analyst-access-token",
    refresh_token: "analyst-refresh-token",
    expires_at: expiresAt,
    expires_in: 60 * 60,
    token_type: "bearer",
    user: {
      id: "00000000-0000-4000-8000-000000000010",
      email: "analyst@example.com",
      aud: "authenticated",
      role: "authenticated",
    },
  };
  const value = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
  await context.addCookies([
    {
      name: "sb-example-auth-token",
      value,
      domain: "localhost",
      path: "/",
      sameSite: "Lax",
    },
  ]);
}

test("authoring loop covers collection, question, execute, clone, and export", async ({
  context,
  page,
}) => {
  const startedAt = Date.now();
  const server = await startMockApi();
  try {
    await setSupabaseSessionCookie(context);

    await page.goto("/collections");
    await expect(
      page.getByRole("heading", { name: "Collections", level: 1 }),
    ).toBeVisible();
    await page.getByPlaceholder("Revenue").fill("Revenue");
    await page.getByRole("button", { name: "Create collection" }).click();
    await expect(page.getByRole("button", { name: "Create collection" })).toBeEnabled();

    await page.goto("/questions?new=1");
    await expect(page.getByRole("heading", { name: "New question" })).toBeVisible();
    await page.locator('input[name="title"]').fill("Revenue by Day");
    await page.locator('textarea[name="sql_text"]').fill("SELECT 42 AS revenue");
    await page.getByRole("button", { name: "Create question" }).click();
    await page.waitForURL(/\/questions\?id=/);
    await expect(page.getByRole("heading", { name: "Edit question" })).toBeVisible();

    await expect(page.getByRole("button", { name: "Execute" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Force fresh" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();

    await page.getByRole("button", { name: "Execute" }).click();
    await expect(page.getByRole("cell", { name: "42" })).toBeVisible();

    await page.getByRole("button", { name: "Force fresh" }).click();
    await expect(page.getByRole("cell", { name: "42" })).toBeVisible();

    await page.getByRole("button", { name: "Clone question" }).click();
    await page.waitForURL(/\/questions\?id=/);
    await expect(page.getByRole("heading", { name: "Edit question" })).toBeVisible();

    await page.getByRole("button", { name: "Export CSV" }).click();
    await expect(page.getByText("Export failed")).toHaveCount(0);

    expect(Date.now() - startedAt).toBeLessThan(THREE_MINUTES_MS);
  } finally {
    await stopMockApi(server);
  }
});
