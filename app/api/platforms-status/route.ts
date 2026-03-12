import { NextResponse } from "next/server";
import { getConfiguredPlatforms } from "@/lib/publishToPlatform";

export async function GET() {
  return NextResponse.json(getConfiguredPlatforms());
}
