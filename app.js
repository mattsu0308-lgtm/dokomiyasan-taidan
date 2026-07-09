"use strict";

/* ============================================================
   勤怠アプリ（ローカル / クラウド 両対応）
   - モード選択:
       local … ログイン不要。この端末の localStorage に保存
       cloud … Supabase Auth（メールのマジックリンク）でログインし、
               Supabase に保存。複数端末で同じ記録を共有
   - 選んだモードは記憶し、「モード変更」でいつでも切替可能
   record: { date: "YYYY-MM-DD", clockIn: "HH:MM"|null, clockOut: "HH:MM"|null }
   ============================================================ */

const DOW = ["日", "月", "火", "水", "木", "金", "土"];
const RECORDS_KEY = "kintai_records"; // localStorage 用
const MODE_KEY = "kintai_mode"; // "local" | "cloud"

let currentMode = null; // "local" | "cloud"
let store = null; // 現在のデータストア

let client = null; // Supabase client（cloud時のみ）
let currentUser = null;
let loadedUserId = null;

// メモリ上の記録キャッシュ（work_date -> record）。描画はここから同期的に行う。
let recordsCache = {};

// 表示中の月（0-11）
let viewYear;
let viewMonth;

// 手修正モーダルの対象日付
let editingDate = null;

/* ---------- 設定 ---------- */
function isConfigured() {
  const c = window.APP_CONFIG || {};
  return (
    !!c.SUPABASE_URL &&
    !!c.SUPABASE_ANON_KEY &&
    !c.SUPABASE_URL.includes("YOUR_") &&
    !c.SUPABASE_ANON_KEY.includes("YOUR_")
  );
}

