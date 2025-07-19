import React from "react";
import Container from "./Container";
import Logo from "./Logo";
import HeaderMenu from "./HeaderMenu";
import SearchBar from "./SearchBar";
import CartIcon from "./CartIcon";
import FavoriteButton from "./FavoriteButton";
import SignIn from "./SignIn";
import MobileMenu from "./MobileMenu";
import { auth, currentUser } from "@clerk/nextjs/server";
import { ClerkLoaded, SignedIn, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Logs } from "lucide-react";
import { getMyOrders } from "@/sanity/queries";

const Header = async () => {
  const user = await currentUser();
  const { userId } = await auth();
  let orders = null;
  if (userId) {
    orders = await getMyOrders(userId);
  }

  return (
    <header className="sticky top-0 z-50 py-4 bg-white/70 backdrop-blur-md">
      <Container className="text-lightColor">

        {/* === Mobile Layout === */}
        <div className="md:hidden flex flex-col items-center gap-3">
          {/* Logo Centered */}
          <Logo />

          {/* Row: Menu + Search + Icons */}
          <div className="flex items-center gap-3 w-full">
            <MobileMenu />
            <div className="flex-grow">
              <SearchBar />
            </div>
            <CartIcon />
            <FavoriteButton />

            {user && (
              <Link
                href={"/orders"}
                className="group relative hover:text-shop_light_green hoverEffect"
              >
                <Logs />
                <span className="absolute -top-1 -right-1 bg-shop_btn_dark_green text-white h-3.5 w-3.5 rounded-full text-xs font-semibold flex items-center justify-center">
                  {orders?.length ?? 0}
                </span>
              </Link>
            )}

            <ClerkLoaded>
              <SignedIn>
                <UserButton />
              </SignedIn>
              {!user && <SignIn />}
            </ClerkLoaded>
          </div>
        </div>

        {/* === Desktop Layout === */}
        <div className="hidden md:flex items-center justify-between">
          <div className="w-auto md:w-1/3 flex items-center gap-2.5 justify-start">
            <MobileMenu />
            <Logo />
          </div>

          <HeaderMenu />

          <div className="w-auto md:w-1/3 flex items-center justify-end gap-5">
            <SearchBar />
            <CartIcon />
            <FavoriteButton />

            {user && (
              <Link
                href={"/orders"}
                className="group relative hover:text-shop_light_green hoverEffect"
              >
                <Logs />
                <span className="absolute -top-1 -right-1 bg-shop_btn_dark_green text-white h-3.5 w-3.5 rounded-full text-xs font-semibold flex items-center justify-center">
                  {orders?.length ?? 0}
                </span>
              </Link>
            )}

            <ClerkLoaded>
              <SignedIn>
                <UserButton />
              </SignedIn>
              {!user && <SignIn />}
            </ClerkLoaded>
          </div>
        </div>
      </Container>
    </header>
  );
};

export default Header;
