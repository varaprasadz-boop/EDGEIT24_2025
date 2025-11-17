import { useState } from "react";
import { Plus, GripVertical, Trash2, ChevronDown, ChevronUp, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { CustomField } from "@shared/schema";
import { nanoid } from "nanoid";

interface CustomFieldsBuilderProps {
  fields: CustomField[];
  onChange: (fields: CustomField[]) => void;
  language?: "en" | "ar";
}

export default function CustomFieldsBuilder({ fields, onChange, language = "en" }: CustomFieldsBuilderProps) {
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

  const toggleFieldExpansion = (fieldId: string) => {
    const newExpanded = new Set(expandedFields);
    if (newExpanded.has(fieldId)) {
      newExpanded.delete(fieldId);
    } else {
      newExpanded.add(fieldId);
    }
    setExpandedFields(newExpanded);
  };

  const addField = () => {
    const newField: CustomField = {
      id: nanoid(8),
      name: "",
      type: "text",
      required: false,
      options: undefined,
      validation: undefined,
    };
    onChange([...fields, newField]);
    setExpandedFields(new Set([...Array.from(expandedFields), newField.id]));
  };

  const removeField = (fieldId: string) => {
    onChange(fields.filter(f => f.id !== fieldId));
    const newExpanded = new Set(expandedFields);
    newExpanded.delete(fieldId);
    setExpandedFields(newExpanded);
  };

  const updateField = (fieldId: string, updates: Partial<CustomField>) => {
    onChange(fields.map(f => {
      if (f.id !== fieldId) return f;
      
      const updated = { ...f, ...updates };
      
      // Handle type changes - clear incompatible fields
      if (updates.type && updates.type !== f.type) {
        const newType = updates.type;
        
        // Clear options for non-select types
        if (newType !== 'select' && newType !== 'multiselect') {
          updated.options = undefined;
        }
        
        // Set default empty options for select types
        if ((newType === 'select' || newType === 'multiselect') && !updated.options) {
          updated.options = [];
        }
        
        // Reset validation based on type
        if (newType === 'boolean') {
          updated.validation = { message: undefined };
        } else if (newType === 'file') {
          updated.validation = { maxSize: undefined, allowedTypes: undefined, message: undefined };
        } else if (newType === 'select') {
          updated.validation = { message: undefined };
        } else if (newType === 'multiselect') {
          updated.validation = { min: undefined, max: undefined, message: undefined };
        } else if (newType === 'text') {
          updated.validation = { min: undefined, max: undefined, pattern: undefined, message: undefined };
        } else if (newType === 'textarea' || newType === 'number') {
          updated.validation = { min: undefined, max: undefined, message: undefined };
        } else if (newType === 'date') {
          updated.validation = { min: undefined, max: undefined, message: undefined };
        }
      }
      
      return updated as CustomField;
    }));
  };

  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    const index = fields.findIndex(f => f.id === fieldId);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === fields.length - 1) return;
    
    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    onChange(newFields);
  };

  const addOption = (fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field || (field.type !== 'select' && field.type !== 'multiselect')) return;
    
    const newOption = {
      value: nanoid(6),
      label: "",
      labelAr: "",
    };
    
    const currentOptions = field.options || [];
    updateField(fieldId, {
      options: [...currentOptions, newOption],
    });
  };

  const updateOption = (fieldId: string, optionIndex: number, updates: { value?: string; label?: string; labelAr?: string }) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field || !field.options) return;
    
    const newOptions = [...field.options];
    newOptions[optionIndex] = { ...newOptions[optionIndex], ...updates };
    updateField(fieldId, { options: newOptions });
  };

  const removeOption = (fieldId: string, optionIndex: number) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field || !field.options) return;
    
    const newOptions = field.options.filter((_, i) => i !== optionIndex);
    updateField(fieldId, { options: newOptions });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Custom Fields</h3>
          <p className="text-sm text-muted-foreground">Define category-specific fields for job postings and consultant profiles</p>
        </div>
        <Button onClick={addField} size="sm" data-testid="button-add-field">
          <Plus className="w-4 h-4" />
          Add Field
        </Button>
      </div>

      {fields.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No custom fields defined yet. Click "Add Field" to create one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <Collapsible
              key={field.id}
              open={expandedFields.has(field.id)}
              onOpenChange={() => toggleFieldExpansion(field.id)}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover-elevate p-4">
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-5 h-5 text-muted-foreground" />
                      <div className="flex-1 flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {field.name || <span className="text-muted-foreground italic">Unnamed Field</span>}
                            </span>
                            <Badge variant="outline">{field.type}</Badge>
                            {field.required && <Badge variant="secondary">Required</Badge>}
                          </div>
                          {field.placeholder && (
                            <p className="text-sm text-muted-foreground">{field.placeholder}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); moveField(field.id, 'up'); }}
                            disabled={index === 0}
                            data-testid={`button-move-up-${field.id}`}
                          >
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); moveField(field.id, 'down'); }}
                            disabled={index === fields.length - 1}
                            data-testid={`button-move-down-${field.id}`}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); removeField(field.id); }}
                            data-testid={`button-remove-field-${field.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                          {expandedFields.has(field.id) ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="p-4 pt-0 space-y-4">
                    <Separator />
                    
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`field-name-${field.id}`}>Field Name (English)*</Label>
                        <Input
                          id={`field-name-${field.id}`}
                          value={field.name}
                          onChange={(e) => updateField(field.id, { name: e.target.value })}
                          placeholder="e.g., Project Duration"
                          data-testid={`input-field-name-${field.id}`}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`field-name-ar-${field.id}`}>Field Name (Arabic)</Label>
                        <Input
                          id={`field-name-ar-${field.id}`}
                          value={field.nameAr || ""}
                          onChange={(e) => updateField(field.id, { nameAr: e.target.value })}
                          placeholder="e.g., مدة المشروع"
                          data-testid={`input-field-name-ar-${field.id}`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`field-type-${field.id}`}>Field Type*</Label>
                        <Select
                          value={field.type}
                          onValueChange={(value) => updateField(field.id, { type: value as CustomField['type'] })}
                        >
                          <SelectTrigger id={`field-type-${field.id}`} data-testid={`select-field-type-${field.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="textarea">Text Area</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="select">Single Select</SelectItem>
                            <SelectItem value="multiselect">Multi Select</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="boolean">Yes/No</SelectItem>
                            <SelectItem value="file">File Upload</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2 pt-8">
                        <Switch
                          id={`field-required-${field.id}`}
                          checked={field.required}
                          onCheckedChange={(checked) => updateField(field.id, { required: checked })}
                          data-testid={`switch-required-${field.id}`}
                        />
                        <Label htmlFor={`field-required-${field.id}`}>Required Field</Label>
                      </div>
                    </div>

                    {/* Placeholder */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`field-placeholder-${field.id}`}>Placeholder (English)</Label>
                        <Input
                          id={`field-placeholder-${field.id}`}
                          value={field.placeholder || ""}
                          onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                          placeholder="e.g., Enter duration in weeks"
                          data-testid={`input-placeholder-${field.id}`}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`field-placeholder-ar-${field.id}`}>Placeholder (Arabic)</Label>
                        <Input
                          id={`field-placeholder-ar-${field.id}`}
                          value={field.placeholderAr || ""}
                          onChange={(e) => updateField(field.id, { placeholderAr: e.target.value })}
                          placeholder="e.g., أدخل المدة بالأسابيع"
                          data-testid={`input-placeholder-ar-${field.id}`}
                        />
                      </div>
                    </div>

                    {/* Help Text */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`field-help-${field.id}`}>Help Text (English)</Label>
                        <Textarea
                          id={`field-help-${field.id}`}
                          value={field.helpText || ""}
                          onChange={(e) => updateField(field.id, { helpText: e.target.value })}
                          placeholder="Additional instructions for users"
                          rows={2}
                          data-testid={`textarea-help-${field.id}`}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`field-help-ar-${field.id}`}>Help Text (Arabic)</Label>
                        <Textarea
                          id={`field-help-ar-${field.id}`}
                          value={field.helpTextAr || ""}
                          onChange={(e) => updateField(field.id, { helpTextAr: e.target.value })}
                          placeholder="تعليمات إضافية للمستخدمين"
                          rows={2}
                          data-testid={`textarea-help-ar-${field.id}`}
                        />
                      </div>
                    </div>

                    {/* Options for Select/Multiselect */}
                    {(field.type === 'select' || field.type === 'multiselect') && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Options*</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addOption(field.id)}
                            data-testid={`button-add-option-${field.id}`}
                          >
                            <Plus className="w-3 h-3" />
                            Add Option
                          </Button>
                        </div>
                        {(!field.options || field.options.length === 0) ? (
                          <p className="text-sm text-muted-foreground italic">No options defined. Add at least one option.</p>
                        ) : (
                          <div className="space-y-2">
                            {field.options.map((option, optIndex) => (
                              <div key={optIndex} className="flex items-center gap-2">
                                <Input
                                  value={option.label}
                                  onChange={(e) => updateOption(field.id, optIndex, { label: e.target.value })}
                                  placeholder="Option label (English)"
                                  data-testid={`input-option-label-${field.id}-${optIndex}`}
                                />
                                <Input
                                  value={option.labelAr || ""}
                                  onChange={(e) => updateOption(field.id, optIndex, { labelAr: e.target.value })}
                                  placeholder="Label (Arabic)"
                                  data-testid={`input-option-label-ar-${field.id}-${optIndex}`}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeOption(field.id, optIndex)}
                                  data-testid={`button-remove-option-${field.id}-${optIndex}`}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Validation Rules */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Settings2 className="w-4 h-4" />
                        <Label>Validation Rules</Label>
                      </div>
                      
                      {/* Text/Textarea/Number validation */}
                      {(field.type === 'text' || field.type === 'textarea' || field.type === 'number') && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`field-min-${field.id}`}>
                              {field.type === 'number' ? 'Minimum Value' : 'Minimum Length'}
                            </Label>
                            <Input
                              id={`field-min-${field.id}`}
                              type="number"
                              value={field.validation?.min ?? ""}
                              onChange={(e) => updateField(field.id, {
                                validation: { ...field.validation, min: e.target.value ? Number(e.target.value) : undefined }
                              })}
                              data-testid={`input-min-${field.id}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`field-max-${field.id}`}>
                              {field.type === 'number' ? 'Maximum Value' : 'Maximum Length'}
                            </Label>
                            <Input
                              id={`field-max-${field.id}`}
                              type="number"
                              value={field.validation?.max ?? ""}
                              onChange={(e) => updateField(field.id, {
                                validation: { ...field.validation, max: e.target.value ? Number(e.target.value) : undefined }
                              })}
                              data-testid={`input-max-${field.id}`}
                            />
                          </div>
                        </div>
                      )}

                      {/* Pattern for text fields */}
                      {field.type === 'text' && (
                        <div className="space-y-2">
                          <Label htmlFor={`field-pattern-${field.id}`}>Pattern (RegEx)</Label>
                          <Input
                            id={`field-pattern-${field.id}`}
                            value={field.validation?.pattern || ""}
                            onChange={(e) => updateField(field.id, {
                              validation: { ...field.validation, pattern: e.target.value }
                            })}
                            placeholder="e.g., ^[A-Z]{3}-\d{4}$"
                            data-testid={`input-pattern-${field.id}`}
                          />
                        </div>
                      )}

                      {/* Multiselect min/max selections */}
                      {field.type === 'multiselect' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`field-min-select-${field.id}`}>Minimum Selections</Label>
                            <Input
                              id={`field-min-select-${field.id}`}
                              type="number"
                              value={field.validation?.min ?? ""}
                              onChange={(e) => updateField(field.id, {
                                validation: { ...field.validation, min: e.target.value ? Number(e.target.value) : undefined }
                              })}
                              data-testid={`input-min-select-${field.id}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`field-max-select-${field.id}`}>Maximum Selections</Label>
                            <Input
                              id={`field-max-select-${field.id}`}
                              type="number"
                              value={field.validation?.max ?? ""}
                              onChange={(e) => updateField(field.id, {
                                validation: { ...field.validation, max: e.target.value ? Number(e.target.value) : undefined }
                              })}
                              data-testid={`input-max-select-${field.id}`}
                            />
                          </div>
                        </div>
                      )}

                      {/* Date validation */}
                      {field.type === 'date' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`field-min-date-${field.id}`}>Minimum Date</Label>
                            <Input
                              id={`field-min-date-${field.id}`}
                              type="date"
                              value={field.validation?.min || ""}
                              onChange={(e) => updateField(field.id, {
                                validation: { ...field.validation, min: e.target.value }
                              })}
                              data-testid={`input-min-date-${field.id}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`field-max-date-${field.id}`}>Maximum Date</Label>
                            <Input
                              id={`field-max-date-${field.id}`}
                              type="date"
                              value={field.validation?.max || ""}
                              onChange={(e) => updateField(field.id, {
                                validation: { ...field.validation, max: e.target.value }
                              })}
                              data-testid={`input-max-date-${field.id}`}
                            />
                          </div>
                        </div>
                      )}

                      {/* File validation */}
                      {field.type === 'file' && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor={`field-max-size-${field.id}`}>Max File Size (bytes)</Label>
                            <Input
                              id={`field-max-size-${field.id}`}
                              type="number"
                              value={field.validation?.maxSize ?? ""}
                              onChange={(e) => updateField(field.id, {
                                validation: { ...field.validation, maxSize: e.target.value ? Number(e.target.value) : undefined }
                              })}
                              placeholder="e.g., 5242880 for 5MB"
                              data-testid={`input-max-size-${field.id}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`field-allowed-types-${field.id}`}>Allowed MIME Types (comma-separated)</Label>
                            <Input
                              id={`field-allowed-types-${field.id}`}
                              value={field.validation?.allowedTypes?.join(", ") || ""}
                              onChange={(e) => updateField(field.id, {
                                validation: { 
                                  ...field.validation, 
                                  allowedTypes: e.target.value ? e.target.value.split(",").map(t => t.trim()) : undefined 
                                }
                              })}
                              placeholder="e.g., application/pdf, image/png, image/jpeg"
                              data-testid={`input-allowed-types-${field.id}`}
                            />
                          </div>
                        </div>
                      )}

                      {/* Custom validation message */}
                      <div className="space-y-2">
                        <Label htmlFor={`field-validation-msg-${field.id}`}>Custom Validation Message</Label>
                        <Input
                          id={`field-validation-msg-${field.id}`}
                          value={field.validation?.message || ""}
                          onChange={(e) => updateField(field.id, {
                            validation: { ...field.validation, message: e.target.value }
                          })}
                          placeholder="Error message to show when validation fails"
                          data-testid={`input-validation-msg-${field.id}`}
                        />
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
}
