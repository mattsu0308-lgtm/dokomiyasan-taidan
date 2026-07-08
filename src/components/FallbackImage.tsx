"use client";

import { useEffect, useRef, useState } from "react";

/**
 * イラスト用の img。未配置・読み込み失敗時は絵文字ブロックにフォールバックし、
 * 画像がなくてもレイアウトが成立する。
 */
export function FallbackImage({
  src,
  alt,
  emoji,
  className = "",
}: {
  src: string;
  alt: string;
  emoji: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // 読み込み失敗がハイドレーション前に起きると onError では拾えないため、
  // マウント後にも読み込み状態を確認してフォールバックさせる
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, [src]);

  if (failed) {
    return (
      <div
        aria-hidden
        className={`flex items-center justify-center rounded-2xl bg-cream-deep text-5xl ${className}`}
      >
        {emoji}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={`rounded-2xl object-cover ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
