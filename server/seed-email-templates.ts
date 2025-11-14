import { db } from "./db";
import { emailTemplates } from "@shared/schema";

async function seedEmailTemplates() {
  console.log("🌱 Seeding email templates...");

  const templates = [
    // ========================================
    // 1. USER AUTHENTICATION & ONBOARDING (6)
    // ========================================
    {
      name: "welcome_email_client",
      subject: "Welcome to EDGEIT24 - Start Posting Projects Today!",
      subject_ar: "مرحباً بك في EDGEIT24 - ابدأ بنشر مشاريعك اليوم!",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">Welcome to EDGEIT24, {{userName}}!</h1>
    <p>Thank you for joining EDGEIT24, Saudi Arabia's premier B2B IT marketplace.</p>
    <p>As a <strong>Client</strong>, you can now:</p>
    <ul>
      <li>Post IT project requirements</li>
      <li>Receive competitive bids from verified consultants</li>
      <li>Manage projects with milestone-based payments</li>
      <li>Access Saudi Arabia's top IT talent</li>
    </ul>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/dashboard" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Go to Dashboard</a>
    </p>
    <p style="margin-top: 30px; color: #666; font-size: 14px;">
      Need help? Contact us at {{supportEmail}}
    </p>
  </div>
</body>
</html>`,
      body_ar: `
<!DOCTYPE html>
<html dir="rtl">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">مرحباً بك في EDGEIT24، {{userName}}!</h1>
    <p>شكراً لانضمامك إلى EDGEIT24، السوق الرائد لخدمات تقنية المعلومات في المملكة العربية السعودية.</p>
    <p>كـ <strong>عميل</strong>، يمكنك الآن:</p>
    <ul>
      <li>نشر متطلبات مشاريع تقنية المعلومات</li>
      <li>استقبال عروض تنافسية من مستشارين معتمدين</li>
      <li>إدارة المشاريع بنظام دفع قائم على المراحل</li>
      <li>الوصول إلى أفضل المواهب التقنية في المملكة</li>
    </ul>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/dashboard" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">الذهاب إلى لوحة التحكم</a>
    </p>
    <p style="margin-top: 30px; color: #666; font-size: 14px;">
      تحتاج مساعدة؟ تواصل معنا على {{supportEmail}}
    </p>
  </div>
</body>
</html>`,
      audience: "client",
      trigger: "user_registration_client",
      active: true,
    },
    {
      name: "welcome_email_consultant",
      subject: "Welcome to EDGEIT24 - Start Bidding on Projects!",
      subject_ar: "مرحباً بك في EDGEIT24 - ابدأ بتقديم عروضك على المشاريع!",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">Welcome to EDGEIT24, {{userName}}!</h1>
    <p>Thank you for joining EDGEIT24 as an IT Service Provider.</p>
    <p>As a <strong>Consultant</strong>, you can now:</p>
    <ul>
      <li>Browse available IT projects</li>
      <li>Submit competitive bids with your proposals</li>
      <li>Build your professional portfolio</li>
      <li>Earn with secure milestone-based payments</li>
    </ul>
    <p><strong>Next Steps:</strong></p>
    <ol>
      <li>Complete your consultant profile</li>
      <li>Add your skills and experience</li>
      <li>Start bidding on projects</li>
    </ol>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/profile/consultant" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Complete Your Profile</a>
    </p>
    <p style="margin-top: 30px; color: #666; font-size: 14px;">
      Need help? Contact us at {{supportEmail}}
    </p>
  </div>
</body>
</html>`,
      body_ar: `
<!DOCTYPE html>
<html dir="rtl">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">مرحباً بك في EDGEIT24، {{userName}}!</h1>
    <p>شكراً لانضمامك إلى EDGEIT24 كمزود خدمات تقنية معلومات.</p>
    <p>كـ <strong>مستشار</strong>، يمكنك الآن:</p>
    <ul>
      <li>تصفح المشاريع المتاحة</li>
      <li>تقديم عروض تنافسية مع مقترحاتك</li>
      <li>بناء سجلك المهني</li>
      <li>الربح من خلال نظام دفع آمن قائم على المراحل</li>
    </ul>
    <p><strong>الخطوات التالية:</strong></p>
    <ol>
      <li>أكمل ملفك الشخصي كمستشار</li>
      <li>أضف مهاراتك وخبراتك</li>
      <li>ابدأ بتقديم عروضك على المشاريع</li>
    </ol>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/profile/consultant" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">أكمل ملفك الشخصي</a>
    </p>
    <p style="margin-top: 30px; color: #666; font-size: 14px;">
      تحتاج مساعدة؟ تواصل معنا على {{supportEmail}}
    </p>
  </div>
</body>
</html>`,
      audience: "consultant",
      trigger: "user_registration_consultant",
      active: true,
    },
    {
      name: "email_verification",
      subject: "Verify Your Email - EDGEIT24",
      subject_ar: "تأكيد بريدك الإلكتروني - EDGEIT24",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #0A0E27;">Verify Your Email Address</h1>
    <p>Hi {{userName}},</p>
    <p>Please click the button below to verify your email address and activate your EDGEIT24 account.</p>
    <p style="margin-top: 30px;">
      <a href="{{verificationLink}}" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Verify Email</a>
    </p>
    <p style="margin-top: 30px; color: #666; font-size: 14px;">
      This link will expire in 24 hours. If you didn't create an account, please ignore this email.
    </p>
  </div>
</body>
</html>`,
      body_ar: `
<!DOCTYPE html>
<html dir="rtl">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #0A0E27;">تأكيد عنوان بريدك الإلكتروني</h1>
    <p>مرحباً {{userName}}،</p>
    <p>يرجى النقر على الزر أدناه لتأكيد بريدك الإلكتروني وتفعيل حسابك في EDGEIT24.</p>
    <p style="margin-top: 30px;">
      <a href="{{verificationLink}}" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">تأكيد البريد الإلكتروني</a>
    </p>
    <p style="margin-top: 30px; color: #666; font-size: 14px;">
      سينتهي صلاحية هذا الرابط خلال 24 ساعة. إذا لم تقم بإنشاء حساب، يرجى تجاهل هذا البريد.
    </p>
  </div>
</body>
</html>`,
      audience: "both",
      trigger: "email_verification_request",
      active: true,
    },
    {
      name: "password_reset",
      subject: "Reset Your Password - EDGEIT24",
      subject_ar: "إعادة تعيين كلمة المرور - EDGEIT24",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #0A0E27;">Reset Your Password</h1>
    <p>Hi {{userName}},</p>
    <p>We received a request to reset your password. Click the button below to create a new password.</p>
    <p style="margin-top: 30px;">
      <a href="{{resetLink}}" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Reset Password</a>
    </p>
    <p style="margin-top: 30px; color: #666; font-size: 14px;">
      This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
    </p>
  </div>
</body>
</html>`,
      body_ar: `
<!DOCTYPE html>
<html dir="rtl">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #0A0E27;">إعادة تعيين كلمة المرور</h1>
    <p>مرحباً {{userName}}،</p>
    <p>تلقينا طلباً لإعادة تعيين كلمة المرور. انقر على الزر أدناه لإنشاء كلمة مرور جديدة.</p>
    <p style="margin-top: 30px;">
      <a href="{{resetLink}}" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">إعادة تعيين كلمة المرور</a>
    </p>
    <p style="margin-top: 30px; color: #666; font-size: 14px;">
      سينتهي صلاحية هذا الرابط خلال ساعة واحدة. إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد.
    </p>
  </div>
</body>
</html>`,
      audience: "both",
      trigger: "password_reset_request",
      active: true,
    },
    {
      name: "password_changed",
      subject: "Password Changed Successfully - EDGEIT24",
      subject_ar: "تم تغيير كلمة المرور بنجاح - EDGEIT24",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">Password Changed Successfully</h1>
    <p>Hi {{userName}},</p>
    <p>Your password has been changed successfully on {{changeDate}}.</p>
    <p>If you didn't make this change, please contact our support team immediately at {{supportEmail}}.</p>
  </div>
</body>
</html>`,
      body_ar: `
<!DOCTYPE html>
<html dir="rtl">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">تم تغيير كلمة المرور بنجاح</h1>
    <p>مرحباً {{userName}}،</p>
    <p>تم تغيير كلمة المرور الخاصة بك بنجاح في {{changeDate}}.</p>
    <p>إذا لم تقم بهذا التغيير، يرجى الاتصال بفريق الدعم فوراً على {{supportEmail}}.</p>
  </div>
</body>
</html>`,
      audience: "both",
      trigger: "password_changed",
      active: true,
    },
    {
      name: "account_activated",
      subject: "Your Account Has Been Activated - EDGEIT24",
      subject_ar: "تم تفعيل حسابك - EDGEIT24",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">Account Activated!</h1>
    <p>Hi {{userName}},</p>
    <p>Good news! Your account has been activated by our admin team.</p>
    <p>You can now access all platform features.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/login" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Login Now</a>
    </p>
  </div>
</body>
</html>`,
      body_ar: `
<!DOCTYPE html>
<html dir="rtl">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">تم تفعيل الحساب!</h1>
    <p>مرحباً {{userName}}،</p>
    <p>أخبار سارة! تم تفعيل حسابك من قبل فريق الإدارة.</p>
    <p>يمكنك الآن الوصول إلى جميع ميزات المنصة.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/login" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">تسجيل الدخول الآن</a>
    </p>
  </div>
</body>
</html>`,
      audience: "both",
      trigger: "account_activated",
      active: true,
    },

    // ========================================
    // 2. CONSULTANT/VENDOR MANAGEMENT (4)
    // ========================================
    {
      name: "consultant_profile_approved",
      subject: "Your Consultant Profile Has Been Approved!",
      subject_ar: "تم قبول ملفك الشخصي كمستشار!",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">Profile Approved!</h1>
    <p>Hi {{userName}},</p>
    <p>Congratulations! Your consultant profile has been verified and approved.</p>
    <p>You can now start bidding on projects and showcasing your expertise to potential clients.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/dashboard" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Browse Projects</a>
    </p>
  </div>
</body>
</html>`,
      body_ar: `
<!DOCTYPE html>
<html dir="rtl">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">تم قبول الملف الشخصي!</h1>
    <p>مرحباً {{userName}}،</p>
    <p>تهانينا! تم التحقق من ملفك الشخصي كمستشار والموافقة عليه.</p>
    <p>يمكنك الآن البدء في تقديم عروضك على المشاريع وعرض خبراتك للعملاء المحتملين.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/dashboard" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">تصفح المشاريع</a>
    </p>
  </div>
</body>
</html>`,
      audience: "consultant",
      trigger: "consultant_profile_approved",
      active: true,
    },
    {
      name: "consultant_profile_rejected",
      subject: "Update Required: Consultant Profile Review",
      subject_ar: "يلزم التحديث: مراجعة الملف الشخصي للمستشار",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #0A0E27;">Profile Requires Updates</h1>
    <p>Hi {{userName}},</p>
    <p>Thank you for submitting your consultant profile. Our team has reviewed it and requires some updates before approval.</p>
    <p><strong>Reason:</strong> {{rejectionReason}}</p>
    <p>Please update your profile and resubmit for review.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/profile/consultant" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Update Profile</a>
    </p>
  </div>
</body>
</html>`,
      body_ar: `
<!DOCTYPE html>
<html dir="rtl">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #0A0E27;">الملف الشخصي يتطلب تحديثات</h1>
    <p>مرحباً {{userName}}،</p>
    <p>شكراً لإرسال ملفك الشخصي كمستشار. راجع فريقنا الملف ويتطلب بعض التحديثات قبل الموافقة.</p>
    <p><strong>السبب:</strong> {{rejectionReason}}</p>
    <p>يرجى تحديث ملفك الشخصي وإعادة تقديمه للمراجعة.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/profile/consultant" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">تحديث الملف الشخصي</a>
    </p>
  </div>
</body>
</html>`,
      audience: "consultant",
      trigger: "consultant_profile_rejected",
      active: true,
    },
    {
      name: "vendor_category_approved",
      subject: "Category Access Approved - EDGEIT24",
      subject_ar: "تمت الموافقة على الوصول إلى الفئة - EDGEIT24",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">Category Access Approved!</h1>
    <p>Hi {{userName}},</p>
    <p>Great news! Your request to access the <strong>{{categoryName}}</strong> category has been approved.</p>
    <p>You can now bid on projects in this category.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/dashboard" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Browse Projects</a>
    </p>
  </div>
</body>
</html>`,
      body_ar: `
<!DOCTYPE html>
<html dir="rtl">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">تمت الموافقة على الوصول إلى الفئة!</h1>
    <p>مرحباً {{userName}}،</p>
    <p>أخبار رائعة! تمت الموافقة على طلبك للوصول إلى فئة <strong>{{categoryName}}</strong>.</p>
    <p>يمكنك الآن تقديم عروضك على المشاريع في هذه الفئة.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/dashboard" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">تصفح المشاريع</a>
    </p>
  </div>
</body>
</html>`,
      audience: "consultant",
      trigger: "vendor_category_approved",
      active: true,
    },
    {
      name: "vendor_category_rejected",
      subject: "Category Access Request Update - EDGEIT24",
      subject_ar: "تحديث طلب الوصول إلى الفئة - EDGEIT24",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #0A0E27;">Category Access Request</h1>
    <p>Hi {{userName}},</p>
    <p>Thank you for your request to access the <strong>{{categoryName}}</strong> category.</p>
    <p>Unfortunately, we cannot approve this request at this time.</p>
    <p><strong>Reason:</strong> {{rejectionReason}}</p>
    <p>You may reapply once you meet the requirements.</p>
  </div>
</body>
</html>`,
      body_ar: `
<!DOCTYPE html>
<html dir="rtl">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #0A0E27;">طلب الوصول إلى الفئة</h1>
    <p>مرحباً {{userName}}،</p>
    <p>شكراً لطلبك الوصول إلى فئة <strong>{{categoryName}}</strong>.</p>
    <p>للأسف، لا يمكننا الموافقة على هذا الطلب في الوقت الحالي.</p>
    <p><strong>السبب:</strong> {{rejectionReason}}</p>
    <p>يمكنك التقديم مرة أخرى بمجرد استيفاء المتطلبات.</p>
  </div>
</body>
</html>`,
      audience: "consultant",
      trigger: "vendor_category_rejected",
      active: true,
    },

    // ========================================
    // 3. JOBS & BIDS (8)
    // ========================================
    {
      name: "job_posted_confirmation",
      subject: "Your Project Has Been Posted - EDGEIT24",
      subject_ar: "تم نشر مشروعك - EDGEIT24",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">Project Posted Successfully!</h1>
    <p>Hi {{userName}},</p>
    <p>Your project "<strong>{{projectTitle}}</strong>" has been submitted and is under review.</p>
    <p><strong>Project Details:</strong></p>
    <ul>
      <li>Budget: {{budget}}</li>
      <li>Category: {{categoryName}}</li>
      <li>Duration: {{duration}}</li>
    </ul>
    <p>You'll receive bids from qualified consultants soon!</p>
  </div>
</body>
</html>`,
      body_ar: `
<!DOCTYPE html>
<html dir="rtl">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">تم نشر المشروع بنجاح!</h1>
    <p>مرحباً {{userName}}،</p>
    <p>تم تقديم مشروعك "<strong>{{projectTitle}}</strong>" وهو قيد المراجعة.</p>
    <p><strong>تفاصيل المشروع:</strong></p>
    <ul>
      <li>الميزانية: {{budget}}</li>
      <li>الفئة: {{categoryName}}</li>
      <li>المدة: {{duration}}</li>
    </ul>
    <p>ستتلقى عروضاً من مستشارين مؤهلين قريباً!</p>
  </div>
</body>
</html>`,
      audience: "client",
      trigger: "job_posted",
      active: true,
    },
    {
      name: "job_approved",
      subject: "Your Project is Now Live - EDGEIT24",
      subject_ar: "مشروعك الآن مباشر - EDGEIT24",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">Project Approved & Live!</h1>
    <p>Hi {{userName}},</p>
    <p>Great news! Your project "<strong>{{projectTitle}}</strong>" has been approved and is now live on EDGEIT24.</p>
    <p>Qualified consultants can now view and bid on your project.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/projects/{{projectId}}" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">View Project</a>
    </p>
  </div>
</body>
</html>`,
      body_ar: `
<!DOCTYPE html>
<html dir="rtl">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">تمت الموافقة على المشروع وهو الآن مباشر!</h1>
    <p>مرحباً {{userName}}،</p>
    <p>أخبار رائعة! تمت الموافقة على مشروعك "<strong>{{projectTitle}}</strong>" وهو الآن مباشر على EDGEIT24.</p>
    <p>يمكن للمستشارين المؤهلين الآن عرض مشروعك وتقديم عروضهم عليه.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/projects/{{projectId}}" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">عرض المشروع</a>
    </p>
  </div>
</body>
</html>`,
      audience: "client",
      trigger: "job_approved",
      active: true,
    },
    {
      name: "job_rejected",
      subject: "Project Requires Updates - EDGEIT24",
      subject_ar: "المشروع يتطلب تحديثات - EDGEIT24",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #0A0E27;">Project Update Required</h1>
    <p>Hi {{userName}},</p>
    <p>Your project "<strong>{{projectTitle}}</strong>" requires some updates before it can be published.</p>
    <p><strong>Admin Notes:</strong> {{adminNotes}}</p>
    <p>Please update your project and resubmit for review.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/projects/{{projectId}}/edit" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Edit Project</a>
    </p>
  </div>
</body>
</html>`,
      body_ar: `
<!DOCTYPE html>
<html dir="rtl">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #0A0E27;">المشروع يتطلب تحديثاً</h1>
    <p>مرحباً {{userName}}،</p>
    <p>مشروعك "<strong>{{projectTitle}}</strong>" يتطلب بعض التحديثات قبل نشره.</p>
    <p><strong>ملاحظات الإدارة:</strong> {{adminNotes}}</p>
    <p>يرجى تحديث مشروعك وإعادة تقديمه للمراجعة.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/projects/{{projectId}}/edit" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">تعديل المشروع</a>
    </p>
  </div>
</body>
</html>`,
      audience: "client",
      trigger: "job_rejected",
      active: true,
    },
    {
      name: "new_bid_received",
      subject: "New Bid on Your Project - {{projectTitle}}",
      subject_ar: "عرض جديد على مشروعك - {{projectTitle}}",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">You Received a New Bid!</h1>
    <p>Hi {{userName}},</p>
    <p>A consultant has submitted a bid on your project "<strong>{{projectTitle}}</strong>".</p>
    <p><strong>Bid Details:</strong></p>
    <ul>
      <li>Consultant: {{consultantName}}</li>
      <li>Proposed Budget: {{proposedBudget}}</li>
      <li>Duration: {{proposedDuration}}</li>
    </ul>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/projects/{{projectId}}/bids" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Review Bid</a>
    </p>
  </div>
</body>
</html>`,
      body_ar: `
<!DOCTYPE html>
<html dir="rtl">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">تلقيت عرضاً جديداً!</h1>
    <p>مرحباً {{userName}}،</p>
    <p>قدم مستشار عرضاً على مشروعك "<strong>{{projectTitle}}</strong>".</p>
    <p><strong>تفاصيل العرض:</strong></p>
    <ul>
      <li>المستشار: {{consultantName}}</li>
      <li>الميزانية المقترحة: {{proposedBudget}}</li>
      <li>المدة: {{proposedDuration}}</li>
    </ul>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/projects/{{projectId}}/bids" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">مراجعة العرض</a>
    </p>
  </div>
</body>
</html>`,
      audience: "client",
      trigger: "new_bid_received",
      active: true,
    },
    {
      name: "bid_accepted",
      subject: "Your Bid Was Accepted! - {{projectTitle}}",
      subject_ar: "تم قبول عرضك! - {{projectTitle}}",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">Congratulations! Your Bid Was Accepted!</h1>
    <p>Hi {{userName}},</p>
    <p>Great news! Your bid on "<strong>{{projectTitle}}</strong>" has been accepted by the client.</p>
    <p><strong>Next Steps:</strong></p>
    <ol>
      <li>Review the project contract</li>
      <li>Set up project milestones</li>
      <li>Start working on the project</li>
    </ol>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/projects/{{projectId}}" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">View Project</a>
    </p>
  </div>
</body>
</html>`,
      body_ar: `
<!DOCTYPE html>
<html dir="rtl">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">تهانينا! تم قبول عرضك!</h1>
    <p>مرحباً {{userName}}،</p>
    <p>أخبار رائعة! تم قبول عرضك على "<strong>{{projectTitle}}</strong>" من قبل العميل.</p>
    <p><strong>الخطوات التالية:</strong></p>
    <ol>
      <li>راجع عقد المشروع</li>
      <li>قم بإعداد مراحل المشروع</li>
      <li>ابدأ العمل على المشروع</li>
    </ol>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/projects/{{projectId}}" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">عرض المشروع</a>
    </p>
  </div>
</body>
</html>`,
      audience: "consultant",
      trigger: "bid_accepted",
      active: true,
    },
    {
      name: "bid_rejected",
      subject: "Bid Status Update - {{projectTitle}}",
      subject_ar: "تحديث حالة العرض - {{projectTitle}}",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #0A0E27;">Bid Status Update</h1>
    <p>Hi {{userName}},</p>
    <p>Thank you for your bid on "<strong>{{projectTitle}}</strong>".</p>
    <p>The client has decided to proceed with another consultant for this project.</p>
    <p>Don't be discouraged! Keep bidding on projects that match your expertise.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/dashboard" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Browse More Projects</a>
    </p>
  </div>
</body>
</html>`,
      body_ar: `
<!DOCTYPE html>
<html dir="rtl">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #0A0E27;">تحديث حالة العرض</h1>
    <p>مرحباً {{userName}}،</p>
    <p>شكراً لعرضك على "<strong>{{projectTitle}}</strong>".</p>
    <p>قرر العميل المتابعة مع مستشار آخر لهذا المشروع.</p>
    <p>لا تيأس! استمر في تقديم عروضك على المشاريع التي تتناسب مع خبرتك.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/dashboard" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">تصفح المزيد من المشاريع</a>
    </p>
  </div>
</body>
</html>`,
      audience: "consultant",
      trigger: "bid_rejected",
      active: true,
    },
    {
      name: "job_deadline_approaching",
      subject: "Reminder: Bid Deadline Approaching - {{projectTitle}}",
      subject_ar: "تذكير: موعد تقديم العروض يقترب - {{projectTitle}}",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">Bid Deadline Approaching</h1>
    <p>Hi {{userName}},</p>
    <p>This is a reminder that the bid deadline for your project "<strong>{{projectTitle}}</strong>" is approaching.</p>
    <p><strong>Deadline:</strong> {{deadline}}</p>
    <p><strong>Bids Received:</strong> {{bidCount}}</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/projects/{{projectId}}/bids" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Review Bids</a>
    </p>
  </div>
</body>
</html>`,
      body_ar: `
<!DOCTYPE html>
<html dir="rtl">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">موعد تقديم العروض يقترب</h1>
    <p>مرحباً {{userName}}،</p>
    <p>هذا تذكير بأن موعد تقديم العروض على مشروعك "<strong>{{projectTitle}}</strong>" يقترب.</p>
    <p><strong>الموعد النهائي:</strong> {{deadline}}</p>
    <p><strong>العروض المستلمة:</strong> {{bidCount}}</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/projects/{{projectId}}/bids" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">مراجعة العروض</a>
    </p>
  </div>
</body>
</html>`,
      audience: "client",
      trigger: "job_deadline_approaching",
      active: true,
    },
    {
      name: "job_completed",
      subject: "Project Closed Successfully - {{projectTitle}}",
      subject_ar: "تم إغلاق المشروع بنجاح - {{projectTitle}}",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">Project Closed Successfully!</h1>
    <p>Hi {{userName}},</p>
    <p>Your project "<strong>{{projectTitle}}</strong>" has been closed successfully.</p>
    <p>Thank you for using EDGEIT24. We hope to serve you again soon!</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/dashboard" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Post Another Project</a>
    </p>
  </div>
</body>
</html>`,
      body_ar: `
<!DOCTYPE html>
<html dir="rtl">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">تم إغلاق المشروع بنجاح!</h1>
    <p>مرحباً {{userName}}،</p>
    <p>تم إغلاق مشروعك "<strong>{{projectTitle}}</strong>" بنجاح.</p>
    <p>شكراً لاستخدامك EDGEIT24. نتطلع لخدمتك مرة أخرى قريباً!</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/dashboard" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">نشر مشروع آخر</a>
    </p>
  </div>
</body>
</html>`,
      audience: "both",
      trigger: "job_completed",
      active: true,
    },

    // Continue with remaining templates in next part...
  ];

  // Insert templates in batches
  console.log(`Inserting ${templates.length} email templates...`);
  
  for (const template of templates) {
    await db.insert(emailTemplates).values(template).onConflictDoNothing();
  }

  console.log("✅ Email templates seeded successfully (Part 1 of 2)");
}

seedEmailTemplates()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error seeding email templates:", error);
    process.exit(1);
  });
