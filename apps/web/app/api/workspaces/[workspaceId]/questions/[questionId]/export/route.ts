import { NextResponse, type NextRequest } from "next/server";

import { ApiError } from "@/app/lib/connections-api";
import { exportSavedQuestionCsv } from "@/app/lib/questions-api";
import { createServerSupabase } from "@/app/lib/supabase-server";

type RouteContext = {
  params: {
    workspaceId: string;
    questionId: string;
  };
};

export async function GET(request: NextRequest, context: RouteContext) {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    return NextResponse.json(
      { error_code: "authz_denied", message: "Unauthorized." },
      { status: 401 },
    );
  }

  const { workspaceId, questionId } = context.params;
  const parameters: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    if (key.startsWith("parameters[") && key.endsWith("]")) {
      const name = key.slice("parameters[".length, -1);
      if (name) {
        parameters[name] = value;
      }
    }
  });

  try {
    const blob = await exportSavedQuestionCsv(token, workspaceId, questionId, {
      parameters,
      bypass_cache: request.nextUrl.searchParams.get("bypass_cache") === "true",
    });
    return new NextResponse(blob, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${questionId}.csv"`,
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error_code: err.errorCode, message: err.message },
        { status: err.status },
      );
    }
    return NextResponse.json(
      { message: "Failed to export saved question." },
      { status: 500 },
    );
  }
}
