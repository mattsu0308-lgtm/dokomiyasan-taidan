# タグ付け結果(tags-1..4.json) + reels_cleaned.csv + thumbs-index.json を合流し、
# src/data/recipes.generated.ts (実データ169本 + まとめ3本) を生成する。
#
# - captionRaw: CSVの全文
# - permalink: サムネ取得済みの19本は実URL、それ以外はプロフィールへフォールバック
#   (Metaエクスポートにpermalinkが無いため。docs/csv-import-schema.md 参照)
# - thumbnailUrl: thumbs-index.json の taken_at(UTC epoch) と posted_at(JST) を±5分で突合
import csv
import json
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
JST = timezone(timedelta(hours=9))
PROFILE_URL = "https://www.instagram.com/macchi_recipi/"
ALLOWED_PLACEHOLDER = {"default", "pork", "chicken", "egg", "cheese", "vegetable", "microwave", "rice-bowl"}
ALLOWED_INGREDIENT = {"豚肉","鶏肉","ひき肉","牛肉","卵","豆腐","キャベツ","もやし","なす","じゃがいも","玉ねぎ","トマト","きのこ","チーズ","ごはん","麺","鮭","ツナ缶"}
# 語彙外食材の昇格(5本以上で出現・2026-07-09集計)と名寄せ
PROMOTED = {"ライスペーパー","にんじん","大葉","えび","長ネギ","きゅうり","ピーマン","白菜","小松菜","ニラ","はんぺん","ブロッコリー"}
NORM = {
    "長いも": "長芋", "白ネギ": "長ネギ", "小ネギ": "長ネギ", "にら": "ニラ",
    "冷凍えび": "えび", "冷凍エビ": "えび", "エビ": "えび", "ほたて": "ホタテ",
    "冷凍ブロッコリー": "ブロッコリー", "冷凍ほうれん草": "ほうれん草",
    "カニカマ": "かにかま", "まぐろたたき": "まぐろ", "サーモン": "鮭",
}
# レシピ以外の投稿(商品PR・エッセイ・報告動画)は図鑑に載せない
EXCLUDE = {"r074","r086","r087","r092","r093","r099","r102","r104","r121","r122","r130","r145","r164"}
ALLOWED_MOOD = {"時短","レンジ","さっぱり","がっつり","ヘルシー","こってり","子どもウケ","疲れた夜","洗い物少ない","平日夜","作り置き","おつまみ","節約","夫が作れる","週末ごちそう"}

# 1) タグ結果を合流
tags = {}
for i in (1, 2, 3, 4):
    for t in json.loads((ROOT / "scripts" / f"tags-{i}.json").read_text(encoding="utf-8-sig")):
        tags[t["id"]] = t

# 2) 重複除去後の対象一覧(id⇔posted_at)
inputs = json.loads((ROOT / "scripts" / "tagging-input.json").read_text(encoding="utf-8"))

# 3) CSV全文をposted_atで引けるように
csv_rows = {}
for r in csv.DictReader(open(ROOT / "reels_cleaned.csv", encoding="utf-8-sig", newline="")):
    csv_rows[r["posted_at"]] = r

# 4a) サムネ: 公式エクスポート由来(extract-thumbs-from-export.py の出力)を全件参照
thumbs_map = json.loads((ROOT / "public/images/thumbs/thumbs-map.json").read_text(encoding="utf-8"))

# 4b) permalink: 2026-07-09以前に取得済みの15本の実リールコードのみ維持
#    (taken_at UTC epoch → JST で突合。新規取得はしない。全件の正規取得はPhase Bの公式API同期で行う)
PERMALINK_INDEX = ROOT / "scripts" / "permalink-index.json"
def to_jst(epoch):
    return datetime.fromtimestamp(epoch, tz=timezone.utc).astimezone(JST).replace(tzinfo=None)
code_list = []
if PERMALINK_INDEX.exists():
    for t in json.loads(PERMALINK_INDEX.read_text(encoding="utf-8")):
        if t["code"] != "DZEUrDzpII9":
            code_list.append((to_jst(t["taken_at"]), t["code"]))

def find_code(posted_at_str):
    dt = datetime.strptime(posted_at_str, "%Y-%m-%d %H:%M:%S")
    for tdt, code in code_list:
        if abs((tdt - dt).total_seconds()) <= 300:
            return code
    return None

