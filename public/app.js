// Built by Manaswin Tripathi (@manaswintripathi)
const form = document.getElementById('shorten-form');
const urlInput = document.getElementById('url-input');
const aliasInput = document.getElementById('alias-input');
const formError = document.getElementById('form-error');
const resultBox = document.getElementById('result');
const resultLink = document.getElementById('result-link');
const resultCopy = document.getElementById('result-copy');
const linksBody = document.getElementById('links-body');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const clearAllBtn = document.getElementById('clear-all');

function showError(msg) {
  formError.textContent = msg;
  formError.hidden = !msg;
}

async function api(path, options) {
  const res = await fetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  if (btn) {
    const old = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = old; }, 1200);
  }
}

function drawChart(days) {
  const canvas = document.getElementById('chart');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const max = Math.max(1, ...days.map((d) => d.clicks));
  const padLeft = 36;
  const padBottom = 28;
  const padTop = 12;
  const plotW = W - padLeft - 10;
  const plotH = H - padTop - padBottom;
  const slot = plotW / days.length;
  const barW = Math.min(34, slot * 0.6);

  // Gridlines + y labels
  ctx.strokeStyle = '#e2e8f0';
  ctx.fillStyle = '#64748b';
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const v = Math.round((max * i) / 4);
    const y = padTop + plotH - (plotH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(W - 10, y);
    ctx.stroke();
    ctx.fillText(String(v), padLeft - 6, y + 4);
  }

  // Bars + x labels
  ctx.textAlign = 'center';
  days.forEach((d, i) => {
    const h = (d.clicks / max) * plotH;
    const x = padLeft + slot * i + (slot - barW) / 2;
    const y = padTop + plotH - h;
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(x, y, barW, h);
    ctx.fillStyle = '#64748b';
    const label = d.date.slice(5); // MM-DD
    ctx.fillText(label, x + barW / 2, H - 8);
    if (d.clicks > 0) {
      ctx.fillStyle = '#1a2233';
      ctx.fillText(String(d.clicks), x + barW / 2, y - 5);
    }
  });
}

async function loadStats() {
  const stats = await api('/api/stats');
  document.getElementById('total-links').textContent = stats.totalLinks;
  document.getElementById('total-clicks').textContent = stats.totalClicks;
  document.getElementById('top-link').textContent =
    stats.topLinks.length ? stats.topLinks[0].code : '—';
  drawChart(stats.clicksPerDay);

  const topList = document.getElementById('top-links');
  topList.innerHTML = stats.topLinks.length
    ? stats.topLinks.map((l) => `<li><strong>${l.code}</strong> — ${l.clicks} clicks — <a href="${l.shortUrl}" target="_blank" rel="noopener">${l.shortUrl}</a></li>`).join('')
    : '<li>No clicks yet.</li>';
}

async function loadLinks() {
  const q = searchInput.value.trim();
  const links = await api('/api/links' + (q ? '?search=' + encodeURIComponent(q) : ''));
  emptyState.hidden = links.length > 0;
  linksBody.innerHTML = links.map((l) => `
    <tr>
      <td><a href="${l.shortUrl}" target="_blank" rel="noopener">${l.shortUrl}</a></td>
      <td class="url-cell" title="${l.url}">${l.url}</td>
      <td>${l.clicks}</td>
      <td>${new Date(l.createdAt).toLocaleDateString()}</td>
      <td>
        <button class="small copy-btn" type="button" data-url="${l.shortUrl}">Copy</button>
        <button class="small danger delete-btn" type="button" data-code="${l.code}">Delete</button>
      </td>
    </tr>`).join('');
}

async function refresh() {
  await Promise.all([loadStats(), loadLinks()]);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  showError('');
  resultBox.hidden = true;
  try {
    const link = await api('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: urlInput.value.trim(), alias: aliasInput.value.trim() }),
    });
    resultLink.textContent = link.shortUrl;
    resultLink.href = link.shortUrl;
    resultBox.hidden = false;
    urlInput.value = '';
    aliasInput.value = '';
    await refresh();
  } catch (err) {
    showError(err.message);
  }
});

resultCopy.addEventListener('click', () => copyText(resultLink.textContent, resultCopy));

linksBody.addEventListener('click', async (e) => {
  const copyBtn = e.target.closest('.copy-btn');
  if (copyBtn) {
    await copyText(copyBtn.dataset.url, copyBtn);
    return;
  }
  const delBtn = e.target.closest('.delete-btn');
  if (delBtn) {
    if (!confirm(`Delete short link "${delBtn.dataset.code}"?`)) return;
    await api('/api/links/' + encodeURIComponent(delBtn.dataset.code), { method: 'DELETE' });
    await refresh();
  }
});

let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadLinks, 250);
});

clearAllBtn.addEventListener('click', async () => {
  if (!confirm('Delete ALL links? This clears the sample links too.')) return;
  await api('/api/links', { method: 'DELETE' });
  await refresh();
});

refresh().catch((err) => showError(err.message));
