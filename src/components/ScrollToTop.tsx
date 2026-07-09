"use client";

import { useEffect, useState } from "react";

/**
 * 一番上に戻るボタン。少しスクロールしたら右下(下ナビの上)に出現する。
 * 長い一覧を下まで見たあと、素早くトップへ戻れるようにする。
 */
export function ScrollToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      type="button"
      aria-label="一番上に戻る"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-24 right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-muted bg-white/95 text-ink shadow-md active:bg-cream-deep"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        className="h-5 w-5"
        aria-hidden
      >
        <path
          d="M12 19V5M5 12l7-7 7 7"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
