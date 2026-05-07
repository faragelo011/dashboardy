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
  let connectionStatus: "not_configured" | "pending_test" = "not_configured";
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
          json(res, {
            status: "pending_test",
            has_credentials: true,
            name: "Acme Snowflake",
            warehouse: "WH",
            database: "DB",
            schema: null,
          });
        });
        return;
      }
      res.writeHead(405);
      res.end();
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

    await page.getByLabel("Account").fill("acct");
    await page.getByLabel("Username").fill("user");
    await page.getByLabel("Role").fill("SYSADMIN");
    await page.getByLabel("Password").fill("supersecret");

    await page.getByRole("button", { name: "Save connection" }).click();

    // Status badge should update, and password field should not retain the value after submit.
    await expect(
      page
        .locator("header")
        .locator("span")
        .filter({ hasText: /pending test/i })
        .first(),
    ).toBeVisible();
    await expect(page.getByLabel("Password")).toHaveValue("");
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
    const home = new URL("/", baseURL ?? "http://localhost:3005").href;
    await expect(page).toHaveURL(home);
  } finally {
    await stopMockApi(server);
  }
});
