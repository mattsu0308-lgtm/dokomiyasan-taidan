/**
 * 農家プロスペクトリスト用 Google Apps Script
 * タイミー求人テキストを貼り付け → 構造化してシートに追加
 * Instagram検索URL / Googleマップ URL を自動生成
 * 規模感・SNS有無・口コミから優先度を自動採点
 */

const COL = {
  TIMESTAMP: 1,
  FARM_NAME: 2,
  LOCATION: 3,
  OWNER: 4,
  CROPS: 5,
  WAGE: 6,
  HEADCOUNT: 7,
  SCALE: 8,
  IG_URL: 9,
  MAP_URL: 10,
  IG_FOLLOWERS: 11,
  REVIEW_SCORE: 12,
  PRIORITY: 13,
  STATUS: 14,
  NOTES: 15,
  RAW: 16,
};

const HEADERS = [
  '登録日', '農園名', '所在地', '経営者', '栽培品目',
  '時給', '募集人数', '規模感', 'Instagram検索', 'Googleマップ',
  'IGフォロワー', '口コミ', '優先度', 'ステータス', 'メモ', '元テキスト'
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('農家リスト')
    .addItem('タイミー求人を追加', 'showAddDialog')
    .addItem('シート初期化（ヘッダー作成）', 'initSheet')
    .addItem('優先度を再計算', 'recalcPriority')
    .addToUi();
}

function initSheet() {
  const sheet = SpreadsheetApp.getActiveSheet();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setBackground('#2d5a2d')
    .setFontColor('white')
    .setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(COL.FARM_NAME, 180);
  sheet.setColumnWidth(COL.LOCATION, 150);
  sheet.setColumnWidth(COL.CROPS, 150);
  sheet.setColumnWidth(COL.IG_URL, 80);
  sheet.setColumnWidth(COL.MAP_URL, 80);
  sheet.setColumnWidth(COL.RAW, 60);
}

function showAddDialog() {
  const html = HtmlService.createHtmlOutput(
    '<style>' +
    '  body { font-family: -apple-system, sans-serif; padding: 12px; margin: 0; }' +
    '  textarea { width: 100%; box-sizing: border-box; padding: 8px; font-family: monospace; font-size: 12px; }' +
    '  button { padding: 10px 20px; background: #2d5a2d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }' +
    '  button:disabled { background: #999; }' +
    '  .hint { font-size: 12px; color: #666; margin: 8px 0; }' +
    '</style>' +
    '<h3 style="margin-top:0">タイミー求人テキストを貼り付け</h3>' +
    '<p class="hint">求人ページを全選択（Cmd+A / Ctrl+A）→ コピー → 下に貼り付け</p>' +
    '<textarea id="text" rows="18" placeholder="求人テキストをここに貼り付け..."></textarea>' +
    '<p><button id="btn" onclick="submit()">追加する</button></p>' +
    '<script>' +
    '  function submit() {' +
    '    const text = document.getElementById("text").value;' +
    '    if (!text.trim()) { alert("テキストが空です"); return; }' +
    '    const btn = document.getElementById("btn");' +
    '    btn.disabled = true; btn.innerText = "追加中...";' +
    '    google.script.run' +
    '      .withSuccessHandler(function(){ google.script.host.close(); })' +
    '      .withFailureHandler(function(e){ alert("エラー: " + e.message); btn.disabled = false; btn.innerText = "追加する"; })' +
    '      .addProspect(text);' +
    '  }' +
    '</script>'
  ).setWidth(640).setHeight(520);
  SpreadsheetApp.getUi().showModalDialog(html, 'タイミー求人を追加');
}

function addProspect(rawText) {
  const sheet = SpreadsheetApp.getActiveSheet();
  if (sheet.getLastRow() === 0) initSheet();

  const parsed = parseTimeeText(rawText);
  const lastRow = sheet.getLastRow();

  const igUrl = parsed.farmName
    ? 'https://www.instagram.com/explore/search/keyword/?q=' + encodeURIComponent(parsed.farmName)
    : '';
  const mapQuery = (parsed.farmName + ' ' + parsed.location).trim();
  const mapUrl = mapQuery
    ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(mapQuery)
    : '';

  const row = [
    new Date(),
    parsed.farmName,
    parsed.location,
    parsed.owner,
    parsed.crops,
    parsed.wage,
    parsed.headcount,
    parsed.scale,
    igUrl ? '=HYPERLINK("' + igUrl + '","IG検索")' : '',
    mapUrl ? '=HYPERLINK("' + mapUrl + '","マップ")' : '',
    '', '', '', '未着手', '', rawText
  ];

  sheet.getRange(lastRow + 1, 1, 1, row.length).setValues([row]);
  sheet.getRange(lastRow + 1, COL.RAW).setWrap(false).setFontSize(8);
}

