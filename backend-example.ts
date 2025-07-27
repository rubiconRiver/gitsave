// Example NestJS endpoints for GitSave licensing

// License Controller
@Controller('license')
export class LicenseController {
  @Post('activate')
  async activate(@Body() dto: {
    key: string;
    email: string;
    machineId: string;
    platform: string;
  }) {
    // 1. Validate license key exists in database
    // 2. Check if already activated on too many machines (e.g., limit 2)
    // 3. Store machine ID with license
    // 4. Return license details
    return {
      type: 'monthly', // or 'multi-year'
      expiresAt: new Date('2025-08-27').getTime(),
    };
  }

  @Post('deactivate')
  async deactivate(@Body() dto: {
    key: string;
    machineId: string;
  }) {
    // Remove machine ID from license
    return { success: true };
  }
}

// Stripe Webhook Controller
@Controller('webhook')
export class StripeWebhookController {
  @Post('stripe')
  async handleStripeWebhook(@Body() body: any, @Headers('stripe-signature') sig: string) {
    // 1. Verify webhook signature
    // 2. Handle checkout.session.completed event
    // 3. Generate license key
    // 4. Email license to customer
    // 5. Store in database with type (monthly/multi-year)
  }
}

// Database schema
interface LicenseRecord {
  key: string;
  email: string;
  type: 'monthly' | 'multi-year';
  createdAt: Date;
  expiresAt?: Date;
  stripeCustomerId: string;
  stripeSubscriptionId?: string;
  activeMachines: string[];
}