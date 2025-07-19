import { Metadata } from "@/actions/createCheckoutSession";
import stripe from "@/lib/stripe";
import { backendClient } from "@/sanity/lib/backendClient";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Define a product reference type for Sanity order
type SanityOrderProduct = {
  _key: string;
  product: {
    _type: "reference";
    _ref: string;
  };
  quantity: number;
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = headers().get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing Stripe signature or webhook secret" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("❌ Invalid Stripe signature:", err);
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      const invoice = session.invoice
        ? await stripe.invoices.retrieve(session.invoice as string)
        : null;

      await createOrderInSanity(session, invoice);
    } catch (err) {
      console.error("❌ Failed to create order:", err);
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}

// --- Create Order in Sanity ---
async function createOrderInSanity(
  session: Stripe.Checkout.Session,
  invoice: Stripe.Invoice | null
) {
  const {
    id,
    amount_total,
    currency,
    metadata,
    payment_intent,
    total_details,
  } = session;

  const {
    orderNumber,
    customerName,
    customerEmail,
    clerkUserId,
    address,
  } = metadata as Metadata & { address: string };

  const parsedAddress = address ? JSON.parse(address) : null;

  const lineItems = await stripe.checkout.sessions.listLineItems(id, {
    expand: ["data.price.product"],
  });

  const products: SanityOrderProduct[] = [];
  const stockUpdates: { productId: string; quantity: number }[] = [];

  for (const item of lineItems.data) {
    const productMeta = item.price?.product as Stripe.Product;
    const productId = productMeta?.metadata?.id;
    const quantity = item?.quantity || 0;

    if (!productId) continue;

    products.push({
      _key: crypto.randomUUID(),
      product: {
        _type: "reference",
        _ref: productId,
      },
      quantity,
    });

    stockUpdates.push({ productId, quantity });
  }

  const order = await backendClient.create({
    _type: "order",
    orderNumber,
    stripeCheckoutSessionId: id,
    stripePaymentIntentId: payment_intent,
    customerName,
    stripeCustomerId: customerEmail,
    clerkUserId,
    email: customerEmail,
    currency,
    amountDiscount: total_details?.amount_discount
      ? total_details.amount_discount / 100
      : 0,
    products,
    totalPrice: amount_total ? amount_total / 100 : 0,
    status: "paid",
    orderDate: new Date().toISOString(),
    invoice: invoice
      ? {
          id: invoice.id,
          number: invoice.number,
          hosted_invoice_url: invoice.hosted_invoice_url,
        }
      : null,
    address: parsedAddress
      ? {
          name: parsedAddress.name,
          address: parsedAddress.address,
          city: parsedAddress.city,
          state: parsedAddress.state,
          zip: parsedAddress.zip,
        }
      : null,
  });

  await updateStockLevels(stockUpdates);
  return order;
}

// --- Update Stock Levels ---
async function updateStockLevels(
  stockUpdates: { productId: string; quantity: number }[]
) {
  for (const { productId, quantity } of stockUpdates) {
    try {
      const product = await backendClient.getDocument(productId);

      if (!product || typeof product.stock !== "number") {
        console.warn(`⚠️ Invalid stock for product ${productId}`);
        continue;
      }

      const newStock = Math.max(product.stock - quantity, 0);
      await backendClient.patch(productId).set({ stock: newStock }).commit();
    } catch (err) {
      console.error(`❌ Failed to update stock for ${productId}:`, err);
    }
  }
}
