"use client";

import React from "react";
import { ActivityIcon, MenuIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function FloatingHeader() {
  const [open, setOpen] = React.useState(false);

  const links = [
    { label: "Markets", href: "/markets" },
    { label: "Oracle", href: "/oracle" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Verify", href: "/verify" },
  ];

  return (
    <header
      className={cn(
        "sticky top-6 z-50",
        "mx-auto w-[95%] max-w-7xl border-brutal shadow-brutal",
        "bg-cream/90 backdrop-blur-sm transition-all duration-300"
      )}
    >
      <nav className="mx-auto flex items-center justify-between p-4 px-6 md:px-8">
        <Link
          href="/"
          className="hover:bg-lime-green flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors border-2 border-transparent hover:border-black"
        >
          <ActivityIcon className="size-8 stroke-[3px]" />
          <p className="font-heading text-2xl md:text-3xl font-black uppercase tracking-tighter">
            VERITAS
          </p>
        </Link>
        <div className="hidden items-center gap-4 lg:flex px-4">
          {links.map((link) => (
            <a
              key={link.label}
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className:
                  "text-lg border-2 shadow-none hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-0 hover:translate-y-0 h-12",
              })}
              href={link.href}
            >
              {link.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/create">
            <Button
              size="lg"
              variant="solana"
              className="hidden lg:flex text-lg border-2 h-14 px-8"
            >
              Create Market
            </Button>
          </Link>
          <Sheet open={open} onOpenChange={setOpen}>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setOpen(!open)}
              className="lg:hidden border-2 shadow-none h-10 w-10 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-0 hover:translate-y-0"
            >
              <MenuIcon className="size-5" />
            </Button>
            <SheetContent
              side="left"
              className="p-0 gap-0 border-r-4 border-black w-full sm:w-80"
              showClose={false}
            >
              <SheetHeader className="flex flex-row items-center justify-between">
                <SheetTitle>Menu</SheetTitle>
                <SheetClose className="border-2 border-black p-1 hover:bg-black hover:text-white transition-colors">
                  <MenuIcon className="size-5" />
                </SheetClose>
              </SheetHeader>
              <div className="grid gap-y-2 overflow-y-auto px-6 py-10 flex-grow">
                {links.map((link) => (
                  <a
                    key={link.label}
                    className={buttonVariants({
                      variant: "ghost",
                      className:
                        "justify-start text-xl border-b-2 border-transparent hover:border-black hover:bg-transparent rounded-none",
                    })}
                    href={link.href}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
              <SheetFooter className="gap-4">
                <Link
                  href="/create"
                  className="w-full"
                  onClick={() => setOpen(false)}
                >
                  <Button className="w-full" size="lg" variant="solana">
                    Create Market
                  </Button>
                </Link>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
