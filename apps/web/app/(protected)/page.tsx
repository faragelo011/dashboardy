import { getProtectedMe } from "./data";

export default async function ProtectedHomePage() {
  const me = await getProtectedMe();
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Dashboardy</h1>
      <p className="mt-2 text-sm text-gray-600">
        Workspace: <span className="font-medium">{me.current_workspace.workspace_name}</span>
      </p>
      <p className="text-sm text-gray-600">
        Role: <span className="font-medium">{me.current_workspace.role}</span> — status:{" "}
        <span className="font-medium">{me.current_workspace.membership_status}</span>
      </p>
      <p className="mt-4 text-xs text-gray-400">Signed in as {me.user.email}</p>
      <p className="mt-6">
        <form action="/sign-out" method="post">
          <button
            type="submit"
            className="text-sm text-blue-600 underline disabled:opacity-50"
          >
            Sign out
          </button>
        </form>
      </p>
    </main>
  );
}
