# reels_cleaned.csv → 重複除去(トライアル/再投稿を1本に) → タグ付け用JSON
# 残す基準: キャプション先頭120字が同じ組の中で「17時以降投稿を優先、同点なら最新」
import csv
import json
import re
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "reels_cleaned.csv"
OUT = ROOT / "scripts" / "tagging-input.json"

rows = list(csv.DictReader(open(SRC, encoding="utf-8-sig", newline="")))

groups = defaultdict(list)
for r in rows:
    groups[(r["caption"] or "")[:120]].append(r)

kept = []
for key, grp in groups.items():
    if len(grp) == 1:
        kept.append(grp[0])
        continue
    def score(r):
        dt = datetime.strptime(r["posted_at"], "%Y-%m-%d %H:%M:%S")
        return (1 if dt.hour >= 17 else 0, dt)  # 夜優先→新しい方
    grp.sort(key=score, reverse=True)
    kept.append(grp[0])

kept.sort(key=lambda r: r["posted_at"])
print(f"{len(rows)}本 → 重複除去後 {len(kept)}本")

out_rows = []
for i, r in enumerate(kept, start=1):
    caption = (r.get("caption") or "").strip()
    out_rows.append({
        "id": f"r{i:03d}",
        "posted_at": r.get("posted_at") or "",
        "cap_head": re.sub(r"\s+", " ", caption)[:400],
        "hashtags": (r.get("hashtags") or "")[:200],
    })

OUT.write_text(json.dumps(out_rows, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"wrote {len(out_rows)} rows -> {OUT}")
