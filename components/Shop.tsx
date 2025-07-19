"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, SlidersHorizontal } from "lucide-react";

import { client } from "@/sanity/lib/client";
import { BRANDS_QUERYResult, Category, Product } from "@/sanity.types";

import Container from "./Container";
import Title from "./Title";
import CategoryList from "./shop/CategoryList";
import BrandList from "./shop/BrandList";
import PriceList from "./shop/PriceList";
import ProductCard from "./ProductCard";
import NoProductAvailable from "./NoProductAvailable";

interface Props {
  categories: Category[];
  brands: BRANDS_QUERYResult;
}

const Shop = ({ categories, brands }: Props) => {
  const searchParams = useSearchParams();

  const selectedCategoryParam = searchParams?.get("category") || null;
  const selectedBrandParam = searchParams?.get("brand") || null;

  const searchQuery = useMemo(() => {
    return searchParams?.get("search")?.toLowerCase() || "";
  }, [searchParams]);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(selectedCategoryParam);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(selectedBrandParam);
  const [selectedPrice, setSelectedPrice] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const [minPrice, maxPrice] = selectedPrice?.split("-").map(Number) || [0, 10000];

      const query = `
        *[_type == 'product' 
          && (!defined($selectedCategory) || references(*[_type == "category" && slug.current == $selectedCategory]._id))
          && (!defined($selectedBrand) || references(*[_type == "brand" && slug.current == $selectedBrand]._id))
          && (!defined($searchQuery) || name match $searchQuery)
          && price >= $minPrice && price <= $maxPrice
        ] 
        | order(name asc) {
          ...,
          "categories": categories[]->title
        }
      `;

      const data = await client.fetch<Product[]>(
        query,
        {
          selectedCategory,
          selectedBrand,
          minPrice,
          maxPrice,
          searchQuery: `${searchQuery}*`,
        },
        { next: { revalidate: 0 } }
      );

      setProducts(data);
    } catch (error) {
      console.error("Shop product fetching error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, selectedBrand, selectedPrice, searchQuery]);

  const handleResetFilters = () => {
    setSelectedCategory(null);
    setSelectedBrand(null);
    setSelectedPrice(null);
  };

  return (
    <div className="border-t">
      <Container className="mt-5">
        {/* Header with Title, Filter Icon (Mobile), Reset */}
        <div className="sticky top-0 z-10 mb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-end gap-25 sm: px-5">
              <Title className="text-lg uppercase tracking-wide">
                Get the products as your needs
              </Title>

              {/* Mobile Filter Icon */}
              <button
                onClick={() => setMobileFiltersOpen(true)}
                aria-label="Open filter menu"
                className="md:hidden p-2 rounded-md border border-gray-300 hover:bg-gray-100 transition"
              >
                <SlidersHorizontal className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            {/* Reset Filters */}
            {(selectedCategory || selectedBrand || selectedPrice) && (
              <button
                onClick={handleResetFilters}
                className="text-shop_dark_green underline text-sm mt-2 font-medium hover:text-darkRed hoverEffect"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Layout */}
        <div className="flex flex-col md:flex-row gap-5 border-t border-t-shop_dark_green/50">
          {/* Desktop Sidebar Filters */}
          <div className="hidden md:block md:sticky md:top-20 md:self-start md:h-[calc(100vh-160px)] md:overflow-y-auto md:min-w-64 pb-5 md:border-r border-r-shop_btn_dark_green/50 scrollbar-hide">
            <CategoryList
              categories={categories}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
            />
            <BrandList
              brands={brands}
              selectedBrand={selectedBrand}
              setSelectedBrand={setSelectedBrand}
            />
            <PriceList
              selectedPrice={selectedPrice}
              setSelectedPrice={setSelectedPrice}
            />
          </div>

          {/* Product Grid */}
          <div className="flex-1 pt-5">
            <div className="h-[calc(100vh-160px)] overflow-y-auto pr-2 scrollbar-hide">
              {loading ? (
                <div className="p-20 flex flex-col items-center justify-center bg-white gap-2">
                  <Loader2 className="w-10 h-10 text-shop_dark_green animate-spin" />
                  <p className="font-semibold tracking-wide text-base">
                    Product is loading . . .
                  </p>
                </div>
              ) : products.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {products.map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>
              ) : (
                <NoProductAvailable className="bg-white mt-0" />
              )}
            </div>
          </div>
        </div>
      </Container>

      {/* Mobile Filters Drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-end md:hidden">
          <div className="w-4/5 sm:w-2/3 max-w-sm bg-white h-full p-4 overflow-y-auto shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Filters</h2>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="text-gray-500 hover:text-red-500 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <CategoryList
                categories={categories}
                selectedCategory={selectedCategory}
                setSelectedCategory={(val) => {
                  setSelectedCategory(val);
                  setMobileFiltersOpen(false);
                }}
              />
              <BrandList
                brands={brands}
                selectedBrand={selectedBrand}
                setSelectedBrand={(val) => {
                  setSelectedBrand(val);
                  setMobileFiltersOpen(false);
                }}
              />
              <PriceList
                selectedPrice={selectedPrice}
                setSelectedPrice={(val) => {
                  setSelectedPrice(val);
                  setMobileFiltersOpen(false);
                }}
              />
              {(selectedCategory || selectedBrand || selectedPrice) && (
                <button
                  onClick={() => {
                    handleResetFilters();
                    setMobileFiltersOpen(false);
                  }}
                  className="text-sm text-shop_dark_green underline font-medium hover:text-darkRed"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shop;
