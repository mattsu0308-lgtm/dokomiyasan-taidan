"use client";

import { useEffect, useRef, useState } from "react";
import type { PlaceholderCategory } from "@/lib/data/types";
import { getPlaceholderStyle } from "@/lib/design/assets";

/**
 * 9:16 サムネイル。画像が未配置・読み込み失敗でも表示が成立するように、
 * onError で CSS プレースホルダ(グラデーション+絵文字)へフォールバックする。
 */
export function RecipeThumb({
  src,
  alt,
  category,
  className = "",
}: {
  src: string;
  alt: string;
  category: PlaceholderCategory;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const ph = getPlaceholderStyle(category);

  // 読み込み失敗がハイドレーション前に起きると onError では拾えないため、
  // マウント後にも読み込み状態を確認してフォールバックさせる
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, [src]);

  return (
    <div
      className={`relative aspect-[9/16] w-full overflow-hidden rounded-2xl bg-cream-deep ${className}`}
      style={failed ? { background: ph.gradient } : undefined}
    >
      {failed ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2">
          <span aria-hidden className="text-4xl">
            {ph.emoji}
          </span>
          <span className="text-xs text-ink-soft">{ph.label}</span>
        </div>
      ) : (
        // 生成画像・実サムネの差し替えを最優先にするため next/image ではなく
        // 素の img + onError フォールバックを使う(外部URLも設定不要で使える)
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
