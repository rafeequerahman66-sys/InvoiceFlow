import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.businessProfile.upsert({
    where: { id: "rinmedia" },
    create: {
      id: "rinmedia",
      address: "Bengaluru, Karnataka, India", // update to your registered Kerala address
      email: "rafeequerahman66@gmail.com",
      // TODO: drop in the real values from your rin-media-invoice skill
      lutNumber: null,
      bankName: "DCB Bank",
      bankAccount: "XXXXXXXXXXXX",
      ifsc: "XXXX0000000",
      swift: null,
    },
    update: {},
  });

  const emails = (process.env.ALLOWED_EMAILS ?? "rafeequerahman66@gmail.com")
    .split(",").map((e) => e.trim()).filter(Boolean);
  for (const [i, email] of emails.entries()) {
    await prisma.user.upsert({
      where: { email },
      create: { email, role: i === 0 ? "OWNER" : "MEMBER" },
      update: {},
    });
  }

  const clients = [
    { name: "Lumen Labs", company: "Lumen Labs Pvt Ltd", email: "ops@lumenlabs.io", country: "IN", stateCode: "32", gstin: "32ABCDE1234F1Z5", defaultCurrency: "INR" },
    { name: "Verda", company: "Verda Capital", email: "finance@verda.fund", country: "IN", stateCode: "27", defaultCurrency: "INR" },
    { name: "Northwind", company: "Northwind Studios", email: "hi@northwind.co", country: "US", defaultCurrency: "USD" },
    { name: "Orbit", company: "Orbit Robotics", email: "team@orbit.dev", country: "DE", defaultCurrency: "EUR" },
  ];
  for (const c of clients) {
    const exists = await prisma.client.findFirst({ where: { company: c.company } });
    if (!exists) await prisma.client.create({ data: c });
  }

  const items = [
    { name: "Cinematic brand film (60s)", defaultRate: 180000, sacCode: "998361" },
    { name: "Event coverage — day rate", defaultRate: 65000, sacCode: "998361" },
    { name: "Creative direction — retainer/mo", defaultRate: 120000, sacCode: "998361" },
  ];
  for (const it of items) {
    const exists = await prisma.catalogItem.findFirst({ where: { name: it.name } });
    if (!exists) await prisma.catalogItem.create({ data: it });
  }

  console.log("Seeded business profile, users, clients, and catalog.");
}

main().finally(() => prisma.$disconnect());
