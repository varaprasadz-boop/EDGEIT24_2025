import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";

interface DeliveryOptions {
  shippingMethods?: string[];
  estimatedDays?: string;
  fees?: {
    [key: string]: number;
  };
}

interface DeliveryOptionsBuilderProps {
  value: DeliveryOptions | null;
  onChange: (value: DeliveryOptions) => void;
}

const SHIPPING_METHODS = [
  { id: "standard", label: "Standard Shipping" },
  { id: "express", label: "Express Shipping" },
  { id: "sameDay", label: "Same Day Delivery" },
  { id: "pickup", label: "Store Pickup" },
];

export function DeliveryOptionsBuilder({ value, onChange }: DeliveryOptionsBuilderProps) {
  const { t } = useTranslation();
  
  const currentValue: DeliveryOptions = value || {
    shippingMethods: [],
    estimatedDays: "",
    fees: {},
  };

  const handleMethodToggle = (methodId: string, checked: boolean) => {
    const methods = currentValue.shippingMethods || [];
    const updated = checked
      ? [...methods, methodId]
      : methods.filter((m) => m !== methodId);
    
    onChange({
      ...currentValue,
      shippingMethods: updated,
    });
  };

  const handleEstimatedDaysChange = (days: string) => {
    onChange({
      ...currentValue,
      estimatedDays: days,
    });
  };

  const handleFeeChange = (methodId: string, fee: string) => {
    const feeValue = parseFloat(fee) || 0;
    onChange({
      ...currentValue,
      fees: {
        ...currentValue.fees,
        [methodId]: feeValue,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {t("categories.deliveryOptionsDescription")}
      </div>

      {/* Shipping Methods */}
      <div className="space-y-3">
        <Label>{t("categories.shippingMethods")}</Label>
        <Card className="p-4 space-y-3">
          {SHIPPING_METHODS.map((method) => {
            const isChecked = (currentValue.shippingMethods || []).includes(method.id);
            
            return (
              <div key={method.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`method-${method.id}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => handleMethodToggle(method.id, checked as boolean)}
                    data-testid={`checkbox-shipping-${method.id}`}
                  />
                  <Label
                    htmlFor={`method-${method.id}`}
                    className="font-normal cursor-pointer"
                  >
                    {method.label}
                  </Label>
                </div>
                
                {isChecked && (
                  <div className="ml-6 flex items-center gap-2">
                    <Label className="text-sm min-w-20">{t("categories.fee")} (SAR):</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={currentValue.fees?.[method.id] || ""}
                      onChange={(e) => handleFeeChange(method.id, e.target.value)}
                      placeholder="0.00"
                      className="w-32"
                      data-testid={`input-fee-${method.id}`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      </div>

      {/* Estimated Delivery Days */}
      <div className="space-y-2">
        <Label htmlFor="estimated-days">{t("categories.estimatedDeliveryDays")}</Label>
        <Input
          id="estimated-days"
          value={currentValue.estimatedDays || ""}
          onChange={(e) => handleEstimatedDaysChange(e.target.value)}
          placeholder={t("categories.estimatedDaysPlaceholder")}
          data-testid="input-estimated-days"
        />
        <p className="text-xs text-muted-foreground">
          {t("categories.estimatedDaysHelper")}
        </p>
      </div>
    </div>
  );
}
