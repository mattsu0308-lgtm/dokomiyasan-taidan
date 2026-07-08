"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    href: "/",
    label: "ホーム",
    icon: (
      <path d="M3 11.5 12 4l9 7.5M5.5 9.8V20h13V9.8" strokeWidth="1.8" />
    ),
    isActive: (p: string) => p === "/" || p.startsWith("/recipes"),
  },
  {
    href: "/search",
    label: "さがす",
    icon: (
      <>
        <circle cx="11" cy="11" r="6.5" strokeWidth="1.8" />
        <path d="m16 16 5 5" strokeWidth="1.8" />
      </>
    ),
    isActive: (p: string) => p.startsWith("/search"),
  },
  {
    href: "/collections",
    label: "まとめ",
    icon: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="3" strokeWidth="1.8" />
        <path d="M8 9h8M8 13h8M8 17h5" strokeWidth="1.8" />
      </>
    ),
    isActive: (p: string) => p.startsWith("/collections"),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-muted bg-cream/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map((item) => {
          const active = item.isActive(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
                active ? "font-bold text-primary-deep" : "text-ink-soft"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
                aria-hidden
              >
                {item.icon}
              </svg>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
