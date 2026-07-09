"use strict";

/* ============================================================
   勤怠アプリ  ─ 出勤・退勤の打刻／月次一覧／CSV出力
   データは localStorage にのみ保存（キー: kintai_records）
   record: { date: "YYYY-MM-DD", clockIn: "HH:MM"|null, clockOut: "HH:MM"|null }
   ============================================================ */

const STORAGE_KEY = "kintai_records";
const DOW = ["日", "月", "火", "水", "木", "金", "土"];

// 表示中の月（1日を保持）。初期値は今月。
let viewYear;
let viewMonth; // 0-11

// 手修正モーダルの対象日付
let editingDate = null;

/* ---------- localStorage ---------- */
function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    console.error("記録の読み込みに失敗しました", e);
    return {};
  }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

/* ---------- 日付ユーティリティ ---------- */
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

/* ---------- 稼働時間計算 ---------- */
// "HH:MM" -> 分。無効なら null
function hmToMinutes(hm) {
  if (!hm) return null;
  const [h, m] = hm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

// 出勤・退勤から稼働分を計算。退勤が出勤より前（日跨ぎ）は+24h扱い。
function workedMinutes(rec) {
  const inM = hmToMinutes(rec.clockIn);
  const outM = hmToMinutes(rec.clockOut);
  if (inM === null || outM === null) return null;
  let diff = outM - inM;
  if (diff < 0) diff += 24 * 60;
  return diff;
}

// 分 -> "h:mm"
function formatDuration(min) {
  if (min === null || min === undefined) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${pad2(m)}`;
}

/* ---------- 打刻 ---------- */
function handleClockIn() {
  const records = loadRecords();
  const key = todayKey();
  const rec = records[key] || { date: key, clockIn: null, clockOut: null };
  if (rec.clockIn && !confirm("すでに出勤済みです。出勤時刻を上書きしますか？")) {
    return;
  }
  rec.clockIn = nowHM();
  records[key] = rec;
  saveRecords(records);
  renderAll();
}

function handleClockOut() {
  const records = loadRecords();
  const key = todayKey();
  const rec = records[key] || { date: key, clockIn: null, clockOut: null };
  if (rec.clockOut && !confirm("すでに退勤済みです。退勤時刻を上書きしますか？")) {
    return;
  }
  rec.clockOut = nowHM();
  records[key] = rec;
  saveRecords(records);
  renderAll();
}

/* ---------- 本日ステータス描画 ---------- */
function renderToday() {
  const records = loadRecords();
  const rec = records[todayKey()] || {};
  document.getElementById("statusIn").textContent = rec.clockIn || "—";
  document.getElementById("statusOut").textContent = rec.clockOut || "—";
  document.getElementById("statusDuration").textContent = formatDuration(
    workedMinutes(rec)
  );

  const now = new Date();
  document.getElementById("todayLabel").textContent =
    `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日（${DOW[now.getDay()]}）`;
}

/* ---------- 月次一覧描画 ---------- */
function renderMonth() {
  const records = loadRecords();
  const title = document.getElementById("monthTitle");
  title.textContent = `${viewYear}年${viewMonth + 1}月`;

  const body = document.getElementById("recordsBody");
  body.innerHTML = "";

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const tKey = todayKey();
  let totalMin = 0;
  let workedDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(viewYear, viewMonth, day);
    const key = dateKey(d);
    const rec = records[key] || {};
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

    const inTxt = rec.clockIn || "";
    const outTxt = rec.clockOut || "";

    tr.innerHTML = `
      <td class="date-cell">${day}</td>
      <td><span class="dow">${DOW[dow]}</span></td>
      <td>${inTxt || '<span class="empty-cell">—</span>'}</td>
      <td>${outTxt || '<span class="empty-cell">—</span>'}</td>
      <td>${min !== null ? formatDuration(min) : '<span class="empty-cell">—</span>'}</td>
      <td><button class="edit-link" data-date="${key}">修正</button></td>
    `;
    body.appendChild(tr);
  }

  document.getElementById("monthSummary").innerHTML =
    `<span>稼働日数 <strong>${workedDays}日</strong></span>` +
    `<span>合計稼働 <strong>${formatDuration(totalMin)}</strong></span>`;
}

/* ---------- 手修正モーダル ---------- */
function openEdit(key) {
  editingDate = key;
  const records = loadRecords();
  const rec = records[key] || {};
  const [y, m, dd] = key.split("-").map(Number);
  document.getElementById("editModalTitle").textContent =
    `${m}月${dd}日 の打刻を修正`;
  document.getElementById("editIn").value = rec.clockIn || "";
  document.getElementById("editOut").value = rec.clockOut || "";
  document.getElementById("editModal").hidden = false;
}

function closeEdit() {
  editingDate = null;
  document.getElementById("editModal").hidden = true;
}

function saveEdit() {
  if (!editingDate) return;
  const records = loadRecords();
  const inVal = document.getElementById("editIn").value || null;
  const outVal = document.getElementById("editOut").value || null;

  if (!inVal && !outVal) {
    // 両方空なら記録削除
    delete records[editingDate];
  } else {
    records[editingDate] = {
      date: editingDate,
      clockIn: inVal,
      clockOut: outVal,
    };
  }
  saveRecords(records);
  closeEdit();
  renderAll();
}

function deleteEdit() {
  if (!editingDate) return;
  if (!confirm("この日の打刻を削除しますか？")) return;
  const records = loadRecords();
  delete records[editingDate];
  saveRecords(records);
  closeEdit();
  renderAll();
}

/* ---------- CSV出力 ---------- */
function exportCsv() {
  const records = loadRecords();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const rows = [["日付", "曜日", "出勤", "退勤", "稼働時間"]];

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(viewYear, viewMonth, day);
    const key = dateKey(d);
    const rec = records[key] || {};
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

  // BOM付きでExcelの文字化けを防ぐ
  const blob = new Blob(["﻿" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kintai_${viewYear}-${pad2(viewMonth + 1)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ---------- 月ナビ ---------- */
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

/* ---------- 全体描画 ---------- */
function renderAll() {
  renderToday();
  renderMonth();
}

/* ---------- 初期化 ---------- */
function init() {
  const now = new Date();
  viewYear = now.getFullYear();
  viewMonth = now.getMonth();

  document.getElementById("btnClockIn").addEventListener("click", handleClockIn);
  document
    .getElementById("btnClockOut")
    .addEventListener("click", handleClockOut);
  document
    .getElementById("btnPrevMonth")
    .addEventListener("click", () => shiftMonth(-1));
  document
    .getElementById("btnNextMonth")
    .addEventListener("click", () => shiftMonth(1));
  document.getElementById("btnExportCsv").addEventListener("click", exportCsv);

  // モーダル
  document
    .getElementById("btnEditCancel")
    .addEventListener("click", closeEdit);
  document.getElementById("btnEditSave").addEventListener("click", saveEdit);
  document
    .getElementById("btnEditDelete")
    .addEventListener("click", deleteEdit);
  document.getElementById("editModal").addEventListener("click", (e) => {
    if (e.target.id === "editModal") closeEdit();
  });

  // 一覧の「修正」ボタン（イベント委任）
  document.getElementById("recordsBody").addEventListener("click", (e) => {
    const btn = e.target.closest(".edit-link");
    if (btn) openEdit(btn.dataset.date);
  });

  renderAll();
}

document.addEventListener("DOMContentLoaded", init);
