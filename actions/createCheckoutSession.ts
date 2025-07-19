"use server";

import stripe from "@/lib/stripe";
import { urlFor } from "@/sanity/lib/image";
import { backendClient } from "@/sanity/lib/backendClient";
import type { Address } from "@/sanity.types";
import type { CartItem } from "@/store";
import Stripe from "stripe";

export interface Metadata {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  clerkUserId?: string;
  address?: Address | null;
  paymentMethod?: "stripe" | "bkash" | "cod";
}

export interface GroupedCartItems {
  product: CartItem["product"];
  quantity: number;
}

// --- Create Bkash session (placeholder) ---
async function createBkashSession(
  items: GroupedCartItems[],
  metadata: Metadata
): Promise<string> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/bkash`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ items, metadata }),
  });

  const data = await res.json();
  if (!res.ok || !data?.url) {
    throw new Error("Bkash session creation failed");
  }
  return data.url;
}

// --- Create Cash On Delivery Order in Sanity ---
async function createCashOnDeliverySession(
  metadata: Metadata,
  items: GroupedCartItems[]
): Promise<string> {
  try {
    console.log("Creating COD order in Sanity...");

    // Calculate total price (assumes all prices are BDT)
    const totalPrice = items.reduce(
      (sum, item) => sum + (item.product.price ?? 0) * item.quantity,
      0
    );

    // Prepare order document matching your Sanity schema exactly
    const orderDoc = {
      _type: "order",
      orderNumber: metadata.orderNumber,
      customerName: metadata.customerName,
      email: metadata.customerEmail,
      clerkUserId: metadata.clerkUserId || "",
      address: metadata.address
        ? {
            name: metadata.address.name || "",
            address: metadata.address.address || "",
            city: metadata.address.city || "",
            state: metadata.address.state || "",
            zip: metadata.address.zip || "",
          }
        : null,
      paymentMethod: "cod",
      status: "pending",
      orderDate: new Date().toISOString(),
      products: items.map((item) => ({
        _type: "object",
        product: {
          _type: "reference",
          _ref: item.product._id,
        },
        quantity: item.quantity,
      })),
      totalPrice,
      currency: "BDT",
      amountDiscount: 0,
    };

    // Save order to Sanity
    const result = await backendClient.create(orderDoc);
    console.log("✅ COD Order saved:", result._id);

    // Return redirect url to COD success page with orderNumber query param
    return `${process.env.NEXT_PUBLIC_BASE_URL}/cod-success?orderNumber=${metadata.orderNumber}`;
  } catch (error) {
    console.error("❌ Failed to save COD order:", error);
    throw new Error("Could not place COD order");
  }
}

// --- Main Checkout Handler ---
export async function createCheckoutSession(
  items: GroupedCartItems[],
  metadata: Metadata
): Promise<string | null> {
  try {
    const paymentMethod = metadata.paymentMethod || "stripe";

    if (paymentMethod === "stripe") {
      const customers = await stripe.customers.list({
        email: metadata.customerEmail,
        limit: 1,
      });

      const customerId =
        customers?.data.length > 0 ? customers.data[0].id : undefined;

      const sessionPayload: Stripe.Checkout.SessionCreateParams = {
        metadata: {
          orderNumber: metadata.orderNumber,
          customerName: metadata.customerName,
          customerEmail: metadata.customerEmail,
          clerkUserId: metadata.clerkUserId || "",
          address: JSON.stringify(metadata.address),
        },
        mode: "payment",
        allow_promotion_codes: true,
        payment_method_types: ["card"],
        invoice_creation: { enabled: true },
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}&orderNumber=${metadata.orderNumber}`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cart`,
        line_items: items.map((item) => ({
          price_data: {
            currency: "BDT",
            unit_amount: Math.round(item.product.price! * 100),
            product_data: {
              name: item.product.name || "Unknown Product",
              description: item.product.description,
              metadata: { id: item.product._id },
              images:
                item.product.images && item.product.images.length > 0
                  ? [urlFor(item.product.images[0]).url()]
                  : undefined,
            },
          },
          quantity: item.quantity,
        })),
      };

      if (customerId) {
        sessionPayload.customer = customerId;
      } else {
        sessionPayload.customer_email = metadata.customerEmail;
      }

      const session = await stripe.checkout.sessions.create(sessionPayload);
      return session.url;
    }

    if (paymentMethod === "bkash") {
      return await createBkashSession(items, metadata);
    }

    if (paymentMethod === "cod") {
      return await createCashOnDeliverySession(metadata, items);
    }

    throw new Error("Invalid payment method");
  } catch (error) {
    console.error("❌ Error creating checkout session:", error);
    throw error;
  }
}
