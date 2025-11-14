import { db } from "./db";
import { users, adminRoles } from "@shared/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

async function seedSuperAdmin() {
  console.log("🌱 Seeding super admin...");

  const email = "superadmin@edgeit24.com";
  const password = "123456";

  // Check if super admin already exists
  const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

  let userId: string;

  if (existingUser.length > 0) {
    console.log("✓ Super admin user already exists");
    userId = existingUser[0].id;
  } else {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create super admin user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        role: "admin",
        status: "active",
        emailVerified: true,
        authProvider: "local",
        firstName: "Super",
        lastName: "Admin",
      })
      .returning();

    userId = newUser.id;
    console.log("✓ Super admin user created");
  }

  // Check if admin role already exists
  const existingRole = await db.select().from(adminRoles).where(eq(adminRoles.userId, userId)).limit(1);

  if (existingRole.length > 0) {
    console.log("✓ Super admin role already assigned");
  } else {
    // Create admin role entry
    await db.insert(adminRoles).values({
      userId,
      role: "super_admin",
      permissions: {
        users: { view: true, edit: true, delete: true, ban: true },
        payments: { view: true, release: true, refund: true },
        content: { approve: true, reject: true, delete: true },
        settings: { view: true, edit: true },
        reports: { view: true, export: true },
        categories: { create: true, edit: true, delete: true },
        disputes: { view: true, resolve: true },
        admins: { manage: true },
      },
      active: true,
    });

    console.log("✓ Super admin role assigned");
  }

  console.log("✅ Super admin seeded successfully");
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`   Login at: /admin/login`);
}

seedSuperAdmin()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error seeding super admin:", error);
    process.exit(1);
  });
