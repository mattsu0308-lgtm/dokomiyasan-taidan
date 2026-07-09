# Instagram公式API(Instagram API with Instagram Login)で
# 自分の全投稿の permalink を取得する。規約クリーンな正規ルート。
#
# トークンは .secretary/tools/ig-official/ig_token.txt から読む(このスクリプトの
# 外に置き、Git管理しない)。トークン値は stdout・ログに一切出さない。
#
# 出力: scripts/permalink-api.json  [{permalink, timestamp, media_type, cap_head}]
import json
import sys
import urllib.request
import urllib.error
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
TOKEN_FILE = Path(r"C:\Users\matts\クロードコード\.secretary\tools\ig-official\ig_token.txt")
OUT = ROOT / "scripts" / "permalink-api.json"
GRAPH = "https://graph.instagram.com"


def load_token() -> str:
    for enc in ("utf-8-sig", "cp932", "utf-8"):
        try:
            for line in TOKEN_FILE.read_text(encoding=enc).splitlines():
                line = line.strip()
                if line.startswith("#") or not line:
                    continue
                if line.startswith("IG_ACCESS_TOKEN="):
                    return line.split("=", 1)[1].strip().strip('"').strip()
        except UnicodeDecodeError:
            continue
    return ""


def mask(url: str) -> str:
    # ログにURLを出すときトークンを隠す
    import re
    return re.sub(r"access_token=[^&]+", "access_token=***", url)


def main():
    token = load_token()
    if not token or len(token) < 20:
        print("NG: トークンが読めません。ig_token.txt の IG_ACCESS_TOKEN= を確認してください。")
        sys.exit(1)

    fields = "id,caption,media_type,permalink,timestamp"
    url = f"{GRAPH}/me/media?fields={fields}&limit=100&access_token={token}"
    items = []
    page = 0
    while url:
        page += 1
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "recipe-zukan/1.0"})
            with urllib.request.urlopen(req, timeout=30) as r:
                data = json.load(r)
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "ignore")
            # Metaのエラー本文にトークンは含まれない
            print(f"NG: API エラー (HTTP {e.code}) at page {page}")
            print("  " + body[:400])
            print("  ※トークン失効(60日)の可能性。その場合は Meta で再発行し ig_token.txt を更新。")
            sys.exit(1)
        except Exception as e:
            print(f"NG: 通信エラー: {e}")
            sys.exit(1)

        batch = data.get("data", [])
        for m in batch:
            items.append({
                "permalink": m.get("permalink"),
                "timestamp": m.get("timestamp"),
                "media_type": m.get("media_type"),
                "cap_head": (m.get("caption") or "").replace("\n", " ")[:60],
            })
        nxt = (data.get("paging") or {}).get("next")
        url = nxt
        if page > 40:  # 安全弁(4000件超は想定外)
            break

    OUT.write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding="utf-8")
    with_link = sum(1 for i in items if i["permalink"])
    print(f"OK: 取得 {len(items)}件 / permalinkあり {with_link}件 → {OUT.name}")
    # サンプル3件(permalinkは公開URLなので表示OK)
    for i in items[:3]:
        print(f"  {i['timestamp']}  {i['permalink']}")


if __name__ == "__main__":
    main()
