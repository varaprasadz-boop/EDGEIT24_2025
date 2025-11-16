import { storage } from "../server/storage";
import bcrypt from "bcrypt";

async function createTestAccounts() {
  const password = "123456";
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    // 1. Create super admin account
    console.log("Creating super admin account...");
    const existingSuperAdmin = await storage.getUserByEmail("superadmin@edgeit24.com");
    if (!existingSuperAdmin) {
      const superAdmin = await storage.createUser({
        email: "superadmin@edgeit24.com",
        password: hashedPassword,
        role: "admin",
        fullName: "Super Admin",
        country: "SA",
        phoneCountryCode: "+966",
        phone: "500000000",
        companyName: "EDGEIT24",
        authProvider: "local",
        emailVerified: true,
        engagementPlan: "enterprise",
        paymentStatus: "not_required",
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        status: "active",
      });
      console.log("✓ Super admin created:", superAdmin.email);
    } else {
      console.log("Super admin already exists");
    }

    // 2. Create test client account
    console.log("\nCreating test client account...");
    const existingClient = await storage.getUserByEmail("client@edgeit24.com");
    if (!existingClient) {
      const client = await storage.createUser({
        email: "client@edgeit24.com",
        password: hashedPassword,
        role: "client",
        fullName: "Test Client",
        country: "SA",
        phoneCountryCode: "+966",
        phone: "501111111",
        companyName: "Test Company Ltd",
        authProvider: "local",
        emailVerified: true,
        engagementPlan: "professional",
        paymentStatus: "not_required",
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        status: "active",
      });

      console.log("✓ Test client created:", client.email);
      console.log("  (Note: Complete profile via /profile/complete)");
    } else {
      console.log("Test client already exists");
    }

    // 3. Create test consultant account
    console.log("\nCreating test consultant account...");
    const existingConsultant = await storage.getUserByEmail("consultant@edgeit24.com");
    if (!existingConsultant) {
      const consultant = await storage.createUser({
        email: "consultant@edgeit24.com",
        password: hashedPassword,
        role: "consultant",
        fullName: "Test Consultant",
        country: "SA",
        phoneCountryCode: "+966",
        phone: "502222222",
        companyName: "Test Consulting",
        authProvider: "local",
        emailVerified: true,
        engagementPlan: "professional",
        paymentStatus: "not_required",
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        status: "active",
      });

      console.log("✓ Test consultant created:", consultant.email);
      console.log("  (Note: Complete profile via /profile/complete)");
    } else {
      console.log("Test consultant already exists");
    }

    console.log("\n✅ All test accounts created successfully!");
    console.log("\nTest Credentials:");
    console.log("------------------");
    console.log("Super Admin:");
    console.log("  Email: superadmin@edgeit24.com");
    console.log("  Password: 123456");
    console.log("\nClient:");
    console.log("  Email: client@edgeit24.com");
    console.log("  Password: 123456");
    console.log("\nConsultant:");
    console.log("  Email: consultant@edgeit24.com");
    console.log("  Password: 123456");
    console.log("\n");
  } catch (error) {
    console.error("Error creating test accounts:", error);
    process.exit(1);
  }

  process.exit(0);
}

createTestAccounts();