recipes = []
warn = []
matched_thumbs = 0
for row in inputs:
    rid = row["id"]
    if rid in EXCLUDE:
        continue
    t = tags.get(rid)
    if not t:
        warn.append(f"{rid}: タグ結果なし")
        continue
    src = csv_rows.get(row["posted_at"])
    if not src:
        warn.append(f"{rid}: CSV行なし({row['posted_at']})")
        continue
    ing = [x for x in t.get("ingredientTags", []) if x in ALLOWED_INGREDIENT]
    # 昇格食材: extraIngredients を名寄せして追加(最大4つまで)
    for e in t.get("extraIngredients") or []:
        e = NORM.get(e, e)
        if e in PROMOTED and e not in ing and len(ing) < 4:
            ing.append(e)
    MOOD_NORM = {"レンチン": "レンジ"}
    mood_src = [MOOD_NORM.get(x, x) for x in t.get("moodTags", [])]
    mood = list(dict.fromkeys(x for x in mood_src if x in ALLOWED_MOOD))
    bad_ing = set(t.get("ingredientTags", [])) - ALLOWED_INGREDIENT
    bad_mood = set(t.get("moodTags", [])) - ALLOWED_MOOD
    if bad_ing or bad_mood:
        warn.append(f"{rid}: 語彙外を除外 {bad_ing | bad_mood}")
    ph = t.get("placeholderCategory") or "default"
    if ph not in ALLOWED_PLACEHOLDER:
        ph = "default"
    code = find_code(row["posted_at"])
    thumb_file = thumbs_map.get(rid)
    if thumb_file:
        matched_thumbs += 1
    posted_iso = datetime.strptime(row["posted_at"], "%Y-%m-%d %H:%M:%S").isoformat() + "+09:00"
    rec = {
        "id": rid,
        "source": "instagram",
        "title": t["title"],
        "captionRaw": src["caption"],
        "permalink": f"https://www.instagram.com/reel/{code}/" if code else PROFILE_URL,
        "postedAt": posted_iso,
        "ingredientTags": ing,
        "moodTags": mood,
        "placeholderCategory": ph,
    }
    if thumb_file:
        rec["thumbnailUrl"] = f"/images/thumbs/{thumb_file}"
    if t.get("cuisine") in ("和", "洋", "中", "韓", "エスニック", "その他"):
        rec["cuisine"] = t["cuisine"]
    if t.get("difficulty") in ("かんたん", "ふつう", "本格"):
        rec["difficulty"] = t["difficulty"]
    if isinstance(t.get("timeMinutes"), (int, float)):
        rec["timeMinutes"] = int(t["timeMinutes"])
    recipes.append(rec)

recipes.sort(key=lambda r: r["postedAt"])

# キャプション文面を変えた再投稿はタイトルで衝突する → 1本化
# (実サムネ有り > 新しい方 の優先で残す)
by_title = {}
for r in recipes:
    prev = by_title.get(r["title"])
    if prev is None:
        by_title[r["title"]] = r
        continue
    def rank(x):
        return (1 if x.get("thumbnailUrl") else 0, x["postedAt"])
    by_title[r["title"]] = max(prev, r, key=rank)
dropped = len(recipes) - len(by_title)
recipes = sorted(by_title.values(), key=lambda r: r["postedAt"])
if dropped:
    print(f"タイトル重複の再投稿を{dropped}本統合")

# 5) まとめ3本を実データから再生成(新しい順に8本)
def pick(tag, n=8):
    return [r["id"] for r in sorted(recipes, key=lambda x: x["postedAt"], reverse=True) if tag in r["moodTags"]][:n]

collections = [
    {"slug": "tsukareta-yoru-8sen", "title": "疲れた夜に助かる8選",
     "description": "帰ってから考えたくない日のための、手数最小のレシピだけを集めました。",
     "recipeIds": pick("疲れた夜") or pick("時短")},
    {"slug": "renji-dake-8sen", "title": "レンジだけで完結8選",
     "description": "コンロを使わない日があってもいい。レンジ調理だけの8品。",
     "recipeIds": pick("レンジ")},
    {"slug": "otto-ga-tsukureru-8sen", "title": "夫が作れる8選",
     "description": "料理をはじめたばかりでも失敗しにくい、工程が少ないレシピを集めました。",
     "recipeIds": pick("夫が作れる") or pick("洗い物少ない")},
]

ts = (
    "// このファイルは scripts/build-recipes.py が生成する(手編集しない)\n"
    "// 元データ: reels_cleaned.csv(Metaエクスポート由来・トライアル/再投稿の重複除去済み)\n"
    "import type { SeedRecipe, SeedCollection } from \"@/lib/data/types\";\n\n"
    "export const realRecipes: SeedRecipe[] = "
    + json.dumps(recipes, ensure_ascii=False, indent=2)
    + " as SeedRecipe[];\n\n"
    "export const realCollections: SeedCollection[] = "
    + json.dumps(collections, ensure_ascii=False, indent=2)
    + ";\n"
)
out = ROOT / "src/data/recipes.generated.ts"
out.write_text(ts, encoding="utf-8")

print(f"レシピ: {len(recipes)}本 / サムネ紐付け: {matched_thumbs}本")
print(f"まとめ: " + ", ".join(f"{c['title']}={len(c['recipeIds'])}本" for c in collections))
if warn:
    print("警告:")
    for w in warn[:20]:
        print(" -", w)
