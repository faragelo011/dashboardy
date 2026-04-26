export default function Home() {
  const apiUrl = process.env.NEXT_PUBLIC_API_PUBLIC_URL ?? "(unset)";
  return (
    <main className="p-8 text-lg">
      <h1 className="text-2xl font-semibold">Dashboardy</h1>
      <p className="text-sm text-gray-500">API: {apiUrl}</p>
    </main>
  );
}
