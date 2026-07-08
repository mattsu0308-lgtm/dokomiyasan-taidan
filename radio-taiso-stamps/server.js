// 夏の朝活ラジオ体操スタンプラリー サーバー
// 依存パッケージなし・Node.js 標準機能のみで動きます: `node server.js`
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const CONFIG_PATH = path.join(ROOT, 'config.json');
const DATA_DIR = path.join(ROOT, 'data');
const DATA_PATH = path.join(DATA_DIR, 'stamps.json');
const PUBLIC_DIR = path.join(ROOT, 'public');

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const PORT = process.env.PORT || config.port || 3000;

// ---------- データの読み書き(JSONファイル保存) ----------

function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch {
    return { participants: [] };
  }
}

function saveData(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DATA_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DATA_PATH);
}

let data = loadData();

// ---------- 日本時間(JST)の現在日時 ----------

function jstNow() {
  const now = new Date();
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now); // "YYYY-MM-DD"
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(now); // "HH:MM"
  return { date, time };
}

function weekdayOf(dateStr) {
  return new Date(dateStr + 'T00:00:00Z').getUTCDay(); // 0=日 … 6=土
}

function isEventDay(dateStr) {
  if (dateStr < config.startDate || dateStr > config.endDate) return false;
  if ((config.excludeWeekdays || []).includes(weekdayOf(dateStr))) return false;
  return true;
}

function stampStatus() {
  const { date, time } = jstNow();
  if (config.testMode) {
    return { date, time, open: true, reason: 'テストモード中(いつでも押せます)' };
  }
  if (!isEventDay(date)) {
    return { date, time, open: false, reason: '今日はイベント期間外です' };
  }
  if (time < config.windowStart) {
    return { date, time, open: false, reason: `受付は ${config.windowStart} からです` };
  }
  if (time >= config.windowEnd) {
    return { date, time, open: false, reason: `今日の受付は ${config.windowEnd} で終了しました。また明日の朝に!` };
  }
  return { date, time, open: true, reason: '' };
}

// ---------- API ----------

function findParticipant(name) {
  return data.participants.find((p) => p.name === name);
}

function handleState(res) {
  const status = stampStatus();
  sendJson(res, 200, {
    eventName: config.eventName,
    startDate: config.startDate,
    endDate: config.endDate,
    windowStart: config.windowStart,
    windowEnd: config.windowEnd,
    excludeWeekdays: config.excludeWeekdays || [],
    rewards: config.rewards || [],
    testMode: !!config.testMode,
    today: status.date,
    now: status.time,
    open: status.open,
    closedReason: status.reason,
    participants: data.participants,
  });
}

function handleStamp(res, body) {
  const name = String(body.name || '').trim().slice(0, 20);
  if (!name) return sendJson(res, 400, { error: 'お名前を入力してください' });

  const status = stampStatus();
  if (!status.open) return sendJson(res, 403, { error: status.reason });

  let p = findParticipant(name);
  if (!p) {
    p = { name, stamps: {} };
    data.participants.push(p);
  }
  if (p.stamps[status.date]) {
    return sendJson(res, 409, { error: `今日のスタンプはもう押してあります(${p.stamps[status.date]})`, already: true });
  }
  p.stamps[status.date] = status.time;
  saveData(data);
  sendJson(res, 200, { ok: true, date: status.date, time: status.time, total: Object.keys(p.stamps).length });
}

// 管理者ページのパスワード確認
function handleAdminVerify(res, body) {
  if (String(body.pass || '') !== config.adminPass) {
    return sendJson(res, 401, { error: '管理者パスワードが違います' });
  }
  sendJson(res, 200, { ok: true });
}

// 管理者用: 押し忘れの補完や誤打の取り消し
function handleAdminStamp(res, body) {
  if (String(body.pass || '') !== config.adminPass) {
    return sendJson(res, 401, { error: '管理者パスワードが違います' });
  }
  const name = String(body.name || '').trim().slice(0, 20);
  const date = String(body.date || '');
  if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return sendJson(res, 400, { error: 'name と date (YYYY-MM-DD) を指定してください' });
  }
  let p = findParticipant(name);
  if (body.remove) {
    if (p && p.stamps[date]) {
      delete p.stamps[date];
      saveData(data);
    }
    return sendJson(res, 200, { ok: true, removed: true });
  }
  if (!isEventDay(date)) return sendJson(res, 400, { error: 'イベント期間外の日付です' });
  if (!p) {
    p = { name, stamps: {} };
    data.participants.push(p);
  }
  p.stamps[date] = body.time && /^\d{2}:\d{2}$/.test(body.time) ? body.time : '手動';
  saveData(data);
  sendJson(res, 200, { ok: true });
}

// ---------- HTTP まわり ----------

function sendJson(res, code, obj) {
  const buf = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(buf);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 10_000) { reject(new Error('too large')); req.destroy(); }
    });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function serveStatic(res, urlPath) {
  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const file = path.join(PUBLIC_DIR, path.normalize(rel));
  if (!file.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); return res.end('Forbidden');
  }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('Not Found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname === '/api/state' && req.method === 'GET') return handleState(res);
    if (url.pathname === '/api/stamp' && req.method === 'POST') return handleStamp(res, await readBody(req));
    if (url.pathname === '/api/admin/stamp' && req.method === 'POST') return handleAdminStamp(res, await readBody(req));
    if (url.pathname === '/api/admin/verify' && req.method === 'POST') return handleAdminVerify(res, await readBody(req));
    if (req.method === 'GET') return serveStatic(res, url.pathname);
    res.writeHead(405); res.end();
  } catch (e) {
    sendJson(res, 500, { error: 'サーバーエラーが発生しました' });
  }
});

server.listen(PORT, () => {
  console.log(`☀ ${config.eventName}`);
  console.log(`   http://localhost:${PORT} で起動しました`);
  console.log(`   受付時間: ${config.windowStart}〜${config.windowEnd} (JST) / 期間: ${config.startDate}〜${config.endDate}`);
});
