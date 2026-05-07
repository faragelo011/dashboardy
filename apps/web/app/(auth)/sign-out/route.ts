import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createServerSupabase } from "@/app/lib/supabase-server";

function requestOrigin(request: NextRequest): string {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const proto = forwardedProto?.split(",")[0]?.trim() || request.nextUrl.protocol.replace(":", "");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost?.split(",")[0]?.trim() || request.headers.get("host") || request.nextUrl.host;
  return `${proto}://${host}`;
}

async function signOutAndRedirect(request: NextRequest) {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/sign-in", requestOrigin(request)), {
    status: 303,
  });
}

export async function GET() {
  return new NextResponse(null, { status: 405 });
}

export async function POST(request: NextRequest) {
  return signOutAndRedirect(request);
}
