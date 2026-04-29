// main.js - Electron Main Process
const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen } = require('electron');
const path = require('path');
const Store = require('electron-store');
const https = require('https');

// ──────────────────────────────────────────────
// Store
// ──────────────────────────────────────────────
const store = new Store({
  defaults: {
    settings: {
      mode: '1',           // '1' or '3' chapters per day
      hoursPerDay: 8,      // how many hours/day the user is at the computer
      active: true,
    },
    history: [],
    todayProgress: null,
  }
});

// ──────────────────────────────────────────────
// App State
// ──────────────────────────────────────────────
let tray = null;
let dashboardWindow = null;
let overlayWindow = null;
let dimWindows = [];       // one per non-active screen
let scheduler = null;
let postponeTimer = null;
let isSchedulerActive = true;

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'RambamDaily/1.0' } }, (res) => {
      res.setEncoding('utf8'); // Ensure Hebrew multi-byte chars aren't split across chunks
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('JSON parse error: ' + e.message)); }
      });
    }).on('error', reject);
  });
}

function cleanParagraphs(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map(p => (typeof p === 'string' ? p : '')
      .replace(/<small[^>]*>.*?<\/small>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&[^;]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    )
    .filter(p => p.length > 3); // skip tiny/empty strings
}

// ──────────────────────────────────────────────
// Rambam API — returns array of { name, hebrewName, paragraphs[] }
// ──────────────────────────────────────────────
async function fetchSefariaChapterText(pathPart) {
  const apiUrl = `https://www.sefaria.org/api/texts/${encodeURIComponent(pathPart)}?lang=he&commentary=0`;
  const data = await fetchJson(apiUrl);
  return data.he || [];
}

async function fetchTodayRambam(mode) {
  try {
    const response = await fetchJson('https://www.torahcalc.com/api/dailylearning');
    const data = response.data || response; // API wraps in { success, data: {...} }

    if (mode === '3') {
      const entry = data['dailyRambam3'];
      if (!entry) throw new Error('No dailyRambam3 entry found');

      // URL like: .../Mishneh_Torah%2C_Virgin_Maiden.1-3?lang=bi
      const urlObj = new URL(entry.url);
      const fullPath = decodeURIComponent(urlObj.pathname.replace(/^\//, ''));
      // fullPath: Mishneh_Torah,_Virgin_Maiden.1-3

      // Extract base and range
      const rangeMatch = fullPath.match(/^(.+)\.(\d+)-(\d+)$/);
      if (!rangeMatch) throw new Error('Cannot parse chapter range from: ' + fullPath);

      const [, basePath, startStr, endStr] = rangeMatch;
      const start = parseInt(startStr);
      const end   = parseInt(endStr);

      // Fetch each chapter individually
      const chapters = [];
      for (let ch = start; ch <= end; ch++) {
        const chPath = `${basePath}.${ch}`;
        const heText = await fetchSefariaChapterText(chPath);
        const paragraphs = cleanParagraphs(Array.isArray(heText[0]) ? heText[0] : heText);

        // Build Hebrew chapter name: strip trailing range "1-3" and add number
        const hebrewBase = entry.hebrewName.replace(/\s+\d+-\d+$/, '').trim();
        chapters.push({
          name: `${basePath.replace(/Mishneh_Torah,_/, '').replace(/_/g, ' ')} ${ch}`,
          hebrewName: `${hebrewBase} פרק ${ch}`,
          paragraphs,
        });
      }
      return chapters;

    } else {
      const entry = data['dailyRambam'];
      if (!entry) throw new Error('No dailyRambam entry found');

      const urlObj = new URL(entry.url);
      const fullPath = decodeURIComponent(urlObj.pathname.replace(/^\//, ''));
      const heText = await fetchSefariaChapterText(fullPath);

      // Could be nested if range (shouldn't be for single), flatten if so
      const flat = (heText.length > 0 && Array.isArray(heText[0]))
        ? heText.flat()
        : heText;

      return [{
        name: entry.name,
        hebrewName: entry.hebrewName,
        paragraphs: cleanParagraphs(flat),
      }];
    }
  } catch (err) {
    console.error('fetchTodayRambam error:', err);
    return null;
  }
}

// ──────────────────────────────────────────────
// Today Progress — flat list of individual paragraphs (halakhot)
//
// todayProgress = {
//   date: "YYYY-MM-DD",
//   items: [
//     {
//       chapterName, hebrewName,   -- which chapter this belongs to
//       chapterIndex,              -- 0-based chapter index
//       totalChapters,
//       paragraphIndex,            -- 0-based within the chapter
//       totalInChapter,
//       text,                      -- single halakha text
//       status: 'pending'|'read'|'skipped',
//       readAt: null | ISO string
//     },
//     ...
//   ]
// }
// ──────────────────────────────────────────────
function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getTodayProgress() {
  const s = store.get('settings');
  const progress = store.get('todayProgress');
  if (!progress || progress.date !== getTodayDate()) return null;
  // Invalidate if mode has changed since progress was created
  if (progress.mode && progress.mode !== s.mode) return null;
  return progress;
}

function initTodayProgress(chapters, mode) {
  const items = [];
  chapters.forEach((ch, chIdx) => {
    ch.paragraphs.forEach((text, pIdx) => {
      items.push({
        chapterName: ch.name,
        hebrewName: ch.hebrewName,
        chapterIndex: chIdx,
        totalChapters: chapters.length,
        paragraphIndex: pIdx,
        totalInChapter: ch.paragraphs.length,
        text,
        status: 'pending',
        readAt: null,
      });
    });
  });

  const progress = { date: getTodayDate(), mode, items };
  store.set('todayProgress', progress);
  return progress;
}

/** Returns the next pending or skipped item (for display), or null if all done */
function getNextItem() {
  const progress = getTodayProgress();
  if (!progress || !progress.items) return null;
  return progress.items.find(it => it.status === 'pending' || it.status === 'skipped') || null;
}

/** Mark the first pending/skipped item with the given status. Returns updated progress. */
function markCurrentItemStatus(status) {
  const progress = getTodayProgress();
  if (!progress) return null;

  const item = progress.items.find(it => it.status === 'pending' || it.status === 'skipped');
  if (!item) return progress;

  item.status = status;
  if (status === 'read') item.readAt = new Date().toISOString();

  store.set('todayProgress', progress);
  updateHistory(progress);
  return progress;
}

function updateHistory(progress) {
  const history = store.get('history') || [];
  const today = getTodayDate();
  const idx = history.findIndex(h => h.date === today);

  const totalItems = progress.items.length;
  const readCount  = progress.items.filter(it => it.status === 'read').length;

  const record = {
    date: today,
    totalChapters: progress.items.length > 0 ? progress.items[progress.items.length - 1].totalChapters : 1,
    items: progress.items.map(it => ({
      hebrewName: it.hebrewName,
      chapterIndex: it.chapterIndex,
      paragraphIndex: it.paragraphIndex,
      status: it.status,
      readAt: it.readAt,
    })),
    readCount,
    totalItems,
    completed: readCount === totalItems,
  };

  if (idx >= 0) history[idx] = record;
  else history.unshift(record);

  store.set('history', history.slice(0, 365));
}

// ──────────────────────────────────────────────
// Dim helpers — darken all screens except the active one
// ──────────────────────────────────────────────
function showDimScreens(activeDisplay) {
  destroyDimScreens(); // clear any previous
  const allDisplays = screen.getAllDisplays();
  for (const display of allDisplays) {
    if (display.id === activeDisplay.id) continue;
    const { x, y, width, height } = display.bounds;
    const win = new BrowserWindow({
      x, y, width, height,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      hasShadow: false,
      focusable: false,
      webPreferences: { contextIsolation: true, nodeIntegration: false },
      show: false,
    });
    win.setAlwaysOnTop(true, 'screen-saver');
    win.setIgnoreMouseEvents(true); // don't steal clicks
    // Inject a simple dark overlay via data URL
    win.loadURL('data:text/html,<style>*{margin:0;padding:0}html,body{width:100vw;height:100vh;background:rgba(0,0,0,0.65);}</style>');
    win.once('ready-to-show', () => win.show());
    dimWindows.push(win);
  }
}

function destroyDimScreens() {
  for (const win of dimWindows) {
    if (win && !win.isDestroyed()) win.close();
  }
  dimWindows = [];
}

// ──────────────────────────────────────────────
// Windows
// ──────────────────────────────────────────────
function createDashboardWindow() {
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.focus();
    return;
  }

  dashboardWindow = new BrowserWindow({
    width: 420,
    height: 720,
    resizable: false,
    titleBarStyle: 'hiddenInset',
    vibrancy: 'under-window',
    visualEffectState: 'active',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  dashboardWindow.loadFile(path.join(__dirname, 'src', 'dashboard', 'index.html'));

  dashboardWindow.once('ready-to-show', () => {
    dashboardWindow.show();
    dashboardWindow.focus();
  });

  dashboardWindow.on('closed', () => { dashboardWindow = null; });

  // Position near tray icon
  if (tray) {
    const tb = tray.getBounds();
    const wb = dashboardWindow.getBounds();
    dashboardWindow.setPosition(
      Math.round(tb.x + tb.width / 2 - wb.width / 2),
      Math.round(tb.y + tb.height + 4)
    );
  }
}

async function showOverlay(itemData) {
  // Find the display the user is currently working on (where the mouse cursor is)
  const cursorPos = screen.getCursorScreenPoint();
  const currentDisplay = screen.getDisplayNearestPoint(cursorPos);
  const { x, y, width, height } = currentDisplay.bounds;

  if (overlayWindow && !overlayWindow.isDestroyed()) {
    // Move existing overlay to the current display and refresh dims
    overlayWindow.setBounds({ x, y, width, height });
    overlayWindow.webContents.send('chapter-data', itemData);
    overlayWindow.focus();
    showDimScreens(currentDisplay);
    return;
  }

  overlayWindow = new BrowserWindow({
    width, height,
    x, y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.loadFile(path.join(__dirname, 'src', 'overlay', 'index.html'));

  overlayWindow.once('ready-to-show', () => {
    overlayWindow.show();
    overlayWindow.focus();
    overlayWindow.webContents.send('chapter-data', itemData);
    showDimScreens(currentDisplay);
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
    destroyDimScreens();
  });
}

// ──────────────────────────────────────────────
// Scheduler — Smart interval based on remaining items & hours at computer
// ──────────────────────────────────────────────

/**
 * Calculate a smart random interval (ms) based on:
 *  - hoursPerDay: how many hours/day the user sits at the computer
 *  - remainingItems: how many halakhot still need to be read today
 *
 * Goal: spread the remaining sessions across the day but finish ASAP.
 * The "ideal" gap = (hoursPerDay * 60) / remainingItems minutes.
 * We randomise ±30% around that gap so it feels natural.
 * Hard floor: 5 min.  Hard ceiling: 90 min.
 */
function getSmartInterval() {
  const s = store.get('settings');
  const hours = Math.max(1, s.hoursPerDay || 8);

  // Count remaining items (pending or skipped)
  const progress = getTodayProgress();
  const remaining = progress
    ? progress.items.filter(it => it.status === 'pending' || it.status === 'skipped').length
    : 1;  // fallback before first fetch

  // Ideal gap in minutes
  const totalMinutes = hours * 60;
  const idealMinutes = remaining > 0 ? totalMinutes / remaining : totalMinutes;

  // ±30% jitter, then clamp
  const jitter  = 0.3;
  const minGap  = Math.max(5,  idealMinutes * (1 - jitter));
  const maxGap  = Math.min(90, idealMinutes * (1 + jitter));

  const minutes = minGap + Math.random() * (maxGap - minGap);
  console.log(
    `Smart interval: ${remaining} items left, ${hours}h/day → ideal ${Math.round(idealMinutes)}m, ` +
    `next in ~${Math.round(minutes)}m`
  );
  return Math.round(minutes * 60 * 1000);
}

function scheduleNext() {
  if (scheduler)     clearTimeout(scheduler);
  if (postponeTimer) clearTimeout(postponeTimer);

  const s = store.get('settings');
  if (!s.active || !isSchedulerActive) return;

  const delay = getSmartInterval();
  console.log(`Next show in ${Math.round(delay / 60000)} minutes`);
  scheduler = setTimeout(triggerShow, delay);
}

async function triggerShow() {
  const s = store.get('settings');

  let progress = getTodayProgress();

  if (!progress) {
    const chapters = await fetchTodayRambam(s.mode);
    if (!chapters || chapters.length === 0) {
      console.error('Failed to fetch chapters');
      scheduleNext();
      return;
    }
    progress = initTodayProgress(chapters, s.mode);
  }

  const item = getNextItem();
  if (!item) {
    console.log('All halakhot done for today');
    scheduleNext();
    return;
  }

  const readCount  = progress.items.filter(it => it.status === 'read').length;
  const totalItems = progress.items.length;

  await showOverlay({
    item,
    itemIndex:  progress.items.indexOf(item),
    totalItems,
    readCount,
  });
  // Don't schedule next until user interacts
}

// ──────────────────────────────────────────────
// Tray
// ──────────────────────────────────────────────
function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'trayTemplate.png'));
  tray = new Tray(icon);
  tray.setToolTip('רמב"ם יומי');
  updateTrayMenu();
  tray.on('click', () => createDashboardWindow());
}

function updateTrayMenu() {
  if (!tray) return;
  const s = store.get('settings');
  const active = s.active && isSchedulerActive;

  let statusLabel = '📖 ממתין לשיעור הראשון';
  const progress = getTodayProgress();
  if (progress && progress.items) {
    const read  = progress.items.filter(it => it.status === 'read').length;
    const total = progress.items.length;
    statusLabel = read === total && total > 0
      ? `✅ סיימתי להיום! (${total} הלכות)`
      : `📖 ${read}/${total} הלכות נקראו`;
  }

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: statusLabel, enabled: false },
    { type: 'separator' },
    { label: '📖 פתח הגדרות', click: createDashboardWindow },
    { label: active ? '⏸ השהה תזמון' : '▶️ הפעל תזמון', click: toggleScheduler },
    { label: '⚡ הצג עכשיו', click: triggerShow },
    { type: 'separator' },
    { label: '✕ יציאה', click: () => app.quit() },
  ]));
}

function toggleScheduler() {
  isSchedulerActive = !isSchedulerActive;
  const s = store.get('settings');
  s.active = isSchedulerActive;
  store.set('settings', s);
  isSchedulerActive ? scheduleNext() : (clearTimeout(scheduler), clearTimeout(postponeTimer));
  updateTrayMenu();
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.webContents.send('status-update', { active: isSchedulerActive });
  }
}

