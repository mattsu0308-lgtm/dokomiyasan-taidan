# reels_cleaned.csv → タグ付け用の圧縮JSON
# 各行から「タグ判断に必要な最小限」だけを抜き出す(キャプション冒頭・ハッシュタグ・字幕冒頭)
import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "reels_cleaned.csv"
OUT = ROOT / "scripts" / "tagging-input.json"

rows = []
with open(SRC, encoding="utf-8-sig", newline="") as fh:
    for i, r in enumerate(csv.DictReader(fh), start=1):
        caption = (r.get("caption") or "").strip()
        # キャプション冒頭からタイトル候補: 先頭の @メンション行を飛ばし、
        # 最初の意味のある行を拾う
        lines = [l.strip() for l in caption.splitlines() if l.strip()]
        title_cand = ""
        for l in lines:
            plain = re.sub(r"@[\w.]+", "", l).strip(" \\/￩←→↓・|｜")
            if len(plain) >= 4 and not plain.startswith("#"):
                title_cand = plain
                break
        rows.append({
            "n": i,
            "posted_at": r.get("posted_at") or "",
            "title_cand": title_cand[:60],
            "cap_head": re.sub(r"\s+", " ", caption)[:200],
            "hashtags": (r.get("hashtags") or "")[:200],
            "srt_head": re.sub(r"\s+", " ", (r.get("srt_text") or ""))[:150],
        })

OUT.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"wrote {len(rows)} rows -> {OUT}")
