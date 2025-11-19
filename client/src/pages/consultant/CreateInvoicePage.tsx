import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import type { User } from "@shared/schema";

const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description required"),
  quantity: z.number().positive("Quantity must be positive"),
  unitPrice: z.number().nonnegative("Unit price cannot be negative"),
  total: z.number().nonnegative("Total cannot be negative"),
});

const createInvoiceSchema = z.object({
  contractId: z.string().min(1, "Contract required"),
  clientId: z.string().min(1, "Client required"),
  dueDate: z.string().min(1, "Due date required"),
  items: z.array(invoiceItemSchema).min(1, "At least one item required"),
  notes: z.string().optional(),
  currency: z.literal("SAR"),
});

type CreateInvoiceForm = z.infer<typeof createInvoiceSchema>;

export default function CreateInvoicePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();

  const { data: contracts } = useQuery<any[]>({
    queryKey: ['/api/contracts/consultant'],
  });

  const { data: clients } = useQuery<User[]>({
    queryKey: ['/api/users/clients'],
  });

  const form = useForm<CreateInvoiceForm>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      currency: "SAR",
      items: [{ description: "", quantity: 1, unitPrice: 0, total: 0 }],
      dueDate: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateInvoiceForm) => {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to create invoice');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('createInvoice.invoiceCreated'),
        description: t('createInvoice.invoiceCreatedDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices/consultant'] });
      navigate('/consultant/invoices');
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error.message,
      });
    },
  });

  const calculateItemTotal = (index: number) => {
    const quantity = form.watch(`items.${index}.quantity`);
    const unitPrice = form.watch(`items.${index}.unitPrice`);
    const total = quantity * unitPrice;
    form.setValue(`items.${index}.total`, total);
    return total;
  };

  const calculateSubtotal = () => {
    return fields.reduce((sum, _, index) => {
      const quantity = form.watch(`items.${index}.quantity`) || 0;
      const unitPrice = form.watch(`items.${index}.unitPrice`) || 0;
      return sum + (quantity * unitPrice);
    }, 0);
  };

  const calculateVAT = () => {
    return calculateSubtotal() * 0.15;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateVAT();
  };

  const onSubmit = (data: CreateInvoiceForm) => {
    createMutation.mutate(data);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/consultant/invoices">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('invoiceDetails.backToInvoices')}
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t('createInvoice.title')}</CardTitle>
          <CardDescription>
            {t('createInvoice.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contractId">{t('createInvoice.contract')} *</Label>
                <Select
                  value={form.watch('contractId')}
                  onValueChange={(value) => form.setValue('contractId', value)}
                >
                  <SelectTrigger id="contractId" data-testid="select-contract">
                    <SelectValue placeholder={t('createInvoice.selectContract')} />
                  </SelectTrigger>
                  <SelectContent>
                    {contracts?.map((contract) => (
                      <SelectItem key={contract.id} value={contract.id}>
                        {t('createInvoice.contractNumber', { number: contract.id.slice(0, 8) })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.contractId && (
                  <p className="text-sm text-red-500">{form.formState.errors.contractId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientId">{t('createInvoice.client')} *</Label>
                <Select
                  value={form.watch('clientId')}
                  onValueChange={(value) => form.setValue('clientId', value)}
                >
                  <SelectTrigger id="clientId" data-testid="select-client">
                    <SelectValue placeholder={t('createInvoice.selectClient')} />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.fullName || client.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.clientId && (
                  <p className="text-sm text-red-500">{form.formState.errors.clientId.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">{t('createInvoice.dueDate')} *</Label>
              <Input
                id="dueDate"
                type="date"
                {...form.register('dueDate')}
                data-testid="input-due-date"
              />
              {form.formState.errors.dueDate && (
                <p className="text-sm text-red-500">{form.formState.errors.dueDate.message}</p>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-lg font-semibold">{t('createInvoice.invoiceItems')}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ description: "", quantity: 1, unitPrice: 0, total: 0 })}
                  data-testid="button-add-item"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('createInvoice.addItem')}
                </Button>
              </div>

              {fields.map((field, index) => (
                <Card key={field.id} className="p-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`items.${index}.description`}>{t('createInvoice.description')} *</Label>
                      <Textarea
                        id={`items.${index}.description`}
                        {...form.register(`items.${index}.description`)}
                        placeholder={t('createInvoice.itemDescriptionPlaceholder')}
                        data-testid={`input-description-${index}`}
                      />
                      {form.formState.errors.items?.[index]?.description && (
                        <p className="text-sm text-red-500">
                          {form.formState.errors.items[index]?.description?.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`items.${index}.quantity`}>{t('createInvoice.quantity')} *</Label>
                        <Input
                          id={`items.${index}.quantity`}
                          type="number"
                          step="1"
                          min="1"
                          {...form.register(`items.${index}.quantity`, {
                            valueAsNumber: true,
                            onChange: () => calculateItemTotal(index),
                          })}
                          data-testid={`input-quantity-${index}`}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`items.${index}.unitPrice`}>{t('createInvoice.unitPrice')} *</Label>
                        <Input
                          id={`items.${index}.unitPrice`}
                          type="number"
                          step="0.01"
                          min="0"
                          {...form.register(`items.${index}.unitPrice`, {
                            valueAsNumber: true,
                            onChange: () => calculateItemTotal(index),
                          })}
                          data-testid={`input-unit-price-${index}`}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>{t('createInvoice.total')}</Label>
                        <div className="h-10 flex items-center px-3 border rounded-md bg-muted">
                          {(form.watch(`items.${index}.quantity`) * form.watch(`items.${index}.unitPrice`)).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => remove(index)}
                        data-testid={`button-remove-item-${index}`}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t('createInvoice.removeItem')}
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t('createInvoice.notesOptional')}</Label>
              <Textarea
                id="notes"
                {...form.register('notes')}
                placeholder={t('createInvoice.notesPlaceholder')}
                rows={3}
                data-testid="input-notes"
              />
            </div>

            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t('createInvoice.subtotal')}:</span>
                    <span data-testid="text-subtotal">{calculateSubtotal().toFixed(2)} {t('createInvoice.currency')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('createInvoice.vat')}:</span>
                    <span data-testid="text-vat">{calculateVAT().toFixed(2)} {t('createInvoice.currency')}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>{t('createInvoice.total')}:</span>
                    <span data-testid="text-total">{calculateTotal().toFixed(2)} {t('createInvoice.currency')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={createMutation.isPending}
                data-testid="button-submit"
              >
                {createMutation.isPending ? t('createInvoice.creating') : t('createInvoice.createInvoice')}
              </Button>
              <Link href="/consultant/invoices">
                <Button type="button" variant="outline" data-testid="button-cancel">
                  {t('common.cancel')}
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