function parseTimeeText(text) {
  const result = {
    farmName: '', location: '', owner: '', crops: '',
    wage: '', headcount: '', scale: ''
  };

  const namePatterns = [
    /【([^】]*(?:農園|ファーム|農場|農産|園芸|フルーツ|ワイナリー|牧場)[^】]*)】/,
    /([一-龥゠-ヿ぀-ゟA-Za-z0-9]+(?:農園|ファーム|農場|農産|園芸|ワイナリー|牧場))/,
    /(株式会社[一-龥゠-ヿ぀-ゟA-Za-z0-9]+)/,
  ];
  for (let i = 0; i < namePatterns.length; i++) {
    const m = text.match(namePatterns[i]);
    if (m && m[1]) { result.farmName = m[1].trim(); break; }
  }

  const locPatterns = [
    /(北海道[一-龥]+?[市町村区])/,
    /((?:札幌|石狩|江別|岩見沢|当別|恵庭|千歳|北広島|長沼|栗山|夕張|滝川|旭川|富良野|帯広|十勝|苫小牧|室蘭|登別|小樽|余市|仁木|ニセコ|倶知安|函館|釧路|北見|網走|稚内|名寄|留萌)[市町村区]?)/,
  ];
  for (let i = 0; i < locPatterns.length; i++) {
    const m = text.match(locPatterns[i]);
    if (m && m[1]) { result.location = m[1].trim(); break; }
  }

  const wageMatch = text.match(/時給[\s::]*([\d,]+)\s*円?/);
  if (wageMatch) result.wage = wageMatch[1].replace(/,/g, '') + '円';

  const headcountPatterns = [
    /募集人数[\s::]*(\d+)\s*名?/,
    /(\d+)\s*名募集/,
  ];
  for (let i = 0; i < headcountPatterns.length; i++) {
    const m = text.match(headcountPatterns[i]);
    if (m) { result.headcount = m[1] + '名'; break; }
  }

  const cropKeywords = [
    'トマト', 'きゅうり', 'なす', 'ナス', 'じゃがいも', 'ジャガイモ', 'たまねぎ', 'タマネギ',
    '玉ねぎ', '米', '稲', 'りんご', 'リンゴ', 'ぶどう', 'ブドウ', 'いちご', 'イチゴ', 'メロン',
    'かぼちゃ', 'カボチャ', 'とうもろこし', 'トウモロコシ', 'アスパラ', 'ブロッコリー',
    'にんじん', 'ニンジン', 'ねぎ', 'ネギ', 'ほうれん草', 'レタス', 'ピーマン', '小麦',
    'そば', 'ソバ', 'ハーブ', '花', 'バラ', 'ワイン', 'チーズ', '牛', '豚', '鶏', '酪農',
    'ハスカップ', 'さくらんぼ', 'サクランボ', '長いも', '長芋', '大根', 'ダイコン',
    'スイートコーン', 'かぶ', 'カブ', 'キャベツ', '白菜', 'ハクサイ',
  ];
  const found = [];
  for (let i = 0; i < cropKeywords.length; i++) {
    if (text.indexOf(cropKeywords[i]) >= 0) found.push(cropKeywords[i]);
  }
  result.crops = found.slice(0, 5).join('・');

  const headcountNum = parseInt(result.headcount) || 1;
  if (headcountNum >= 5) result.scale = '大';
  else if (headcountNum >= 2) result.scale = '中';
  else result.scale = '小';

  return result;
}

function recalcPriority() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  const data = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  const priorities = data.map(function(row) {
    let score = 0;

    const scale = row[COL.SCALE - 1];
    if (scale === '大') score += 3;
    else if (scale === '中') score += 2;
    else if (scale === '小') score += 1;

    const followersRaw = row[COL.IG_FOLLOWERS - 1];
    const followers = parseInt(String(followersRaw).replace(/[^\d]/g, '')) || 0;
    const hasIgInput = String(followersRaw).trim() !== '';
    if (!hasIgInput) score += 0;
    else if (followers === 0) score += 3;
    else if (followers < 1000) score += 3;
    else if (followers < 5000) score += 2;
    else if (followers < 10000) score += 1;

    const review = parseFloat(row[COL.REVIEW_SCORE - 1]) || 0;
    if (review >= 4.0) score += 2;
    else if (review >= 3.5) score += 1;

    let rank;
    if (score >= 7) rank = '★★★';
    else if (score >= 5) rank = '★★';
    else if (score >= 3) rank = '★';
    else rank = '-';
    return [rank];
  });

  sheet.getRange(2, COL.PRIORITY, priorities.length, 1).setValues(priorities);
}
