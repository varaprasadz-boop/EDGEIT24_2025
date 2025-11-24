import { Card, CardContent } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export default function AdminSecurityDashboard() {
  console.log('[AdminSecurityDashboard] Component rendering...');
  
  return (
    <div className="space-y-4 p-4">
      <AdminPageHeader
        title="Security Dashboard"
        subtitle="System-wide security monitoring and analytics"
        testId="security-dashboard"
      />
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-lg font-medium">Security Dashboard</p>
          <p className="text-center text-muted-foreground mt-2">Basic version working - full features coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}
