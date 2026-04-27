import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createServerSupabase } from "@/app/lib/supabase-server";

async function signOutAndRedirect(request: NextRequest) {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/sign-in", request.url), {
    status: 303,
  });
}

export async function GET() {
  return new NextResponse(null, { status: 405 });
}

export async function POST(request: NextRequest) {
  return signOutAndRedirect(request);
}
