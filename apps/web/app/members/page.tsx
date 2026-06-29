import { redirect } from "next/navigation";

import { AdminLuxuryNav } from "@/app/admin-luxury-nav";
import { getProtectedMe } from "@/app/(protected)/data";
import { listExternalAssetGrants } from "@/app/lib/asset-grants-api";
import { listWorkspaceMembers } from "@/app/lib/members-api";
import { createServerSupabase } from "@/app/lib/supabase-server";

import {
  createAssetGrantAction,
  deactivateMemberAction,
  deleteAssetGrantAction,
  updateMemberRoleAction,
} from "./actions";
import { ProvisionMemberForm } from "./provision-member-form";

const roleOptions = [
  ["admin", "Admin", "Manage workspace access and settings."],
  ["analyst", "Analyst", "Explore dashboards and reporting data."],
  ["viewer", "Viewer", "View shared dashboards and answers."],
  ["external_client", "External client", "Access only granted assets."],
] as const;

// Luxury Aesthetic Form Fields & Buttons
const fieldClass =
  "w-full bg-transparent border-b border-white/20 px-0 py-2 text-[#F8FAFC] text-sm focus:outline-none focus:border-[#6366F1] focus:ring-0 transition-colors rounded-none placeholder:text-[#374151] focus:bg-transparent disabled:opacity-50 disabled:cursor-not-allowed";

const primaryButtonClass =
  "bg-[#6366F1] text-black px-6 py-3 text-[11px] uppercase tracking-[0.15em] font-medium hover:bg-[#818CF8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-center";

const quietButtonClass =
  "text-[#94A3B8] hover:text-[#6366F1] transition-colors text-[10px] uppercase tracking-[0.15em] bg-transparent border border-white/10 px-4 py-3 hover:border-[#6366F1]/50 disabled:opacity-50 disabled:cursor-not-allowed block text-center min-w-max";

const dangerButtonClass =
  "text-[#EF4444] hover:text-white transition-colors text-[10px] uppercase tracking-[0.15em] bg-transparent border border-[#EF4444]/30 px-4 py-3 hover:bg-[#EF4444]/30 disabled:opacity-50 disabled:cursor-not-allowed block text-center min-w-max";

const roleLabel = (role: string) =>
  roleOptions.find(([value]) => value === role)?.[1] ?? role;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));

