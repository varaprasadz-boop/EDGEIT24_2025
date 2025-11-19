import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";

interface WarrantyConfig {
  duration?: string;
  terms?: string;
  supportOptions?: string[];
}

interface WarrantyConfigBuilderProps {
  value: WarrantyConfig | null;
  onChange: (value: WarrantyConfig) => void;
}

const DURATION_OPTIONS = [
  { value: "3_months", label: "3 Months" },
  { value: "6_months", label: "6 Months" },
  { value: "1_year", label: "1 Year" },
  { value: "2_years", label: "2 Years" },
  { value: "3_years", label: "3 Years" },
  { value: "5_years", label: "5 Years" },
  { value: "lifetime", label: "Lifetime" },
];

const SUPPORT_OPTIONS = [
  { id: "email", label: "Email Support" },
  { id: "phone", label: "Phone Support" },
  { id: "chat", label: "Live Chat" },
  { id: "onsite", label: "On-site Support" },
];

export function WarrantyConfigBuilder({ value, onChange }: WarrantyConfigBuilderProps) {
  const { t } = useTranslation();
  
  const currentValue: WarrantyConfig = value || {
    duration: "",
    terms: "",
    supportOptions: [],
  };

  const handleDurationChange = (duration: string) => {
    onChange({
      ...currentValue,
      duration,
    });
  };

  const handleTermsChange = (terms: string) => {
    onChange({
      ...currentValue,
      terms,
    });
  };

  const handleSupportToggle = (optionId: string, checked: boolean) => {
    const options = currentValue.supportOptions || [];
    const updated = checked
      ? [...options, optionId]
      : options.filter((o) => o !== optionId);
    
    onChange({
      ...currentValue,
      supportOptions: updated,
    });
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {t("categories.warrantyConfigDescription")}
      </div>

      {/* Warranty Duration */}
      <div className="space-y-2">
        <Label htmlFor="warranty-duration">{t("categories.warrantyDuration")}</Label>
        <Select
          value={currentValue.duration || ""}
          onValueChange={handleDurationChange}
        >
          <SelectTrigger id="warranty-duration" data-testid="select-warranty-duration">
            <SelectValue placeholder={t("categories.selectDuration")} />
          </SelectTrigger>
          <SelectContent>
            {DURATION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Warranty Terms */}
      <div className="space-y-2">
        <Label htmlFor="warranty-terms">{t("categories.warrantyTerms")}</Label>
        <Textarea
          id="warranty-terms"
          value={currentValue.terms || ""}
          onChange={(e) => handleTermsChange(e.target.value)}
          placeholder={t("categories.warrantyTermsPlaceholder")}
          rows={4}
          data-testid="textarea-warranty-terms"
        />
        <p className="text-xs text-muted-foreground">
          {t("categories.warrantyTermsHelper")}
        </p>
      </div>

      {/* Support Options */}
      <div className="space-y-2">
        <Label>{t("categories.supportOptions")}</Label>
        <Card className="p-4 space-y-2">
          {SUPPORT_OPTIONS.map((option) => {
            const isChecked = (currentValue.supportOptions || []).includes(option.id);
            
            return (
              <div key={option.id} className="flex items-center gap-2">
                <Checkbox
                  id={`support-${option.id}`}
                  checked={isChecked}
                  onCheckedChange={(checked) => handleSupportToggle(option.id, checked as boolean)}
                  data-testid={`checkbox-support-${option.id}`}
                />
                <Label
                  htmlFor={`support-${option.id}`}
                  className="font-normal cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}
