import dotenv from 'dotenv';
dotenv.config();

import TelegramBot from 'node-telegram-bot-api';
import sanityClient from './sanity.mjs';

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
console.log("🤖 QuickCart Bot is live...");

const BASE_URL = "https://quickcart.com"; // change if different

// In-memory session store per chat (for demo; use DB/cache in prod)
const sessions = {};

// /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId,
    "👋 Welcome to QuickCart Bot 🛒\n\n" +
    "You can search products by typing product name.\n\n" +
    "To login, type /login\n" +
    "To logout, type /logout"
  );
});

// /login command: send magic login link with chatId embedded
bot.onText(/\/login/, (msg) => {
  const chatId = msg.chat.id;
  const loginLink = `${BASE_URL}/login?telegramChatId=${chatId}`;
  const message = 
    `🔐 To login securely, please click this link and follow the login process:\n\n` +
    `${loginLink}\n\n` +
    `Once logged in, you can return here and continue using the bot.`;
  bot.sendMessage(chatId, message);
});

// /logout command clears session (for local bot state)
bot.onText(/\/logout/, (msg) => {
  const chatId = msg.chat.id;
  delete sessions[chatId];
  bot.sendMessage(chatId, "✅ You have been logged out.");
});

// Message handler for product search and other commands
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  if (!text) return;

  // Ignore commands (handled above)
  if (text.startsWith('/')) return;

  // Minimal length check for product search
  if (text.length < 2) {
    return bot.sendMessage(chatId, "🔍 Type at least 2 characters to search.");
  }

  try {
    // Search products from Sanity
    const products = await sanityClient.fetch(
      `*[_type == "product" && name match $query]{
        _id, name, price, image {asset->{url}}, slug
      }[0...5]`,
      { query: `${text}*` }
    );

    if (products.length === 0) {
      return bot.sendMessage(chatId, `❌ No results for "${text}".`);
    }

    for (const product of products) {
      const caption = `🛍️ *${product.name}*\n💵 Price: ${product.price}৳\n🌐 [View on Website](${BASE_URL}/product/${product.slug.current})`;

      const options = {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[
            {
              text: "🌐 View Product",
              url: `${BASE_URL}/product/${product.slug.current}`
            }
          ]]
        }
      };

      if (product.image?.asset?.url) {
        await bot.sendPhoto(chatId, product.image.asset.url, { caption, ...options });
      } else {
        await bot.sendMessage(chatId, caption, options);
      }
    }

  } catch (err) {
    console.error("❌ Product search error:", err);
    bot.sendMessage(chatId, "⚠️ Failed to fetch products.");
  }
});
