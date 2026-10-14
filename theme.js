// Template - a starting point for a VPinFE 3.0 theme.
//
// This file does four things, in this order: read the options, draw the list, draw the
// selection, and hand every message to core. Everything else a front end needs is core's:
// stepping and paging, the menu, audio, preloading the neighbors, the loading indicator,
// attract mode, turning the page for a sideways screen, and the backglass and score view
// pages. Nothing here reads a key or a button, picks a media file, or counts around the
// wheel. If you find yourself writing any of that, check the README for the setting that
// hands it to you or turns it off.

const vpin = new VPinFECore();
window.vpin = vpin;                  // core and its overlays look for this name
window.receiveEvent = receiveEvent;  // core delivers every message through this one

start();

async function start() {
  vpin.init();
  await vpin.ready;                  // the tables, the options and the layout are in

  // Input. Core moves the wheel, pages it and opens the menu and the collection picker.
  // The one action it leaves to a theme is select, because launching is the theme's call.
  vpin.registerInputHandler((action) => {
    if (action === "select") vpin.launchTable(vpin.getCurrentTableIndex());
  });

  // The English here shows when no locales file has the key.
  listEl.setAttribute("aria-label", vpin.t("theme.tables", "Tables"));

  draw({ reason: "enter" });
  document.body.dataset.ready = "true";
}

// --- 1. Options ---------------------------------------------------------------------
// options.json declares them and carries their defaults; core merges in what the person
// chose. Dotted keys arrive nested. Read them where they are used, not once, so the
// number always matches what the person sees.

function option(key, fallback) {
  const value = vpin.themeConfig ? vpin.themeConfig[key] : undefined;
  return value === undefined ? fallback : value;
}

// --- 2. The list --------------------------------------------------------------------
// activeList() is the list core is moving - the wheel, unless the theme has opened the
// collection picker, which Template does not. indexAfter(n) is core's wrap-around: it is
// the reason this file has no modulo.

const listEl = document.getElementById("list");

function drawList(list, motion, direction) {
  const rows = Math.max(1, Number(option("rows", 7)) || 7);
  // A list shorter than the rows shows each entry once, the selected one as near the
  // middle as the count allows.
  const shown = Math.min(rows, list.length);
  const before = Math.min(Math.floor(rows / 2), Math.floor((shown - 1) / 2));
  const after = shown - 1 - before;

  listEl.replaceChildren();
  // The CSS slides the rows when motion is "slide" and draws them in place when it is
  // "cut"; direction says which way.
  listEl.dataset.motion = motion;
  listEl.dataset.direction = direction;

  for (let offset = -before; offset <= after; offset++) {
    const index = list.indexAfter(offset);
    const row = document.createElement("li");
    row.dataset.offset = String(offset);
    if (offset === 0) row.setAttribute("aria-current", "true");

    const label = document.createElement("span");
    label.textContent = labelOf(list, index);
    row.appendChild(label);
    listEl.appendChild(row);
  }
}

// A table's name is display-ready: a name the person set has already replaced the
// original, and a leading "The" has moved to the end.
function labelOf(list, index) {
  const item = list.items[index];
  return item ? item.game.name : "";
}

// --- 3. The selection ---------------------------------------------------------------
// Everything about the selected table is on its entry: entry.game is the game,
// entry.table is the .vpx file that plays it, entry.media lists the kinds of art that
// have a file. The art behind the page is not drawn here - the data-vpin-media element in
// index_playfield.html is filled by core.

const wheelEl = document.getElementById("wheel");
const nameEl = document.getElementById("name");
const detailsEl = document.getElementById("details");
const emptyEl = document.getElementById("empty");

function drawSelection(list) {
  const empty = list.length === 0;
  emptyEl.hidden = !empty;
  emptyEl.textContent = vpin.t("frontend.theme.no_tables_found", "No tables found");
  document.getElementById("selection").hidden = empty;
  if (empty) return;

  const entry = list.current;
  nameEl.textContent = entry.game.name;

  // Ask for a kind only when the entry says it has one. The URL is the same whichever
  // file answered, and a kind with no file is simply absent from entry.media.
  const hasWheel = entry.media.includes("wheel");
  wheelEl.hidden = !hasWheel;
  if (hasWheel) wheelEl.src = vpin.getMediaURL(list.cursor, "wheel");

  detailsEl.hidden = !option("showDetails", true);
  detailsEl.textContent = [
    entry.game.manufacturer,
    entry.game.year,
    entry.table.authors.join(", "),
  ].filter(Boolean).join(" · ");
}

// --- 4. Messages --------------------------------------------------------------------
// Core needs to see every message first: it keeps the selection, the audio and the
// loading indicator in step with them. After that the theme draws.
//
// TableIndexUpdate is the wheel moving. reason says why - "step" is one press and slides,
// "page" is a jump to another letter and cuts. TableDataChange is a new list, and core
// has already filled in message.index by the time handleEvent returns.

async function receiveEvent(message) {
  await vpin.handleEvent(message);

  if (message.type === "TableIndexUpdate") {
    draw(message);
  } else if (message.type === "TableDataChange") {
    draw({ reason: "enter" });
  }
}

function draw(message) {
  const list = vpin.activeList();
  const slide = message.reason === "step" && message.direction;
  drawList(list, slide ? "slide" : "cut", slide ? message.direction : "");
  drawSelection(list);
}
