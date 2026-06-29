import { AdminLuxuryNav } from "@/app/admin-luxury-nav";
import { getProtectedMe } from "./data";
import { WorkspaceBadge } from "./workspace-badge";

export default async function ProtectedHomePage() {
  const me = await getProtectedMe();
  
  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#F8FAFC] font-sans selection:bg-[#6366F1]/30 selection:text-[#6366F1] relative overflow-hidden">
      <AdminLuxuryNav />
      {/* Background Decor */}
      <div className="absolute top-0 right-0 -mr-40 -mt-20 w-[600px] h-[600px] bg-[#6366F1] opacity-[0.02] blur-[100px] pointer-events-none rounded-full" />
      
      <main className="mx-auto flex max-w-7xl flex-col px-4 py-12 sm:px-8 lg:py-24 animate-fade-in relative z-10">
        
        <header className="mb-16 border-b border-white/10 pb-12 flex flex-col items-start gap-4">
          <WorkspaceBadge workspace={me.current_workspace} />
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#6366F1]">
            Command Center
          </p>
          <h1 className="text-5xl lg:text-7xl font-serif text-white tracking-tight font-light leading-none">
            Dashboardy
          </h1>
          <p className="text-sm lg:text-base leading-relaxed text-[#94A3B8] font-light max-w-[50ch] mt-4">
            Welcome to your executive operational console. Additional analytics and visualization modules will be provisioned here shortly.
          </p>
        </header>

        <section className="bg-[#111827] border border-white/5 shadow-2xl p-8 sm:p-12 relative group/card">
          <div className="absolute top-0 left-0 w-12 h-px bg-gradient-to-r from-[#6366F1]/50 to-transparent" />
          
          <h2 className="text-2xl font-serif text-[#F8FAFC] tracking-wide font-light mb-8">
            Current Session Context
          </h2>
          
          <dl className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-2">
              <dt className="text-[10px] uppercase tracking-[0.2em] text-[#374151]">Namespace</dt>
              <dd className="text-lg font-mono font-light text-white">{me.current_workspace.workspace_name}</dd>
            </div>
            
            <div className="flex flex-col gap-2">
              <dt className="text-[10px] uppercase tracking-[0.2em] text-[#374151]">Clearance Level</dt>
              <dt className="sr-only">Role:</dt>
              <dd className="text-lg font-light text-white capitalize">{me.current_workspace.role}</dd>
            </div>

            <div className="flex flex-col gap-2">
              <dt className="text-[10px] uppercase tracking-[0.2em] text-[#374151]">Identity Anchor</dt>
              <dd className="text-sm font-light text-[#94A3B8] mt-1 truncate">{me.user.email}</dd>
            </div>
            
            <div className="flex flex-col gap-2">
              <dt className="text-[10px] uppercase tracking-[0.2em] text-[#374151]">Authorization Status</dt>
              <dd className="text-xs uppercase tracking-widest text-[#6366F1] font-medium mt-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#6366F1] shadow-[0_0_8px_rgba(212,175,55,0.6)] mr-2" />
                {me.current_workspace.membership_status}
              </dd>
            </div>
          </dl>

          <form action="/sign-out" method="post" className="mt-16 pt-8 border-t border-white/10">
            <button
              type="submit"
              className="text-[#EF4444] hover:text-white transition-colors text-[10px] uppercase tracking-[0.15em] bg-transparent border border-[#EF4444]/30 px-6 py-3 hover:bg-[#EF4444]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Terminate Session
            </button>
          </form>
        </section>

      </main>
    </div>
  );
}
