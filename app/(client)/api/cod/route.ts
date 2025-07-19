import { NextRequest, NextResponse } from "next/server";
import { backendClient } from "@/sanity/lib/backendClient";

interface CODOrderRequestBody {
  orderNumber?: string; // Optional - generate if missing
  customerName: string;
  customerEmail: string;
  clerkUserId?: string;
  address: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  products: {
    productId: string;
    quantity: number;
  }[];
}

// Generates a unique order number like "ORD-20250719-ABC123"
function generateOrderNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomStr = crypto.randomUUID().slice(0, 6).toUpperCase();
  return `ORD-${date}-${randomStr}`;
}

export async function POST(req: NextRequest) {
  try {
    const body: CODOrderRequestBody = await req.json();

    // Validate mandatory fields
    if (
      !body.customerName ||
      !body.customerEmail ||
      !body.address ||
      !Array.isArray(body.products) ||
      body.products.length === 0
    ) {
      return NextResponse.json(
        { error: "Missing required fields in request body" },
        { status: 400 }
      );
    }

    // Validate address fields
    const { name, address, city, state, zip } = body.address;
    if (!name || !address || !city || !state || !zip) {
      return NextResponse.json(
        { error: "Incomplete address information" },
        { status: 400 }
      );
    }

    // Generate order number if not provided
    const orderNumber = body.orderNumber || generateOrderNumber();

    // Prepare product references for Sanity order document
    const productRefs = body.products.map((item) => ({
      _key: crypto.randomUUID(),
      product: {
        _type: "reference",
        _ref: item.productId,
      },
      quantity: item.quantity,
    }));

    // Calculate total price and discount based on current product data
    const { totalPrice, amountDiscount } = await calculatePriceAndDiscount(body.products);

    // Construct order document to store in Sanity
    const orderDoc = {
      _type: "order",
      orderNumber,
      customerName: body.customerName,
      email: body.customerEmail,
      clerkUserId: body.clerkUserId || "",
      currency: "bdt",
      amountDiscount,
      stripePaymentIntentId: "cash_on_delivery",
      stripeCheckoutSessionId: "cash_on_delivery",
      status: "pending",
      totalPrice,
      products: productRefs,
      orderDate: new Date().toISOString(),
      invoice: {}, // placeholder empty object for invoice
      address: {
        name,
        address,
        city,
        state,
        zip,
      },
      paymentMethod: "cod",
    };

    // Save the order in Sanity
    const order = await backendClient.create(orderDoc);

    // After successful order creation, update stock for each product
    await updateStockLevels(body.products);

    // Respond with created order info
    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (error) {
    console.error("❌ COD Order error:", error);
    return NextResponse.json(
      { error: "Failed to create COD order" },
      { status: 500 }
    );
  }
}

/**
 * Calculates total price and discount for the ordered products
 */
async function calculatePriceAndDiscount(
  items: { productId: string; quantity: number }[]
) {
  let totalPrice = 0;
  let totalDiscount = 0;

  for (const item of items) {
    const product = await backendClient.getDocument(item.productId);
    if (!product) continue;

    const price = product.price ?? 0;
    const discountPercent = product.discount ?? 0;
    const discountAmount = (discountPercent * price) / 100;
    const finalPrice = price - discountAmount;

    totalPrice += finalPrice * item.quantity;
    totalDiscount += discountAmount * item.quantity;
  }

  return { totalPrice, amountDiscount: totalDiscount };
}

/**
 * Updates stock quantities for products after order placement
 */
async function updateStockLevels(
  stockUpdates: { productId: string; quantity: number }[]
) {
  for (const { productId, quantity } of stockUpdates) {
    try {
      const product = await backendClient.getDocument(productId);
      if (!product || typeof product.stock !== "number") continue;

      const newStock = Math.max(product.stock - quantity, 0);

      // Patch product with new stock value in Sanity
      await backendClient.patch(productId).set({ stock: newStock }).commit();
    } catch (err) {
      console.error(`❌ Failed to update stock for ${productId}:`, err);
    }
  }
}
