import { expect, test, type BrowserContext } from "@playwright/test";
import { createServer, type Server, type ServerResponse } from "node:http";

const workspaceId = "00000000-0000-4000-8000-000000000001";

function json(res: ServerResponse, body: unknown) {
  res.writeHead(200, { "Content-Type": "application/json" });
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
  const server = createServer((req, res) => {
    if (req.url === "/me" && req.method === "GET") {
      json(res, meResponse(role));
      return;
    }
    if (req.url === `/workspaces/${workspaceId}/members`) {
      if (req.method !== "GET") {
        res.writeHead(405);
        res.end();
        return;
      }
      if (role !== "admin") {
        res.writeHead(403, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error_code: "authz_denied",
            message: "You do not have permission to perform this action.",
          }),
        );
        return;
      }
      json(res, {
        members: [
          {
            id: "00000000-0000-4000-8000-000000000030",
            user_id: "00000000-0000-4000-8000-000000000010",
            email: "admin@example.com",
            role: "admin",
            status: "active",
            created_at: "2026-04-28T00:00:00.000Z",
            deactivated_at: null,
          },
        ],
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
      url: "http://localhost:3000",
      sameSite: "Lax",
    },
  ]);
}

test("signed-out visitor is redirected away from protected home", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("signed-out visitor is redirected away from members page", async ({ page }) => {
  await page.goto("/members");
  await expect(page).toHaveURL(/\/sign-in/);
});

test("admin can access members page", async ({ context, page }) => {
  const server = await startMockApi("admin");
  try {
    await setSupabaseSessionCookie(context, "admin");
    await page.goto("/members");
    await expect(page.getByRole("heading", { name: "Workspace members" })).toBeVisible();
    await expect(page.getByText("admin@example.com")).toBeVisible();
  } finally {
    await stopMockApi(server);
  }
});

test("non-admin is redirected away from members page", async ({ context, page }) => {
  const server = await startMockApi("viewer");
  try {
    await setSupabaseSessionCookie(context, "viewer");
    await page.goto("/members");
    await expect(page).toHaveURL("http://localhost:3000/");
    await expect(page.getByText("Role:")).toBeVisible();
    await expect(page.getByText("viewer", { exact: true })).toBeVisible();
  } finally {
    await stopMockApi(server);
  }
});
