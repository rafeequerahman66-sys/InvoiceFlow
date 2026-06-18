/**
 * Payment integration — stubbed behind an interface so Stripe / Razorpay /
 * PayPal can drop in later. Default mock returns a fake hosted link and an
 * always-PENDING status, so "Collect payment online" works end-to-end with
 * no keys configured.
 */

export type PaymentProvider = "stripe" | "razorpay" | "paypal" | "mock";

export interface PaymentLinkArgs {
  invoiceId: string;
  amount: number; // major units (e.g. rupees)
  currency: string;
  description: string;
}

export interface PaymentLink {
  url: string;
  provider: PaymentProvider;
  reference: string;
}

export type PaymentStatus = "PENDING" | "PAID" | "FAILED";

export interface PaymentGateway {
  readonly provider: PaymentProvider;
  createPaymentLink(args: PaymentLinkArgs): Promise<PaymentLink>;
  getStatus(reference: string): Promise<PaymentStatus>;
}

class MockGateway implements PaymentGateway {
  readonly provider: PaymentProvider = "mock";
  async createPaymentLink({ invoiceId, amount, currency }: PaymentLinkArgs): Promise<PaymentLink> {
    const reference = `mock_pl_${invoiceId}`;
    return {
      provider: this.provider,
      reference,
      // Deliberately a local placeholder — real gateways return a hosted URL.
      url: `/share/invoice/${invoiceId}?pay=mock&amt=${amount}&cur=${currency}`,
    };
  }
  async getStatus(): Promise<PaymentStatus> {
    return "PENDING";
  }
}

// Future: class StripeGateway / RazorpayGateway implements PaymentGateway.
export function getPaymentGateway(): PaymentGateway {
  switch (process.env.PAYMENT_PROVIDER as PaymentProvider | undefined) {
    // case "stripe": return new StripeGateway(process.env.STRIPE_SECRET_KEY!);
    // case "razorpay": return new RazorpayGateway(...);
    default:
      return new MockGateway();
  }
}