// ──────────────────────────────────────────────
// IPC Handlers
// ──────────────────────────────────────────────
ipcMain.handle('get-settings', () => store.get('settings'));

ipcMain.handle('save-settings', (_, settings) => {
  const prevSettings = store.get('settings');
  store.set('settings', settings);
  isSchedulerActive = settings.active;

  // If mode changed, clear today's progress so it gets re-fetched with the new mode
  if (prevSettings.mode !== settings.mode) {
    store.set('todayProgress', null);
    console.log(`Mode changed from ${prevSettings.mode} to ${settings.mode} — clearing today's progress`);
  }

  settings.active ? scheduleNext() : clearTimeout(scheduler);
  updateTrayMenu();
  return true;
});

ipcMain.handle('get-today-status', () => {
  const progress = getTodayProgress();
  if (!progress || !progress.items) return { date: getTodayDate(), items: [], allDone: false };
  const allDone = progress.items.every(it => it.status === 'read') && progress.items.length > 0;
  return { ...progress, allDone };
});

ipcMain.handle('get-history', () => store.get('history') || []);

ipcMain.handle('get-chapter', async () => {
  const s = store.get('settings');
  let progress = getTodayProgress();
  if (!progress) {
    const chapters = await fetchTodayRambam(s.mode);
    if (!chapters) return null;
    progress = initTodayProgress(chapters, s.mode);
  }
  return progress;
});

