// overlay.js — Overlay renderer — single halakha per appearance
(function () {

  const elTitle    = document.getElementById('chapter-title');
  const elSub      = document.getElementById('chapter-subtitle');
  const elCounter  = document.getElementById('chapter-counter');
  const elSpinner  = document.getElementById('loading-spinner');
  const elText     = document.getElementById('text-content');
  const elOverall  = document.getElementById('overall-fill');
  const elOverLbl  = document.getElementById('overall-label');
  const elAllDone  = document.getElementById('all-done-overlay');
  const btnRead    = document.getElementById('btn-read');
  const btnSkip    = document.getElementById('btn-skip');
  const btnPost    = document.getElementById('btn-postpone');
  const btnDone    = document.getElementById('btn-done-close');

  // ── Render single item ──
  function renderItem(data) {
    const { item, itemIndex, totalItems, readCount } = data;

    // Header: chapter name
    elTitle.textContent = item.hebrewName || item.chapterName || 'פרק';

    // Subtitle: position within chapter
    const paraNum = item.paragraphIndex + 1;
    const paraTotal = item.totalInChapter;
    elSub.textContent = `הלכה ${paraNum} מתוך ${paraTotal} בפרק`;

    // Counter badge: overall day position
    elCounter.textContent = `${itemIndex + 1} / ${totalItems} ביום`;

    // Overall progress bar
    const pct = totalItems > 0 ? Math.round((readCount / totalItems) * 100) : 0;
    elOverall.style.width = `${pct}%`;
    elOverLbl.textContent = `${readCount}/${totalItems} הלכות נקראו היום`;

    // Text
    renderText(item.text);
  }

  function renderText(text) {
    elSpinner.style.display = 'none';
    elText.innerHTML = '';

    if (!text || !text.trim()) {
      elText.innerHTML = '<p class="error-text">לא ניתן לטעון את הטקסט כרגע.</p>';
      elText.classList.add('show');
      return;
    }

    const div = document.createElement('div');
    div.className = 'halakha-text';
    div.textContent = text;
    elText.appendChild(div);
    elText.classList.add('show');
  }

  // ── Actions ──
  async function handleRead() {
    disableButtons();
    const progress = await window.rambam.markRead();

    if (progress) {
      const allDone = progress.items.every(it => it.status === 'read');
      if (allDone) { showAllDone(); return; }
    }
    window.close();
  }

  async function handleSkip() {
    disableButtons();
    await window.rambam.markSkipped();
    window.close();
  }

  async function handlePostpone() {
    disableButtons();
    await window.rambam.markPostpone();
    window.close();
  }

  function disableButtons() {
    [btnRead, btnSkip, btnPost].forEach(b => b.disabled = true);
  }

  function showAllDone() {
    elAllDone.style.display = 'flex';
    setTimeout(() => window.close(), 3500);
  }

  // ── Buttons ──
  btnRead.addEventListener('click', handleRead);
  btnSkip.addEventListener('click', handleSkip);
  btnPost.addEventListener('click', handlePostpone);
  btnDone.addEventListener('click', () => window.close());

  // ── Keyboard ──
  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'Enter':   e.preventDefault(); handleRead();     break;
      case 'Escape':  e.preventDefault(); handleSkip();     break;
      case ' ':       e.preventDefault(); handlePostpone(); break;
    }
  });

  // ── Receive data from main process ──
  window.rambam.onChapterData((data) => {
    renderItem(data);
  });

})();
