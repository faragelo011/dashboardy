"use client";

import { useState, useTransition } from "react";

import { runAdhocQueryAction, type RunQueryFormState } from "./actions";

const fieldClass =
  "w-full min-h-[200px] bg-[#0B0F15] border border-white/10 px-4 py-3 text-[#F0F2F5] text-[13px] font-mono focus:outline-none focus:border-[#D4AF37]/50 focus:bg-[#12161E] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all rounded-sm placeholder:text-[#5C6A7A] disabled:opacity-50 disabled:cursor-not-allowed tracking-wide font-light";

const primaryButtonClass =
  "bg-[#D4AF37] text-black px-6 py-3 text-[11px] uppercase tracking-[0.15em] font-medium hover:bg-[#FBE398] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-center";

export function QueryRunForm() {
  const [state, setState] = useState<RunQueryFormState | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-8">
      <form
        className="bg-[#0B0F15] p-8 sm:p-12 border border-white/5 shadow-2xl relative overflow-hidden"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => {
            void runAdhocQueryAction(null, fd).then(setState);
          });
        }}
      >
        <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-[#D4AF37] opacity-[0.02] blur-3xl pointer-events-none rounded-full" />
        <div className="relative z-10 flex flex-col gap-8">
          <label className="flex flex-col gap-3">
            <span className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A]">
              SQL statement
            </span>
            <textarea
              name="sql_text"
              required
              spellCheck={false}
              className={fieldClass}
              placeholder="SELECT 1 AS hello;"
              aria-invalid={!!state && !state.ok}
            />
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" disabled={isPending} className={primaryButtonClass}>
              {isPending ? "Running…" : "Execute query"}
            </button>
          </div>
        </div>
      </form>

      {state?.ok === false ? (
        <div
          className="border-l-2 border-[#EF4444] bg-[#EF4444]/5 p-5"
          role="alert"
          aria-live="polite"
        >
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#EF4444] mb-2 font-semibold">
            Execution failed
          </div>
          <p className="text-[13px] font-light text-[#A0AAB2] whitespace-pre-wrap">{state.message}</p>
        </div>
      ) : null}

      {state?.ok === true ? (
        <div className="flex flex-col gap-6">
          <div className="border border-[#D4AF37]/30 bg-[#0B0F15]/90 p-5 sm:p-6">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF37] mb-4 font-medium">
              Execution summary
            </div>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A]">
                  meta.status
                </dt>
                <dd className="mt-1 font-mono text-sm text-white">{state.summary.status}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A]">
                  meta.duration_ms
                </dt>
                <dd className="mt-1 font-mono text-sm text-white">{state.summary.duration_ms}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A]">
                  meta.truncated
                </dt>
                <dd className="mt-1 font-mono text-sm text-white">
                  {state.summary.truncated ? "true" : "false"}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.15em] text-[#5C6A7A]">
                  meta.row_count / cache_hit
                </dt>
                <dd className="mt-1 font-mono text-sm text-white">
                  {state.summary.row_count} / {state.summary.cache_hit ? "true" : "false"}
                </dd>
              </div>
            </dl>
          </div>
          <div className="border border-white/10 bg-[#0B0F15]/80 p-5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF37] mb-3 font-medium">
              Result JSON
            </div>
            <pre className="text-[11px] font-mono text-[#A0AAB2] whitespace-pre-wrap overflow-x-auto max-h-[480px] overflow-y-auto leading-relaxed">
              {state.rawJson}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
