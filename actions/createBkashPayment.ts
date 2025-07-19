export async function createBkashPayment(items: any[], metadata: any): Promise<string | null> {
  try {
    const res = await fetch("/api/bkash", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items, metadata }),
    });

    if (!res.ok) throw new Error("Bkash payment failed");

    const data = await res.json();
    return data.url;
  } catch (err) {
    console.error("Bkash Error:", err);
    return null;
  }
}
