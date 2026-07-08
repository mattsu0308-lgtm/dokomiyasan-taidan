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
      <div class="taiso-card${isMe ? ' me' : ''}" data-name="${escapeHtml(p.name)}" title="クリックで拡大・画像保存">
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

// ---------- カードの拡大表示と画像ダウンロード ----------

let modalName = '';

// カードをそのままCanvasに描く(ダウンロードする画像と拡大表示は同じもの)
function renderCardCanvas(p) {
  const dates = eventDates();
  const validDays = dates.filter((d) => !d.off).length;
  const total = Object.keys(p.stamps).length;

  const cols = 7, cell = 96, gap = 8, padX = 40;
  const rows = Math.ceil(dates.length / cols);
  const W = padX * 2 + cols * cell + (cols - 1) * gap;
  const headH = 158;
  const gridH = rows * cell + (rows - 1) * gap;
  const gotRewards = state.rewards.filter((r) => total >= r.days);
  const badgeH = gotRewards.length ? 64 : 20;
  const H = headH + gridH + badgeH + 46;

  const canvas = document.createElement('canvas');
  canvas.width = W * 2; canvas.height = H * 2; // 高解像度で描画
  canvas.style.width = '100%';
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);

  const FONT = '"Hiragino Maru Gothic ProN", "Yu Gothic", "Noto Sans JP", sans-serif';

  // カードの下地とふち
  ctx.fillStyle = '#fff8e7';
  ctx.beginPath(); ctx.roundRect(3, 3, W - 6, H - 6, 18); ctx.fill();
  ctx.strokeStyle = '#e0402f'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.roundRect(3, 3, W - 6, H - 6, 18); ctx.stroke();

  // 首ひもの穴
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#e0402f'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.ellipse(W / 2, 26, 26, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // タイトル・名前・合計
  ctx.fillStyle = '#4a6076';
  ctx.font = `bold 17px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(state.eventName, W / 2, 66);
  ctx.font = `13px ${FONT}`;
  const fmt = (iso) => `${Number(iso.slice(5, 7))}月${Number(iso.slice(8, 10))}日`;
  ctx.fillText(`${fmt(state.startDate)} 〜 ${fmt(state.endDate)}`, W / 2, 88);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#2b3a4a';
  ctx.font = `bold 30px ${FONT}`;
  ctx.fillText(`${p.name} さん`, padX, 130);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#e0402f';
  ctx.fillText(`${total} / ${validDays}日`, W - padX, 130);

  ctx.strokeStyle = '#e0402f'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(padX, 142); ctx.lineTo(W - padX, 142); ctx.stroke();

  // 日付マス
  dates.forEach((d, i) => {
    const x = padX + (i % cols) * (cell + gap);
    const y = headH + Math.floor(i / cols) * (cell + gap);
    ctx.fillStyle = d.off ? '#eef2f5' : '#ffffff';
    ctx.strokeStyle = '#d9c9a8'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(x, y, cell, cell, 10); ctx.fill(); ctx.stroke();

    ctx.fillStyle = d.off ? '#b8c4cd' : '#8a97a3';
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(String(d.day), x + 8, y + 20);

    const t = p.stamps[d.iso];
    if (t) {
      const cx = x + cell / 2, cy = y + cell / 2 + 4;
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(-0.14);
      ctx.strokeStyle = 'rgba(224, 64, 47, 0.9)'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(0, 0, cell * 0.36, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#e0402f';
      ctx.font = `bold 30px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('☀', 0, 11);
      ctx.restore();
      ctx.fillStyle = '#a52d20';
      ctx.font = `10px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(t, cx, y + cell - 7);
    }
  });

  // 獲得したごほうびバッジ
  if (gotRewards.length) {
    let bx = padX;
    const by = headH + gridH + 22;
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = 'left';
    for (const r of gotRewards) {
      const label = `🎉 ${r.label}`;
      const w = ctx.measureText(label).width + 26;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#3d9b63'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(bx, by, w, 32, 16); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3d9b63';
      ctx.fillText(label, bx + 13, by + 22);
      bx += w + 10;
      if (bx > W - padX - 120) break;
    }
  }

  return canvas;
}

function openCardModal(name) {
  const p = state.participants.find((q) => q.name === name);
  if (!p) return;
  modalName = name;
  const wrap = $('card-canvas-wrap');
  wrap.innerHTML = '';
  wrap.appendChild(renderCardCanvas(p));
  $('card-modal').hidden = false;
}

$('board').addEventListener('click', (e) => {
  const card = e.target.closest('.taiso-card');
  if (card) openCardModal(card.dataset.name);
});

$('download-btn').addEventListener('click', () => {
  const canvas = $('card-canvas-wrap').querySelector('canvas');
  if (!canvas) return;
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ラジオ体操カード_${modalName}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }, 'image/png');
});

$('close-modal-btn').addEventListener('click', () => { $('card-modal').hidden = true; });
$('card-modal').addEventListener('click', (e) => {
  if (e.target === $('card-modal')) $('card-modal').hidden = true;
});

fetchState();
setInterval(fetchState, 30_000); // 30秒ごとに自動更新(みんなのスタンプが増えるのが見える)
