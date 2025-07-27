# GitSave API Architecture

## What are Next.js API Routes?
- Backend endpoints that run as serverless functions
- Live alongside your frontend code
- Deploy together on Vercel
- Each file in `/app/api/` becomes an endpoint

## Key Routes for GitSave

### 1. `/api/checkout` - Create Stripe checkout session
```typescript
// app/api/checkout/route.ts
export async function POST(request: Request) {
  const { priceId } = await request.json();
  
  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price: priceId, // price_monthly or price_3year
      quantity: 1,
    }],
    mode: 'subscription', // or 'payment' for one-time
    success_url: 'https://gitsave.app/success?session_id={CHECKOUT_SESSION_ID}',
    metadata: {
      productType: priceId === 'price_monthly' ? 'monthly' : 'multi-year'
    }
  });
  
  return Response.json({ url: session.url });
}
```

### 2. `/api/webhook/stripe` - Handle Stripe events
```typescript
// app/api/webhook/stripe/route.ts
export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');
  
  // Verify webhook is from Stripe
  const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  
  if (event.type === 'checkout.session.completed') {
    // Generate license key
    const licenseKey = generateLicenseKey();
    
    // Save to database
    await db.license.create({
      key: licenseKey,
      email: session.customer_email,
      type: session.metadata.productType,
      stripeCustomerId: session.customer,
      expiresAt: calculateExpiry(session.metadata.productType)
    });
    
    // Email license to customer
    await sendLicenseEmail(session.customer_email, licenseKey);
  }
  
  return Response.json({ received: true });
}
```

### 3. `/api/license/activate` - Activate license on machine
```typescript
// app/api/license/activate/route.ts
export async function POST(request: Request) {
  const { key, email, machineId } = await request.json();
  
  // Find license in database
  const license = await db.license.findUnique({ where: { key } });
  
  if (!license || license.email !== email) {
    return Response.json({ error: 'Invalid license' }, { status: 400 });
  }
  
  // Check machine limit (e.g., 2 machines)
  if (license.activeMachines.length >= 2 && !license.activeMachines.includes(machineId)) {
    return Response.json({ error: 'Machine limit reached' }, { status: 400 });
  }
  
  // Add machine if not already active
  if (!license.activeMachines.includes(machineId)) {
    await db.license.update({
      where: { key },
      data: { 
        activeMachines: [...license.activeMachines, machineId]
      }
    });
  }
  
  return Response.json({
    type: license.type,
    expiresAt: license.expiresAt?.getTime()
  });
}
```

### 4. `/api/license/validate` - Check if license still valid
```typescript
// app/api/license/validate/route.ts
export async function POST(request: Request) {
  const { key, machineId } = await request.json();
  
  const license = await db.license.findUnique({ where: { key } });
  
  if (!license || !license.activeMachines.includes(machineId)) {
    return Response.json({ valid: false }, { status: 401 });
  }
  
  // Check expiration
  if (license.expiresAt && new Date() > license.expiresAt) {
    return Response.json({ valid: false, reason: 'expired' }, { status: 401 });
  }
  
  return Response.json({ valid: true });
}
```

### 5. `/api/license/deactivate` - Remove machine from license
```typescript
// app/api/license/deactivate/route.ts
export async function POST(request: Request) {
  const { key, machineId } = await request.json();
  
  await db.license.update({
    where: { key },
    data: {
      activeMachines: {
        set: license.activeMachines.filter(id => id !== machineId)
      }
    }
  });
  
  return Response.json({ success: true });
}
```

## Database Schema (Prisma example)
```prisma
model License {
  id                String   @id @default(cuid())
  key               String   @unique
  email             String
  type              String   // 'monthly' or 'multi-year'
  activeMachines    String[]
  stripeCustomerId  String?
  stripeSubId       String?
  createdAt         DateTime @default(now())
  expiresAt         DateTime?
}
```

## File Structure
```
gitsave-web/
├── app/
│   ├── page.tsx          // Landing page
│   ├── success/page.tsx  // Post-purchase page
│   └── api/
│       ├── checkout/route.ts
│       ├── webhook/stripe/route.ts
│       └── license/
│           ├── activate/route.ts
│           ├── validate/route.ts
│           └── deactivate/route.ts
├── lib/
│   ├── stripe.ts         // Stripe client
│   └── db.ts            // Database client
└── .env.local           // Stripe keys, database URL
```