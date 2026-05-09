import { redirect } from "next/navigation";

import { AdminLuxuryNav } from "@/app/admin-luxury-nav";
import { getProtectedMe } from "@/app/(protected)/data";
import { getWorkspaceConnection } from "@/app/lib/connections-api";
import { createServerSupabase } from "@/app/lib/supabase-server";

import { ConnectionsForm } from "./connections-form";
import { rotateConnectionAction, testConnectionAction } from "./actions";

const formatUtcDateTime = (value: string) =>
  new Intl.DateTimeFormat("en", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(new Date(value));

const statusPill = (status: string) => {
  switch (status) {
    case "active":
      return "border border-[#D4AF37]/50 text-[#D4AF37] bg-[#D4AF37]/10 shadow-[0_0_15px_rgba(212,175,55,0.1)]";
    case "pending_test":
      return "border border-white/30 text-[#F0F2F5] bg-white/5";
    case "test_failed":
      return "border border-[#EF4444]/50 text-[#EF4444] bg-[#EF4444]/10";
    default:
      return "border border-[#5C6A7A]/50 text-[#5C6A7A] bg-[#5C6A7A]/10";
  }
};

const fieldBoxyClass =
  "w-full bg-[#0B0F15] border border-white/10 px-4 py-3 text-[#F0F2F5] text-[13px] focus:outline-none focus:border-[#D4AF37]/50 focus:bg-[#12161E] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all rounded-sm placeholder:text-[#5C6A7A] disabled:opacity-50 disabled:cursor-not-allowed tracking-wide font-light";

const primaryButtonClass =
  "bg-[#D4AF37] text-black px-6 py-3 text-[11px] uppercase tracking-[0.15em] font-medium hover:bg-[#FBE398] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-center";

export default async function ConnectionsPage() {
  const me = await getProtectedMe();
  if (me.current_workspace.role !== "admin") {
    redirect("/");
  }

  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    redirect("/sign-in");
  }

  const workspaceId = me.current_workspace.workspace_id;
  let connection:
    | Awaited<ReturnType<typeof getWorkspaceConnection>>
    | null = null;
  let loadError: string | null = null;
  try {
    connection = await getWorkspaceConnection(token, workspaceId);
  } catch (err) {
    console.error("failed to load connection", { workspaceId, err });
    loadError = "Failed to load connection settings. Please refresh and try again.";
  }

  return (
    <div className="min-h-screen bg-[#06080A] text-[#F0F2F5] font-sans selection:bg-[#D4AF37]/30 selection:text-[#D4AF37]">
      <AdminLuxuryNav />
      <div className="mx-auto flex max-w-7xl flex-col gap-16 px-4 py-12 sm:px-8 lg:py-24 animate-fade-in">
        
        {/* Luxury Header */}
        <header className="flex flex-col gap-12 lg:flex-row lg:items-end lg:justify-between border-b border-white/10 pb-12">
          <div className="max-w-3xl space-y-6">
            <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#D4AF37]">
              Administrative Settings
            </p>
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-7xl font-serif text-white tracking-tight font-light leading-none">
                Data <span className="italic opacity-80">Connection</span>
              </h1>
              <p className="max-w-[55ch] text-sm lg:text-base leading-relaxed text-[#A0AAB2] font-light">
                Configure tenant connectivity metadata and deploy secure payload secrets. 
                Credentials reside exclusively within secure vaults post-transmission.
              </p>
            </div>
          </div>

          {connection ? (
            <div className="flex flex-col items-start lg:items-end gap-3 pt-8 lg:pt-0">
              <span
                className={`inline-flex items-center px-4 py-1.5 text-[10px] uppercase tracking-[0.2em] font-medium ${statusPill(
                  connection.status,
                )}`}
              >
                {connection.status.replace(/_/g, " ")}
              </span>
              <span className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A]">
                Namespace: <span className="text-white font-light lowercase font-mono">{me.current_workspace.workspace_name}</span>
              </span>
            </div>
          ) : null}
        </header>

        {loadError ? (
          <section className="border border-red-500/20 bg-red-500/5 p-6 animate-fade-in-up">
            <h2 className="text-[#EF4444] text-[11px] uppercase tracking-[0.15em] mb-2">System Error</h2>
            <p className="mt-1 text-sm text-[#A0AAB2] font-light">{loadError}</p>
          </section>
        ) : null}

        <section className="grid gap-12 lg:gap-24 lg:grid-cols-[1.2fr_0.8fr] animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          
          <div className="flex flex-col gap-16">
            <ConnectionsForm workspaceId={workspaceId} connection={connection} />

            {/* Connection Test Region */}
            <div className="bg-[#0B0F15] p-8 sm:p-12 border border-white/5 relative overflow-hidden group hover:border-white/10 transition-colors">
              <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between mb-10 border-b border-white/5 pb-8">
                <div>
                  <h2 className="text-2xl font-serif text-[#F0F2F5] tracking-wide font-light mb-2">Diagnostic Test</h2>
                  <p className="text-[11px] leading-5 text-[#A0AAB2] font-light max-w-[40ch]">
                    Execute bounded connectivity simulation. Upon verification, pending vaults are transposed to operational status.
                  </p>
                </div>
                <form action={testConnectionAction} className="shrink-0">
                  <input type="hidden" name="workspace_id" value={workspaceId} />
                  <button
                    className={`bg-transparent text-white border border-white/20 px-6 py-3 text-[11px] uppercase tracking-[0.15em] font-medium hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 hover:text-[#D4AF37] transition-all disabled:opacity-30 disabled:border-white/10 disabled:hover:bg-transparent disabled:hover:text-white disabled:cursor-not-allowed`}
                    disabled={!connection || connection.status === "not_configured"}
                  >
                    Execute Diagnosis
                  </button>
                </form>
              </div>

              <dl className="grid gap-8 sm:grid-cols-2">
                <div className="relative group/dl">
                  <dt className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#5C6A7A] mb-2 group-hover/dl:text-[#D4AF37] transition-colors">
                    Last Execution
                  </dt>
                  <dd className="text-[13px] font-mono font-light text-[#F0F2F5]">
                    {connection?.last_tested_at
                      ? formatUtcDateTime(connection.last_tested_at)
                      : "— Awaiting Initialization —"}
                  </dd>
                </div>
                <div className="relative group/dl">
                  <dt className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#5C6A7A] mb-2 group-hover/dl:text-[#D4AF37] transition-colors">
                    Last Successful
                  </dt>
                  <dd className="text-[13px] font-mono font-light text-[#F0F2F5]">
                    {connection?.last_successful_test_at
                      ? formatUtcDateTime(connection.last_successful_test_at)
                      : "— None —"}
                  </dd>
                </div>
              </dl>

              {connection?.last_error ? (
                <div className="mt-8 border-l-2 border-[#EF4444] bg-[#EF4444]/5 p-5">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[#EF4444] mb-2 font-semibold">Diagnosis Failure</div>
                  <p className="whitespace-pre-wrap leading-relaxed text-[11px] font-mono text-[#A0AAB2]">{connection.last_error}</p>
                </div>
              ) : null}
            </div>

            {/* Credential Rotation */}
            <div className="bg-[#0B0F15] p-8 sm:p-12 border border-white/5 relative">
              <header className="mb-10 pb-8 border-b border-white/5">
                <h2 className="text-2xl font-serif text-[#F0F2F5] tracking-wide font-light mb-2">Vault Rotation Protocol</h2>
                <p className="text-[11px] leading-5 text-[#A0AAB2] font-light max-w-[60ch]">
                  Rotation processes are test-gated. New secret keys transition to active exclusively post <span className="text-white italic">Execution Diagnosis</span>. Provide singular authentication (password OR pem key).
                </p>
              </header>

              <form action={rotateConnectionAction}>
                <input type="hidden" name="workspace_id" value={workspaceId} />
                
                <div className="grid gap-8 md:grid-cols-2">
                  <label className="flex flex-col gap-3 group/input">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A] group-focus-within/input:text-[#D4AF37] transition-colors">Tenant Account</span>
                    <input
                      name="rotate_account"
                      className={fieldBoxyClass}
                      placeholder="acme.us-east-1"
                      autoComplete="off"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-3 group/input">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A] group-focus-within/input:text-[#D4AF37] transition-colors">Execution Role</span>
                    <input
                      name="rotate_role"
                      className={fieldBoxyClass}
                      placeholder="SYSADMIN"
                      autoComplete="off"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-3 group/input md:col-span-2">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A] group-focus-within/input:text-[#D4AF37] transition-colors">Service Username</span>
                    <input
                      name="rotate_username"
                      className={fieldBoxyClass}
                      placeholder="service_user"
                      autoComplete="off"
                      required
                    />
                  </label>
                  
                  <div className="md:col-span-2 pt-6 my-2 border-t border-white/5 relative">
                    <span className="absolute -top-3 left-0 bg-[#0B0F15] px-2 text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A]">Password Auth</span>
                  </div>

                  <label className="flex flex-col gap-3 group/input md:col-span-2">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A] group-focus-within/input:text-[#D4AF37] transition-colors">Target Password</span>
                    <input
                      name="rotate_password"
                      type="password"
                      className={fieldBoxyClass}
                      placeholder="Leave empty if delegating to key-pair protocol..."
                      autoComplete="new-password"
                    />
                  </label>

                  <div className="md:col-span-2 pt-6 my-2 border-t border-white/5 relative">
                    <span className="absolute -top-3 left-0 bg-[#0B0F15] px-2 text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A]">Key-Pair Auth</span>
                  </div>

                  <label className="flex flex-col gap-3 group/input md:col-span-2">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A] group-focus-within/input:text-[#D4AF37] transition-colors">New Key Payload (PEM)</span>
                    <textarea
                      name="rotate_private_key_pem"
                      rows={5}
                      className={`${fieldBoxyClass} font-mono text-[11px] resize-none leading-relaxed placeholder:font-sans`}
                      placeholder="— BEGIN PRIVATE KEY —\nPaste payload block here..."
                      autoComplete="off"
                    />
                  </label>
                  <label className="flex flex-col gap-3 group/input md:col-span-2">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A] group-focus-within/input:text-[#D4AF37] transition-colors">PEM Passphrase <span className="opacity-50">(Encrypted variants)</span></span>
                    <input
                      name="rotate_private_key_passphrase"
                      type="password"
                      className={fieldBoxyClass}
                      placeholder="Enter decryption secret if applicable..."
                      autoComplete="new-password"
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-t border-white/5 pt-8 mt-8">
                  <p className="text-[10px] uppercase tracking-[0.05em] leading-5 text-[#5C6A7A] font-medium max-w-[45ch]">
                    Status reverts to <span className="text-white italic">pending test</span> on submission. Failure retains the former credential set.
                  </p>
                  <button
                    className={primaryButtonClass}
                    disabled={!connection || connection.status === "not_configured"}
                  >
                    Commit Rotation
                  </button>
                </div>
              </form>
            </div>
            
          </div>

          {/* Sidebar / Instructions */}
          <aside className="relative py-8 lg:py-12 px-2 flex flex-col justify-start">
            <div className="hidden lg:block absolute left-[-48px] top-4 bottom-4 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>
            
            <h2 className="text-2xl font-serif font-light text-white mb-10">Procedural Flow</h2>
            <ol className="space-y-8 text-[13px] font-light text-[#A0AAB2] leading-relaxed relative border-l border-white/10 ml-[2px] pl-6 pb-2">
              <li className="relative">
                <span className="absolute -left-[30px] top-1 w-2.5 h-2.5 rounded-full bg-[#12161E] border border-white/30" />
                <span className="text-[#D4AF37] block text-[10px] uppercase tracking-[0.15em] mb-1">Phase Alpha</span>
                Store organizational definitions and initial secret keys. Framework shifts to <span className="text-white">Pending Test</span> state.
              </li>
              <li className="relative">
                <span className="absolute -left-[30px] top-1 w-2.5 h-2.5 rounded-full bg-[#12161E] border border-[#D4AF37]" />
                <span className="text-[#D4AF37] block text-[10px] uppercase tracking-[0.15em] mb-1">Phase Beta</span>
                Run diagnostic simulation. Actuates the provided tokens and confirms systemic handshake.
              </li>
              <li className="relative">
                <span className="absolute -left-[30px] top-1 w-2.5 h-2.5 rounded-full bg-[#12161E] border border-white/30" />
                <span className="text-[#D4AF37] block text-[10px] uppercase tracking-[0.15em] mb-1">Phase Gamma</span>
                Review telemetry. Unsuccessful binds produce sanitized error strings void of critical secrets.
              </li>
            </ol>

            <div className="mt-12 bg-[#D4AF37]/5 border border-[#D4AF37]/10 p-5 w-full">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF37] mb-2 font-medium">Security Notice</div>
              <p className="text-[11px] leading-5 text-[#A0AAB2] font-light">
                Secure values operate on an ingest-only paradigm. Secret strings are expunged from all presentation layers immediately following submission payloads, ensuring zero-trust visibility.
              </p>
            </div>
          </aside>

        </section>
      </div>
    </div>
  );
}
