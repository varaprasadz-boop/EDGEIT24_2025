import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Shield } from "lucide-react";

export default function MockPaymentGateway() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  
  const params = new URLSearchParams(location.split('?')[1]);
  const sessionId = params.get('session');
  
  const [cardNumber, setCardNumber] = useState('');
  const [cvv, setCvv] = useState('');
  const [expiry, setExpiry] = useState('');
  
  const handlePayment = async () => {
    setProcessing(true);
    
    // Simulate payment processing
    setTimeout(async () => {
      try {
        await apiRequest('POST', '/api/payments/complete', { sessionId });
        
        toast({
          title: "Payment Successful!",
          description: "Your subscription has been activated."
        });
        
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } catch (error) {
        toast({
          title: "Payment Failed",
          description: "Something went wrong. Please try again.",
          variant: "destructive"
        });
        setProcessing(false);
      }
    }, 2000);
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center" data-testid="text-payment-title">Mock Payment Gateway</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="cardNumber">Card Number</Label>
            <Input
              id="cardNumber"
              placeholder="4242 4242 4242 4242"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              data-testid="input-card-number"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="expiry">Expiry</Label>
              <Input
                id="expiry"
                placeholder="MM/YY"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                data-testid="input-expiry"
              />
            </div>
            <div>
              <Label htmlFor="cvv">CVV</Label>
              <Input
                id="cvv"
                placeholder="123"
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                data-testid="input-cvv"
              />
            </div>
          </div>
          
          <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 border" data-testid="container-privacy-notice">
            <Shield className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <p className="text-xs text-muted-foreground" data-testid="text-privacy-notice">
              Your payment information is secure and encrypted. By proceeding, you agree to our{" "}
              <Link href="/legal/privacy-policy" className="text-primary hover:underline" data-testid="link-privacy-policy">
                Privacy Policy
              </Link>
              .
            </p>
          </div>

          <Button
            onClick={handlePayment}
            disabled={processing}
            className="w-full"
            data-testid="button-pay"
          >
            {processing ? "Processing..." : "Pay Now"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
