// 夏の朝活ラジオ体操スタンプラリー フロントエンド
'use strict';

const $ = (id) => document.getElementById(id);
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

let state = null;
const myName = () => localStorage.getItem('taiso-name') || '';

async function fetchState() {
  const res = await fetch('/api/state');
  state = await res.json();
  render();
}

function eventDates() {
  // 期間内の日付一覧(YYYY-MM-DD)。お休み曜日には off フラグを付ける
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

function render() {
  $('event-name').textContent = state.eventName;
  document.title = state.eventName;

  const fmt = (iso) => {
    const [y, m, d] = iso.split('-');
    return `${Number(m)}月${Number(d)}日`;
  };
  $('event-period').textContent = `${fmt(state.startDate)} 〜 ${fmt(state.endDate)} / 受付 ${state.windowStart}〜${state.windowEnd}`;

  const todayW = WEEKDAYS[new Date(state.today + 'T00:00:00Z').getUTCDay()];
  $('today-label').textContent = `${fmt(state.today)}(${todayW})`;
  $('now-clock').textContent = state.now;

  const winEl = $('window-label');
  if (state.open) {
    winEl.innerHTML = '<span class="open">🟢 ただいま受付中!</span> ボタンを押してスタンプをもらおう';
  } else {
    winEl.innerHTML = `<span class="closed">⏰ ${escapeHtml(state.closedReason)}</span>`;
  }

  $('stamp-btn').disabled = !state.open;

  // 名前の候補
  $('name-list').innerHTML = state.participants
    .map((p) => `<option value="${escapeHtml(p.name)}">`).join('');
  if (!$('name-input').value && myName()) $('name-input').value = myName();

  // ごほうびライン
  $('rewards').innerHTML = state.rewards
    .map((r) => `<li>${r.days}日で ${escapeHtml(r.label)}</li>`).join('');

  renderBoard();
}

function renderBoard() {
  const dates = eventDates();
  const validDays = dates.filter((d) => !d.off).length;
  const todayCount = state.participants.filter((p) => p.stamps[state.today]).length;
  $('today-count').textContent = state.participants.length
    ? `今日の出席 ${todayCount}人 / 参加 ${state.participants.length}人`
    : 'まだ誰も登録していません。最初の1人になろう!';

  const sorted = [...state.participants].sort((a, b) => {
    if (a.name === myName()) return -1;
    if (b.name === myName()) return 1;
    return Object.keys(b.stamps).length - Object.keys(a.stamps).length || a.name.localeCompare(b.name, 'ja');
  });

  $('board').innerHTML = sorted.map((p) => {
    const total = Object.keys(p.stamps).length;
    const isMe = p.name === myName();
    const cells = dates.map((d) => {
      const t = p.stamps[d.iso];
      const cls = ['day', d.off ? 'off' : '', d.iso === state.today ? 'today' : '', t ? 'stamped' : ''].filter(Boolean).join(' ');
      const hanko = t ? `<span class="hanko">☀</span><span class="time">${escapeHtml(t)}</span>` : '';
      return `<div class="${cls}" title="${d.iso}${t ? ' ' + escapeHtml(t) : ''}"><span class="num">${d.day}</span>${hanko}</div>`;
    }).join('');
    const badges = state.rewards.map((r) => {
      const got = total >= r.days;
      return `<span class="${got ? '' : 'locked'}">${got ? '🎉' : '🔒'} ${escapeHtml(r.label)}</span>`;
    }).join('');
    return `
      <div class="taiso-card${isMe ? ' me' : ''}">
        <div class="taiso-head">
          <span class="taiso-name">${escapeHtml(p.name)}${isMe ? '<span class="me-badge">あなた</span>' : ''}</span>
          <span class="taiso-total">${total} / ${validDays}日</span>
        </div>
        <div class="day-grid">${cells}</div>
        <div class="reward-badges">${badges}</div>
      </div>`;
  }).join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function showMessage(text, ok) {
  const el = $('message');
  el.textContent = text;
  el.className = 'message ' + (ok ? 'ok' : 'err');
}

function playStampAnimation() {
  const overlay = $('stamp-overlay');
  overlay.hidden = false;
  setTimeout(() => { overlay.hidden = true; }, 1100);
}

$('stamp-btn').addEventListener('click', async () => {
  const name = $('name-input').value.trim();
  if (!name) return showMessage('お名前を入力してください', false);
  localStorage.setItem('taiso-name', name);

  const res = await fetch('/api/stamp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const body = await res.json();
  if (res.ok) {
    playStampAnimation();
    showMessage(`スタンプを押しました!(${body.time}) これで ${body.total}日目 🌻`, true);
  } else {
    showMessage(body.error || 'エラーが発生しました', false);
  }
  await fetchState();
});

$('stamp-overlay').addEventListener('click', () => { $('stamp-overlay').hidden = true; });

fetchState();
setInterval(fetchState, 30_000); // 30秒ごとに自動更新(みんなのスタンプが増えるのが見える)
