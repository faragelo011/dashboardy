import { expect, test, type BrowserContext } from "@playwright/test";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import type {
  Collection,
  CollectionListResponse,
  DashboardCreateRequest,
  DashboardDetail,
  DashboardEditorDetail,
  DashboardListResponse,
  DashboardUpdateRequest,
  SavedQuestionInternalDetail,
  SavedQuestionListResponse,
  WidgetExecuteResponse,
} from "@dashboardy/types";

const workspaceId = "00000000-0000-4000-8000-000000000001";

function json(res: ServerResponse, body: unknown, status = 200) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  });
  res.end(JSON.stringify(body));
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

function meResponse(role: "analyst" | "viewer") {
  return {
    user: {
      id: "00000000-0000-4000-8000-000000000010",
      email: `${role}@example.com`,
    },
    current_workspace: {
      tenant_id: "00000000-0000-4000-8000-000000000020",
      workspace_id: workspaceId,
      workspace_name: "Acme Workspace",
      role,
      membership_status: "active",
    },
    workspaces: [
      {
        tenant_id: "00000000-0000-4000-8000-000000000020",
        workspace_id: workspaceId,
        workspace_name: "Acme Workspace",
        role,
        membership_status: "active",
      },
    ],
  };
}

function widgetHasActiveOverrides(
  widget: {
    filter_overrides?: Record<string, unknown>;
  },
  definition: DashboardEditorDetail["definition"],
): boolean {
  const overrides = widget.filter_overrides ?? {};
  for (const gf of definition.global_filters) {
    if (gf.id in overrides && overrides[gf.id] !== gf.default_value) {
      return true;
    }
  }
  return false;
}

function widgetExecuteResponse(value: unknown, cacheHit = true): WidgetExecuteResponse {
  return {
    columns: [{ name: "value" }],
    rows: [[value]],
    meta: {
      status: "ok",
      duration_ms: 1,
      row_count: 1,
      truncated: false,
      cache_hit: cacheHit,
      error_code: null,
    },
  };
}

