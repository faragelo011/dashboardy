export async function register() {
  const required = ["API_PUBLIC_URL"];
  const missing = required.filter((key) => !process.env[key] || process.env[key] === "");

  if (missing.length) {
    for (const name of missing) {
      process.stderr.write(`Missing required environment variable: ${name}\n`);
    }
    process.exit(2);
  }
}
