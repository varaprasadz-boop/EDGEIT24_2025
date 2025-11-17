import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Package, Truck, Key, Download, Upload, CheckCircle, XCircle, Clock, FileText, Shield, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface ProjectDeliveryTabProps {
  projectId: string;
  project: any;
  userRole: 'client' | 'consultant';
}

export function ProjectDeliveryTab({ projectId, project, userRole }: ProjectDeliveryTabProps) {
  const { toast } = useToast();
  
  // Detect delivery type from project's bid category
  const deliveryType = detectDeliveryType(project);
  
  if (!deliveryType) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No delivery workflow available for this project type</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6" data-testid="container-delivery-tab">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Delivery Workflow</CardTitle>
              <CardDescription>
                {deliveryType === 'service' && 'File version management and downloads'}
                {deliveryType === 'hardware' && 'Shipping, quality inspection, and warranty'}
                {deliveryType === 'software' && 'License and subscription management'}
              </CardDescription>
            </div>
            <Badge variant="outline" data-testid="badge-delivery-type">
              {deliveryType === 'service' && <FileText className="w-4 h-4 mr-1" />}
              {deliveryType === 'hardware' && <Package className="w-4 h-4 mr-1" />}
              {deliveryType === 'software' && <Key className="w-4 h-4 mr-1" />}
              {deliveryType.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
      </Card>
      
      {deliveryType === 'service' && <ServiceDeliveryWorkflow projectId={projectId} userRole={userRole} />}
      {deliveryType === 'hardware' && <HardwareDeliveryWorkflow projectId={projectId} userRole={userRole} />}
      {deliveryType === 'software' && <SoftwareDeliveryWorkflow projectId={projectId} project={project} userRole={userRole} />}
    </div>
  );
}

function detectDeliveryType(project: any): 'service' | 'hardware' | 'software' | null {
  // Use the deliveryType field from the API response
  // The backend determines this based on the project's bid category
  if (project.deliveryType) {
    return project.deliveryType;
  }
  // Backward compatibility: check categoryType
  if (project.categoryType === 'hardware') return 'hardware';
  if (project.categoryType === 'software') return 'software';
  if (project.categoryType === 'service') return 'service';
  return null;
}

