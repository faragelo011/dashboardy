export const dynamic = "force-static";

export default function NotFound() {
  return (
    <main className="p-8 text-lg">
      <h1 className="text-2xl font-semibold">Not found</h1>
      <p className="text-sm text-gray-500">The requested page does not exist.</p>
    </main>
  );
}
