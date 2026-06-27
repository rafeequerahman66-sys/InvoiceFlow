import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const ownerEmail = (process.env.SEED_OWNER_EMAIL ?? "owner@rinmedia.test").toLowerCase();
  const ownerPassword = process.env.SEED_OWNER_PASSWORD ?? "password123";

  // Demo tenant.
  const org = await prisma.organization.upsert({
    where: { slug: "rin-media" },
    update: {},
    create: {
      name: "Rin Media",
      slug: "rin-media",
      legalName: "Crew Catalyst Innovations Private Limited",
      gstin: "32AANCC1730B1ZB",
      stateCode: "32",
      address: "Kerala, India",
      email: ownerEmail,
      bankName: "DCB Bank",
      bankAccount: "XXXXXXXXXXXX",
      ifsc: "XXXX0000000",
    },
  });

  // Owner user + membership.
  const passwordHash = await bcrypt.hash(ownerPassword, 10);
  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: { emailVerified: new Date() },
    create: { email: ownerEmail, name: "Rin Media Owner", passwordHash, emailVerified: new Date() },
  });
  await prisma.membership.upsert({
    where: { userId_orgId: { userId: owner.id, orgId: org.id } },
    update: {},
    create: { userId: owner.id, orgId: org.id, role: "OWNER" },
  });

  // Sample clients (scoped to the org).
  const clients = [
    { name: "Lumen Labs", company: "Lumen Labs Pvt Ltd", email: "ops@lumenlabs.io", country: "IN", stateCode: "32", gstin: "32ABCDE1234F1Z5", defaultCurrency: "INR" },
    { name: "Verda", company: "Verda Capital", email: "finance@verda.fund", country: "IN", stateCode: "27", defaultCurrency: "INR" },
    { name: "Northwind", company: "Northwind Studios", email: "hi@northwind.co", country: "US", defaultCurrency: "USD" },
    { name: "Orbit", company: "Orbit Robotics", email: "team@orbit.dev", country: "DE", defaultCurrency: "EUR" },
  ];
  for (const c of clients) {
    const exists = await prisma.client.findFirst({ where: { orgId: org.id, company: c.company } });
    if (!exists) await prisma.client.create({ data: { ...c, orgId: org.id } });
  }

  // Sample catalog (scoped to the org).
  const items = [
    { name: "Cinematic brand film (60s)", defaultRate: 180000, sacCode: "998361" },
    { name: "Event coverage — day rate", defaultRate: 65000, sacCode: "998361" },
    { name: "Creative direction — retainer/mo", defaultRate: 120000, sacCode: "998361" },
  ];
  for (const it of items) {
    const exists = await prisma.catalogItem.findFirst({ where: { orgId: org.id, name: it.name } });
    if (!exists) await prisma.catalogItem.create({ data: { ...it, orgId: org.id } });
  }

  console.log(`Seeded org "${org.name}". Login: ${ownerEmail} / ${ownerPassword}`);
}

main().finally(() => prisma.$disconnect());
