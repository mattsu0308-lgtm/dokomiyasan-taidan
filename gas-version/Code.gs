/**
 * ☀️ 夏の朝活ラジオ体操スタンプラリー (Googleスプレッドシート + Apps Script版)
 *
 * 完全無料で動くバージョンです。スタンプのデータはこのスプレッドシートに保存されます。
 *
 * セットアップ手順(くわしくは README.md):
 *   1. このファイルの内容を Apps Script の「コード.gs」に貼り付ける
 *   2. index.html というHTMLファイルを追加して、index.html の内容を貼り付ける
 *   3. 上のツールバーで関数「setup」を選んで実行(初回は権限の承認が出ます)
 *      → 「設定」「ごほうび」「出席」の3つのシートが自動で作られます
 *   4. 「デプロイ」→「新しいデプロイ」→ 種類「ウェブアプリ」
 *      実行ユーザー「自分」/ アクセスできるユーザー「全員」でデプロイ
 *   5. 発行されたURLをオフィスに貼るだけ!
 *
 * 運用:
 *   - イベント名・期間・受付時間の変更 → 「設定」シートを書き換えるだけ
 *   - 賞の変更 → 「ごほうび」シートを書き換えるだけ
 *   - スタンプの修正(押し忘れの救済・取り消し) → 「出席」シートのセルに
 *     時刻(例 06:45)を書く/消すだけ
 */

const TZ = 'Asia/Tokyo';
const SHEET_SETTINGS = '設定';
const SHEET_ATTEND = '出席';
const SHEET_REWARDS = 'ごほうび';

// ---------- 初回セットアップ: シートを自動で作る ----------

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (!ss.getSheetByName(SHEET_SETTINGS)) {
    const sh = ss.insertSheet(SHEET_SETTINGS);
    const rows = [
      ['項目', '値', 'メモ'],
      ['イベント名', '夏の朝活ラジオ体操スタンプラリー', 'タイトルはここで自由に変更できます'],
      ['開始日', '2026-07-01', '年-月-日 の形で書いてください'],
      ['終了日', '2026-07-31', ''],
      ['受付開始', '06:30', 'この時間からスタンプが押せます(日本時間)'],
      ['受付終了', '07:00', 'この時間になると押せなくなります'],
      ['お休みの曜日', '', '例: 土日 と書くと土曜と日曜はお休みになります'],
      ['テストモード', 'FALSE', 'TRUE にすると時間外でも押せます(動作確認用)'],
    ];
    sh.getRange(1, 1, rows.length, 3).setNumberFormat('@').setValues(rows);
    sh.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#fff2cc');
    sh.setColumnWidth(1, 130).setColumnWidth(2, 260).setColumnWidth(3, 380);
  }

  if (!ss.getSheetByName(SHEET_REWARDS)) {
    const sh = ss.insertSheet(SHEET_REWARDS);
    const rows = [
      ['日数', 'ごほうび'],
      ['5', 'アイスキャンディ賞 🍦'],
      ['10', 'ジュース賞 🧃'],
      ['20', 'スイカ賞 🍉'],
      ['31', '皆勤賞 🏆 素敵なプレゼント!'],
    ];
    sh.getRange(1, 1, rows.length, 2).setNumberFormat('@').setValues(rows);
    sh.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#fff2cc');
    sh.setColumnWidth(2, 280);
  }

  if (!ss.getSheetByName(SHEET_ATTEND)) {
    const sh = ss.insertSheet(SHEET_ATTEND);
    const config = getConfig_();
    const header = ['名前'].concat(listDates_(config.startDate, config.endDate));
    sh.getRange(1, 1, 200, header.length).setNumberFormat('@'); // 日付や時刻が勝手に変換されないよう文字列扱いに
    sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold').setBackground('#fce5cd');
    sh.setFrozenRows(1);
    sh.setFrozenColumns(1);
    for (let c = 2; c <= header.length; c++) sh.setColumnWidth(c, 56);
  }
}

// ---------- Webページの表示 ----------

function doGet() {
  let title = 'ラジオ体操スタンプラリー';
  try { title = getConfig_().eventName; } catch (e) { /* setup前でもページ自体は開けるように */ }
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle(title)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ---------- フロントから呼ばれるAPI ----------

// 画面表示に必要な情報をまとめて返す
function getState() {
  const config = getConfig_();
  const st = stampStatus_(config);
  return {
    eventName: config.eventName,
    startDate: config.startDate,
    endDate: config.endDate,
    windowStart: config.windowStart,
    windowEnd: config.windowEnd,
    excludeWeekdays: config.excludeWeekdays,
    testMode: config.testMode,
    rewards: getRewards_(),
    today: st.date,
    now: st.time,
    open: st.open,
    closedReason: st.reason,
    participants: readParticipants_(),
  };
}

// スタンプを押す(1日1回・受付時間内のみ)
function pushStamp(name) {
  name = String(name || '').trim().slice(0, 20);
  if (!name) return { error: 'お名前を入力してください' };

  const config = getConfig_();
  const st = stampStatus_(config);
  if (!st.open) return { error: st.reason };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = getAttendSheet_();
    const col = findOrCreateDateCol_(sh, st.date);

    const lastRow = sh.getLastRow();
    let row = -1;
    if (lastRow >= 2) {
      const names = sh.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < names.length; i++) {
        if (String(names[i][0]).trim() === name) { row = i + 2; break; }
      }
    }
    if (row === -1) {
      row = lastRow + 1;
      sh.getRange(row, 1).setNumberFormat('@').setValue(name);
    }

    const cell = sh.getRange(row, col);
    const existing = cell.getValue();
    if (existing !== '' && existing != null) {
      return { error: '今日のスタンプはもう押してあります(' + asTimeStr_(existing) + ')', already: true };
    }
    cell.setNumberFormat('@').setValue(st.time);

    const lastCol = sh.getLastColumn();
    const rowVals = sh.getRange(row, 2, 1, lastCol - 1).getValues()[0];
    const total = rowVals.filter(function (v) { return v !== '' && v != null; }).length;
    return { ok: true, date: st.date, time: st.time, total: total };
  } finally {
    lock.releaseLock();
  }
}

