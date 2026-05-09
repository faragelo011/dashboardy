import Link from "next/link";

import { getProtectedMe } from "./data";
import { WorkspaceBadge } from "./workspace-badge";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // We can retain getProtectedMe check here to ensure only protected users access this branch
  await getProtectedMe();
  
  return <>{children}</>;
}

