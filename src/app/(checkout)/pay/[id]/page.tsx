import { getCharge } from '@/lib/fetch/charges';
import { CheckoutInterface } from '@/components/checkout/checkout-interface';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

type CheckoutPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { id } = await params;
  const charge = await getCharge(id);

  if (!charge) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Invalid Payment Link</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">404 - This payment link is invalid or has expired.</p>
        </CardContent>
      </Card>
    );
  }

  return <CheckoutInterface charge={charge} />;
}