async function startMockApi(): Promise<{
  server: Server;
}> {
  let nextId = 1;
  const nextUuid = () => {
    const suffix = String(nextId++).padStart(12, "0");
    return `00000000-0000-4000-8000-${suffix}`;
  };
  const now = () => new Date().toISOString();

  const collectionId = nextUuid();
  const collections: Collection[] = [
    {
      id: collectionId,
      workspace_id: workspaceId,
      name: "Revenue",
      slug: "revenue",
      sort_order: 0,
      permission: "edit",
      created_at: now(),
      updated_at: now(),
    },
  ];

  const questionId = nextUuid();
  const questions: SavedQuestionInternalDetail[] = [
    {
      id: questionId,
      collection_id: collectionId,
      title: "ARR",
      description: "Annual recurring revenue",
      permission: "edit",
      can_export: true,
      detail_level: "internal",
      sql_text: "SELECT 1 AS value",
      parameters: [
        {
          name: "region",
          type: "string",
          required: true,
        },
      ],
      created_at: now(),
      updated_at: now(),
    },
  ];

  const dashboards: DashboardEditorDetail[] = [];
  const widgetExecuteCount: Record<string, number> = {};

  const server = createServer(async (req, res) => {
    const url = req.url ?? "";
    const method = req.method ?? "GET";
    if (method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
      });
      res.end();
      return;
    }
    const auth = String(req.headers.authorization ?? "");
    const role = auth.includes("viewer") ? "viewer" : "analyst";

    if (url === "/me" && method === "GET") {
      json(res, meResponse(role));
      return;
    }

    if (url === `/workspaces/${workspaceId}/collections` && method === "GET") {
      const body: CollectionListResponse = { collections };
      json(res, body);
      return;
    }

    if (url === `/workspaces/${workspaceId}/questions` && method === "GET") {
      const body: SavedQuestionListResponse = {
        questions: questions.map((q) => ({
          id: q.id,
          collection_id: q.collection_id,
          title: q.title,
          description: q.description,
          permission: q.permission,
          can_export: q.can_export,
          created_at: q.created_at,
          updated_at: q.updated_at,
        })),
      };
      json(res, body);
      return;
    }

    const questionDetailMatch = url.match(
      new RegExp(`^/workspaces/${workspaceId}/questions/([^/?]+)$`),
    );
    if (questionDetailMatch && method === "GET") {
      const id = questionDetailMatch[1];
      const detail = questions.find((q) => q.id === id);
      if (!detail) {
        json(res, { error_code: "question_not_found", message: "Not found." }, 404);
        return;
      }
      json(res, detail);
      return;
    }

    const dashboardsListMatch = url.match(
      new RegExp(`^/workspaces/${workspaceId}/dashboards(?:\\?.*)?$`),
    );
    if (dashboardsListMatch && method === "GET") {
      const body: DashboardListResponse = {
        dashboards: dashboards.map((d) => ({
          id: d.id,
          collection_id: d.collection_id,
          title: d.title,
          updated_at: d.updated_at,
        })),
      };
      json(res, body);
      return;
    }

    if (url === `/workspaces/${workspaceId}/dashboards` && method === "POST") {
      if (role !== "analyst") {
        json(res, { error_code: "authz_denied", message: "Authorization denied." }, 403);
        return;
      }
      const body = await readJsonBody<DashboardCreateRequest>(req);
      const timestamp = now();
      const definition =
        body.definition ??
        ({
          layout_version: 1,
          global_filters: [],
        } as const);
      const widgets = body.widgets ?? [];
      const created: DashboardEditorDetail = {
        detail_level: "editor",
        id: nextUuid(),
        collection_id: body.collection_id,
        title: body.title,
        definition,
        widgets: widgets.map((w) => ({
            id: nextUuid(),
            title: w.title ?? null,
            widget_type: w.widget_type,
            saved_question_id: w.saved_question_id,
            layout: w.layout,
            config: w.config ?? {},
            filter_bindings: w.filter_bindings ?? {},
            filter_overrides: w.filter_overrides ?? {},
            has_active_overrides: widgetHasActiveOverrides(w, definition),
            can_export: w.widget_type === "table",
          })),
        updated_at: timestamp,
        can_edit: true,
      };
      dashboards.push(created);
      json(res, created, 201);
      return;
    }

    const dashboardDetailMatch = url.match(
      new RegExp(`^/workspaces/${workspaceId}/dashboards/([^/?]+)$`),
    );
    if (dashboardDetailMatch && method === "GET") {
      const id = dashboardDetailMatch[1];
      const dash = dashboards.find((d) => d.id === id);
      if (!dash) {
        json(res, { error_code: "dashboard_not_found", message: "Not found." }, 404);
        return;
      }
      if (role === "viewer") {
        const consumer: DashboardDetail = {
          detail_level: "consumer",
          id: dash.id,
          collection_id: dash.collection_id,
          title: dash.title,
          definition: dash.definition,
          widgets: dash.widgets.map((w) => ({
            id: w.id,
            title: w.title ?? null,
            widget_type: w.widget_type,
            layout: w.layout,
            config: w.config ?? {},
            filter_bindings: w.filter_bindings ?? {},
            filter_overrides: w.filter_overrides ?? {},
            has_active_overrides: w.has_active_overrides ?? false,
            can_export: w.can_export ?? false,
          })),
          updated_at: dash.updated_at,
          can_edit: false,
        };
        json(res, consumer);
        return;
      }
      json(res, dash);
      return;
    }

    const dashboardPatchMatch = url.match(
      new RegExp(`^/workspaces/${workspaceId}/dashboards/([^/?]+)$`),
    );
    if (dashboardPatchMatch && method === "PATCH") {
      if (role !== "analyst") {
        json(res, { error_code: "authz_denied", message: "Authorization denied." }, 403);
        return;
      }
      const id = dashboardPatchMatch[1];
      const dash = dashboards.find((d) => d.id === id);
      if (!dash) {
        json(res, { error_code: "dashboard_not_found", message: "Not found." }, 404);
        return;
      }
      const body = await readJsonBody<DashboardUpdateRequest>(req);
      dash.title = body.title ?? dash.title;
      dash.collection_id = body.collection_id ?? dash.collection_id;
      dash.definition = body.definition ?? dash.definition;
      if (body.widgets) {
        dash.widgets = body.widgets.map((w) => ({
          id: w.id,
          title: w.title ?? null,
          widget_type: w.widget_type,
          saved_question_id: w.saved_question_id,
          layout: w.layout,
          config: w.config ?? {},
          filter_bindings: w.filter_bindings ?? {},
          filter_overrides: w.filter_overrides ?? {},
          has_active_overrides: widgetHasActiveOverrides(w, dash.definition),
          can_export: w.widget_type === "table",
        }));
      }
      dash.updated_at = now();
      json(res, dash);
      return;
    }

    const executeMatch = url.match(
      new RegExp(
        `^/workspaces/${workspaceId}/dashboards/([^/]+)/widgets/([^/]+)/execute$`,
      ),
    );
    if (executeMatch && method === "POST") {
      const dashboardId = executeMatch[1];
      const widgetId = executeMatch[2];
      const key = `${dashboardId}:${widgetId}`;
      widgetExecuteCount[key] = (widgetExecuteCount[key] ?? 0) + 1;
      const payload = await readJsonBody<{ global_filter_values?: Record<string, unknown> }>(
        req,
      );
      const region = payload.global_filter_values?.region ?? "EMEA";
      json(res, widgetExecuteResponse(region, widgetExecuteCount[key] === 1));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve) => server.listen(4010, "127.0.0.1", resolve));
  return { server };
}

