import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "./utils/supabase/middleware";

export function middleware(request: NextRequest) {
  const response = createClient(request);
  return response ?? NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
