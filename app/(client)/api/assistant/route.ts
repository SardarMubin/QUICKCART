import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { client } from "@/lib/sanity";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const chatMessages = messages.map((m: { from: string; text: string }) => ({
      role: m.from === "user" ? "user" : "assistant",
      content: m.text,
    }));

    // Step 1: Ask GPT to classify intent
    const intentCheck = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        ...chatMessages,
        {
          role: "system",
          content:
            'Does the user want to search for a product? Reply ONLY in JSON format: {"intent": "search"} or {"intent": "question"}.',
        },
      ],
    });

    const intentResponse = intentCheck.choices[0].message?.content || "{}";
    let intent = "search";

    try {
      const parsed = JSON.parse(intentResponse);
      intent = parsed.intent || "search";
    } catch {
      intent = "search";
    }

    // If user asked a general question (like "how to order")
    if (intent === "question") {
      const faqAnswer = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful e-commerce assistant. Answer questions about how to place an order, how to pay, check order status, and other website help.",
          },
          ...chatMessages,
        ],
      });

      const reply = faqAnswer.choices[0].message?.content || "I'm here to help!";
      return NextResponse.json({ reply, products: [] });
    }

    // Else: Product search mode
    const extract = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        ...chatMessages,
        {
          role: "system",
          content:
            'Extract the main product keyword(s) as JSON like: { "query": "sneakers" }. Only return JSON.',
        },
      ],
    });

    const rawReply = extract.choices[0].message?.content || "{}";
    let searchTerm = "";

    try {
      const parsed = JSON.parse(rawReply);
      searchTerm = parsed.query || "shoes";
    } catch {
      searchTerm = "shoes";
    }

    // Query Sanity for matching products
    const products = await client.fetch(
      `*[_type == "product" && name match $term]{
        _id,
        name,
        price,
        "slug": slug.current,
        "image": images[0].asset->url
      }[0...4]`,
      { term: searchTerm }
    );

    const productListText = products.length
      ? products
          .map(p => `- ${p.name} (৳${p.price}) → /product/${p.slug}`)
          .join("\n")
      : "No products found.";

    const reply = `Here are some products matching "${searchTerm}":\n${productListText}`;

    return NextResponse.json({ reply, products });
  } catch (error) {
    console.error("❌ Error in /api/assistant:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
