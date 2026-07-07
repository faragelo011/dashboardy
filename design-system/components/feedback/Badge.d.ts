import * as React from "react";

/**
 * Badge — compact status pill with a leading dot. Status is conveyed by dot +
 * label, never color alone. Maps to connection status (`active`→ok,
 * `pending_test`→warn, `test_failed`→danger, `not_configured`→idle) and
 * execution outcomes.
 *
 * @startingPoint section="Feedback" subtitle="Status badges — ok / warn / danger / info / idle" viewport="700x120"
 */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Status tone. @default "neutral" */
  tone?: "neutral" | "ok" | "warn" | "danger" | "info" | "idle";
  /** Show the leading status dot. @default true */
  dot?: boolean;
  children?: React.ReactNode;
}

export function Badge(props: BadgeProps): JSX.Element;
