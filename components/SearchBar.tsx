"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const trimmed = query.trim();
    if (!trimmed) return;

    router.push(`/shop?search=${encodeURIComponent(trimmed)}`);
    setQuery("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center border rounded-md overflow-hidden w-full max-w-xs sm:max-w-sm md:max-w-md"
    >
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        placeholder="Search products…"
        className="px-2 py-1 text-sm md:px-3 md:py-2 md:text-base flex-grow focus:outline-none"
      />
      <button
        type="submit"
        aria-label="Search"
        className="px-2 py-1 text-sm md:px-4 md:py-2 md:text-base text-shop_dark_green hover:bg-shop_dark_green/10 transition"
      >
        <Search className="w-4 h-4 md:w-5 md:h-5" />
      </button>
    </form>
  );
}
