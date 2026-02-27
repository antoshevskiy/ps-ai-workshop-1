const TILE_W = 56;
const TILE_H = 72;
const GAP = 6;
const LAYER_OFFSET = 6;

const TYPE_POOL = [
  "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9",
  "C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9",
  "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9",
  "W1", "W2", "W3", "W4", "N", "E", "S", "R"
];

const LAYOUT = [
  { z: 0, x0: 0, x1: 11, y0: 0, y1: 5 },
  { z: 1, x0: 2, x1: 9, y0: 1, y1: 4 },
  { z: 2, x0: 4, x1: 7, y0: 2, y1: 3 }
];

const boardEl = document.getElementById("board");
const pairsLeftEl = document.getElementById("pairsLeft");
const movesCountEl = document.getElementById("movesCount");
const timerEl = document.getElementById("timer");
const statusEl = document.getElementById("status");

const newGameBtn = document.getElementById("newGameBtn");
const hintBtn = document.getElementById("hintBtn");
const shuffleBtn = document.getElementById("shuffleBtn");

let tiles = [];
let selectedId = null;
let moves = 0;
let timerId = null;
let seconds = 0;

function shuffled(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildPositions() {
  const positions = [];
  for (const layer of LAYOUT) {
    for (let y = layer.y0; y <= layer.y1; y += 1) {
      for (let x = layer.x0; x <= layer.x1; x += 1) {
        positions.push({ x, y, z: layer.z });
      }
    }
  }
  return positions;
}

function resetTimer() {
  clearInterval(timerId);
  seconds = 0;
  timerEl.textContent = "00:00";
  timerId = setInterval(() => {
    seconds += 1;
    const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
    const ss = String(seconds % 60).padStart(2, "0");
    timerEl.textContent = `${mm}:${ss}`;
  }, 1000);
}

function isRemoved(tile) {
  return tile.removed === true;
}

function hasTop(tile) {
  return tiles.some((other) => !isRemoved(other)
    && other.id !== tile.id
    && other.z > tile.z
    && other.x === tile.x
    && other.y === tile.y);
}

function hasNeighbor(tile, direction) {
  return tiles.some((other) => !isRemoved(other)
    && other.id !== tile.id
    && other.z === tile.z
    && other.y === tile.y
    && other.x === tile.x + direction);
}

function isFree(tile) {
  if (isRemoved(tile) || hasTop(tile)) {
    return false;
  }
  const leftBlocked = hasNeighbor(tile, -1);
  const rightBlocked = hasNeighbor(tile, 1);
  return !(leftBlocked && rightBlocked);
}

function availablePairs() {
  const freeTiles = tiles.filter((tile) => !isRemoved(tile) && isFree(tile));
  const grouped = new Map();
  for (const tile of freeTiles) {
    if (!grouped.has(tile.type)) {
      grouped.set(tile.type, []);
    }
    grouped.get(tile.type).push(tile);
  }

  const pairs = [];
  for (const [, group] of grouped) {
    if (group.length >= 2) {
      pairs.push([group[0], group[1]]);
    }
  }
  return pairs;
}

function updateHeader() {
  const left = tiles.filter((t) => !isRemoved(t)).length / 2;
  pairsLeftEl.textContent = String(left);
  movesCountEl.textContent = String(moves);
}

function setStatus(text) {
  statusEl.textContent = text;
}

function renderTile(tile) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "tile";
  el.dataset.id = String(tile.id);
  el.textContent = tile.type;

  el.style.left = `${tile.x * (TILE_W + GAP) + tile.z * LAYER_OFFSET + 10}px`;
  el.style.top = `${tile.y * (TILE_H + GAP) - tile.z * LAYER_OFFSET + 10}px`;
  el.style.zIndex = String(10 + tile.z);

  el.addEventListener("click", () => onTileClick(tile.id));
  tile.el = el;
  boardEl.appendChild(el);
}

function updateTileStates() {
  for (const tile of tiles) {
    if (isRemoved(tile)) {
      continue;
    }
    tile.el.classList.remove("selected", "free", "blocked", "hint");
    if (tile.id === selectedId) {
      tile.el.classList.add("selected");
    }
    tile.el.classList.add(isFree(tile) ? "free" : "blocked");
  }
}

