import { expect, test, type BrowserContext } from "@playwright/test";
import { createServer, type Server, type ServerResponse } from "node:http";

const workspaceId = "00000000-0000-4000-8000-000000000001";

function json(res: ServerResponse, body: unknown, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function meResponse(role: "admin" | "viewer") {
  return {
    user: { id: "00000000-0000-4000-8000-000000000010", email: `${role}@example.com` },
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

async function startMockApi(role: "admin" | "viewer"): Promise<Server> {
  let connectionStatus: "not_configured" | "pending_test" | "active" =
    "not_configured";
  let lastTestedAt: string | null = null;
  let lastSuccessfulAt: string | null = null;
  let lastError: string | null = null;
  const server = createServer((req, res) => {
    if (req.url === "/me" && req.method === "GET") {
      json(res, meResponse(role));
      return;
    }
    if (req.url === `/workspaces/${workspaceId}/connection`) {
      if (role !== "admin") {
        json(
          res,
          { error_code: "authz_denied", message: "You do not have permission to perform this action." },
          403,
        );
        return;
      }
      if (req.method === "GET") {
        json(res, {
          status: connectionStatus,
          has_credentials: connectionStatus !== "not_configured",
          name: connectionStatus === "not_configured" ? null : "Acme Snowflake",
          warehouse: connectionStatus === "not_configured" ? null : "WH",
          database: connectionStatus === "not_configured" ? null : "DB",
          schema: null,
          last_tested_at: lastTestedAt,
          last_successful_test_at: lastSuccessfulAt,
          last_error: lastError,
        });
        return;
      }
      if (req.method === "PUT") {
        let raw = "";
        req.on("data", (c) => (raw += String(c)));
        req.on("end", () => {
          try {
            const body = JSON.parse(raw || "{}") as { credentials?: { password?: string } };
            // Ensure our mock never echoes passwords back.
            if (body.credentials?.password) {
              // password received by API
            }
          } catch {
            // ignore
          }
          connectionStatus = "pending_test";
          lastError = null;
          json(res, {
            status: "pending_test",
            has_credentials: true,
            name: "Acme Snowflake",
            warehouse: "WH",
            database: "DB",
            schema: null,
            last_tested_at: lastTestedAt,
            last_successful_test_at: lastSuccessfulAt,
            last_error: lastError,
          });
        });
        return;
      }
      res.writeHead(405);
      res.end();
      return;
    }
    if (req.url === `/workspaces/${workspaceId}/connection/test`) {
      if (role !== "admin") {
        json(
          res,
          { error_code: "authz_denied", message: "You do not have permission to perform this action." },
          403,
        );
        return;
      }
      if (req.method !== "POST") {
        res.writeHead(405);
        res.end();
        return;
      }
      const now = new Date().toISOString();
      lastTestedAt = now;
      lastSuccessfulAt = now;
      lastError = null;
      connectionStatus = "active";
      json(res, {
        connection: {
          status: "active",
          has_credentials: true,
          name: "Acme Snowflake",
          warehouse: "WH",
          database: "DB",
          schema: null,
          last_tested_at: lastTestedAt,
          last_successful_test_at: lastSuccessfulAt,
          last_error: lastError,
        },
        test_status: "success",
      });
      return;
    }
    if (req.url === `/workspaces/${workspaceId}/connection/rotate`) {
      if (role !== "admin") {
        json(
          res,
          {
            error_code: "authz_denied",
            message: "You do not have permission to perform this action.",
          },
          403,
        );
        return;
      }
      if (req.method !== "POST") {
        res.writeHead(405);
        res.end();
        return;
      }
      connectionStatus = "pending_test";
      lastError = null;
      json(res, {
        status: "pending_test",
        has_credentials: true,
        name: "Acme Snowflake",
        warehouse: "WH",
        database: "DB",
        schema: null,
        last_tested_at: lastTestedAt,
        last_successful_test_at: lastSuccessfulAt,
        last_error: lastError,
      });
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

async function setSupabaseSessionCookie(
  context: BrowserContext,
  role: "admin" | "viewer",
) {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
  const session = {
    access_token: `${role}-access-token`,
    refresh_token: `${role}-refresh-token`,
    expires_at: expiresAt,
    expires_in: 60 * 60,
    token_type: "bearer",
    user: {
      id: "00000000-0000-4000-8000-000000000010",
      email: `${role}@example.com`,
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

test("admin can access connections page and submit credentials", async ({
  context,
  page,
}) => {
  const server = await startMockApi("admin");
  try {
    await setSupabaseSessionCookie(context, "admin");
    await page.goto("/connections");
    await expect(page.getByRole("heading", { name: "Data connection" })).toBeVisible();

    await page.getByLabel("Display name").fill("Acme Snowflake");
    await page.getByLabel("Warehouse").fill("WH");
    await page.getByLabel("Database").fill("DB");

    await page.locator('input[name="account"]').fill("acct");
    await page.locator('input[name="username"]').fill("user");
    await page.locator('input[name="role"]').fill("SYSADMIN");
    await page.locator('input[name="password"]').fill("supersecret");

    await page.getByRole("button", { name: "Save connection" }).click();

    // Status badge should update, and password field should not retain the value after submit.
    await expect(
      page
        .locator("header")
        .locator("span")
        .filter({ hasText: /pending test/i })
        .first(),
    ).toBeVisible();
    await expect(page.locator('input[name="password"]')).toHaveValue("");

    await page.getByRole("button", { name: "Test connection" }).click();
    await expect(
      page.getByText("Last tested", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Last successful", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("—", { exact: true }),
    ).toHaveCount(0);

    await page.locator('input[name="rotate_account"]').fill("acct");
    await page.locator('input[name="rotate_username"]').fill("user");
    await page.locator('input[name="rotate_role"]').fill("SYSADMIN");
    await page.locator('input[name="rotate_password"]').fill("rotatedsecret");
    await page.getByRole("button", { name: "Rotate credentials" }).click();
    await expect(
      page
        .locator("header")
        .locator("span")
        .filter({ hasText: /pending test/i })
        .first(),
    ).toBeVisible();
  } finally {
    await stopMockApi(server);
  }
});
test("non-admin is redirected away from connections page", async ({
  context,
  page,
  baseURL,
}) => {
  const server = await startMockApi("viewer");
  try {
    await setSupabaseSessionCookie(context, "viewer");
    await page.goto("/connections");
    const dashboards = new URL("/dashboards", baseURL ?? "http://localhost:3005").href;
    await expect(page).toHaveURL(dashboards);
  } finally {
    await stopMockApi(server);
  }
});