ipcMain.handle('mark-read', async () => {
  const progress = markCurrentItemStatus('read');
  if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.close();
  updateTrayMenu();

  if (progress) {
    const allDone = progress.items.every(it => it.status === 'read');
    if (allDone && dashboardWindow && !dashboardWindow.isDestroyed()) {
      dashboardWindow.webContents.send('status-update', { allDone: true, progress });
    }
  }
  scheduleNext();
  return progress;
});

ipcMain.handle('mark-skipped', async () => {
  const progress = markCurrentItemStatus('skipped');
  if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.close();
  updateTrayMenu();
  scheduleNext();
  return progress;
});

ipcMain.handle('mark-postpone', async () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.close();
  if (postponeTimer) clearTimeout(postponeTimer);
  postponeTimer = setTimeout(triggerShow, 5 * 60 * 1000);
  return true;
});

ipcMain.handle('toggle-scheduler', () => {
  toggleScheduler();
  return isSchedulerActive;
});

ipcMain.handle('trigger-now', async () => {
  await triggerShow();
  return true;
});

ipcMain.handle('reset-today', () => {
  store.set('todayProgress', null);
  updateTrayMenu();
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.webContents.send('status-update', { reset: true });
  }
  return true;
});

// ──────────────────────────────────────────────
// App Lifecycle
// ──────────────────────────────────────────────
app.whenReady().then(() => {
  // Set app icon
  const appIcon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png'));
  if (app.dock) {
    app.dock.setIcon(appIcon);
    app.dock.hide();
  }
  createTray();
  scheduleNext();
  setTimeout(() => createDashboardWindow(), 500);
});

app.on('window-all-closed', e => e.preventDefault());

app.on('before-quit', () => {
  clearTimeout(scheduler);
  clearTimeout(postponeTimer);
});
