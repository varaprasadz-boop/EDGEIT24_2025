import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DataTable } from "@/components/admin/DataTable";
import { FilterBar, type FilterConfig } from "@/components/admin/FilterBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { EmailTemplate } from "@shared/schema";
import { Plus, Eye, Pencil, Trash2, Loader2, Code } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

// Variable documentation for email templates
const AVAILABLE_VARIABLES = [
  { var: '{{userName}}', descKey: 'variables.userName' },
  { var: '{{userEmail}}', descKey: 'variables.userEmail' },
  { var: '{{projectTitle}}', descKey: 'variables.projectTitle' },
  { var: '{{jobTitle}}', descKey: 'variables.jobTitle' },
  { var: '{{bidAmount}}', descKey: 'variables.bidAmount' },
  { var: '{{paymentAmount}}', descKey: 'variables.paymentAmount' },
  { var: '{{platformName}}', descKey: 'variables.platformName' },
  { var: '{{supportEmail}}', descKey: 'variables.supportEmail' },
  { var: '{{actionUrl}}', descKey: 'variables.actionUrl' },
  { var: '{{verificationCode}}', descKey: 'variables.verificationCode' },
  { var: '{{resetPasswordUrl}}', descKey: 'variables.resetPasswordUrl' },
];

export default function AdminEmailTemplates() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedAudience, setSelectedAudience] = useState("all");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isVariablesOpen, setIsVariablesOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    trigger: '',
    audience: 'both' as const,
    subject: '',
    subjectAr: '',
    body: '',
    bodyAr: '',
  });

  // Fetch templates with pagination and filters
  const { data, isLoading } = useQuery({
    queryKey: ['/api/admin/email-templates', pagination, search, selectedAudience],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
      });
      if (search) params.append('search', search);
      if (selectedAudience !== 'all') params.append('audience', selectedAudience);
      
      const response = await fetch(`/api/admin/email-templates?${params}`);
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    },
  });

  const templates = data?.templates || [];
  const totalCount = data?.total || 0;
  const pageCount = Math.ceil(totalCount / pagination.pageSize);

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest('POST', '/api/admin/email-templates', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/email-templates'] });
      setIsCreateOpen(false);
      resetForm();
      toast({ title: t('common.success'), description: t('admin.emailTemplates.success.created') });
    },
    onError: () => {
      toast({ variant: "destructive", title: t('common.error'), description: t('admin.emailTemplates.error.create') });
    },
  });

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      return apiRequest('PATCH', `/api/admin/email-templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/email-templates'] });
      setIsEditOpen(false);
      resetForm();
      toast({ title: t('common.success'), description: t('admin.emailTemplates.success.updated') });
    },
    onError: () => {
      toast({ variant: "destructive", title: t('common.error'), description: t('admin.emailTemplates.error.update') });
    },
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/admin/email-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/email-templates'] });
      setIsDeleteOpen(false);
      setSelectedTemplate(null);
      toast({ title: t('common.success'), description: t('admin.emailTemplates.success.deleted') });
    },
    onError: () => {
      toast({ variant: "destructive", title: t('common.error'), description: t('admin.emailTemplates.error.delete') });
    },
  });

  // Reset form
  const resetForm = () => {
    setFormData({
      trigger: '',
      audience: 'both',
      subject: '',
      subjectAr: '',
      body: '',
      bodyAr: '',
    });
  };

  // Handle create
  const handleCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  // Handle edit
  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      trigger: template.trigger,
      audience: template.audience as any,
      subject: template.subject,
      subjectAr: template.subjectAr || '',
      body: template.body,
      bodyAr: template.bodyAr || '',
    });
    setIsEditOpen(true);
  };

  // Handle view
  const handleView = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setIsViewOpen(true);
  };

  // Handle delete
  const handleDelete = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setIsDeleteOpen(true);
  };

  // Audience options with translations
  const audienceOptions = [
    { value: 'client', label: t('admin.emailTemplates.audience.client') },
    { value: 'consultant', label: t('admin.emailTemplates.audience.consultant') },
    { value: 'both', label: t('admin.emailTemplates.audience.both') },
    { value: 'admin', label: t('admin.emailTemplates.audience.admin') },
  ];

  // Columns definition
  const columns: ColumnDef<EmailTemplate>[] = [
    {
      accessorKey: "trigger",
      header: t('admin.emailTemplates.table.trigger'),
      cell: ({ row }) => (
        <div className="font-mono text-sm" data-testid={`text-trigger-${row.original.id}`}>
          {row.original.trigger}
        </div>
      ),
    },
    {
      accessorKey: "audience",
      header: t('admin.emailTemplates.table.audience'),
      cell: ({ row }) => (
        <Badge variant="outline" data-testid={`badge-audience-${row.original.id}`}>
          {row.original.audience}
        </Badge>
      ),
    },
    {
      accessorKey: "subject",
      header: t('admin.emailTemplates.table.subjectEn'),
      cell: ({ row }) => (
        <div className="max-w-md truncate" data-testid={`text-subject-${row.original.id}`}>
          {row.original.subject}
        </div>
      ),
    },
    {
      accessorKey: "subjectAr",
      header: t('admin.emailTemplates.table.subjectAr'),
      cell: ({ row }) => (
        <div className="max-w-md truncate text-right" data-testid={`text-subject-ar-${row.original.id}`}>
          {row.original.subjectAr || '—'}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleView(row.original)}
            data-testid={`button-view-${row.original.id}`}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEdit(row.original)}
            data-testid={`button-edit-${row.original.id}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(row.original)}
            data-testid={`button-delete-${row.original.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Filter configuration
  const filters: FilterConfig[] = [
    {
      key: 'audience',
      type: 'select',
      label: t('admin.emailTemplates.filters.audience'),
      options: audienceOptions,
    },
  ];

  const handleFiltersChange = (filters: Record<string, string>) => {
    const audienceFilter = filters.audience;
    setSelectedAudience(audienceFilter || 'all');
    setPagination({ ...pagination, pageIndex: 0 });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-email-templates-title">{t('admin.emailTemplates.title')}</h1>
          <p className="text-muted-foreground mt-2" data-testid="text-email-templates-subtitle">
            {t('admin.emailTemplates.description')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsVariablesOpen(true)} data-testid="button-show-variables">
            <Code className="mr-2 h-4 w-4" />
            {t('admin.emailTemplates.buttons.variables')}
          </Button>
          <Button onClick={handleCreate} data-testid="button-create-template">
            <Plus className="mr-2 h-4 w-4" />
            {t('admin.emailTemplates.buttons.create')}
          </Button>
        </div>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPagination({ ...pagination, pageIndex: 0 });
        }}
        searchPlaceholder={t('admin.emailTemplates.searchPlaceholder')}
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      <DataTable
        columns={columns}
        data={templates}
        pagination={pagination}
        onPaginationChange={setPagination}
        pageCount={pageCount}
        isLoading={isLoading}
        manualPagination={true}
      />

      {/* Create/Edit Modal */}
      <Dialog open={isCreateOpen || isEditOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setIsEditOpen(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-modal-title">
              {isCreateOpen ? t('admin.emailTemplates.modal.createTitle') : t('admin.emailTemplates.modal.editTitle')}
            </DialogTitle>
            <DialogDescription data-testid="text-modal-desc">
              {t('admin.emailTemplates.modal.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="trigger" data-testid="label-trigger">{t('admin.emailTemplates.form.trigger')} *</Label>
                <Input
                  id="trigger"
                  data-testid="input-trigger"
                  value={formData.trigger}
                  onChange={(e) => setFormData({ ...formData, trigger: e.target.value })}
                  placeholder="user_registration"
                  disabled={isEditOpen}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="audience" data-testid="label-audience">{t('admin.emailTemplates.form.audience')} *</Label>
                <Select
                  value={formData.audience}
                  onValueChange={(value: any) => setFormData({ ...formData, audience: value })}
                >
                  <SelectTrigger id="audience" data-testid="select-audience">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {audienceOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} data-testid={`option-audience-${opt.value}`}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject" data-testid="label-subject">{t('admin.emailTemplates.form.subjectEn')} *</Label>
              <Input
                id="subject"
                data-testid="input-subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Welcome to {{platformName}}!"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subjectAr" data-testid="label-subject-ar">{t('admin.emailTemplates.form.subjectAr')}</Label>
              <Input
                id="subjectAr"
                dir="rtl"
                data-testid="input-subject-ar"
                value={formData.subjectAr}
                onChange={(e) => setFormData({ ...formData, subjectAr: e.target.value })}
                placeholder="مرحباً بك في {{platformName}}!"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body" data-testid="label-body">{t('admin.emailTemplates.form.bodyEn')} *</Label>
              <Textarea
                id="body"
                rows={6}
                data-testid="input-body"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                placeholder="Hi {{userName}},&#10;&#10;Welcome to our platform!..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bodyAr" data-testid="label-body-ar">{t('admin.emailTemplates.form.bodyAr')}</Label>
              <Textarea
                id="bodyAr"
                dir="rtl"
                rows={6}
                data-testid="input-body-ar"
                value={formData.bodyAr}
                onChange={(e) => setFormData({ ...formData, bodyAr: e.target.value })}
                placeholder="مرحباً {{userName}}،&#10;&#10;أهلاً بك في منصتنا!..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setIsEditOpen(false);
                resetForm();
              }}
              data-testid="button-cancel"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => {
                if (isCreateOpen) {
                  createMutation.mutate(formData);
                } else if (isEditOpen && selectedTemplate) {
                  updateMutation.mutate({ id: selectedTemplate.id, data: formData });
                }
              }}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isCreateOpen ? t('admin.emailTemplates.buttons.createSubmit') : t('admin.emailTemplates.buttons.update')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-view-modal-title">{t('admin.emailTemplates.modal.viewTitle')}</DialogTitle>
            <DialogDescription data-testid="text-view-modal-desc">
              {selectedTemplate?.trigger}
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Trigger</Label>
                  <p className="font-mono" data-testid="text-view-trigger">{selectedTemplate.trigger}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Audience</Label>
                  <Badge variant="outline" data-testid="badge-view-audience">{selectedTemplate.audience}</Badge>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Subject (English)</Label>
                <p className="mt-1" data-testid="text-view-subject">{selectedTemplate.subject}</p>
              </div>

              {selectedTemplate.subjectAr && (
                <div>
                  <Label className="text-xs text-muted-foreground">Subject (Arabic)</Label>
                  <p className="mt-1 text-right" dir="rtl" data-testid="text-view-subject-ar">{selectedTemplate.subjectAr}</p>
                </div>
              )}

              <div>
                <Label className="text-xs text-muted-foreground">Body (English)</Label>
                <Card className="mt-1">
                  <CardContent className="p-4">
                    <pre className="whitespace-pre-wrap text-sm" data-testid="text-view-body">{selectedTemplate.body}</pre>
                  </CardContent>
                </Card>
              </div>

              {selectedTemplate.bodyAr && (
                <div>
                  <Label className="text-xs text-muted-foreground">Body (Arabic)</Label>
                  <Card className="mt-1">
                    <CardContent className="p-4">
                      <pre className="whitespace-pre-wrap text-sm text-right" dir="rtl" data-testid="text-view-body-ar">{selectedTemplate.bodyAr}</pre>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)} data-testid="button-close-view">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-delete-modal-title">Delete Email Template</DialogTitle>
            <DialogDescription data-testid="text-delete-modal-desc">
              Are you sure you want to delete this email template? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="py-4">
              <p className="font-mono text-sm" data-testid="text-delete-trigger">
                Trigger: {selectedTemplate.trigger}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedTemplate && deleteMutation.mutate(selectedTemplate.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variables Documentation Modal */}
      <Dialog open={isVariablesOpen} onOpenChange={setIsVariablesOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle data-testid="text-variables-modal-title">{t('admin.emailTemplates.variables.title')}</DialogTitle>
            <DialogDescription data-testid="text-variables-modal-desc">
              {t('admin.emailTemplates.variables.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-2">
              {AVAILABLE_VARIABLES.map((v, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2 hover-elevate rounded" data-testid={`variable-item-${idx}`}>
                  <code className="bg-muted px-2 py-1 rounded text-sm font-mono flex-shrink-0" data-testid={`variable-code-${idx}`}>
                    {v.var}
                  </code>
                  <p className="text-sm text-muted-foreground" data-testid={`variable-desc-${idx}`}>{t(`admin.emailTemplates.${v.descKey}`)}</p>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVariablesOpen(false)} data-testid="button-close-variables">
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
