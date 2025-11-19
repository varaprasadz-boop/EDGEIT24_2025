import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, GripVertical } from "lucide-react";
import { Card } from "@/components/ui/card";

interface FeatureListBuilderProps {
  features: string[];
  onChange: (features: string[]) => void;
}

export function FeatureListBuilder({ features, onChange }: FeatureListBuilderProps) {
  const { t } = useTranslation();
  const [newFeature, setNewFeature] = useState("");

  const addFeature = () => {
    if (newFeature.trim()) {
      onChange([...features, newFeature.trim()]);
      setNewFeature("");
    }
  };

  const removeFeature = (index: number) => {
    onChange(features.filter((_, i) => i !== index));
  };

  const updateFeature = (index: number, value: string) => {
    const updated = [...features];
    updated[index] = value;
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        {t("subscriptionPlans.featureListDescription")}
      </div>

      {/* Existing Features */}
      {features.length > 0 && (
        <div className="space-y-2">
          {features.map((feature, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Input
                  value={feature}
                  onChange={(e) => updateFeature(index, e.target.value)}
                  placeholder={t("subscriptionPlans.featurePlaceholder")}
                  data-testid={`input-feature-${index}`}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFeature(index)}
                  data-testid={`button-remove-feature-${index}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add New Feature */}
      <div className="flex gap-2">
        <Input
          value={newFeature}
          onChange={(e) => setNewFeature(e.target.value)}
          placeholder={t("subscriptionPlans.addFeaturePlaceholder")}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addFeature();
            }
          }}
          data-testid="input-new-feature"
          className="flex-1"
        />
        <Button
          type="button"
          onClick={addFeature}
          disabled={!newFeature.trim()}
          data-testid="button-add-feature"
        >
          <Plus className="h-4 w-4 mr-1" />
          {t("common.add")}
        </Button>
      </div>

      {features.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
          {t("subscriptionPlans.noFeaturesYet")}
        </div>
      )}
    </div>
  );
}
