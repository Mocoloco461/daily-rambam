// dashboard.js — Dashboard renderer
(async () => {
  // ── State ──
  let settings = { mode: '1', hoursPerDay: 8, active: true };

  // ── Elements ──
  const statusCard    = document.getElementById('status-card');
  const statusIcon    = document.getElementById('status-icon');
  const statusTitle   = document.getElementById('status-title');
  const statusSub     = document.getElementById('status-subtitle');
  const statusBadge   = document.getElementById('status-badge');
  const progressFill  = document.getElementById('progress-fill');
  const progressLabel = document.getElementById('progress-label');
  const btnShowNow    = document.getElementById('btn-show-now');
  const btnToggle     = document.getElementById('btn-toggle');
  const toggleIcon    = document.getElementById('toggle-icon');
  const toggleLabel   = document.getElementById('toggle-label');
  const mode1Btn      = document.getElementById('mode-1');
  const mode3Btn      = document.getElementById('mode-3');
  const intervalMin   = document.getElementById('hours-per-day');
  const intervalMinV  = null; // unused
  const intervalMaxV  = null; // unused
  const intervalMax   = null; // unused
  const smartHint     = document.getElementById('smart-hint');
  const btnSave       = document.getElementById('btn-save');
  const saveFeedback  = document.getElementById('save-feedback');
  const historyList   = document.getElementById('history-list');
  const historyLoad   = document.getElementById('history-loading');
  const btnResetToday  = document.getElementById('btn-reset-today');
  const modalBackdrop  = document.getElementById('modal-backdrop');
  const modalCancel    = document.getElementById('modal-cancel');
  const modalConfirm1  = document.getElementById('modal-confirm-1');
  const modalStep2     = document.getElementById('modal-step2');
  const modalCancel2   = document.getElementById('modal-cancel-2');
  const modalConfirm2  = document.getElementById('modal-confirm-2');

  // ── Load settings ──
  async function loadSettings() {
    settings = await window.rambam.getSettings();
    applySettings(settings);
  }

  function applySettings(s) {
    mode1Btn.classList.toggle('active', s.mode === '1');
    mode3Btn.classList.toggle('active', s.mode === '3');
    const hpd = document.getElementById('hours-per-day');
    if (hpd) hpd.value = s.hoursPerDay ?? 8;
    updateToggleButton(s.active);
  }

  function updateToggleButton(active) {
    toggleIcon.textContent = active ? '⏸' : '▶️';
    toggleLabel.textContent = active ? 'השהה' : 'הפעל';
  }

  // ── Load today status ──
  async function loadTodayStatus() {
    const status = await window.rambam.getTodayStatus();
    renderStatus(status);
  }

  function renderStatus(status) {
    if (!status || !status.items || status.items.length === 0) {
      statusIcon.textContent = '📖';
      statusTitle.textContent = 'ממתין לשיעור הראשון';
      statusSub.textContent = 'ההלכות של היום יטענו בהופעה הראשונה';
      statusBadge.textContent = '0/0';
      progressFill.style.width = '0%';
      progressLabel.textContent = 'לא הושלם';
      return;
    }

    const items  = status.items;
    const total  = items.length;
    const read   = items.filter(it => it.status === 'read').length;
    const allDone = read === total;
    const pct    = total > 0 ? Math.round((read / total) * 100) : 0;

    statusBadge.textContent = `${read}/${total}`;
    progressFill.style.width = `${pct}%`;

    if (allDone) {
      statusCard.classList.add('done');
      statusIcon.textContent = '✅';
      statusTitle.textContent = 'סיימתי להיום! 🎉';
      statusSub.textContent = `כל ${total} ההלכות נקראו`;
      progressLabel.textContent = `הושלם — ${total} הלכות`;
    } else {
      statusCard.classList.remove('done');
      const nextItem = items.find(it => it.status === 'pending' || it.status === 'skipped');
      const remaining = total - read;
      statusIcon.textContent = '📖';
      statusTitle.textContent = nextItem ? nextItem.hebrewName : 'ממתין...';
      statusSub.textContent = remaining === 1
        ? 'נותרה הלכה אחת להיום'
        : `נותרות ${remaining} הלכות להיום`;
      progressLabel.textContent = pct > 0 ? `${pct}% הושלם` : 'טרם הושלם';
    }
  }

  // ── Load history ──
  async function loadHistory() {
    historyLoad.style.display = 'block';
    historyList.innerHTML = '';

    const history = await window.rambam.getHistory();
    historyLoad.style.display = 'none';

    if (!history || history.length === 0) {
      historyList.innerHTML = '<div class="history-empty">עדיין אין היסטוריה.<br/>התחל ללמוד כדי לראות כאן את ההלכות שקראת.</div>';
      return;
    }

    history.forEach(day => {
      const div = document.createElement('div');
      div.className = 'history-day';

      const icon = day.completed ? '✅' : (day.readCount > 0 ? '📖' : '⏸');
      const badgeClass = day.completed ? 'complete' : 'partial';
      const badgeText  = day.completed ? 'הושלם' : `${day.readCount}/${day.totalItems}`;
      const dateStr    = formatDate(day.date);

      // Group items by chapter for display
      const byChapter = {};
      (day.items || []).forEach(it => {
        const key = it.hebrewName || `פרק ${it.chapterIndex + 1}`;
        if (!byChapter[key]) byChapter[key] = { read: 0, total: 0 };
        byChapter[key].total++;
        if (it.status === 'read') byChapter[key].read++;
      });

      const chaptersHtml = Object.entries(byChapter).map(([name, counts]) => {
        const dotClass = counts.read === counts.total ? 'read' : (counts.read > 0 ? 'skipped' : 'pending');
        return `<div class="history-chapter">
          <span class="history-chapter-dot ${dotClass}"></span>
          <span>${name} — ${counts.read}/${counts.total} הלכות</span>
        </div>`;
      }).join('');

      div.innerHTML = `
        <div class="history-day-icon">${icon}</div>
        <div class="history-day-info">
          <div class="history-day-date">${dateStr}</div>
          <div class="history-day-chapters">${chaptersHtml}</div>
        </div>
        <div class="history-day-badge ${badgeClass}">${badgeText}</div>
      `;
      historyList.appendChild(div);
    });
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  // ── Event Handlers ──
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      settings.mode = btn.dataset.mode;
    });
  });

  // שעות ביום על המחשב
  const hoursInput = document.getElementById('hours-per-day');

  function updateSmartHint() {
    const hours = parseFloat(hoursInput.value) || 8;
    // Try to get the current remaining count from today's status
    window.rambam.getTodayStatus().then(status => {
      let remaining = 1;
      if (status && status.items && status.items.length > 0) {
        remaining = status.items.filter(it => it.status === 'pending' || it.status === 'skipped').length;
        if (remaining === 0) remaining = status.items.length; // all done edge-case
      }
      const idealMin = Math.round((hours * 60) / remaining);
      const lo = Math.max(5, Math.round(idealMin * 0.7));
      const hi = Math.min(90, Math.round(idealMin * 1.3));
      if (smartHint) {
        smartHint.textContent = remaining > 1
          ? `יש ${remaining} הלכות לקריאה — המרווח המחושב: כ${lo}-${hi} דקות`
          : `הלכה אחת לקריאה — תופיע כעבור ${lo}-${hi} דקות`;
      }
    });
  }

  hoursInput.addEventListener('input', () => {
    settings.hoursPerDay = parseFloat(hoursInput.value) || 8;
    updateSmartHint();
  });

  // Initial hint
  updateSmartHint();

  btnSave.addEventListener('click', async () => {
    await window.rambam.saveSettings(settings);
    saveFeedback.classList.add('show');
    setTimeout(() => saveFeedback.classList.remove('show'), 2500);
  });

  btnShowNow.addEventListener('click', async () => {
    btnShowNow.disabled = true;
    btnShowNow.querySelector('.btn-icon').textContent = '⏳';
    await window.rambam.triggerNow();
    setTimeout(() => {
      btnShowNow.disabled = false;
      btnShowNow.querySelector('.btn-icon').textContent = '⚡';
    }, 2000);
  });

  btnToggle.addEventListener('click', async () => {
    const active = await window.rambam.toggleScheduler();
    settings.active = active;
    updateToggleButton(active);
  });

  // ── Reset Today ──
  function openResetModal() {
    modalStep2.style.display = 'none';
    modalBackdrop.style.display = 'flex';
    // small animation tick
    requestAnimationFrame(() => {
      document.getElementById('modal-box').classList.add('visible');
    });
  }

  function closeResetModal() {
    document.getElementById('modal-box').classList.remove('visible');
    setTimeout(() => { modalBackdrop.style.display = 'none'; }, 200);
    modalStep2.style.display = 'none';
  }

  btnResetToday.addEventListener('click', openResetModal);
  modalCancel.addEventListener('click', closeResetModal);
  modalCancel2.addEventListener('click', closeResetModal);
  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closeResetModal();
  });

  modalConfirm1.addEventListener('click', () => {
    modalStep2.style.display = 'block';
    modalConfirm1.style.display = 'none';
    modalCancel.style.display = 'none';
  });

  modalConfirm2.addEventListener('click', async () => {
    closeResetModal();
    btnResetToday.disabled = true;
    btnResetToday.querySelector('.btn-icon').textContent = '⏳';
    await window.rambam.resetToday();
    await loadTodayStatus();
    await loadHistory();
    btnResetToday.disabled = false;
    btnResetToday.querySelector('.btn-icon').textContent = '🔄';
  });

  // ── IPC Events ──
  window.rambam.onStatusUpdate((data) => {
    if (data.allDone !== undefined || data.progress || data.reset) loadTodayStatus();
    if (data.reset) loadHistory();
    if (data.active !== undefined) {
      settings.active = data.active;
      updateToggleButton(data.active);
    }
  });

  // ── Init ──
  await loadSettings();
  await loadTodayStatus();
  await loadHistory();
})();