// ---------- 内部処理 ----------

function getConfig_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SETTINGS);
  if (!sh) throw new Error('「設定」シートがありません。Apps Scriptで setup を実行してください。');
  const rows = sh.getDataRange().getValues();
  const map = {};
  rows.forEach(function (r) { map[String(r[0]).trim()] = r[1]; });

  const wd = { '日': 0, '月': 1, '火': 2, '水': 3, '木': 4, '金': 5, '土': 6 };
  const excluded = [];
  String(map['お休みの曜日'] || '').split('').forEach(function (ch) {
    if (ch in wd && excluded.indexOf(wd[ch]) === -1) excluded.push(wd[ch]);
  });

  return {
    eventName: String(map['イベント名'] || 'ラジオ体操スタンプラリー'),
    startDate: asDateStr_(map['開始日']),
    endDate: asDateStr_(map['終了日']),
    windowStart: asTimeStr_(map['受付開始']),
    windowEnd: asTimeStr_(map['受付終了']),
    excludeWeekdays: excluded,
    testMode: String(map['テストモード']).toUpperCase() === 'TRUE',
  };
}

function getRewards_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_REWARDS);
  if (!sh) return [];
  return sh.getDataRange().getValues().slice(1)
    .map(function (r) { return { days: Number(r[0]), label: String(r[1]) }; })
    .filter(function (r) { return r.days > 0 && r.label; })
    .sort(function (a, b) { return a.days - b.days; });
}

function getAttendSheet_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ATTEND);
  if (!sh) throw new Error('「出席」シートがありません。Apps Scriptで setup を実行してください。');
  return sh;
}

function readParticipants_() {
  const sh = getAttendSheet_();
  const values = sh.getDataRange().getValues();
  if (values.length === 0) return [];
  const header = values[0];
  const dateCols = [];
  for (let c = 1; c < header.length; c++) {
    const iso = asDateStr_(header[c]);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) dateCols.push({ iso: iso, col: c });
  }
  const participants = [];
  for (let r = 1; r < values.length; r++) {
    const name = String(values[r][0]).trim();
    if (!name) continue;
    const stamps = {};
    dateCols.forEach(function (d) {
      const v = values[r][d.col];
      if (v !== '' && v != null) stamps[d.iso] = asTimeStr_(v);
    });
    participants.push({ name: name, stamps: stamps });
  }
  return participants;
}

// 今日の日付列を探す。無ければ日付順の正しい位置に列を作る(期間を延長した場合など)
function findOrCreateDateCol_(sh, iso) {
  const lastCol = sh.getLastColumn();
  const header = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  let insertBefore = -1;
  for (let c = 1; c < header.length; c++) {
    const h = asDateStr_(header[c]);
    if (h === iso) return c + 1;
    if (/^\d{4}-\d{2}-\d{2}$/.test(h) && h > iso && insertBefore === -1) insertBefore = c + 1;
  }
  let col;
  if (insertBefore === -1) {
    col = lastCol + 1;
    sh.insertColumnAfter(lastCol);
  } else {
    col = insertBefore;
    sh.insertColumnBefore(insertBefore);
  }
  sh.getRange(1, col, sh.getMaxRows(), 1).setNumberFormat('@');
  sh.getRange(1, col).setValue(iso).setFontWeight('bold').setBackground('#fce5cd');
  sh.setColumnWidth(col, 56);
  return col;
}

function stampStatus_(config) {
  const now = new Date();
  const date = Utilities.formatDate(now, TZ, 'yyyy-MM-dd');
  const time = Utilities.formatDate(now, TZ, 'HH:mm');
  if (config.testMode) {
    return { date: date, time: time, open: true, reason: 'テストモード中(いつでも押せます)' };
  }
  if (!isEventDay_(config, date)) {
    return { date: date, time: time, open: false, reason: '今日はイベント期間外です' };
  }
  if (time < config.windowStart) {
    return { date: date, time: time, open: false, reason: '受付は ' + config.windowStart + ' からです' };
  }
  if (time >= config.windowEnd) {
    return { date: date, time: time, open: false, reason: '今日の受付は ' + config.windowEnd + ' で終了しました。また明日の朝に!' };
  }
  return { date: date, time: time, open: true, reason: '' };
}

function isEventDay_(config, dateStr) {
  if (dateStr < config.startDate || dateStr > config.endDate) return false;
  const weekday = new Date(dateStr + 'T00:00:00Z').getUTCDay();
  if (config.excludeWeekdays.indexOf(weekday) !== -1) return false;
  return true;
}

function listDates_(startStr, endStr) {
  const dates = [];
  const d = new Date(startStr + 'T00:00:00Z');
  const end = new Date(endStr + 'T00:00:00Z');
  while (d <= end) {
    dates.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return dates;
}

// スプレッドシートが日付や時刻を勝手にDate型に変えてしまった場合でも文字列に戻す
function asDateStr_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  return String(v == null ? '' : v).trim();
}

function asTimeStr_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'HH:mm');
  const s = String(v == null ? '' : v).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (m) return ('0' + m[1]).slice(-2) + ':' + m[2];
  return s;
}
