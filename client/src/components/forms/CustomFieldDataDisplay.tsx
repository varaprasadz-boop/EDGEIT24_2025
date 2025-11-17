import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, FileText } from "lucide-react";
import type { CustomField } from "@shared/schema";

interface CustomFieldDataDisplayProps {
  customFields: CustomField[];
  customFieldData: Record<string, any>;
}

export function CustomFieldDataDisplay({
  customFields,
  customFieldData,
}: CustomFieldDataDisplayProps) {
  if (!customFields || customFields.length === 0 || !customFieldData) {
    return null;
  }

  const renderFieldValue = (field: CustomField) => {
    const value = customFieldData[field.id];

    // Skip if no value
    if (value === undefined || value === null || value === "") {
      return null;
    }

    switch (field.type) {
      case "text":
      case "textarea":
        return (
          <div key={field.id} className="space-y-1" data-testid={`display-custom-${field.id}`}>
            <p className="text-sm font-medium">{field.name}</p>
            <p className="text-sm text-muted-foreground">{value}</p>
          </div>
        );

      case "number":
        return (
          <div key={field.id} className="space-y-1" data-testid={`display-custom-${field.id}`}>
            <p className="text-sm font-medium">{field.name}</p>
            <p className="text-sm text-muted-foreground">{value}</p>
          </div>
        );

      case "select":
        const selectedOption = field.options?.find((opt) => opt.value === value);
        return (
          <div key={field.id} className="space-y-1" data-testid={`display-custom-${field.id}`}>
            <p className="text-sm font-medium">{field.name}</p>
            <Badge variant="secondary" data-testid={`badge-custom-${field.id}-${value}`}>
              {selectedOption?.label || value}
            </Badge>
          </div>
        );

      case "multiselect":
        if (!Array.isArray(value) || value.length === 0) return null;
        return (
          <div key={field.id} className="space-y-1" data-testid={`display-custom-${field.id}`}>
            <p className="text-sm font-medium">{field.name}</p>
            <div className="flex flex-wrap gap-1">
              {value.map((val: string) => {
                const option = field.options?.find((opt) => opt.value === val);
                return (
                  <Badge
                    key={val}
                    variant="secondary"
                    data-testid={`badge-custom-${field.id}-${val}`}
                  >
                    {option?.label || val}
                  </Badge>
                );
              })}
            </div>
          </div>
        );

      case "date":
        try {
          const dateValue = new Date(value);
          return (
            <div key={field.id} className="space-y-1" data-testid={`display-custom-${field.id}`}>
              <p className="text-sm font-medium">{field.name}</p>
              <p className="text-sm text-muted-foreground">
                {format(dateValue, "PPP")}
              </p>
            </div>
          );
        } catch {
          return null;
        }

      case "boolean":
        return (
          <div key={field.id} className="flex items-center gap-2" data-testid={`display-custom-${field.id}`}>
            {value ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-muted-foreground" />
            )}
            <p className="text-sm font-medium">{field.name}</p>
          </div>
        );

      case "file":
        return (
          <div key={field.id} className="space-y-1" data-testid={`display-custom-${field.id}`}>
            <p className="text-sm font-medium">{field.name}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>{value}</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Filter out fields with no values
  const fieldsWithValues = customFields.filter(
    (field) => customFieldData[field.id] !== undefined &&
              customFieldData[field.id] !== null &&
              customFieldData[field.id] !== ""
  );

  if (fieldsWithValues.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 pt-4 border-t" data-testid="container-custom-fields-display">
      <h4 className="text-sm font-semibold">Additional Details</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {customFields.map((field) => renderFieldValue(field))}
      </div>
    </div>
  );
}