async function stopMockApi(server: Server) {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
}

async function setSupabaseSessionCookie(
  context: BrowserContext,
  token: string,
  email: string,
) {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
  const session = {
    access_token: token,
    refresh_token: "refresh-token",
    expires_at: expiresAt,
    expires_in: 60 * 60,
    token_type: "bearer",
    user: {
      id: "00000000-0000-4000-8000-000000000010",
      email,
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

const INTERACTIVE_SHELL_MS = 5_000;

test("dashboard builder smoke: create, bind, override, viewer read-only", async ({
  browser,
  context,
  page,
}) => {
  const { server } = await startMockApi();
  try {
    await setSupabaseSessionCookie(
      context,
      "analyst-access-token",
      "analyst@example.com",
    );

    await page.goto("/dashboards");
    await expect(page.getByRole("heading", { name: "Dashboards", level: 1 })).toBeVisible();

    await page.getByLabel("Title").fill("Revenue Overview");
    const createResponsePromise = page.waitForResponse(
      (resp) =>
        resp.request().method() === "POST" && resp.url().includes("/dashboards"),
    );
    await page.getByRole("button", { name: "Create dashboard" }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.status()).toBe(201);
    const created = (await createResponse.json()) as { id: string };

    const editNavAt = Date.now();
    await page.goto(`/dashboards/${created.id}/edit`);
    await expect(page.getByRole("heading", { name: "Edit dashboard" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("button", { name: "Add widget" })).toBeVisible();
    expect(Date.now() - editNavAt).toBeLessThan(INTERACTIVE_SHELL_MS);

    await page.getByRole("button", { name: "Add filter" }).click();
    const globalFiltersSection = page
      .locator("section")
      .filter({ hasText: "Global filter definitions" });
    await globalFiltersSection.getByLabel("Id").fill("region");
    await globalFiltersSection.getByLabel("Label").fill("Region");
    await globalFiltersSection.getByLabel("Default").fill("EMEA");

    await page.getByLabel("Saved question").selectOption({ label: "ARR" });
    await page.getByLabel("Widget type").selectOption("table");
    await page.getByRole("button", { name: "Add widget" }).click();
    await expect(page.getByText("Filter bindings")).toBeVisible();

    const firstSavePromise = page.waitForResponse(
      (resp) =>
        resp.request().method() === "PATCH" && resp.url().includes("/dashboards/"),
    );
    await page.getByRole("button", { name: "Save" }).click();
    const firstSave = await firstSavePromise;
    expect(firstSave.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Edit dashboard" })).toBeVisible();

    const bindingsPanel = page.getByText("Filter bindings", { exact: true }).locator("..");
    await bindingsPanel.locator("select").selectOption("region");
    await bindingsPanel.locator('input[type="text"]').fill("APAC");

    const saveResponsePromise = page.waitForResponse(
      (resp) =>
        resp.request().method() === "PATCH" && resp.url().includes("/dashboards/"),
    );
    await page.getByRole("button", { name: "Save" }).click();
    const saveResponse = await saveResponsePromise;
    expect(saveResponse.status()).toBe(200);

    const viewNavAt = Date.now();
    await page.getByRole("link", { name: "View" }).click();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Region" })).toBeVisible();
    expect(Date.now() - viewNavAt).toBeLessThan(INTERACTIVE_SHELL_MS);

    // Override indicator should be visible when global value differs from widget override.
    await expect(page.getByText("Filter override active")).toBeVisible();

    // Change global filter bar value -> bound widget should re-execute and show the new value.
    await page.getByRole("textbox", { name: "Region" }).fill("NA");
    await expect(page.getByRole("cell", { name: "NA" })).toBeVisible();

    // Set global equal to override => indicator should disappear.
    await page.getByRole("textbox", { name: "Region" }).fill("APAC");
    await expect(page.getByRole("cell", { name: "APAC" })).toBeVisible();
    await expect(page.getByText("Filter override active")).toHaveCount(0);

    // Viewer context should not see Edit button.
    const viewerContext = await browser.newContext();
    await setSupabaseSessionCookie(
      viewerContext,
      "viewer-access-token",
      "viewer@example.com",
    );
    const viewerPage = await viewerContext.newPage();
    await viewerPage.goto(page.url());
    await expect(
      viewerPage.getByRole("heading", { name: "Revenue Overview", level: 1 }),
    ).toBeVisible();
    await expect(viewerPage.getByRole("link", { name: "Edit" })).toHaveCount(0);
    await viewerContext.close();
  } finally {
    await stopMockApi(server);
  }
});