// 1. SERVICE DELIVERY - File Versioning Workflow
function ServiceDeliveryWorkflow({ projectId, userRole }: { projectId: string; userRole: string }) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState<string>('');
  
  const { data: deliverables = [] } = useQuery<any[]>({
    queryKey: ['/api/projects', projectId, 'deliverables'],
  });
  
  const uploadMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/deliverables/${data.deliverableId}/versions`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'deliverables'] });
      toast({ title: 'New version uploaded successfully' });
      setUploadDialogOpen(false);
    },
  });
  
  const handleUploadVersion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await uploadMutation.mutateAsync({
      deliverableId: selectedDeliverable,
      fileUrl: `mock://files/${Date.now()}.zip`,
      changeNotes: formData.get('changeNotes'),
      fileSize: '1024000',
      fileType: 'application/zip',
    });
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">File Versions</h3>
        {userRole === 'consultant' && deliverables.length > 0 && (
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-upload-version">
                <Upload className="w-4 h-4 mr-2" />
                Upload New Version
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleUploadVersion}>
                <DialogHeader>
                  <DialogTitle>Upload New Version</DialogTitle>
                  <DialogDescription>Upload an updated version of a deliverable</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="deliverable">Select Deliverable</Label>
                    <select 
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base"
                      value={selectedDeliverable}
                      onChange={(e) => setSelectedDeliverable(e.target.value)}
                      required
                      data-testid="select-deliverable"
                    >
                      <option value="">Choose a deliverable...</option>
                      {deliverables.map((d: any) => (
                        <option key={d.id} value={d.id}>{d.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="changeNotes">Change Notes</Label>
                    <Textarea 
                      id="changeNotes" 
                      name="changeNotes" 
                      placeholder="What changed in this version?" 
                      required
                      data-testid="input-change-notes"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={uploadMutation.isPending} data-testid="button-submit-version">
                    {uploadMutation.isPending ? 'Uploading...' : 'Upload Version'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      <div className="grid gap-4">
        {deliverables.length > 0 ? (
          deliverables.map((deliverable: any) => (
            <DeliverableVersionCard key={deliverable.id} deliverable={deliverable} />
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No deliverables submitted yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function DeliverableVersionCard({ deliverable }: { deliverable: any }) {
  const { data: versions = [] } = useQuery<any[]>({
    queryKey: ['/api/deliverables', deliverable.id, 'versions'],
  });
  
  return (
    <Card data-testid={`card-deliverable-versions-${deliverable.id}`}>
      <CardHeader>
        <CardTitle className="text-base">{deliverable.title}</CardTitle>
        <CardDescription>{versions.length} version{versions.length !== 1 ? 's' : ''}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {versions.slice(0, 3).map((version: any) => (
            <div 
              key={version.id} 
              className="flex items-center justify-between p-2 border rounded-md hover-elevate"
              data-testid={`version-${version.id}`}
            >
              <div className="flex items-center gap-2">
                {version.isLatest && <Badge variant="default" data-testid="badge-latest">Latest</Badge>}
                <span className="text-sm font-medium">v{version.versionNumber}</span>
                <span className="text-sm text-muted-foreground">{version.changeNotes}</span>
              </div>
              <Button 
                size="sm" 
                variant="ghost"
                data-testid={`button-download-${version.id}`}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {versions.length === 0 && (
            <p className="text-sm text-muted-foreground">No versions uploaded yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// 2. HARDWARE DELIVERY - Shipping & Quality Workflow
function HardwareDeliveryWorkflow({ projectId, userRole }: { projectId: string; userRole: string }) {
  const [createShipmentOpen, setCreateShipmentOpen] = useState(false);
  const { toast } = useToast();
  
  const { data: shipments = [] } = useQuery<any[]>({
    queryKey: ['/api/projects', projectId, 'shipments'],
  });
  
  const createShipmentMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/projects/${projectId}/shipments`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'shipments'] });
      toast({ title: 'Shipment created successfully' });
      setCreateShipmentOpen(false);
    },
  });
  
  const handleCreateShipment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await createShipmentMutation.mutateAsync({
      deliverableId: 'mock-deliverable-id',
      items: [{ name: formData.get('itemName'), quantity: 1, description: formData.get('itemDescription') }],
      shippingAddress: formData.get('shippingAddress'),
      carrier: formData.get('carrier'),
    });
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Shipments</h3>
        {userRole === 'consultant' && (
          <Dialog open={createShipmentOpen} onOpenChange={setCreateShipmentOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-shipment">
                <Truck className="w-4 h-4 mr-2" />
                Create Shipment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateShipment}>
                <DialogHeader>
                  <DialogTitle>Create Hardware Shipment</DialogTitle>
                  <DialogDescription>Create a new shipment order</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="itemName">Item Name</Label>
                    <Input id="itemName" name="itemName" required data-testid="input-item-name" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="itemDescription">Description</Label>
                    <Textarea id="itemDescription" name="itemDescription" data-testid="input-item-description" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="shippingAddress">Shipping Address</Label>
                    <Textarea id="shippingAddress" name="shippingAddress" required data-testid="input-shipping-address" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="carrier">Carrier</Label>
                    <Input id="carrier" name="carrier" placeholder="e.g., FedEx, UPS" data-testid="input-carrier" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createShipmentMutation.isPending} data-testid="button-submit-shipment">
                    {createShipmentMutation.isPending ? 'Creating...' : 'Create Shipment'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      <div className="grid gap-4">
        {shipments.length > 0 ? (
          shipments.map((shipment: any) => (
            <ShipmentCard key={shipment.id} shipment={shipment} userRole={userRole} />
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No shipments created yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ShipmentCard({ shipment, userRole }: { shipment: any; userRole: string }) {
  const statusColors: Record<string, string> = {
    order_confirmed: 'bg-blue-500',
    preparing: 'bg-yellow-500',
    shipped: 'bg-purple-500',
    in_transit: 'bg-orange-500',
    delivered: 'bg-green-500',
    installed: 'bg-emerald-500',
  };
  
  return (
    <Card data-testid={`card-shipment-${shipment.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">Order #{shipment.orderNumber}</CardTitle>
            <CardDescription>
              {shipment.carrier} • {shipment.items?.length || 0} item(s)
            </CardDescription>
          </div>
          <Badge className={statusColors[shipment.status]} data-testid={`badge-status-${shipment.id}`}>
            {shipment.status.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>Estimated delivery: {shipment.estimatedDelivery ? format(new Date(shipment.estimatedDelivery), 'MMM dd, yyyy') : 'TBD'}</span>
          </div>
          {shipment.trackingNumber && (
            <div className="text-sm">
              <span className="text-muted-foreground">Tracking: </span>
              <span className="font-medium">{shipment.trackingNumber}</span>
            </div>
          )}
          {userRole === 'client' && shipment.status === 'delivered' && !shipment.deliveredAt && (
            <Button size="sm" variant="outline" data-testid={`button-confirm-delivery-${shipment.id}`}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirm Delivery
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// 3. SOFTWARE DELIVERY - License & Subscription Workflow
function SoftwareDeliveryWorkflow({ projectId, project, userRole }: { projectId: string; project: any; userRole: string }) {
  const [generateLicenseOpen, setGenerateLicenseOpen] = useState(false);
  const { toast } = useToast();
  
  const { data: licenses = [] } = useQuery<any[]>({
    queryKey: ['/api/projects', projectId, 'licenses'],
  });
  
  const generateLicenseMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/projects/${projectId}/licenses`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'licenses'] });
      toast({ title: 'License generated successfully' });
      setGenerateLicenseOpen(false);
    },
  });
  
  const handleGenerateLicense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await generateLicenseMutation.mutateAsync({
      deliverableId: 'mock-deliverable-id',
      licenseType: formData.get('licenseType'),
      productName: formData.get('productName'),
      maxActivations: parseInt(formData.get('maxActivations') as string),
    });
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Software Licenses</h3>
        {userRole === 'consultant' && (
          <Dialog open={generateLicenseOpen} onOpenChange={setGenerateLicenseOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-generate-license">
                <Key className="w-4 h-4 mr-2" />
                Generate License
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleGenerateLicense}>
                <DialogHeader>
                  <DialogTitle>Generate Software License</DialogTitle>
                  <DialogDescription>Create a new license for the client</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="productName">Product Name</Label>
                    <Input id="productName" name="productName" required data-testid="input-product-name" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="licenseType">License Type</Label>
                    <select 
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base"
                      name="licenseType"
                      required
                      data-testid="select-license-type"
                    >
                      <option value="trial">Trial</option>
                      <option value="full">Full License</option>
                      <option value="subscription">Subscription</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="maxActivations">Max Activations (-1 for unlimited)</Label>
                    <Input 
                      id="maxActivations" 
                      name="maxActivations" 
                      type="number" 
                      defaultValue="5" 
                      data-testid="input-max-activations"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={generateLicenseMutation.isPending} data-testid="button-submit-license">
                    {generateLicenseMutation.isPending ? 'Generating...' : 'Generate License'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      <div className="grid gap-4">
        {licenses.length > 0 ? (
          licenses.map((license: any) => (
            <LicenseCard key={license.id} license={license} userRole={userRole} />
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <Key className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No licenses generated yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function LicenseCard({ license, userRole }: { license: any; userRole: string }) {
  const [showKey, setShowKey] = useState(false);
  
  return (
    <Card data-testid={`card-license-${license.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{license.productName}</CardTitle>
            <CardDescription>
              {license.licenseType} • {license.maxActivations === -1 ? 'Unlimited' : license.maxActivations} device(s)
            </CardDescription>
          </div>
          <Badge variant={license.isActive ? 'default' : 'secondary'} data-testid={`badge-license-status-${license.id}`}>
            {license.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-muted-foreground" />
            <code className="flex-1 px-2 py-1 bg-muted rounded text-sm font-mono">
              {showKey ? license.licenseKey : '••••-••••-••••-••••'}
            </code>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setShowKey(!showKey)}
              data-testid={`button-toggle-key-${license.id}`}
            >
              {showKey ? 'Hide' : 'Show'}
            </Button>
          </div>
          {license.expiresAt && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>Expires: {format(new Date(license.expiresAt), 'MMM dd, yyyy')}</span>
            </div>
          )}
          {userRole === 'client' && license.isActive && (
            <Button size="sm" variant="outline" data-testid={`button-activate-device-${license.id}`}>
              <Shield className="w-4 h-4 mr-2" />
              Activate on Device
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
