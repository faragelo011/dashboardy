import { getProtectedMe } from "./data";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await getProtectedMe();
  return <div className="min-h-screen bg-white">{children}</div>;
}
