import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, GripVertical } from "lucide-react";
import { Card } from "@/components/ui/card";

interface MultilingualFeature {
  en: string;
  ar?: string;
}

interface FeatureListBuilderProps {
  features: MultilingualFeature[];
  onChange: (features: MultilingualFeature[]) => void;
}

export function FeatureListBuilder({ features, onChange }: FeatureListBuilderProps) {
  const { t } = useTranslation();
  const [newFeatureEn, setNewFeatureEn] = useState("");
  const [newFeatureAr, setNewFeatureAr] = useState("");

  const addFeature = () => {
    if (newFeatureEn.trim()) {
      onChange([...features, { 
        en: newFeatureEn.trim(), 
        ar: newFeatureAr.trim() || undefined 
      }]);
      setNewFeatureEn("");
      setNewFeatureAr("");
    }
  };

  const removeFeature = (index: number) => {
    onChange(features.filter((_, i) => i !== index));
  };

  const updateFeature = (index: number, lang: 'en' | 'ar', value: string) => {
    const updated = [...features];
    if (lang === 'en') {
      updated[index] = { ...updated[index], en: value };
    } else {
      updated[index] = { ...updated[index], ar: value || undefined };
    }
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        Add features in both English and Arabic for multilingual support
      </div>

      {/* Existing Features */}
      {features.length > 0 && (
        <div className="space-y-2">
          {features.map((feature, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-start gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-2" />
                <div className="flex-1 space-y-2">
                  <Input
                    value={feature.en}
                    onChange={(e) => updateFeature(index, 'en', e.target.value)}
                    placeholder="Feature (English)"
                    data-testid={`input-feature-en-${index}`}
                  />
                  <Input
                    value={feature.ar || ""}
                    onChange={(e) => updateFeature(index, 'ar', e.target.value)}
                    placeholder="الميزة (بالعربية)"
                    data-testid={`input-feature-ar-${index}`}
                    dir="rtl"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFeature(index)}
                  data-testid={`button-remove-feature-${index}`}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add New Feature */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={newFeatureEn}
            onChange={(e) => setNewFeatureEn(e.target.value)}
            placeholder="Feature (English)"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addFeature();
              }
            }}
            data-testid="input-new-feature-en"
          />
          <Input
            value={newFeatureAr}
            onChange={(e) => setNewFeatureAr(e.target.value)}
            placeholder="الميزة (بالعربية)"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addFeature();
              }
            }}
            data-testid="input-new-feature-ar"
            dir="rtl"
          />
        </div>
        <Button
          type="button"
          onClick={addFeature}
          disabled={!newFeatureEn.trim()}
          data-testid="button-add-feature"
          variant="outline"
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("common.add")}
        </Button>
      </div>

      {features.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
          No features added yet
        </div>
      )}
    </div>
  );
}
