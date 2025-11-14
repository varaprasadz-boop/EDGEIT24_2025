import { db } from "./db";
import { subscriptionPlans } from "@shared/schema";

async function seedSubscriptionPlans() {
  console.log("🌱 Seeding subscription plans...");

  // ========================================
  // CLIENT SUBSCRIPTION PLANS (3)
  // ========================================
  
  await db.insert(subscriptionPlans).values({
    name: "Basic",
    nameAr: "أساسي",
    description: "Perfect for getting started with EDGEIT24",
    descriptionAr: "مثالي للبدء مع EDGEIT24",
    price: "0",
    currency: "SAR",
    billingCycle: "monthly",
    audience: "client",
    features: {
      list: [
        { en: "Post up to 3 projects per month", ar: "نشر حتى 3 مشاريع شهرياً" },
        { en: "Receive up to 10 bids per project", ar: "استقبال حتى 10 عروض لكل مشروع" },
        { en: "Basic project management tools", ar: "أدوات إدارة مشاريع أساسية" },
        { en: "Standard support (48h response)", ar: "دعم قياسي (استجابة خلال 48 ساعة)" },
        { en: "5% platform commission", ar: "عمولة منصة 5%" }
      ],
      projectsPerMonth: 3,
      bidsPerProject: 10,
      commission: 5
    },
    status: "active",
    featured: false,
    popular: false,
    displayOrder: 1,
  });

  await db.insert(subscriptionPlans).values({
    name: "Professional",
    nameAr: "احترافي",
    description: "Best for growing businesses with regular IT needs",
    descriptionAr: "الأفضل للأعمال المتنامية مع احتياجات تقنية منتظمة",
    price: "499",
    currency: "SAR",
    billingCycle: "monthly",
    audience: "client",
    features: {
      list: [
        { en: "Post unlimited projects", ar: "نشر مشاريع غير محدودة" },
        { en: "Unlimited bids per project", ar: "عروض غير محدودة لكل مشروع" },
        { en: "Advanced project management & analytics", ar: "إدارة مشاريع وتحليلات متقدمة" },
        { en: "Priority support (24h response)", ar: "دعم ذو أولوية (استجابة خلال 24 ساعة)" },
        { en: "Featured project listings", ar: "قوائم مشاريع مميزة" },
        { en: "3% platform commission", ar: "عمولة منصة 3%" }
      ],
      projectsPerMonth: -1, // unlimited
      bidsPerProject: -1, // unlimited
      commission: 3,
      featuredListings: true,
      analyticsAccess: true
    },
    analyticsAccess: true,
    status: "active",
    featured: false,
    popular: true,
    displayOrder: 2,
  });

  await db.insert(subscriptionPlans).values({
    name: "Enterprise",
    nameAr: "مؤسسي",
    description: "Custom solutions for large organizations",
    descriptionAr: "حلول مخصصة للمؤسسات الكبيرة",
    price: "1999",
    currency: "SAR",
    billingCycle: "monthly",
    audience: "client",
    features: {
      list: [
        { en: "Everything in Professional", ar: "كل ما في الخطة الاحترافية" },
        { en: "Dedicated account manager", ar: "مدير حساب مخصص" },
        { en: "Custom integrations & API access", ar: "تكاملات مخصصة ووصول API" },
        { en: "24/7 premium support", ar: "دعم مميز على مدار الساعة" },
        { en: "Team collaboration tools", ar: "أدوات تعاون الفريق" },
        { en: "2% platform commission", ar: "عمولة منصة 2%" }
      ],
      projectsPerMonth: -1,
      bidsPerProject: -1,
      commission: 2,
      featuredListings: true,
      analyticsAccess: true,
      teamCollaboration: true
    },
    analyticsAccess: true,
    apiAccess: true,
    customIntegrations: true,
    dedicatedAccountManager: true,
    slaGuarantee: true,
    status: "active",
    featured: true,
    popular: false,
    displayOrder: 3,
  });

  console.log("✓ Client plans created (Basic, Professional, Enterprise)");

  // ========================================
  // CONSULTANT SUBSCRIPTION PLANS (3)
  // ========================================

  await db.insert(subscriptionPlans).values({
    name: "Basic",
    nameAr: "أساسي",
    description: "Start your consulting journey",
    descriptionAr: "ابدأ رحلتك الاستشارية",
    price: "0",
    currency: "SAR",
    billingCycle: "monthly",
    audience: "consultant",
    features: {
      list: [
        { en: "Submit up to 5 bids per month", ar: "تقديم حتى 5 عروض شهرياً" },
        { en: "Basic profile page", ar: "صفحة ملف شخصي أساسية" },
        { en: "Browse all projects", ar: "تصفح جميع المشاريع" },
        { en: "Standard support", ar: "دعم قياسي" },
        { en: "8% platform commission", ar: "عمولة منصة 8%" }
      ],
      bidsPerMonth: 5,
      commission: 8,
      profileType: "basic"
    },
    status: "active",
    featured: false,
    popular: false,
    displayOrder: 1,
  });

  await db.insert(subscriptionPlans).values({
    name: "Professional",
    nameAr: "احترافي",
    description: "Grow your consulting business",
    descriptionAr: "نمِّ أعمالك الاستشارية",
    price: "299",
    currency: "SAR",
    billingCycle: "monthly",
    audience: "consultant",
    features: {
      list: [
        { en: "Unlimited bid submissions", ar: "تقديم عروض غير محدودة" },
        { en: "Enhanced profile with portfolio showcase", ar: "ملف شخصي محسّن مع عرض الأعمال" },
        { en: "Priority bid placement", ar: "وضع عروض ذو أولوية" },
        { en: "Advanced analytics & insights", ar: "تحليلات ورؤى متقدمة" },
        { en: "Verified badge", ar: "شارة موثق" },
        { en: "5% platform commission", ar: "عمولة منصة 5%" }
      ],
      bidsPerMonth: -1, // unlimited
      commission: 5,
      profileType: "enhanced",
      priorityBidPlacement: true,
      verifiedBadge: true
    },
    analyticsAccess: true,
    status: "active",
    featured: false,
    popular: true,
    displayOrder: 2,
  });

  await db.insert(subscriptionPlans).values({
    name: "Enterprise",
    nameAr: "مؤسسي",
    description: "For established consulting firms",
    descriptionAr: "للشركات الاستشارية القائمة",
    price: "999",
    currency: "SAR",
    billingCycle: "monthly",
    audience: "consultant",
    features: {
      list: [
        { en: "Everything in Professional", ar: "كل ما في الخطة الاحترافية" },
        { en: "Featured consultant listing", ar: "قائمة مستشار مميزة" },
        { en: "Team collaboration & white-label options", ar: "تعاون الفريق وخيارات العلامة البيضاء" },
        { en: "Dedicated success manager", ar: "مدير نجاح مخصص" },
        { en: "Custom service packages", ar: "حزم خدمات مخصصة" },
        { en: "3% platform commission", ar: "عمولة منصة 3%" }
      ],
      bidsPerMonth: -1,
      commission: 3,
      profileType: "premium",
      priorityBidPlacement: true,
      verifiedBadge: true,
      featuredListing: true,
      teamCollaboration: true
    },
    analyticsAccess: true,
    whiteLabel: true,
    dedicatedAccountManager: true,
    slaGuarantee: true,
    status: "active",
    featured: true,
    popular: false,
    displayOrder: 3,
  });

  console.log("✓ Consultant plans created (Basic, Professional, Enterprise)");

  console.log("✅ All subscription plans seeded successfully!");
  console.log("📊 Total: 6 plans (3 Client + 3 Consultant)");
}

seedSubscriptionPlans()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error seeding subscription plans:", error);
    process.exit(1);
  });