export default async function MembersPage() {
  const me = await getProtectedMe();
  if (me.current_workspace.role !== "admin") {
    redirect("/");
  }

  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  const tokenAvailable = Boolean(token);

  const workspaceId = me.current_workspace.workspace_id;
  let members: Awaited<ReturnType<typeof listWorkspaceMembers>>["members"] = [];
  let grants: Awaited<
    ReturnType<typeof listExternalAssetGrants>
  >["grants"] = [];
  let grantsLoadSuccess = false;
  let loadError: string | null = null;
  if (!tokenAvailable) {
    loadError = "Unable to load session token. Please refresh and try again.";
  } else {
    try {
      const resp = await listWorkspaceMembers(token as string, workspaceId);
      members = resp.members;
      const grantsResp = await listExternalAssetGrants(token as string, workspaceId);
      grants = grantsResp.grants;
      grantsLoadSuccess = true;
    } catch (err) {
      console.error("failed to load members or grants", { workspaceId, err });
      loadError = "Failed to load members or grants. Please try again.";
    }
  }

  const activeMembers = members.filter((member) => member.status === "active");
  const inactiveMembers = members.filter((member) => member.status !== "active");
  const externalClients = members.filter(
    (member) => member.role === "external_client" && member.status === "active",
  );
  const adminCount = activeMembers.filter((member) => member.role === "admin").length;
  const analystCount = activeMembers.filter(
    (member) => member.role === "analyst",
  ).length;
  const viewerCount = activeMembers.filter((member) => member.role === "viewer").length;

  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#F8FAFC] font-sans selection:bg-[#6366F1]/30 selection:text-[#6366F1]">
      <AdminLuxuryNav />
      <div className="mx-auto flex max-w-7xl flex-col gap-16 px-4 py-12 sm:px-8 lg:py-24 animate-fade-in">
        
        {/* Luxury Header */}
        <header className="flex flex-col gap-12 lg:flex-row lg:items-end lg:justify-between border-b border-white/10 pb-12">
          <div className="max-w-3xl space-y-6">
            <h1 className="sr-only">Workspace members</h1>
            <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#6366F1]">
              Workspace Directory
            </p>
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-7xl font-serif text-white tracking-tight font-light leading-none">
                Access <span className="italic opacity-80">&</span> Control
              </h1>
              <p className="max-w-[45ch] text-sm lg:text-base leading-relaxed text-[#94A3B8] font-light">
                Manage executive delegates and oversee external asset distribution for{" "}
                <span className="text-white font-normal underline decoration-[#6366F1] decoration-1 underline-offset-4">
                  {me.current_workspace.workspace_name}
                </span>.
              </p>
            </div>
          </div>

          <dl className="flex gap-16 shrink-0 pt-8 lg:pt-0">
            <div className="relative group">
              <dt className="text-[10px] uppercase tracking-[0.2em] text-[#374151] mb-2">Admins</dt>
              <dd className="text-4xl font-serif font-light text-white group-hover:text-[#6366F1] transition-colors">{adminCount.toString().padStart(2, '0')}</dd>
            </div>
            <div className="relative group">
              <dt className="text-[10px] uppercase tracking-[0.2em] text-[#374151] mb-2">Analysts</dt>
              <dd className="text-4xl font-serif font-light text-white group-hover:text-[#6366F1] transition-colors">{analystCount.toString().padStart(2, '0')}</dd>
            </div>
            <div className="relative group">
              <dt className="text-[10px] uppercase tracking-[0.2em] text-[#374151] mb-2">Viewers</dt>
              <dd className="text-4xl font-serif font-light text-white group-hover:text-[#6366F1] transition-colors">{viewerCount.toString().padStart(2, '0')}</dd>
            </div>
          </dl>
        </header>

        {loadError ? (
          <section className="border border-red-500/20 bg-red-500/5 p-6 animate-fade-in-up">
            <h2 className="text-[#EF4444] text-[11px] uppercase tracking-[0.15em] mb-2">System Error</h2>
            <p className="mt-1 text-sm text-[#94A3B8] font-light">{loadError}</p>
          </section>
        ) : null}

        <section className="grid gap-12 lg:gap-24 lg:grid-cols-[1.2fr_0.8fr] animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          
          <ProvisionMemberForm
            workspaceId={workspaceId}
            fieldClass={fieldClass}
            primaryButtonClass={primaryButtonClass}
            roleOptions={roleOptions}
          />

          <aside className="relative py-8 lg:py-12 px-2 flex flex-col justify-center">
            {/* Minimalist vertical divider for large screens */}
            <div aria-hidden="true" className="hidden lg:block absolute left-[-48px] top-4 bottom-4 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>
            
            <h2 className="text-2xl font-serif font-light text-white mb-10">Directory Overview</h2>
            <dl className="space-y-6">
              <div className="flex items-end justify-between border-b border-white/5 pb-4 group">
                <dt className="text-[11px] uppercase tracking-[0.15em] text-[#374151] group-hover:text-[#6366F1] transition-colors">Active Members</dt>
                <dd className="font-serif text-lg font-light">{activeMembers.length}</dd>
              </div>
              <div className="flex items-end justify-between border-b border-white/5 pb-4 group">
                <dt className="text-[11px] uppercase tracking-[0.15em] text-[#374151] group-hover:text-[#6366F1] transition-colors">Inactive Accounts</dt>
                <dd className="font-serif text-lg font-light text-[#374151]">{inactiveMembers.length}</dd>
              </div>
              <div className="flex items-end justify-between border-b border-white/5 pb-4 group">
                <dt className="text-[11px] uppercase tracking-[0.15em] text-[#374151] group-hover:text-[#6366F1] transition-colors">External Partners</dt>
                <dd className="font-serif text-lg font-light">{externalClients.length}</dd>
              </div>
            </dl>
            
            <p className="mt-8 text-[11px] leading-5 text-[#374151] max-w-[40ch] font-light italic">
              * Redundancy protocol: Ensure a minimum of two active administrators to maintain uninterrupted governance mapping.
            </p>
          </aside>
        </section>

        {/* Member Roster */}
        <section className="mt-8 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-end justify-between mb-8 pb-4 border-b border-white/10">
            <h2 className="text-2xl font-serif text-white font-light">
              Executive Roster
            </h2>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#374151]">
              Capacity: {members.length} {members.length === 1 ? 'delegate' : 'delegates'}
            </span>
          </div>

          <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(130px,0.6fr)_minmax(100px,0.4fr)_minmax(110px,0.4fr)_minmax(150px,0.6fr)] gap-4 px-6 text-[10px] uppercase tracking-[0.15em] text-[#374151] md:grid pb-4">
            <div>Identity</div>
            <div>Clearance Level</div>
            <div>Status</div>
            <div>Enlistment Date</div>
            <div className="text-right">Governance Actions</div>
          </div>

          <div className="flex flex-col gap-2">
            {members.map((member, i) => {
              const isActive = member.status === "active";
              return (
                <div
                  key={member.id}
                  className="bg-[#111827] hover:bg-[#1F2937] border border-white/5 hover:border-[#6366F1]/20 transition-all duration-300 grid gap-6 p-6 md:grid-cols-[minmax(0,1.4fr)_minmax(130px,0.6fr)_minmax(100px,0.4fr)_minmax(110px,0.4fr)_minmax(150px,0.6fr)] md:items-center md:gap-4 md:px-6 relative group animate-fade-in-up"
                  style={{ animationDelay: `${250 + i * 50}ms` }}
                >
                  {/* Decorative line on hover */}
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#6366F1] scale-y-0 group-hover:scale-y-100 transition-transform origin-center duration-300" />
                  
                  <div className="min-w-0 pr-4">
                    <div className="text-sm font-light text-white truncate group-hover:text-[#818CF8] transition-colors">{member.email}</div>
                    <div className="mt-2 text-[10px] tracking-wider text-[#374151] uppercase">
                      ID: {member.user_id.split('-')[0]}•••
                    </div>
                  </div>

                  <form
                    action={updateMemberRoleAction}
                    className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] md:block"
                  >
                    <input type="hidden" name="workspace_id" value={workspaceId} />
                    <input type="hidden" name="membership_id" value={member.id} />
                    <select
                      name="role"
                      defaultValue={member.role}
                      className={`${fieldClass} text-[12px] font-light pb-1`}
                      disabled={!isActive}
                    >
                      {roleOptions.map(([value, label]) => (
                        <option key={value} value={value} className="bg-[#111827] text-white">
                          {label}
                        </option>
                      ))}
                    </select>
                    <button
                      className={`${quietButtonClass} md:mt-3 md:w-full`}
                      disabled={!isActive}
                    >
                      Apply Shift
                    </button>
                  </form>

                  <div>
                    <span
                      className={
                        isActive
                          ? "inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.1em] text-[#6366F1]"
                          : "inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.1em] text-[#374151]"
                      }
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#6366F1] shadow-[0_0_8px_rgba(212,175,55,0.6)]' : 'bg-[#374151]'}`} />
                      {isActive ? "Operational" : "Revoked"}
                    </span>
                  </div>

                  <div className="text-[11px] font-light text-[#94A3B8]">
                    {formatDate(member.created_at)}
                  </div>

                  <form action={deactivateMemberAction} className="md:flex md:justify-end">
                    <input type="hidden" name="workspace_id" value={workspaceId} />
                    <input type="hidden" name="membership_id" value={member.id} />
                    <button className={`${dangerButtonClass}`} disabled={!isActive}>
                      Terminate
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        </section>

        {/* Asset Grants */}
        <section className="mt-8 border-t border-white/10 pt-16 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <div className="grid gap-16 lg:grid-cols-[1fr_1.5fr]">
            
            <div className="space-y-8">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#374151] mb-3">
                  External Distribution
                </p>
                <h2 className="text-3xl font-serif text-white font-light mb-4">
                  Asset Grants
                </h2>
                <p className="text-sm font-light text-[#94A3B8] leading-relaxed max-w-[40ch]">
                  Provision specific intelligence assets selectively. Executable only after a partner has been assigned an External clearance level.
                </p>
              </div>

              <form
                action={createAssetGrantAction}
                className="bg-[#111827] p-8 border border-white/5 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#6366F1] opacity-[0.02] blur-2xl" />
                
                <input type="hidden" name="workspace_id" value={workspaceId} />
                
                <div className="space-y-8">
                  <label className="block">
                    <span className="block text-[10px] uppercase tracking-[0.15em] text-[#374151] mb-3">Select Partner</span>
                    <select
                      name="user_id"
                      required
                      className={fieldClass}
                      defaultValue=""
                      disabled={externalClients.length === 0}
                    >
                      <option value="" disabled className="bg-[#111827]">
                        {externalClients.length === 0
                          ? "— Awaiting external partner registration —"
                          : "Select registered partner"}
                      </option>
                      {externalClients.map((member) => (
                        <option key={member.id} value={member.user_id} className="bg-[#111827] text-[#F8FAFC]">
                          {member.email} ({roleLabel(member.role)})
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="grid gap-8 sm:grid-cols-2">
                    <label className="block">
                      <span className="block text-[10px] uppercase tracking-[0.15em] text-[#374151] mb-3">Asset Classification</span>
                      <select
                        name="asset_type"
                        className={fieldClass}
                        defaultValue="dashboard"
                      >
                        <option value="dashboard" className="bg-[#111827] text-[#F8FAFC]">Visual Dashboard</option>
                        <option value="question" className="bg-[#111827] text-[#F8FAFC]">Specific Intelligence</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="block text-[10px] uppercase tracking-[0.15em] text-[#374151] mb-3">Extraction Ability</span>
                      <div className="flex h-[36px] items-center gap-4">
                        <label className="relative flex cursor-pointer items-center p-0 gap-4">
                          <input
                            name="can_export"
                            type="checkbox"
                            className="peer cursor-pointer appearance-none rounded-sm border border-white/30 w-4 h-4 checked:bg-[#6366F1] checked:border-[#6366F1] transition-all"
                          />
                          <span className="text-sm font-light text-[#94A3B8]">Authorize download</span>
                        </label>
                      </div>
                    </label>
                  </div>

                  <label className="block">
                    <span className="block text-[10px] uppercase tracking-[0.15em] text-[#374151] mb-3">Asset UUID Key</span>
                    <input
                      name="asset_id"
                      required
                      pattern="^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
                      title="Enter a UUID like 00000000-0000-4000-8000-000000000000"
                      className={`${fieldClass} font-mono tracking-widest text-xs`}
                      placeholder="00000000-0000-4000-8000-000000000000"
                    />
                  </label>

                  <button
                    className={`w-full mt-4 ${primaryButtonClass}`}
                    disabled={externalClients.length === 0}
                  >
                    Authorize Distribution
                  </button>
                </div>
              </form>
            </div>

            <div className="pt-8 lg:pt-14 relative">
              <div aria-hidden="true" className="hidden lg:block absolute left-[-2rem] top-14 bottom-4 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>
              
              <div className="hidden grid-cols-[minmax(0,1.2fr)_100px_90px_auto] gap-4 mb-4 pb-4 border-b border-white/5 text-[10px] uppercase tracking-[0.15em] text-[#374151] md:grid">
                <div>Asset Signature</div>
                <div>Class</div>
                <div>Extraction</div>
                <div className="text-right">Action</div>
              </div>

              <div className="flex flex-col gap-2">
                {grants.map((grant) => (
                  <div
                    key={grant.id}
                    className="group bg-[#111827] p-5 border border-white/5 hover:border-white/10 transition-colors grid gap-4 md:grid-cols-[minmax(0,1.2fr)_100px_90px_auto] md:items-center"
                  >
                    <div className="min-w-0">
                      <div className="mb-2 text-[9px] uppercase tracking-[0.15em] text-[#374151] md:hidden">Asset Signature</div>
                      <div className="font-mono text-xs text-white truncate">{grant.asset_id}</div>
                      <div className="mt-1 text-[10px] tracking-wider text-[#94A3B8]">USER REF: {grant.user_id.split('-')[0]}...</div>
                    </div>
                    <div className="flex justify-between items-center md:block">
                      <span className="text-[9px] uppercase tracking-[0.15em] text-[#374151] md:hidden">Class</span>
                      <span className="text-[11px] font-light text-white capitalize">{grant.asset_type}</span>
                    </div>
                    <div className="flex justify-between items-center md:block">
                      <span className="text-[9px] uppercase tracking-[0.15em] text-[#374151] md:hidden">Extraction</span>
                      <span className="text-[11px] font-light text-[#94A3B8]">{grant.can_export ? "Auth" : "Deny"}</span>
                    </div>
                    <form action={deleteAssetGrantAction} className="mt-2 md:mt-0 md:text-right">
                      <input type="hidden" name="workspace_id" value={workspaceId} />
                      <input type="hidden" name="grant_id" value={grant.id} />
                      <button className="text-[10px] uppercase tracking-[0.15em] text-[#EF4444] hover:text-[#FF6B6B] transition-colors border-b border-[#EF4444]/30 hover:border-[#FF6B6B] pb-[1px]">
                        Revoke
                      </button>
                    </form>
                  </div>
                ))}

                {grantsLoadSuccess && grants.length === 0 ? (
                  <div className="py-16 text-center border border-dashed border-white/10">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#374151]">Awaiting Submissions</p>
                    <p className="mt-4 text-xs text-[#94A3B8] font-light max-w-[40ch] mx-auto italic">
                      No external distributions have been authorized at this time. Use the form to assign intelligence access.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
