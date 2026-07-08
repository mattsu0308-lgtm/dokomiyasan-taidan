import Link from "next/link";

/**
 * タグ絞り込みチップ。href ベース(サーバーコンポーネントから使える)。
 * 選択状態のトグルはリンク先URLの生成側(ページ)で行う。
 */
export function TagChip({
  label,
  href,
  selected = false,
}: {
  label: string;
  href: string;
  selected?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-block whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] leading-none transition-colors ${
        selected
          ? "border-primary bg-primary text-white"
          : "border-muted bg-white text-ink"
      }`}
    >
      {label}
    </Link>
  );
}
