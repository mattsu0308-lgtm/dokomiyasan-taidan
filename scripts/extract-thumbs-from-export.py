# Meta公式エクスポートのリール動画から、図鑑対象レシピのサムネを切り出す。
# 入手経路が公式エクスポート＝規約クリーン(2026-07-09 公式チェックの結論)。
#
# 前提:
#   - 動画: C:\Users\matts\Downloads\ig-export-media\media\reels\YYYYMM\<media_file>
#   - 対象レシピ: scripts/tagging-input.json (重複除去後) から EXCLUDE を除いた152本
#   - reels_cleaned.csv の posted_at ⇔ media_file で動画を特定
# 出力:
#   - public/images/thumbs/{recipeId}.jpg (t=0.5sフレーム・幅720)
#   - public/images/thumbs/thumbs-map.json (recipeId → ファイル名)
import csv
import json
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
MEDIA_ROOT = Path(r"C:\Users\matts\Downloads\ig-export-media")
OUT_DIR = ROOT / "public/images/thumbs"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# build-recipes.py と同じ除外リスト(非レシピ投稿)
EXCLUDE = {"r074","r086","r087","r092","r093","r099","r102","r104","r121","r122","r130","r145","r164"}

csv_rows = {}
for r in csv.DictReader(open(ROOT / "reels_cleaned.csv", encoding="utf-8-sig", newline="")):
    csv_rows[r["posted_at"]] = r

inputs = json.loads((ROOT / "scripts/tagging-input.json").read_text(encoding="utf-8"))

thumbs_map = {}
missing = []
failed = []
for row in inputs:
    rid = row["id"]
    if rid in EXCLUDE:
        continue
    src = csv_rows.get(row["posted_at"])
    if not src or not src.get("media_file"):
        missing.append(rid)
        continue
    hits = list(MEDIA_ROOT.glob(f"media/reels/*/{src['media_file']}"))
    if not hits:
        missing.append(f"{rid}({src['media_file']})")
        continue
    out = OUT_DIR / f"{rid}.jpg"
    proc = subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-ss", "0.5", "-i", str(hits[0]),
         "-frames:v", "1", "-vf", "scale=720:-2", "-q:v", "3", str(out)],
        capture_output=True, text=True)
    if proc.returncode != 0 or not out.exists() or out.stat().st_size == 0:
        failed.append(f"{rid}: {proc.stderr.strip()[:80]}")
        continue
    thumbs_map[rid] = f"{rid}.jpg"

(OUT_DIR / "thumbs-map.json").write_text(
    json.dumps(thumbs_map, ensure_ascii=False, indent=1), encoding="utf-8")

print(f"切り出し成功: {len(thumbs_map)}本 / 動画なし: {len(missing)} / 失敗: {len(failed)}")
for m in missing[:10]:
    print("  動画なし:", m)
for f_ in failed[:10]:
    print("  失敗:", f_)