/* ---------- 日付・稼働時間ユーティリティ ---------- */
function pad2(n) {
  return String(n).padStart(2, "0");
}
function dateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function todayKey() {
  return dateKey(new Date());
}
function nowHM() {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function hmToMinutes(hm) {
  if (!hm) return null;
  const [h, m] = hm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}
function workedMinutes(rec) {
  const inM = hmToMinutes(rec.clockIn);
  const outM = hmToMinutes(rec.clockOut);
  if (inM === null || outM === null) return null;
  let diff = outM - inM;
  if (diff < 0) diff += 24 * 60; // 日跨ぎ
  return diff;
}
function formatDuration(min) {
  if (min === null || min === undefined) return "—";
  return `${Math.floor(min / 60)}:${pad2(min % 60)}`;
}

/* ---------- データストア ---------- */
// この端末（localStorage）に保存
const LocalStore = {
  async fetch() {
    try {
      recordsCache = JSON.parse(localStorage.getItem(RECORDS_KEY)) || {};
    } catch (e) {
      console.error(e);
      recordsCache = {};
    }
  },
  async upsert(key, rec) {
    recordsCache[key] = { date: key, clockIn: rec.clockIn, clockOut: rec.clockOut };
    localStorage.setItem(RECORDS_KEY, JSON.stringify(recordsCache));
  },
  async remove(key) {
    delete recordsCache[key];
    localStorage.setItem(RECORDS_KEY, JSON.stringify(recordsCache));
  },
};

// クラウド（Supabase）に保存
const CloudStore = {
  async fetch() {
    const { data, error } = await client
      .from("attendance")
      .select("work_date, clock_in, clock_out");
    if (error) throw error;
    recordsCache = {};
    (data || []).forEach((r) => {
      recordsCache[r.work_date] = {
        date: r.work_date,
        clockIn: r.clock_in,
        clockOut: r.clock_out,
      };
    });
  },
  async upsert(key, rec) {
    const row = {
      user_id: currentUser.id,
      work_date: key,
      clock_in: rec.clockIn,
      clock_out: rec.clockOut,
      updated_at: new Date().toISOString(),
    };
    const { error } = await client
      .from("attendance")
      .upsert(row, { onConflict: "user_id,work_date" });
    if (error) throw error;
    recordsCache[key] = { date: key, clockIn: rec.clockIn, clockOut: rec.clockOut };
  },
  async remove(key) {
    const { error } = await client.from("attendance").delete().eq("work_date", key);
    if (error) throw error;
    delete recordsCache[key];
  },
};

/* ---------- 打刻 ---------- */
function setBusy(busy) {
  document.getElementById("btnClockIn").disabled = busy;
  document.getElementById("btnClockOut").disabled = busy;
}
function setSyncMsg(text, isError) {
  const el = document.getElementById("syncMsg");
  el.textContent = text || "";
  el.classList.toggle("error", !!isError);
}

async function handleClockIn() {
  const key = todayKey();
  const rec = recordsCache[key] || { clockIn: null, clockOut: null };
  if (rec.clockIn && !confirm("すでに出勤済みです。出勤時刻を上書きしますか？")) return;
  await savePunch(key, { clockIn: nowHM(), clockOut: rec.clockOut || null });
}
async function handleClockOut() {
  const key = todayKey();
  const rec = recordsCache[key] || { clockIn: null, clockOut: null };
  if (rec.clockOut && !confirm("すでに退勤済みです。退勤時刻を上書きしますか？")) return;
  await savePunch(key, { clockIn: rec.clockIn || null, clockOut: nowHM() });
}
async function savePunch(key, rec) {
  setBusy(true);
  setSyncMsg("保存中…", false);
  try {
    await store.upsert(key, rec);
    setSyncMsg("保存しました", false);
    renderAll();
  } catch (e) {
    console.error(e);
    setSyncMsg("保存に失敗しました。" + (currentMode === "cloud" ? "ネット接続を確認してください。" : ""), true);
  } finally {
    setBusy(false);
  }
}

/* ---------- 描画 ---------- */
function renderToday() {
  const rec = recordsCache[todayKey()] || {};
  document.getElementById("statusIn").textContent = rec.clockIn || "—";
  document.getElementById("statusOut").textContent = rec.clockOut || "—";
  document.getElementById("statusDuration").textContent = formatDuration(
    workedMinutes(rec)
  );
  const now = new Date();
  document.getElementById("todayLabel").textContent =
    `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日（${DOW[now.getDay()]}）`;
}

function renderMonth() {
  document.getElementById("monthTitle").textContent = `${viewYear}年${viewMonth + 1}月`;
  const body = document.getElementById("recordsBody");
  body.innerHTML = "";

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const tKey = todayKey();
  let totalMin = 0;
  let workedDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(viewYear, viewMonth, day);
    const key = dateKey(d);
    const rec = recordsCache[key] || {};
    const dow = d.getDay();
    const min = workedMinutes(rec);
    if (min !== null) {
      totalMin += min;
      workedDays++;
    }

    const tr = document.createElement("tr");
    if (key === tKey) tr.classList.add("row-today");
    if (dow === 6) tr.classList.add("row-sat");
    if (dow === 0) tr.classList.add("row-sun");

    tr.innerHTML = `
      <td class="date-cell">${day}</td>
      <td><span class="dow">${DOW[dow]}</span></td>
      <td>${rec.clockIn || '<span class="empty-cell">—</span>'}</td>
      <td>${rec.clockOut || '<span class="empty-cell">—</span>'}</td>
      <td>${min !== null ? formatDuration(min) : '<span class="empty-cell">—</span>'}</td>
      <td><button class="edit-link" data-date="${key}">修正</button></td>
    `;
    body.appendChild(tr);
  }

  document.getElementById("monthSummary").innerHTML =
    `<span>稼働日数 <strong>${workedDays}日</strong></span>` +
    `<span>合計稼働 <strong>${formatDuration(totalMin)}</strong></span>`;
}

function toggleRecords() {
  const btn = document.getElementById("btnToggleRecords");
  const panel = document.getElementById("recordsPanel");
  const label = btn.querySelector(".records-toggle-label");
  const open = panel.hidden;
  panel.hidden = !open;
  btn.setAttribute("aria-expanded", String(open));
  btn.classList.toggle("open", open);
  label.textContent = open ? "記録を閉じる" : "記録を見る（月次一覧）";
  if (open) renderMonth();
}

