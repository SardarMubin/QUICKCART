// sanity/lib/orderService.ts

import { backendClient } from "./backendClient";

interface CartItem {
  product: { _id: string; price?: number };
  quantity: number;
}

interface Metadata {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  clerkUserId: string;
  address?: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}

export async function createCashOnDeliveryOrder(metadata: Metadata, items: CartItem[]) {
  try {
    console.log("Saving COD order to Sanity...");

    const orderDoc = {
      _type: "order",
      orderNumber: metadata.orderNumber,
      customerName: metadata.customerName,
      email: metadata.customerEmail,
      clerkUserId: metadata.clerkUserId,
      address: metadata.address || null,
      status: "pending",
      paymentMethod: "cod",
      products: items.map((item) => ({
        _type: "cartItem",
        product: {
          _type: "reference",
          _ref: item.product._id,
        },
        quantity: item.quantity,
        price: item.product.price || 0,
      })),
      orderDate: new Date().toISOString(),
      totalPrice: items.reduce(
        (sum, item) => sum + (item.product.price || 0) * item.quantity,
        0
      ),
      currency: "BDT",
      amountDiscount: 0,
    };

    const result = await backendClient.create(orderDoc);

    console.log("Order saved with ID:", result._id);
    return result;
  } catch (error) {
    console.error("Failed to save COD order:", error);
    throw error;
  }
}
