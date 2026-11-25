import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.listing.deleteMany({ where: { isSample: true } });

  const sellerPassword = await bcrypt.hash("SellerDemo!2026", 10);
  const buyerPassword = await bcrypt.hash("BuyerDemo!2026", 10);
  const adminPassword = await bcrypt.hash("AxiverisAdmin!2026", 10);

  const people = [
    {
      email: "maya@cascadecritical.example",
      passwordHash: sellerPassword,
      name: "Maya Chen",
      company: "Cascade Critical Power",
      phone: "541-555-0142",
      location: "Bend, OR",
      role: "SELLER",
    },
    {
      email: "james@ironcladsurplus.example",
      passwordHash: sellerPassword,
      name: "James Okonkwo",
      company: "Ironclad Surplus",
      phone: "214-555-0194",
      location: "Dallas, TX",
      role: "SELLER",
    },
    {
      email: "priya@ashburnspares.example",
      passwordHash: sellerPassword,
      name: "Priya Shah",
      company: "Ashburn Critical Spares",
      phone: "703-555-0177",
      location: "Ashburn, VA",
      role: "SELLER",
    },
    {
      email: "dana@northlinecolo.example",
      passwordHash: buyerPassword,
      name: "Dana Ruiz",
      company: "Northline Colo",
      phone: "571-555-0118",
      location: "Ashburn, VA",
      role: "BUYER",
    },
    {
      email: "admin@axiveris.example",
      passwordHash: adminPassword,
      name: "Alex Rivera",
      company: "Axiveris, LLC",
      phone: "541-555-0100",
      location: "Bend, OR",
      role: "ADMIN",
    },
  ];

  for (const person of people) {
    await prisma.user.upsert({
      where: { email: person.email },
      update: { name: person.name, company: person.company, role: person.role, suspended: false },
      create: person,
    });
  }

  console.log("Demo accounts are ready. Inventory is loaded separately with npm run import:inventory.");
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
