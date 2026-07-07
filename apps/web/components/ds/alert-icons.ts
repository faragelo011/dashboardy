import {
  AlertTriangle,
  Check,
  CircleAlert,
  Info,
  Lock,
  type LucideIcon,
} from "lucide-react";

import type { AlertProps } from "./alert";

/** Default Lucide glyphs per alert tone (dot + label; icon reinforces meaning). */
export const ALERT_ICON_BY_TONE: Record<NonNullable<AlertProps["tone"]>, LucideIcon> = {
  info: Info,
  danger: CircleAlert,
  success: Check,
  warn: AlertTriangle,
};

/** Use for security / credential trust notes. */
export const ALERT_ICON_LOCK = Lock;
