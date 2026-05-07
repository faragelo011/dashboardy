import { NextResponse } from "next/server";

import { createServerSupabase } from "@/app/lib/supabase-server";

import { parseEmailOtpType, safeNextPath } from "./auth-callback-params";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNextPath(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const typeRaw = url.searchParams.get("type");
  const otpType = parseEmailOtpType(typeRaw);

  const supabase = await createServerSupabase();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url), { status: 303 });
    }
    return NextResponse.redirect(new URL(`/sign-in`, url), { status: 303 });
  }

  if (tokenHash && otpType) {
    const { error } = await supabase.auth.verifyOtp({
      type: otpType,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(new URL(next, url), { status: 303 });
    }
    return NextResponse.redirect(new URL(`/sign-in`, url), { status: 303 });
  }

  return NextResponse.redirect(new URL(`/sign-in`, url), { status: 303 });
}
