import { db } from "./db";
import { emailTemplates } from "@shared/schema";

async function seedEmailTemplatesPart2() {
  console.log("🌱 Seeding email templates (Part 2)...");

  const templates = [
    // ========================================
    // 4. PROJECTS & CONTRACTS (7)
    // ========================================
    {
      name: "contract_started",
      subject: "Project Started - {{projectTitle}}",
      subject_ar: "بدأ المشروع - {{projectTitle}}",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">Project Started!</h1>
    <p>Hi {{userName}},</p>
    <p>The project "<strong>{{projectTitle}}</strong>" has officially started!</p>
    <p><strong>Project Details:</strong></p>
    <ul>
      <li>Start Date: {{startDate}}</li>
      <li>Budget: {{budget}}</li>
      <li>Duration: {{duration}}</li>
    </ul>
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
    <h1 style="color: #00D9A3;">بدأ المشروع!</h1>
    <p>مرحباً {{userName}}،</p>
    <p>بدأ المشروع "<strong>{{projectTitle}}</strong>" رسمياً!</p>
    <p><strong>تفاصيل المشروع:</strong></p>
    <ul>
      <li>تاريخ البدء: {{startDate}}</li>
      <li>الميزانية: {{budget}}</li>
      <li>المدة: {{duration}}</li>
    </ul>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/projects/{{projectId}}" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">عرض المشروع</a>
    </p>
  </div>
</body>
</html>`,
      audience: "both",
      trigger: "contract_started",
      active: true,
    },
    {
      name: "milestone_created",
      subject: "New Milestone Created - {{projectTitle}}",
      subject_ar: "تم إنشاء مرحلة جديدة - {{projectTitle}}",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">New Milestone Added</h1>
    <p>Hi {{userName}},</p>
    <p>A new milestone has been created for "<strong>{{projectTitle}}</strong>".</p>
    <p><strong>Milestone Details:</strong></p>
    <ul>
      <li>Title: {{milestoneTitle}}</li>
      <li>Amount: {{milestoneAmount}}</li>
      <li>Due Date: {{milestoneDueDate}}</li>
    </ul>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/projects/{{projectId}}/milestones" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">View Milestone</a>
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
    <h1 style="color: #00D9A3;">تمت إضافة مرحلة جديدة</h1>
    <p>مرحباً {{userName}}،</p>
    <p>تم إنشاء مرحلة جديدة لـ "<strong>{{projectTitle}}</strong>".</p>
    <p><strong>تفاصيل المرحلة:</strong></p>
    <ul>
      <li>العنوان: {{milestoneTitle}}</li>
      <li>المبلغ: {{milestoneAmount}}</li>
      <li>تاريخ الاستحقاق: {{milestoneDueDate}}</li>
    </ul>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/projects/{{projectId}}/milestones" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">عرض المرحلة</a>
    </p>
  </div>
</body>
</html>`,
      audience: "both",
      trigger: "milestone_created",
      active: true,
    },
    {
      name: "milestone_completed_client",
      subject: "Milestone Completed - {{projectTitle}}",
      subject_ar: "اكتملت المرحلة - {{projectTitle}}",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">Milestone Awaiting Your Review</h1>
    <p>Hi {{userName}},</p>
    <p>The consultant has marked milestone "<strong>{{milestoneTitle}}</strong>" as completed in project "<strong>{{projectTitle}}</strong>".</p>
    <p>Please review the deliverables and approve or request revisions.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/projects/{{projectId}}/milestones/{{milestoneId}}" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Review Milestone</a>
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
    <h1 style="color: #00D9A3;">المرحلة بانتظار مراجعتك</h1>
    <p>مرحباً {{userName}}،</p>
    <p>حدد المستشار المرحلة "<strong>{{milestoneTitle}}</strong>" على أنها مكتملة في المشروع "<strong>{{projectTitle}}</strong>".</p>
    <p>يرجى مراجعة المخرجات والموافقة أو طلب التعديلات.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/projects/{{projectId}}/milestones/{{milestoneId}}" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">مراجعة المرحلة</a>
    </p>
  </div>
</body>
</html>`,
      audience: "client",
      trigger: "milestone_completed_consultant",
      active: true,
    },
    {
      name: "milestone_approved",
      subject: "Milestone Approved - {{projectTitle}}",
      subject_ar: "تمت الموافقة على المرحلة - {{projectTitle}}",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">Milestone Approved!</h1>
    <p>Hi {{userName}},</p>
    <p>Great news! The client has approved milestone "<strong>{{milestoneTitle}}</strong>" for project "<strong>{{projectTitle}}</strong>".</p>
    <p>The payment will be processed and released to you shortly.</p>
    <p><strong>Amount:</strong> {{milestoneAmount}}</p>
  </div>
</body>
</html>`,
      body_ar: `
<!DOCTYPE html>
<html dir="rtl">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">تمت الموافقة على المرحلة!</h1>
    <p>مرحباً {{userName}}،</p>
    <p>أخبار رائعة! وافق العميل على المرحلة "<strong>{{milestoneTitle}}</strong>" للمشروع "<strong>{{projectTitle}}</strong>".</p>
    <p>سيتم معالجة الدفع وإرساله إليك قريباً.</p>
    <p><strong>المبلغ:</strong> {{milestoneAmount}}</p>
  </div>
</body>
</html>`,
      audience: "consultant",
      trigger: "milestone_approved",
      active: true,
    },
    {
      name: "milestone_rejected",
      subject: "Milestone Requires Revisions - {{projectTitle}}",
      subject_ar: "المرحلة تتطلب تعديلات - {{projectTitle}}",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #0A0E27;">Milestone Requires Revisions</h1>
    <p>Hi {{userName}},</p>
    <p>The client has requested revisions for milestone "<strong>{{milestoneTitle}}</strong>" in project "<strong>{{projectTitle}}</strong>".</p>
    <p><strong>Client Feedback:</strong> {{clientFeedback}}</p>
    <p>Please make the requested changes and resubmit the milestone.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/projects/{{projectId}}/milestones/{{milestoneId}}" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">View Feedback</a>
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
    <h1 style="color: #0A0E27;">المرحلة تتطلب تعديلات</h1>
    <p>مرحباً {{userName}}،</p>
    <p>طلب العميل تعديلات على المرحلة "<strong>{{milestoneTitle}}</strong>" في المشروع "<strong>{{projectTitle}}</strong>".</p>
    <p><strong>ملاحظات العميل:</strong> {{clientFeedback}}</p>
    <p>يرجى إجراء التغييرات المطلوبة وإعادة تقديم المرحلة.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/projects/{{projectId}}/milestones/{{milestoneId}}" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">عرض الملاحظات</a>
    </p>
  </div>
</body>
</html>`,
      audience: "consultant",
      trigger: "milestone_rejected",
      active: true,
    },
    {
      name: "project_deadline_reminder",
      subject: "Project Deadline Approaching - {{projectTitle}}",
      subject_ar: "موعد المشروع يقترب - {{projectTitle}}",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">Project Deadline Reminder</h1>
    <p>Hi {{userName}},</p>
    <p>This is a reminder that the deadline for project "<strong>{{projectTitle}}</strong>" is approaching.</p>
    <p><strong>Deadline:</strong> {{deadline}}</p>
    <p><strong>Days Remaining:</strong> {{daysRemaining}}</p>
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
    <h1 style="color: #00D9A3;">تذكير بموعد المشروع</h1>
    <p>مرحباً {{userName}}،</p>
    <p>هذا تذكير بأن الموعد النهائي للمشروع "<strong>{{projectTitle}}</strong>" يقترب.</p>
    <p><strong>الموعد النهائي:</strong> {{deadline}}</p>
    <p><strong>الأيام المتبقية:</strong> {{daysRemaining}}</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/projects/{{projectId}}" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">عرض المشروع</a>
    </p>
  </div>
</body>
</html>`,
      audience: "both",
      trigger: "project_deadline_approaching",
      active: true,
    },
    {
      name: "project_completed",
      subject: "Project Completed Successfully - {{projectTitle}}",
      subject_ar: "اكتمل المشروع بنجاح - {{projectTitle}}",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">Project Completed!</h1>
    <p>Hi {{userName}},</p>
    <p>Congratulations! The project "<strong>{{projectTitle}}</strong>" has been completed successfully.</p>
    <p>Thank you for your excellent work and professionalism.</p>
    <p>We'd love to hear about your experience. Please consider leaving a review.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/projects/{{projectId}}/review" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Leave Review</a>
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
    <h1 style="color: #00D9A3;">اكتمل المشروع!</h1>
    <p>مرحباً {{userName}}،</p>
    <p>تهانينا! تم إكمال المشروع "<strong>{{projectTitle}}</strong>" بنجاح.</p>
    <p>شكراً لعملك الممتاز واحترافيتك.</p>
    <p>يسعدنا سماع تجربتك. يرجى النظر في ترك مراجعة.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/projects/{{projectId}}/review" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">ترك مراجعة</a>
    </p>
  </div>
</body>
</html>`,
      audience: "both",
      trigger: "project_completed",
      active: true,
    },

    // ========================================
    // 5. PAYMENTS & FINANCE (6)
    // ========================================
    {
      name: "payment_received",
      subject: "Payment Received - {{projectTitle}}",
      subject_ar: "تم استلام الدفعة - {{projectTitle}}",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">Payment Received</h1>
    <p>Hi {{userName}},</p>
    <p>We have received your payment for project "<strong>{{projectTitle}}</strong>".</p>
    <p><strong>Payment Details:</strong></p>
    <ul>
      <li>Amount: {{amount}}</li>
      <li>Transaction ID: {{transactionId}}</li>
      <li>Date: {{paymentDate}}</li>
    </ul>
    <p>The funds are now held in escrow and will be released upon milestone completion.</p>
  </div>
</body>
</html>`,
      body_ar: `
<!DOCTYPE html>
<html dir="rtl">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">تم استلام الدفعة</h1>
    <p>مرحباً {{userName}}،</p>
    <p>لقد استلمنا دفعتك للمشروع "<strong>{{projectTitle}}</strong>".</p>
    <p><strong>تفاصيل الدفعة:</strong></p>
    <ul>
      <li>المبلغ: {{amount}}</li>
      <li>رقم المعاملة: {{transactionId}}</li>
      <li>التاريخ: {{paymentDate}}</li>
    </ul>
    <p>الأموال الآن محفوظة في الضمان وسيتم إطلاقها عند إكمال المرحلة.</p>
  </div>
</body>
</html>`,
      audience: "client",
      trigger: "payment_received",
      active: true,
    },
    {
      name: "payment_released",
      subject: "Payment Released - {{amount}}",
      subject_ar: "تم إصدار الدفعة - {{amount}}",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">Payment Released!</h1>
    <p>Hi {{userName}},</p>
    <p>Great news! A payment has been released to your account.</p>
    <p><strong>Payment Details:</strong></p>
    <ul>
      <li>Amount: {{amount}}</li>
      <li>Project: {{projectTitle}}</li>
      <li>Milestone: {{milestoneTitle}}</li>
      <li>Transaction ID: {{transactionId}}</li>
    </ul>
    <p>The funds will be available in your wallet shortly.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/wallet" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">View Wallet</a>
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
    <h1 style="color: #00D9A3;">تم إصدار الدفعة!</h1>
    <p>مرحباً {{userName}}،</p>
    <p>أخبار رائعة! تم إصدار دفعة إلى حسابك.</p>
    <p><strong>تفاصيل الدفعة:</strong></p>
    <ul>
      <li>المبلغ: {{amount}}</li>
      <li>المشروع: {{projectTitle}}</li>
      <li>المرحلة: {{milestoneTitle}}</li>
      <li>رقم المعاملة: {{transactionId}}</li>
    </ul>
    <p>ستكون الأموال متاحة في محفظتك قريباً.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/wallet" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">عرض المحفظة</a>
    </p>
  </div>
</body>
</html>`,
      audience: "consultant",
      trigger: "payment_released",
      active: true,
    },
    {
      name: "withdrawal_request_received",
      subject: "Withdrawal Request Received - {{amount}}",
      subject_ar: "تم استلام طلب السحب - {{amount}}",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">Withdrawal Request Received</h1>
    <p>Hi {{userName}},</p>
    <p>We have received your withdrawal request.</p>
    <p><strong>Request Details:</strong></p>
    <ul>
      <li>Amount: {{amount}}</li>
      <li>Request ID: {{requestId}}</li>
      <li>Date: {{requestDate}}</li>
    </ul>
    <p>Your withdrawal is being processed and will be transferred to your bank account within 3-5 business days.</p>
  </div>
</body>
</html>`,
      body_ar: `
<!DOCTYPE html>
<html dir="rtl">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">تم استلام طلب السحب</h1>
    <p>مرحباً {{userName}}،</p>
    <p>لقد استلمنا طلب السحب الخاص بك.</p>
    <p><strong>تفاصيل الطلب:</strong></p>
    <ul>
      <li>المبلغ: {{amount}}</li>
      <li>رقم الطلب: {{requestId}}</li>
      <li>التاريخ: {{requestDate}}</li>
    </ul>
    <p>يتم معالجة طلب السحب الخاص بك وسيتم تحويله إلى حسابك البنكي خلال 3-5 أيام عمل.</p>
  </div>
</body>
</html>`,
      audience: "consultant",
      trigger: "withdrawal_requested",
      active: true,
    },
    {
      name: "withdrawal_completed",
      subject: "Withdrawal Completed - {{amount}}",
      subject_ar: "اكتمل السحب - {{amount}}",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">Withdrawal Completed!</h1>
    <p>Hi {{userName}},</p>
    <p>Your withdrawal has been completed successfully.</p>
    <p><strong>Transfer Details:</strong></p>
    <ul>
      <li>Amount: {{amount}}</li>
      <li>Bank Account: {{bankAccount}}</li>
      <li>Transfer Date: {{transferDate}}</li>
      <li>Reference: {{referenceNumber}}</li>
    </ul>
    <p>The funds should appear in your bank account within 1-2 business days.</p>
  </div>
</body>
</html>`,
      body_ar: `
<!DOCTYPE html>
<html dir="rtl">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">اكتمل السحب!</h1>
    <p>مرحباً {{userName}}،</p>
    <p>تم إكمال عملية السحب الخاصة بك بنجاح.</p>
    <p><strong>تفاصيل التحويل:</strong></p>
    <ul>
      <li>المبلغ: {{amount}}</li>
      <li>الحساب البنكي: {{bankAccount}}</li>
      <li>تاريخ التحويل: {{transferDate}}</li>
      <li>المرجع: {{referenceNumber}}</li>
    </ul>
    <p>يجب أن تظهر الأموال في حسابك البنكي خلال 1-2 يوم عمل.</p>
  </div>
</body>
</html>`,
      audience: "consultant",
      trigger: "withdrawal_completed",
      active: true,
    },
    {
      name: "low_balance_warning",
      subject: "Low Balance Alert - EDGEIT24",
      subject_ar: "تنبيه رصيد منخفض - EDGEIT24",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #0A0E27;">Low Balance Warning</h1>
    <p>Hi {{userName}},</p>
    <p>Your wallet balance is running low.</p>
    <p><strong>Current Balance:</strong> {{currentBalance}}</p>
    <p><strong>Upcoming Milestone Payment:</strong> {{upcomingPayment}}</p>
    <p>Please add funds to your wallet to ensure smooth project continuity.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/wallet/add-funds" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Add Funds</a>
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
    <h1 style="color: #0A0E27;">تنبيه رصيد منخفض</h1>
    <p>مرحباً {{userName}}،</p>
    <p>رصيد محفظتك ينفذ.</p>
    <p><strong>الرصيد الحالي:</strong> {{currentBalance}}</p>
    <p><strong>دفعة المرحلة القادمة:</strong> {{upcomingPayment}}</p>
    <p>يرجى إضافة أموال إلى محفظتك لضمان استمرارية المشروع بسلاسة.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/wallet/add-funds" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">إضافة أموال</a>
    </p>
  </div>
</body>
</html>`,
      audience: "client",
      trigger: "low_balance_detected",
      active: true,
    },
    {
      name: "invoice_generated",
      subject: "Invoice for Platform Commission - {{invoiceId}}",
      subject_ar: "فاتورة عمولة المنصة - {{invoiceId}}",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #0A0E27;">Invoice Generated</h1>
    <p>Hi {{userName}},</p>
    <p>An invoice has been generated for your platform commission.</p>
    <p><strong>Invoice Details:</strong></p>
    <ul>
      <li>Invoice ID: {{invoiceId}}</li>
      <li>Amount: {{amount}}</li>
      <li>Project: {{projectTitle}}</li>
      <li>Due Date: {{dueDate}}</li>
    </ul>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/invoices/{{invoiceId}}" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">View Invoice</a>
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
    <h1 style="color: #0A0E27;">تم إنشاء الفاتورة</h1>
    <p>مرحباً {{userName}}،</p>
    <p>تم إنشاء فاتورة لعمولة المنصة الخاصة بك.</p>
    <p><strong>تفاصيل الفاتورة:</strong></p>
    <ul>
      <li>رقم الفاتورة: {{invoiceId}}</li>
      <li>المبلغ: {{amount}}</li>
      <li>المشروع: {{projectTitle}}</li>
      <li>تاريخ الاستحقاق: {{dueDate}}</li>
    </ul>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/invoices/{{invoiceId}}" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">عرض الفاتورة</a>
    </p>
  </div>
</body>
</html>`,
      audience: "both",
      trigger: "invoice_generated",
      active: true,
    },

    // ========================================
    // 6. DISPUTES (4)
    // ========================================
    {
      name: "dispute_raised",
      subject: "Dispute Raised - {{projectTitle}}",
      subject_ar: "تم رفع نزاع - {{projectTitle}}",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #0A0E27;">Dispute Raised</h1>
    <p>Hi {{userName}},</p>
    <p>A dispute has been raised regarding project "<strong>{{projectTitle}}</strong>".</p>
    <p><strong>Dispute Details:</strong></p>
    <ul>
      <li>Raised by: {{raisedBy}}</li>
      <li>Reason: {{disputeReason}}</li>
      <li>Date: {{disputeDate}}</li>
    </ul>
    <p>Our admin team will review the case and contact both parties shortly.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/disputes/{{disputeId}}" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">View Dispute</a>
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
    <h1 style="color: #0A0E27;">تم رفع نزاع</h1>
    <p>مرحباً {{userName}}،</p>
    <p>تم رفع نزاع بخصوص المشروع "<strong>{{projectTitle}}</strong>".</p>
    <p><strong>تفاصيل النزاع:</strong></p>
    <ul>
      <li>رفع من قبل: {{raisedBy}}</li>
      <li>السبب: {{disputeReason}}</li>
      <li>التاريخ: {{disputeDate}}</li>
    </ul>
    <p>سيقوم فريق الإدارة لدينا بمراجعة الحالة والتواصل مع الطرفين قريباً.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/disputes/{{disputeId}}" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">عرض النزاع</a>
    </p>
  </div>
</body>
</html>`,
      audience: "both",
      trigger: "dispute_raised",
      active: true,
    },
    {
      name: "dispute_under_review",
      subject: "Dispute Under Review - {{projectTitle}}",
      subject_ar: "النزاع قيد المراجعة - {{projectTitle}}",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">Dispute Under Review</h1>
    <p>Hi {{userName}},</p>
    <p>The dispute regarding project "<strong>{{projectTitle}}</strong>" is now under review by our admin team.</p>
    <p>We are carefully examining all evidence and communications from both parties.</p>
    <p>You will be notified of the resolution within 5-7 business days.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/disputes/{{disputeId}}" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">View Status</a>
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
    <h1 style="color: #00D9A3;">النزاع قيد المراجعة</h1>
    <p>مرحباً {{userName}}،</p>
    <p>النزاع المتعلق بالمشروع "<strong>{{projectTitle}}</strong>" قيد المراجعة الآن من قبل فريق الإدارة لدينا.</p>
    <p>نقوم بفحص جميع الأدلة والاتصالات من كلا الطرفين بعناية.</p>
    <p>سيتم إخطارك بالقرار خلال 5-7 أيام عمل.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/disputes/{{disputeId}}" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">عرض الحالة</a>
    </p>
  </div>
</body>
</html>`,
      audience: "both",
      trigger: "dispute_under_review",
      active: true,
    },
    {
      name: "dispute_resolved",
      subject: "Dispute Resolved - {{projectTitle}}",
      subject_ar: "تم حل النزاع - {{projectTitle}}",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">Dispute Resolved</h1>
    <p>Hi {{userName}},</p>
    <p>The dispute regarding project "<strong>{{projectTitle}}</strong>" has been resolved.</p>
    <p><strong>Resolution:</strong> {{resolutionDetails}}</p>
    <p>Thank you for your patience and cooperation during this process.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/disputes/{{disputeId}}" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">View Resolution</a>
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
    <h1 style="color: #00D9A3;">تم حل النزاع</h1>
    <p>مرحباً {{userName}}،</p>
    <p>تم حل النزاع المتعلق بالمشروع "<strong>{{projectTitle}}</strong>".</p>
    <p><strong>القرار:</strong> {{resolutionDetails}}</p>
    <p>شكراً لصبرك وتعاونك خلال هذه العملية.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/disputes/{{disputeId}}" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">عرض القرار</a>
    </p>
  </div>
</body>
</html>`,
      audience: "both",
      trigger: "dispute_resolved",
      active: true,
    },
    {
      name: "dispute_escalated",
      subject: "Dispute Requires Your Attention - {{projectTitle}}",
      subject_ar: "النزاع يتطلب انتباهك - {{projectTitle}}",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #0A0E27;">Dispute Escalated</h1>
    <p>Hi {{userName}},</p>
    <p>The dispute for project "<strong>{{projectTitle}}</strong>" requires additional information from you.</p>
    <p><strong>Admin Request:</strong> {{adminRequest}}</p>
    <p>Please provide the requested information within 3 business days.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/disputes/{{disputeId}}/respond" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Respond Now</a>
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
    <h1 style="color: #0A0E27;">تم تصعيد النزاع</h1>
    <p>مرحباً {{userName}}،</p>
    <p>النزاع الخاص بالمشروع "<strong>{{projectTitle}}</strong>" يتطلب معلومات إضافية منك.</p>
    <p><strong>طلب الإدارة:</strong> {{adminRequest}}</p>
    <p>يرجى تقديم المعلومات المطلوبة خلال 3 أيام عمل.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/disputes/{{disputeId}}/respond" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">الرد الآن</a>
    </p>
  </div>
</body>
</html>`,
      audience: "both",
      trigger: "dispute_escalated",
      active: true,
    },

    // ========================================
    // 7. SUBSCRIPTIONS (5)
    // ========================================
    {
      name: "subscription_purchased",
      subject: "Subscription Activated - {{planName}}",
      subject_ar: "تم تفعيل الاشتراك - {{planName}}",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">Subscription Activated!</h1>
    <p>Hi {{userName}},</p>
    <p>Your subscription to "<strong>{{planName}}</strong>" has been activated successfully.</p>
    <p><strong>Plan Details:</strong></p>
    <ul>
      <li>Plan: {{planName}}</li>
      <li>Price: {{planPrice}}</li>
      <li>Billing Cycle: {{billingCycle}}</li>
      <li>Next Billing Date: {{nextBillingDate}}</li>
    </ul>
    <p>Enjoy all the premium features!</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/dashboard" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Explore Features</a>
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
    <h1 style="color: #00D9A3;">تم تفعيل الاشتراك!</h1>
    <p>مرحباً {{userName}}،</p>
    <p>تم تفعيل اشتراكك في "<strong>{{planName}}</strong>" بنجاح.</p>
    <p><strong>تفاصيل الخطة:</strong></p>
    <ul>
      <li>الخطة: {{planName}}</li>
      <li>السعر: {{planPrice}}</li>
      <li>دورة الفوترة: {{billingCycle}}</li>
      <li>تاريخ الفوترة التالي: {{nextBillingDate}}</li>
    </ul>
    <p>استمتع بجميع الميزات المميزة!</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/dashboard" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">استكشف الميزات</a>
    </p>
  </div>
</body>
</html>`,
      audience: "both",
      trigger: "subscription_purchased",
      active: true,
    },
    {
      name: "subscription_expiring_soon",
      subject: "Your Subscription Expires in {{daysLeft}} Days",
      subject_ar: "ينتهي اشتراكك خلال {{daysLeft}} أيام",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #0A0E27;">Subscription Expiring Soon</h1>
    <p>Hi {{userName}},</p>
    <p>Your subscription to "<strong>{{planName}}</strong>" will expire in {{daysLeft}} days.</p>
    <p><strong>Expiry Date:</strong> {{expiryDate}}</p>
    <p>Renew now to continue enjoying premium features without interruption.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/subscriptions/renew" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Renew Now</a>
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
    <h1 style="color: #0A0E27;">الاشتراك ينتهي قريباً</h1>
    <p>مرحباً {{userName}}،</p>
    <p>سينتهي اشتراكك في "<strong>{{planName}}</strong>" خلال {{daysLeft}} أيام.</p>
    <p><strong>تاريخ الانتهاء:</strong> {{expiryDate}}</p>
    <p>جدد الآن للاستمرار في الاستمتاع بالميزات المميزة دون انقطاع.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/subscriptions/renew" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">تجديد الآن</a>
    </p>
  </div>
</body>
</html>`,
      audience: "both",
      trigger: "subscription_expiring_soon",
      active: true,
    },
    {
      name: "subscription_expired",
      subject: "Your Subscription Has Expired - {{planName}}",
      subject_ar: "انتهى اشتراكك - {{planName}}",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #0A0E27;">Subscription Expired</h1>
    <p>Hi {{userName}},</p>
    <p>Your subscription to "<strong>{{planName}}</strong>" has expired.</p>
    <p>Your account has been downgraded to the free plan. Renew now to restore premium features.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/subscriptions/plans" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Choose a Plan</a>
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
    <h1 style="color: #0A0E27;">انتهى الاشتراك</h1>
    <p>مرحباً {{userName}}،</p>
    <p>انتهى اشتراكك في "<strong>{{planName}}</strong>".</p>
    <p>تم تخفيض حسابك إلى الخطة المجانية. جدد الآن لاستعادة الميزات المميزة.</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/subscriptions/plans" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">اختر خطة</a>
    </p>
  </div>
</body>
</html>`,
      audience: "both",
      trigger: "subscription_expired",
      active: true,
    },
    {
      name: "subscription_renewed",
      subject: "Subscription Renewed Successfully - {{planName}}",
      subject_ar: "تم تجديد الاشتراك بنجاح - {{planName}}",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">Subscription Renewed!</h1>
    <p>Hi {{userName}},</p>
    <p>Your subscription to "<strong>{{planName}}</strong>" has been renewed successfully.</p>
    <p><strong>Renewal Details:</strong></p>
    <ul>
      <li>Amount Charged: {{chargedAmount}}</li>
      <li>Next Billing Date: {{nextBillingDate}}</li>
      <li>Transaction ID: {{transactionId}}</li>
    </ul>
    <p>Thank you for continuing with EDGEIT24!</p>
  </div>
</body>
</html>`,
      body_ar: `
<!DOCTYPE html>
<html dir="rtl">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">تم تجديد الاشتراك!</h1>
    <p>مرحباً {{userName}}،</p>
    <p>تم تجديد اشتراكك في "<strong>{{planName}}</strong>" بنجاح.</p>
    <p><strong>تفاصيل التجديد:</strong></p>
    <ul>
      <li>المبلغ المدفوع: {{chargedAmount}}</li>
      <li>تاريخ الفوترة التالي: {{nextBillingDate}}</li>
      <li>رقم المعاملة: {{transactionId}}</li>
    </ul>
    <p>شكراً لاستمرارك مع EDGEIT24!</p>
  </div>
</body>
</html>`,
      audience: "both",
      trigger: "subscription_renewed",
      active: true,
    },
    {
      name: "subscription_changed",
      subject: "Subscription Plan Changed - {{newPlanName}}",
      subject_ar: "تم تغيير خطة الاشتراك - {{newPlanName}}",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">Subscription Plan Changed</h1>
    <p>Hi {{userName}},</p>
    <p>Your subscription plan has been changed successfully.</p>
    <p><strong>Change Details:</strong></p>
    <ul>
      <li>Previous Plan: {{oldPlanName}}</li>
      <li>New Plan: {{newPlanName}}</li>
      <li>New Price: {{newPrice}}</li>
      <li>Effective Date: {{effectiveDate}}</li>
    </ul>
    <p>Your new plan features are now active!</p>
  </div>
</body>
</html>`,
      body_ar: `
<!DOCTYPE html>
<html dir="rtl">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">تم تغيير خطة الاشتراك</h1>
    <p>مرحباً {{userName}}،</p>
    <p>تم تغيير خطة اشتراكك بنجاح.</p>
    <p><strong>تفاصيل التغيير:</strong></p>
    <ul>
      <li>الخطة السابقة: {{oldPlanName}}</li>
      <li>الخطة الجديدة: {{newPlanName}}</li>
      <li>السعر الجديد: {{newPrice}}</li>
      <li>تاريخ السريان: {{effectiveDate}}</li>
    </ul>
    <p>ميزات خطتك الجديدة نشطة الآن!</p>
  </div>
</body>
</html>`,
      audience: "both",
      trigger: "subscription_plan_changed",
      active: true,
    },

    // ========================================
    // 8. PLATFORM NOTIFICATIONS (4)
    // ========================================
    {
      name: "system_maintenance",
      subject: "Scheduled System Maintenance - EDGEIT24",
      subject_ar: "صيانة نظام مجدولة - EDGEIT24",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #0A0E27;">Scheduled System Maintenance</h1>
    <p>Hi {{userName}},</p>
    <p>We will be performing scheduled system maintenance to improve platform performance.</p>
    <p><strong>Maintenance Window:</strong></p>
    <ul>
      <li>Start: {{maintenanceStart}}</li>
      <li>End: {{maintenanceEnd}}</li>
      <li>Duration: {{duration}}</li>
    </ul>
    <p>The platform will be temporarily unavailable during this time. We apologize for any inconvenience.</p>
  </div>
</body>
</html>`,
      body_ar: `
<!DOCTYPE html>
<html dir="rtl">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #0A0E27;">صيانة نظام مجدولة</h1>
    <p>مرحباً {{userName}}،</p>
    <p>سنقوم بإجراء صيانة نظام مجدولة لتحسين أداء المنصة.</p>
    <p><strong>فترة الصيانة:</strong></p>
    <ul>
      <li>البداية: {{maintenanceStart}}</li>
      <li>النهاية: {{maintenanceEnd}}</li>
      <li>المدة: {{duration}}</li>
    </ul>
    <p>ستكون المنصة غير متاحة مؤقتاً خلال هذا الوقت. نعتذر عن أي إزعاج.</p>
  </div>
</body>
</html>`,
      audience: "both",
      trigger: "system_maintenance_scheduled",
      active: true,
    },
    {
      name: "new_feature_announcement",
      subject: "New Feature: {{featureName}} - EDGEIT24",
      subject_ar: "ميزة جديدة: {{featureName}} - EDGEIT24",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">Exciting New Feature!</h1>
    <p>Hi {{userName}},</p>
    <p>We're excited to announce a new feature: <strong>{{featureName}}</strong></p>
    <p>{{featureDescription}}</p>
    <p><strong>How to Use:</strong></p>
    <p>{{howToUse}}</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/features/{{featureSlug}}" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Learn More</a>
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
    <h1 style="color: #00D9A3;">ميزة جديدة مثيرة!</h1>
    <p>مرحباً {{userName}}،</p>
    <p>يسعدنا الإعلان عن ميزة جديدة: <strong>{{featureName}}</strong></p>
    <p>{{featureDescription}}</p>
    <p><strong>كيفية الاستخدام:</strong></p>
    <p>{{howToUse}}</p>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/features/{{featureSlug}}" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">معرفة المزيد</a>
    </p>
  </div>
</body>
</html>`,
      audience: "both",
      trigger: "new_feature_announced",
      active: true,
    },
    {
      name: "account_suspended",
      subject: "Important: Account Suspended - EDGEIT24",
      subject_ar: "مهم: تم تعليق الحساب - EDGEIT24",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #0A0E27;">Account Suspended</h1>
    <p>Hi {{userName}},</p>
    <p>Your EDGEIT24 account has been temporarily suspended due to a policy violation.</p>
    <p><strong>Reason:</strong> {{suspensionReason}}</p>
    <p><strong>Suspension Period:</strong> {{suspensionPeriod}}</p>
    <p>If you believe this is an error, please contact our support team immediately at {{supportEmail}}.</p>
  </div>
</body>
</html>`,
      body_ar: `
<!DOCTYPE html>
<html dir="rtl">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #0A0E27;">تم تعليق الحساب</h1>
    <p>مرحباً {{userName}}،</p>
    <p>تم تعليق حسابك في EDGEIT24 مؤقتاً بسبب انتهاك السياسة.</p>
    <p><strong>السبب:</strong> {{suspensionReason}}</p>
    <p><strong>فترة التعليق:</strong> {{suspensionPeriod}}</p>
    <p>إذا كنت تعتقد أن هذا خطأ، يرجى الاتصال بفريق الدعم فوراً على {{supportEmail}}.</p>
  </div>
</body>
</html>`,
      audience: "both",
      trigger: "account_suspended",
      active: true,
    },
    {
      name: "monthly_activity_summary",
      subject: "Your Monthly Activity Summary - EDGEIT24",
      subject_ar: "ملخص نشاطك الشهري - EDGEIT24",
      body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #00D9A3;">Monthly Activity Summary</h1>
    <p>Hi {{userName}},</p>
    <p>Here's your activity summary for {{monthName}} {{year}}:</p>
    <p><strong>Your Stats:</strong></p>
    <ul>
      <li>Projects: {{projectCount}}</li>
      <li>Bids: {{bidCount}}</li>
      <li>Earnings/Spending: {{totalAmount}}</li>
      <li>Messages: {{messageCount}}</li>
    </ul>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/dashboard" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">View Dashboard</a>
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
    <h1 style="color: #00D9A3;">ملخص النشاط الشهري</h1>
    <p>مرحباً {{userName}}،</p>
    <p>إليك ملخص نشاطك لشهر {{monthName}} {{year}}:</p>
    <p><strong>إحصاءاتك:</strong></p>
    <ul>
      <li>المشاريع: {{projectCount}}</li>
      <li>العروض: {{bidCount}}</li>
      <li>الأرباح/المصروفات: {{totalAmount}}</li>
      <li>الرسائل: {{messageCount}}</li>
    </ul>
    <p style="margin-top: 30px;">
      <a href="{{platformUrl}}/dashboard" style="background: #00D9A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">عرض لوحة التحكم</a>
    </p>
  </div>
</body>
</html>`,
      audience: "both",
      trigger: "monthly_summary",
      active: true,
    },
  ];

  // Insert templates
  console.log(`Inserting ${templates.length} email templates (Part 2)...`);
  
  for (const template of templates) {
    await db.insert(emailTemplates).values(template).onConflictDoNothing();
  }

  console.log("✅ Email templates seeded successfully (Part 2 of 2)");
  console.log(`📧 Total templates: 44 (Part 1: 8, Part 2: 36)`);
}

seedEmailTemplatesPart2()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error seeding email templates:", error);
    process.exit(1);
  });
