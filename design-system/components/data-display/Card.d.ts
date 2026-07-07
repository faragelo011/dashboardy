import * as React from "react";

/**
 * Card — flat, border-defined surface. Holds forms, panels, list rows, and
 * widgets. No drop shadow; elevation comes from borders + surface tints.
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Use the sunken (app-canvas) background instead of the raised card tint. */
  inset?: boolean;
  /** Dashed border (empty / placeholder panels). */
  dashed?: boolean;
  /** Interior padding. @default "md" */
  padding?: "none" | "sm" | "md" | "lg";
  /** Optional header title. */
  title?: React.ReactNode;
  /** Optional header actions (right-aligned). */
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function Card(props: CardProps): JSX.Element;
