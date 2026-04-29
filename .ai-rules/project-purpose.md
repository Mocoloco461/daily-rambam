# Project Purpose — Rambam Daily

> Rule file for AI agents. Read this before making any changes to the codebase.

## What This App Does

**Rambam Daily** is a personal macOS menu-bar application that helps the user complete the daily Rambam (Mishneh Torah) study cycle.

It randomly prompts the user throughout the day to read one Halakha (legal paragraph) at a time, spreading the daily quota across active computer hours.

## Study Modes

| Mode | Description | API field |
|------|-------------|-----------|
| `1` | 1 chapter/day (the standard 3-year cycle) | `dailyRambam` |
| `3` | 3 chapters/day (the 1-year cycle) | `dailyRambam3` |

## External APIs

### TorahCalc
- **Endpoint:** `https://www.torahcalc.com/api/dailylearning`
- **Purpose:** Returns today's Rambam chapter(s) with name and Sefaria URL.
- **Response fields used:** `data.dailyRambam` and `data.dailyRambam3`

### Sefaria
- **Endpoint:** `https://www.sefaria.org/api/texts/{path}?lang=he&commentary=0`
- **Purpose:** Returns the Hebrew text (array of paragraphs) for a given chapter.
- **URL conversion:** Strip `https://www.sefaria.org/` → prefix with `https://www.sefaria.org/api/texts/`, decode `%2C` → `,`, drop `?lang=bi`.

## Scheduling Logic

- Settings store `hoursPerDay` (default: 8) — estimated active computer hours/day.
- `getSmartInterval()` computes: `(hoursPerDay × 60) / remainingItems` minutes, with ±30% jitter.
- Hard floor: **5 min**. Hard ceiling: **90 min**.
- Postpone: snoozes the overlay by exactly **5 minutes**.

## UI Flow

1. Tray icon lives in the macOS menu bar (template PNG).
2. Clicking the tray opens the **Dashboard** (settings + daily progress + history).
3. At each interval, the **Overlay** appears full-screen on the active display; other displays are dimmed.
4. User can: **Read** (mark done) → **Skip** (defer to later) → **Postpone** (+5 min).

## Data Model

```js
todayProgress = {
  date: "YYYY-MM-DD",
  mode: "1" | "3",
  items: [{
    chapterName, hebrewName,
    chapterIndex, totalChapters,
    paragraphIndex, totalInChapter,
    text,                          // single Halakha (Hebrew)
    status: "pending"|"read"|"skipped",
    readAt: null | ISO string
  }]
}
```

History is stored as the last 365 days of `todayProgress` summaries.

## Constraints & Non-Goals

- **macOS only.** No Windows/Linux support planned.
- **No code signing / notarisation** (personal use). DMG is ad-hoc unsigned.
- **No backend.** All data is local via `electron-store` (`~/Library/Application Support/rambam-daily`).
- **Hebrew only.** The UI and content are Hebrew. No i18n layer needed.
- Do **not** add telemetry, analytics, or external logging.