/* ---------- 手修正モーダル ---------- */
function openEdit(key) {
  editingDate = key;
  const rec = recordsCache[key] || {};
  const [, m, dd] = key.split("-").map(Number);
  document.getElementById("editModalTitle").textContent = `${m}月${dd}日 の打刻を修正`;
  document.getElementById("editIn").value = rec.clockIn || "";
  document.getElementById("editOut").value = rec.clockOut || "";
  document.getElementById("editModal").hidden = false;
}
function closeEdit() {
  editingDate = null;
  document.getElementById("editModal").hidden = true;
}
async function saveEdit() {
  if (!editingDate) return;
  const key = editingDate;
  const inVal = document.getElementById("editIn").value || null;
  const outVal = document.getElementById("editOut").value || null;
  try {
    if (!inVal && !outVal) {
      await store.remove(key);
    } else {
      await store.upsert(key, { clockIn: inVal, clockOut: outVal });
    }
    closeEdit();
    renderAll();
  } catch (e) {
    console.error(e);
    alert("保存に失敗しました。" + (currentMode === "cloud" ? "ネット接続を確認してください。" : ""));
  }
}
async function deleteEdit() {
  if (!editingDate) return;
  if (!confirm("この日の打刻を削除しますか？")) return;
  const key = editingDate;
  try {
    await store.remove(key);
    closeEdit();
    renderAll();
  } catch (e) {
    console.error(e);
    alert("削除に失敗しました。" + (currentMode === "cloud" ? "ネット接続を確認してください。" : ""));
  }
}

/* ---------- CSV出力 ---------- */
function exportCsv() {
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const rows = [["日付", "曜日", "出勤", "退勤", "稼働時間"]];
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(viewYear, viewMonth, day);
    const key = dateKey(d);
    const rec = recordsCache[key] || {};
    const min = workedMinutes(rec);
    rows.push([
      key,
      DOW[d.getDay()],
      rec.clockIn || "",
      rec.clockOut || "",
      min !== null ? formatDuration(min) : "",
    ]);
  }
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kintai_${viewYear}-${pad2(viewMonth + 1)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function shiftMonth(delta) {
  viewMonth += delta;
  if (viewMonth < 0) {
    viewMonth = 11;
    viewYear--;
  } else if (viewMonth > 11) {
    viewMonth = 0;
    viewYear++;
  }
  renderMonth();
}
function renderAll() {
  renderToday();
  if (!document.getElementById("recordsPanel").hidden) renderMonth();
}

/* ---------- 画面切り替え ---------- */
function showView(view) {
  document.getElementById("landingSection").hidden = view !== "landing";
  document.getElementById("configNotice").hidden = view !== "config";
  document.getElementById("loginSection").hidden = view !== "login";
  document.getElementById("appMain").hidden = view !== "app";
}

/* ---------- モード ---------- */
function setAccountBar() {
  const emailEl = document.getElementById("accountEmail");
  const signOutBtn = document.getElementById("btnSignOut");
  if (currentMode === "cloud") {
    emailEl.textContent = currentUser ? currentUser.email || "" : "";
    signOutBtn.hidden = false;
  } else {
    emailEl.textContent = "この端末に保存";
    signOutBtn.hidden = true;
  }
}

async function activateApp() {
  setAccountBar();
  showView("app");
  try {
    await store.fetch();
  } catch (e) {
    console.error(e);
    setSyncMsg("記録の取得に失敗しました。再読み込みしてください。", true);
  }
  renderAll();
}

async function enterMode(mode) {
  currentMode = mode;
  localStorage.setItem(MODE_KEY, mode);

  if (mode === "local") {
    store = LocalStore;
    currentUser = null;
    await activateApp();
    return;
  }

  // cloud
  if (!isConfigured()) {
    showView("config");
    return;
  }
  if (!ensureClient()) {
    showView("login");
    setLoginMsg("オンラインライブラリの読み込みに失敗しました。ネット接続を確認して再読み込みしてください。", true);
    return;
  }
  store = CloudStore;
  const { data } = await client.auth.getSession();
  await handleAuth(data.session);
}

function showLanding() {
  showView("landing");
}

/* ---------- 認証（cloud） ---------- */
function ensureClient() {
  if (client) return true;
  if (!window.supabase || !window.supabase.createClient) return false;
  client = window.supabase.createClient(
    window.APP_CONFIG.SUPABASE_URL,
    window.APP_CONFIG.SUPABASE_ANON_KEY
  );
  client.auth.onAuthStateChange((_event, session) => {
    if (currentMode === "cloud") handleAuth(session);
  });
  return true;
}

function setLoginMsg(text, isError) {
  const el = document.getElementById("loginMsg");
  el.textContent = text || "";
  el.classList.toggle("error", !!isError);
}

async function sendLoginLink() {
  const email = document.getElementById("loginEmail").value.trim();
  if (!email) {
    setLoginMsg("メールアドレスを入力してください。", true);
    return;
  }
  const btn = document.getElementById("btnSendLink");
  btn.disabled = true;
  setLoginMsg("送信中…", false);
  try {
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href.split("#")[0] },
    });
    if (error) throw error;
    setLoginMsg(`${email} にログインリンクを送りました。メールを開いてリンクを押してください。`, false);
  } catch (e) {
    console.error(e);
    setLoginMsg("送信に失敗しました: " + (e.message || e), true);
  } finally {
    btn.disabled = false;
  }
}

