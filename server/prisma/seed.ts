import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("[INFO] Seeding Sentinel baseline data...");

  // Create demo admin user
  const hashedPassword = await bcrypt.hash("sentinel123", 10);
  const user = await prisma.user.upsert({
    where: { email: "admin@sentinel.dev" },
    update: {},
    create: {
      email: "admin@sentinel.dev",
      password: hashedPassword,
      name: "Sentinel Admin",
      role: "ADMIN",
    },
  });

  console.log(`Created admin user: ${user.email}`);

  // Baseline monitored endpoints
  const initialMonitors = [
    {
      name: "GitHub Public API",
      url: "https://api.github.com/zen",
      method: "GET",
      interval: 30,
      timeout: 5000,
      expectedStatus: 200,
      userId: user.id,
    },
    {
      name: "Cloudflare 1.1.1.1 DoH",
      url: "https://cloudflare-dns.com/dns-query?name=example.com&type=A",
      method: "GET",
      headers: JSON.stringify({ Accept: "application/dns-json" }),
      interval: 15,
      timeout: 3000,
      expectedStatus: 200,
      userId: user.id,
    },
    {
      name: "HTTPBin Status Gateway",
      url: "https://httpbin.org/status/200",
      method: "GET",
      interval: 20,
      timeout: 5000,
      expectedStatus: 200,
      userId: user.id,
    },
    {
      name: "Simulated Degraded Endpoint",
      url: "https://httpbin.org/delay/2",
      method: "GET",
      interval: 45,
      timeout: 4000,
      expectedStatus: 200,
      userId: user.id,
    },
  ];

  for (const m of initialMonitors) {
    const existing = await prisma.monitor.findFirst({ where: { name: m.name } });
    if (!existing) {
      await prisma.monitor.create({ data: m });
      console.log(`Created monitor: ${m.name}`);
    }
  }

  console.log("[INFO] Seed completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
