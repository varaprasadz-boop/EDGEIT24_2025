import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FeatureListBuilder } from "@/components/admin/FeatureListBuilder";

const multilingualFeatureSchema = z.object({
  en: z.string().min(1, "English feature is required"),
  ar: z.string().optional(),
});

const planFormSchema = z.object({
  name: z.string().min(1, "Plan name is required"),
  nameAr: z.string().optional(),
  audience: z.enum(["client", "consultant", "both"]),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  price: z.string().min(0, "Price must be 0 or greater"),
  currency: z.string().default("SAR"),
  billingCycle: z.enum(["monthly", "quarterly", "yearly"]).default("monthly"),
  status: z.enum(["active", "inactive", "archived"]).default("active"),
  featured: z.boolean().default(false),
  popular: z.boolean().default(false),
  displayOrder: z.number().int().min(0).default(0),
  features: z.any().optional(),
  supportLevel: z.string().optional(),
  analyticsAccess: z.boolean().default(false),
  apiAccess: z.boolean().default(false),
  whiteLabel: z.boolean().default(false),
  customIntegrations: z.boolean().default(false),
  dedicatedAccountManager: z.boolean().default(false),
  slaGuarantee: z.boolean().default(false),
});

type PlanFormValues = z.infer<typeof planFormSchema>;

interface PlanFormProps {
  plan?: any | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isPending: boolean;
}

export function PlanForm({ plan, onSubmit, onCancel, isPending }: PlanFormProps) {
  const { t } = useTranslation();

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      name: plan?.name || "",
      nameAr: plan?.nameAr || "",
      audience: plan?.audience || "both",
      description: plan?.description || "",
      descriptionAr: plan?.descriptionAr || "",
      price: plan?.price || "0",
      currency: plan?.currency || "SAR",
      billingCycle: plan?.billingCycle || "monthly",
      status: plan?.status || "active",
      featured: plan?.featured || false,
      popular: plan?.popular || false,
      displayOrder: plan?.displayOrder || 0,
      features: plan?.features || null,
      supportLevel: plan?.supportLevel || "email",
      analyticsAccess: plan?.analyticsAccess || false,
      apiAccess: plan?.apiAccess || false,
      whiteLabel: plan?.whiteLabel || false,
      customIntegrations: plan?.customIntegrations || false,
      dedicatedAccountManager: plan?.dedicatedAccountManager || false,
      slaGuarantee: plan?.slaGuarantee || false,
    },
  });

  const handleSubmit = (data: PlanFormValues) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm">{t("subscriptionPlans.basicInformation")}</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("subscriptionPlans.planName")} (EN)</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-plan-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nameAr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("subscriptionPlans.planName")} (AR)</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-plan-name-ar" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("common.description")} (EN)</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={2} data-testid="input-plan-description" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="descriptionAr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("common.description")} (AR)</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={2} data-testid="input-plan-description-ar" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="audience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("subscriptionPlans.audience")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-audience">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="client">{t("subscriptionPlans.client")}</SelectItem>
                      <SelectItem value="consultant">{t("subscriptionPlans.consultant")}</SelectItem>
                      <SelectItem value="both">{t("subscriptionPlans.both")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("subscriptionPlans.price")}</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} data-testid="input-price" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="displayOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("subscriptionPlans.displayOrder")}</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} data-testid="input-display-order" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="billingCycle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("subscriptionPlans.billingCycle")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-billing-cycle">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="monthly">{t("subscriptionPlans.monthly")}</SelectItem>
                      <SelectItem value="quarterly">{t("subscriptionPlans.quarterly")}</SelectItem>
                      <SelectItem value="yearly">{t("subscriptionPlans.yearly")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.status")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-status">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">{t("common.active")}</SelectItem>
                      <SelectItem value="inactive">{t("common.inactive")}</SelectItem>
                      <SelectItem value="archived">{t("subscriptionPlans.archived")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="supportLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("subscriptionPlans.supportLevel")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-support-level">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="24/7">24/7</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Features */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm">{t("subscriptionPlans.features")}</h3>
          
          <FormField
            control={form.control}
            name="features"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <FeatureListBuilder
                    features={field.value?.list || []}
                    onChange={(list) => field.onChange({ ...(field.value || {}), list })}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="featured"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>{t("subscriptionPlans.featured")}</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-featured"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="popular"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>{t("subscriptionPlans.popular")}</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-popular"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="analyticsAccess"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>{t("subscriptionPlans.analyticsAccess")}</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-analytics"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="apiAccess"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 gap-4">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <FormLabel className="text-sm">{t("subscriptionPlans.apiAccess")}</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-api"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="whiteLabel"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 gap-4">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <FormLabel className="text-sm">{t("subscriptionPlans.whiteLabel")}</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-white-label"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customIntegrations"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 gap-4">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <FormLabel className="text-sm">{t("subscriptionPlans.customIntegrations")}</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-custom-integrations"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="dedicatedAccountManager"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>{t("subscriptionPlans.dedicatedAccountManager")}</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-account-manager"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slaGuarantee"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>{t("subscriptionPlans.slaGuarantee")}</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-sla"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
            data-testid="button-cancel"
          >
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={isPending} data-testid="button-save">
            {isPending ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