function finishIfNeeded() {
  const remaining = tiles.filter((tile) => !isRemoved(tile));
  if (remaining.length === 0) {
    clearInterval(timerId);
    setStatus(`Победа! Время ${timerEl.textContent}, ходов: ${moves}.`);
    return true;
  }

  if (availablePairs().length === 0) {
    setStatus("Свободных пар нет. Нажмите 'Перемешать'.");
  }
  return false;
}

function removePair(first, second) {
  first.removed = true;
  second.removed = true;
  first.el.classList.add("hide");
  second.el.classList.add("hide");

  setTimeout(() => {
    first.el.remove();
    second.el.remove();
  }, 180);
}

function onTileClick(id) {
  const tile = tiles.find((item) => item.id === id);
  if (!tile || !isFree(tile)) {
    return;
  }

  if (selectedId === null) {
    selectedId = id;
    updateTileStates();
    return;
  }

  if (selectedId === id) {
    selectedId = null;
    updateTileStates();
    return;
  }

  const selectedTile = tiles.find((item) => item.id === selectedId);
  if (!selectedTile || isRemoved(selectedTile)) {
    selectedId = null;
    updateTileStates();
    return;
  }

  if (selectedTile.type === tile.type) {
    removePair(selectedTile, tile);
    selectedId = null;
    moves += 1;
    updateHeader();
    setStatus("Пара собрана.");
    updateTileStates();
    finishIfNeeded();
    return;
  }

  selectedId = id;
  updateTileStates();
}

function assignTypes(positions) {
  const pairCount = positions.length / 2;
  const neededTypes = [];
  for (let i = 0; i < pairCount; i += 1) {
    neededTypes.push(TYPE_POOL[i % TYPE_POOL.length]);
  }
  const shuffledPairs = shuffled([...neededTypes, ...neededTypes]);

  return positions.map((pos, i) => ({
    id: i + 1,
    x: pos.x,
    y: pos.y,
    z: pos.z,
    type: shuffledPairs[i],
    removed: false,
    el: null
  }));
}

function renderBoard() {
  boardEl.textContent = "";
  const maxX = Math.max(...tiles.map((t) => t.x));
  const maxY = Math.max(...tiles.map((t) => t.y));

  boardEl.style.width = `${(maxX + 1) * (TILE_W + GAP) + 80}px`;
  boardEl.style.height = `${(maxY + 1) * (TILE_H + GAP) + 80}px`;

  const sorted = [...tiles].sort((a, b) => a.z - b.z);
  for (const tile of sorted) {
    renderTile(tile);
  }

  updateTileStates();
}

function reshuffleFreeTiles() {
  const remaining = tiles.filter((tile) => !isRemoved(tile));
  if (remaining.length < 2) {
    return;
  }

  const types = shuffled(remaining.map((tile) => tile.type));
  for (let i = 0; i < remaining.length; i += 1) {
    remaining[i].type = types[i];
    remaining[i].el.textContent = types[i];
  }

  selectedId = null;
  updateTileStates();
  setStatus("Оставшиеся фишки перемешаны.");
}

function showHint() {
  const pair = availablePairs()[0];
  if (!pair) {
    setStatus("Подсказки нет: свободных пар не осталось.");
    return;
  }

  pair[0].el.classList.add("hint");
  pair[1].el.classList.add("hint");
  setStatus(`Подсказка: найдена пара ${pair[0].type}.`);

  setTimeout(() => {
    pair[0].el.classList.remove("hint");
    pair[1].el.classList.remove("hint");
  }, 1200);
}

function newGame() {
  const positions = buildPositions();
  tiles = assignTypes(positions);
  selectedId = null;
  moves = 0;

  renderBoard();
  updateHeader();
  resetTimer();

  if (availablePairs().length === 0) {
    reshuffleFreeTiles();
  }

  setStatus("Новая игра началась.");
}

newGameBtn.addEventListener("click", newGame);
hintBtn.addEventListener("click", showHint);
shuffleBtn.addEventListener("click", () => {
  reshuffleFreeTiles();
  finishIfNeeded();
});

newGame();
