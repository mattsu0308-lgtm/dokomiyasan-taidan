// 管理ページ: 参加状況の一覧・CSV出力・スタンプの手動修正
'use strict';

const $ = (id) => document.getElementById(id);
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

let state = null;
let pass = sessionStorage.getItem('taiso-admin-pass') || '';

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function eventDates() {
  const dates = [];
  const d = new Date(state.startDate + 'T00:00:00Z');
  const end = new Date(state.endDate + 'T00:00:00Z');
  while (d <= end) {
    const iso = d.toISOString().slice(0, 10);
    dates.push({ iso, day: d.getUTCDate(), weekday: d.getUTCDay(), off: state.excludeWeekdays.includes(d.getUTCDay()) });
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return dates;
}

async function verify(p) {
  const res = await fetch('/api/admin/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pass: p }),
  });
  return res.ok;
}

async function fetchState() {
  const res = await fetch('/api/state');
  state = await res.json();
  render();
}

function render() {
  const dates = eventDates();
  const validDates = dates.filter((d) => !d.off);
  const passedDates = validDates.filter((d) => d.iso <= state.today);
  const people = [...state.participants].sort(
    (a, b) => Object.keys(b.stamps).length - Object.keys(a.stamps).length || a.name.localeCompare(b.name, 'ja')
  );

  // まとめ
  const totalStamps = people.reduce((s, p) => s + Object.keys(p.stamps).length, 0);
  const todayCount = people.filter((p) => p.stamps[state.today]).length;
  const perfect = people.filter((p) => passedDates.every((d) => p.stamps[d.iso])).length;
  const avgRate = people.length && passedDates.length
    ? Math.round((totalStamps / (people.length * passedDates.length)) * 100) : 0;
  $('summary').innerHTML = [
    ['参加人数', `${people.length}人`],
    ['今日の出席', `${todayCount}人`],
    ['ここまで皆勤', `${perfect}人`],
    ['平均出席率', `${avgRate}%`],
    ['スタンプ総数', `${totalStamps}個`],
    ['経過日数', `${passedDates.length} / ${validDates.length}日`],
  ].map(([k, v]) => `<div class="stat"><span class="stat-num">${v}</span><span class="stat-label">${k}</span></div>`).join('');

  // 出席表
  const head = `<tr><th class="name-col">名前</th>${dates.map((d) =>
    `<th class="${d.off ? 'off' : ''}${d.iso === state.today ? ' today' : ''}">${d.day}<br><small>${WEEKDAYS[d.weekday]}</small></th>`
  ).join('')}<th class="name-col">合計</th><th class="name-col">出席率</th></tr>`;

  const rows = people.map((p) => {
    const total = Object.keys(p.stamps).length;
    const rate = passedDates.length ? Math.round((passedDates.filter((d) => p.stamps[d.iso]).length / passedDates.length) * 100) : 0;
    const cells = dates.map((d) => {
      const t = p.stamps[d.iso];
      const cls = [d.off ? 'off' : '', d.iso === state.today ? 'today' : '', t ? 'yes' : ''].filter(Boolean).join(' ');
      return `<td class="${cls}" data-name="${escapeHtml(p.name)}" data-date="${d.iso}" title="${escapeHtml(p.name)} ${d.iso}${t ? ' ' + escapeHtml(t) : ''}">${t ? '◎' : ''}</td>`;
    }).join('');
    return `<tr><th class="name-col">${escapeHtml(p.name)}</th>${cells}<td class="total-col">${total}</td><td class="total-col">${rate}%</td></tr>`;
  }).join('');

  $('attend-table').innerHTML = head + (rows || `<tr><td colspan="${dates.length + 3}">まだ参加者がいません</td></tr>`);
}

// 修正モード: マスをクリックでスタンプの付け外し
$('attend-table').addEventListener('click', async (e) => {
  if (!$('edit-mode').checked) return;
  const td = e.target.closest('td[data-name]');
  if (!td) return;
  const name = td.dataset.name;
  const date = td.dataset.date;
  const has = td.classList.contains('yes');
  const msg = has
    ? `${name} さんの ${date} のスタンプを取り消しますか?`
    : `${name} さんの ${date} にスタンプを付けますか?`;
  if (!confirm(msg)) return;
  const res = await fetch('/api/admin/stamp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pass, name, date, remove: has }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    alert(body.error || 'エラーが発生しました');
  }
  await fetchState();
});

// CSVダウンロード(Excelで開けるようBOM付きUTF-8)
$('csv-btn').addEventListener('click', () => {
  const dates = eventDates();
  const header = ['名前', ...dates.map((d) => d.iso), '合計'];
  const lines = [header.join(',')];
  for (const p of state.participants) {
    const row = [p.name, ...dates.map((d) => p.stamps[d.iso] || ''), Object.keys(p.stamps).length];
    lines.push(row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
  }
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `スタンプラリー出席表_${state.today}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
});

async function login(p) {
  if (!(await verify(p))) {
    $('login-message').textContent = 'パスワードが違います';
    $('login-message').className = 'message err';
    return;
  }
  pass = p;
  sessionStorage.setItem('taiso-admin-pass', p);
  $('login-box').hidden = true;
  $('admin-main').hidden = false;
  await fetchState();
  setInterval(fetchState, 30_000);
}

$('login-btn').addEventListener('click', () => login($('pass-input').value));
$('pass-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') login($('pass-input').value); });

if (pass) login(pass);
