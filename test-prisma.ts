import { prisma } from './lib/prisma';

async function main() {
  try {
    const user = await prisma.user.count();
    console.log("Users count:", user);
  } catch (e) {
    console.error("Prisma Error:", e);
  }
}
main();