async function signOut() {
  if (client) await client.auth.signOut();
}

async function handleAuth(session) {
  if (currentMode !== "cloud") return;
  if (session && session.user) {
    currentUser = session.user;
    store = CloudStore;
    if (loadedUserId !== currentUser.id) {
      loadedUserId = currentUser.id;
      await activateApp();
    } else {
      setAccountBar();
      showView("app");
    }
  } else {
    currentUser = null;
    loadedUserId = null;
    recordsCache = {};
    setLoginMsg("", false);
    showView("login");
  }
}

/* ---------- 初期化 ---------- */
function wireEvents() {
  // 打刻・一覧
  document.getElementById("btnClockIn").addEventListener("click", handleClockIn);
  document.getElementById("btnClockOut").addEventListener("click", handleClockOut);
  document.getElementById("btnPrevMonth").addEventListener("click", () => shiftMonth(-1));
  document.getElementById("btnNextMonth").addEventListener("click", () => shiftMonth(1));
  document.getElementById("btnExportCsv").addEventListener("click", exportCsv);
  document.getElementById("btnToggleRecords").addEventListener("click", toggleRecords);

  // モーダル
  document.getElementById("btnEditCancel").addEventListener("click", closeEdit);
  document.getElementById("btnEditSave").addEventListener("click", saveEdit);
  document.getElementById("btnEditDelete").addEventListener("click", deleteEdit);
  document.getElementById("editModal").addEventListener("click", (e) => {
    if (e.target.id === "editModal") closeEdit();
  });
  document.getElementById("recordsBody").addEventListener("click", (e) => {
    const btn = e.target.closest(".edit-link");
    if (btn) openEdit(btn.dataset.date);
  });

  // モード選択
  document.getElementById("btnModeLocal").addEventListener("click", () => enterMode("local"));
  document.getElementById("btnModeCloud").addEventListener("click", () => enterMode("cloud"));
  document.getElementById("btnSwitchMode").addEventListener("click", showLanding);
  document.getElementById("btnConfigBack").addEventListener("click", showLanding);
  document.getElementById("btnLoginBack").addEventListener("click", showLanding);

  // 認証
  document.getElementById("btnSendLink").addEventListener("click", sendLoginLink);
  document.getElementById("loginEmail").addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendLoginLink();
  });
  document.getElementById("btnSignOut").addEventListener("click", signOut);
}

async function init() {
  const now = new Date();
  viewYear = now.getFullYear();
  viewMonth = now.getMonth();

  wireEvents();
  renderToday(); // 日付ラベルを先に表示

  const saved = localStorage.getItem(MODE_KEY);
  if (saved === "local" || saved === "cloud") {
    await enterMode(saved);
  } else {
    showLanding();
  }
}

document.addEventListener("DOMContentLoaded", init);
