import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createServerSupabase } from "@/app/lib/supabase-server";

async function signOutAndRedirect(request: NextRequest) {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/sign-in", request.url));
}

export async function GET(request: NextRequest) {
  return signOutAndRedirect(request);
}

export async function POST(request: NextRequest) {
  return signOutAndRedirect(request);
}
