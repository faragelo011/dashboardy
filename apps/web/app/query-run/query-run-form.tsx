"use client";

import { useState, useTransition } from "react";
import { Play } from "lucide-react";

import { Button } from "@/components/ds/button";
import { DsIcon } from "@/components/ds/icon";

import {
  fetchFullQueryResultAction,
  runAdhocQueryAction,
  type FullQueryResultState,
  type RunQueryFormState,
} from "./actions";

const fieldClass =
  "w-full min-h-[200px] bg-[#111827] border border-white/10 px-4 py-3 text-[#F8FAFC] text-[13px] font-mono focus:outline-none focus:border-[#6366F1]/50 focus:bg-[#1F2937] focus:ring-1 focus:ring-[#6366F1]/30 transition-all rounded-sm placeholder:text-[#374151] disabled:opacity-50 disabled:cursor-not-allowed tracking-wide font-light";

const primaryButtonClass =
  "bg-[#6366F1] text-black px-6 py-3 text-[11px] uppercase tracking-[0.15em] font-medium hover:bg-[#818CF8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-center";

export function QueryRunForm() {
  const [state, setState] = useState<RunQueryFormState | null>(null);
  const [fullResult, setFullResult] = useState<FullQueryResultState | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isFullPending, startFullTransition] = useTransition();

  return (
    <div className="flex flex-col gap-8">
      <form
        data-query-run-form
        className="bg-[#111827] p-8 sm:p-12 border border-white/5 shadow-2xl relative overflow-hidden"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => {
            setFullResult(null);
            void runAdhocQueryAction(null, fd)
              .then(setState)
              .catch((err) => {
                setState({
                  ok: false,
                  message: err instanceof Error ? err.message : "Transport or runtime failure.",
                });
              });
          });
        }}
      >
        <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-[#6366F1] opacity-[0.02] blur-3xl pointer-events-none rounded-full" />
        <div className="relative z-10 flex flex-col gap-8">
          <label className="flex flex-col gap-3">
            <span className="text-[10px] uppercase tracking-[0.15em] text-[#374151]">
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
            <Button type="submit" variant="primary" disabled={isPending} leftIcon={<DsIcon icon={Play} />}>
              {isPending ? "Running…" : "Execute query"}
            </Button>
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
          <p className="text-[13px] font-light text-[#94A3B8] whitespace-pre-wrap">{state.message}</p>
        </div>
      ) : null}

      {state?.ok === true ? (
        <div className="flex flex-col gap-6">
          <div className="border border-[#6366F1]/30 bg-[#111827]/90 p-5 sm:p-6">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#6366F1] mb-4 font-medium">
              Execution summary
            </div>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-[10px] uppercase tracking-[0.15em] text-[#374151]">
                  meta.status
                </dt>
                <dd className="mt-1 font-mono text-sm text-white">{state.summary.status}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.15em] text-[#374151]">
                  meta.duration_ms
                </dt>
                <dd className="mt-1 font-mono text-sm text-white">{state.summary.duration_ms}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.15em] text-[#374151]">
                  meta.truncated
                </dt>
                <dd className="mt-1 font-mono text-sm text-white">
                  {state.summary.truncated ? "true" : "false"}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.15em] text-[#374151]">
                  meta.row_count / cache_hit
                </dt>
                <dd className="mt-1 font-mono text-sm text-white">
                  {state.summary.row_count} / {state.summary.cache_hit ? "true" : "false"}
                </dd>
              </div>
            </dl>
          </div>
          <div className="border border-white/10 bg-[#111827]/80 p-5 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#6366F1] font-medium">
                Result JSON (preview)
              </div>
              <button
                type="button"
                disabled={isFullPending}
                className="border border-[#6366F1]/40 px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-[#6366F1] hover:bg-[#6366F1]/10 transition-colors disabled:opacity-50"
                onClick={() => {
                  const form = document.querySelector<HTMLFormElement>(
                    "form[data-query-run-form]",
                  );
                  if (!form) return;
                  const fd = new FormData(form);
                  startFullTransition(() => {
                    void fetchFullQueryResultAction(null, fd)
                      .then(setFullResult)
                      .catch((err) => {
                        setFullResult({
                          ok: false,
                          message:
                            err instanceof Error
                              ? err.message
                              : "Failed to load full result.",
                        });
                      });
                  });
                }}
              >
                {isFullPending ? "Loading…" : "Load full result JSON"}
              </button>
            </div>
            <pre className="text-[11px] font-mono text-[#94A3B8] whitespace-pre-wrap overflow-x-auto max-h-[480px] overflow-y-auto leading-relaxed">
              {fullResult?.ok === true ? fullResult.rawJson : state.rawJson}
            </pre>
            {fullResult?.ok === false ? (
              <p className="text-[12px] text-[#EF4444] font-light" role="alert">
                {fullResult.message}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
