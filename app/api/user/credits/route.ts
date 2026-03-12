import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      const cUser = await currentUser();
      const email = cUser?.emailAddresses[0]?.emailAddress || `${userId}@placeholder.com`;
      user = await prisma.user.create({ data: { id: userId, email: email, credits: 50 } });
    }

    return NextResponse.json({ credits: user.credits });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
