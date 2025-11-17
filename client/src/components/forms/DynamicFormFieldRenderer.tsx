import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Upload, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { CustomField } from "@shared/schema";

interface DynamicFormFieldRendererProps {
  customFields: CustomField[];
  namePrefix?: string;
  disabled?: boolean;
}

export function DynamicFormFieldRenderer({
  customFields,
  namePrefix = "customFieldData",
  disabled = false,
}: DynamicFormFieldRendererProps) {
  const form = useFormContext();

  if (!customFields || customFields.length === 0) {
    return null;
  }

  const renderField = (field: CustomField) => {
    const fieldName = `${namePrefix}.${field.id}`;
    const isRequired = field.required;

    switch (field.type) {
      case "text":
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName}
            rules={{
              required: isRequired ? `${field.name} is required` : false,
              minLength: field.validation?.min
                ? {
                    value: field.validation.min,
                    message: `Minimum ${field.validation.min} characters`,
                  }
                : undefined,
              maxLength: field.validation?.max
                ? {
                    value: field.validation.max,
                    message: `Maximum ${field.validation.max} characters`,
                  }
                : undefined,
              pattern: field.validation?.pattern
                ? {
                    value: new RegExp(field.validation.pattern),
                    message: field.validation.message || "Invalid format",
                  }
                : undefined,
            }}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.name}
                  {isRequired && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    {...formField}
                    value={formField.value ?? ""}
                    onChange={(e) => formField.onChange(e.target.value || undefined)}
                    placeholder={field.placeholder}
                    disabled={disabled}
                    data-testid={`input-custom-${field.id}`}
                  />
                </FormControl>
                {field.helpText && <FormDescription>{field.helpText}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "textarea":
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName}
            rules={{
              required: isRequired ? `${field.name} is required` : false,
              minLength: field.validation?.min
                ? {
                    value: field.validation.min,
                    message: `Minimum ${field.validation.min} characters`,
                  }
                : undefined,
              maxLength: field.validation?.max
                ? {
                    value: field.validation.max,
                    message: `Maximum ${field.validation.max} characters`,
                  }
                : undefined,
            }}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.name}
                  {isRequired && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...formField}
                    value={formField.value ?? ""}
                    onChange={(e) => formField.onChange(e.target.value || undefined)}
                    placeholder={field.placeholder}
                    disabled={disabled}
                    rows={4}
                    data-testid={`textarea-custom-${field.id}`}
                  />
                </FormControl>
                {field.helpText && <FormDescription>{field.helpText}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "number":
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName}
            rules={{
              required: isRequired ? `${field.name} is required` : false,
              min: field.validation?.min !== undefined
                ? {
                    value: field.validation.min,
                    message: `Minimum value is ${field.validation.min}`,
                  }
                : undefined,
              max: field.validation?.max !== undefined
                ? {
                    value: field.validation.max,
                    message: `Maximum value is ${field.validation.max}`,
                  }
                : undefined,
            }}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.name}
                  {isRequired && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    {...formField}
                    type="number"
                    value={formField.value ?? ""}
                    placeholder={field.placeholder}
                    disabled={disabled}
                    onChange={(e) => {
                      const value = e.target.valueAsNumber;
                      formField.onChange(isNaN(value) ? undefined : value);
                    }}
                    data-testid={`input-number-custom-${field.id}`}
                  />
                </FormControl>
                {field.helpText && <FormDescription>{field.helpText}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "select":
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName}
            rules={{
              required: isRequired ? `${field.name} is required` : false,
            }}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.name}
                  {isRequired && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <Select
                  onValueChange={formField.onChange}
                  value={formField.value}
                  disabled={disabled}
                >
                  <FormControl>
                    <SelectTrigger data-testid={`select-custom-${field.id}`}>
                      <SelectValue placeholder={field.placeholder || "Select an option"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {field.options?.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        data-testid={`select-option-${option.value}`}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {field.helpText && <FormDescription>{field.helpText}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "multiselect":
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName}
            rules={{
              required: isRequired ? `${field.name} is required` : false,
              validate: field.validation?.min || field.validation?.max
                ? (value: string[]) => {
                    const count = value?.length || 0;
                    if (field.validation?.min && count < field.validation.min) {
                      return `Select at least ${field.validation.min} option(s)`;
                    }
                    if (field.validation?.max && count > field.validation.max) {
                      return `Select at most ${field.validation.max} option(s)`;
                    }
                    return true;
                  }
                : undefined,
            }}
            render={({ field: formField }) => {
              const selectedValues = formField.value || [];
              const toggleValue = (value: string) => {
                const newValues = selectedValues.includes(value)
                  ? selectedValues.filter((v: string) => v !== value)
                  : [...selectedValues, value];
                // Normalize to undefined if empty array for optional fields
                formField.onChange(newValues.length > 0 ? newValues : undefined);
              };

              return (
                <FormItem>
                  <FormLabel>
                    {field.name}
                    {isRequired && <span className="text-destructive ml-1">*</span>}
                  </FormLabel>
                  <div className="space-y-2">
                    {field.options?.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          checked={selectedValues.includes(option.value)}
                          onCheckedChange={() => toggleValue(option.value)}
                          disabled={disabled}
                          data-testid={`checkbox-custom-${field.id}-${option.value}`}
                        />
                        <label className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  {selectedValues.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedValues.map((value: string) => {
                        const option = field.options?.find((o) => o.value === value);
                        return (
                          <Badge
                            key={value}
                            variant="secondary"
                            className="gap-1"
                            data-testid={`badge-selected-${value}`}
                          >
                            {option?.label || value}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => toggleValue(value)}
                            />
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                  {field.helpText && <FormDescription>{field.helpText}</FormDescription>}
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        );

      case "date":
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName}
            rules={{
              required: isRequired ? `${field.name} is required` : false,
              validate: field.validation?.min || field.validation?.max
                ? (value: Date) => {
                    if (!value) return true;
                    const dateValue = new Date(value);
                    if (field.validation?.min) {
                      const minDate = new Date(field.validation.min);
                      if (dateValue < minDate) {
                        return `Date must be after ${format(minDate, "PPP")}`;
                      }
                    }
                    if (field.validation?.max) {
                      const maxDate = new Date(field.validation.max);
                      if (dateValue > maxDate) {
                        return `Date must be before ${format(maxDate, "PPP")}`;
                      }
                    }
                    return true;
                  }
                : undefined,
            }}
            render={({ field: formField }) => (
              <FormItem className="flex flex-col">
                <FormLabel>
                  {field.name}
                  {isRequired && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !formField.value && "text-muted-foreground"
                        )}
                        disabled={disabled}
                        data-testid={`button-date-custom-${field.id}`}
                      >
                        {formField.value ? (
                          format(new Date(formField.value), "PPP")
                        ) : (
                          <span>{field.placeholder || "Pick a date"}</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formField.value ? new Date(formField.value) : undefined}
                      onSelect={(date) => formField.onChange(date ? date.toISOString() : undefined)}
                      disabled={(date) => {
                        if (field.validation?.min && date < new Date(field.validation.min)) {
                          return true;
                        }
                        if (field.validation?.max && date > new Date(field.validation.max)) {
                          return true;
                        }
                        return false;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {field.helpText && <FormDescription>{field.helpText}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "boolean":
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName}
            render={({ field: formField }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={formField.value}
                    onCheckedChange={formField.onChange}
                    disabled={disabled}
                    data-testid={`checkbox-boolean-custom-${field.id}`}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    {field.name}
                    {isRequired && <span className="text-destructive ml-1">*</span>}
                  </FormLabel>
                  {field.helpText && <FormDescription>{field.helpText}</FormDescription>}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "file":
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={fieldName}
            rules={{
              required: isRequired ? `${field.name} is required` : false,
            }}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.name}
                  {isRequired && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept={field.validation?.allowedTypes?.join(",")}
                      disabled={disabled}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (field.validation?.maxSize && file.size > field.validation.maxSize) {
                            form.setError(fieldName, {
                              type: "manual",
                              message: `File size must be less than ${Math.round(field.validation.maxSize / 1024 / 1024)}MB`,
                            });
                            return;
                          }
                          formField.onChange(file.name);
                        }
                      }}
                      data-testid={`input-file-custom-${field.id}`}
                    />
                    {formField.value && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Upload className="h-4 w-4" />
                        <span>{formField.value}</span>
                      </div>
                    )}
                  </div>
                </FormControl>
                {field.helpText && <FormDescription>{field.helpText}</FormDescription>}
                {field.validation?.allowedTypes && (
                  <FormDescription>
                    Allowed: {field.validation.allowedTypes.join(", ")}
                  </FormDescription>
                )}
                {field.validation?.maxSize && (
                  <FormDescription>
                    Max size: {Math.round(field.validation.maxSize / 1024 / 1024)}MB
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {customFields.map((field) => renderField(field))}
    </div>
  );
}
