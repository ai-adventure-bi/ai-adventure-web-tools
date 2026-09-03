/* Mix-a-Monster: no build step or external dependencies required. */
const DB_NAME = 'mix-a-monster-library';
const storeName = 'characters';
const HIDDEN_ENTRIES_KEY = 'mix-a-monster-hidden-entries';
let library = [];
let selected = [0, 0, 0];
const cuts = [35.5, 62.5]; // Neck and waist cuts on the compact square template.
let templateImage = null;
let templateTransform = { scale: .82, x: 0, y: 0 };
let prepCuts = [284, 500];

const $ = (selector) => document.querySelector(selector);
const status = $('#libraryStatus');
const emptyState = $('#emptyState');
function hiddenEntryIds() { try { return new Set(JSON.parse(localStorage.getItem(HIDDEN_ENTRIES_KEY) || '[]')); } catch { return new Set(); } }
function rememberRemovedEntry(id) {
  const removed = hiddenEntryIds(); removed.add(id);
  localStorage.setItem(HIDDEN_ENTRIES_KEY, JSON.stringify([...removed]));
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function savedCharacters() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName).objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}
async function saveCharacter(character) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, 'readwrite').objectStore(storeName).put(character);
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
  });
}
async function deleteCharacter(id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, 'readwrite').objectStore(storeName).delete(id);
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
  });
}
function imageReady(entry) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ ...entry, image });
    image.onerror = () => reject(new Error(`Could not load ${entry.name}`));
    image.src = entry.src;
  });
}
async function loadFolderLibrary() {
  // library/library.json is generated for static hosting; failed fetch simply means it is absent.
  try {
    const response = await fetch('library/library.json', { cache: 'no-store' });
    if (!response.ok) return [];
    const listedNames = await response.json();
    const filenames = Array.isArray(listedNames) ? listedNames : [listedNames];
    return Promise.all(filenames.map((name, i) => imageReady({ id:`folder-${i}-${name}`, name, src:`library/${encodeURIComponent(name)}` })));
  } catch { return []; }
}
async function start() {
  const [folderEntries, savedEntries] = await Promise.all([loadFolderLibrary(), savedCharacters()]);
  const saved = await Promise.all(savedEntries.map(imageReady).map(p => p.catch(() => null)));
  const removed = hiddenEntryIds();
  library = [...folderEntries, ...saved.filter(Boolean)].filter(entry => !removed.has(entry.id));
  update();
}
function update() {
  const count = library.length;
  selected = selected.map(i => count ? ((i % count) + count) % count : 0);
  status.textContent = count ? `${count} character${count === 1 ? '' : 's'} ready to mix` : 'No pictures yet — choose some to add.';
  emptyState.hidden = Boolean(count);
  for (let part = 0; part < 3; part++) drawPart(part);
  renderLibraryManager();
}
function renderLibraryManager() {
  const grid = $('#libraryGrid');
  grid.replaceChildren();
  if (!library.length) { grid.textContent = 'Your library is empty.'; return; }
  library.forEach(entry => {
    const item = document.createElement('article'); item.className = 'library-item';
    const image = document.createElement('img'); image.src = entry.src; image.alt = entry.name;
    const label = document.createElement('p'); label.title = entry.name; label.textContent = entry.name;
    item.append(image, label);
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Remove';
    remove.addEventListener('click', async () => {
      rememberRemovedEntry(entry.id);
      if (!entry.id.startsWith('folder-')) await deleteCharacter(entry.id);
      library = library.filter(character => character.id !== entry.id);
      update();
    });
    item.append(remove);
    grid.append(item);
  });
}
function drawPart(part) {
  const canvas = $(`#panel${part}`);
  const context = canvas.getContext('2d');
  if (!library.length) { canvas.width = 620; canvas.height = 110; context.clearRect(0, 0, canvas.width, canvas.height); return; }
  const image = library[selected[part]].image;
  const from = part === 0 ? 0 : cuts[part - 1] / 100;
  const to = part === 2 ? 1 : cuts[part] / 100;
  const sourceY = Math.round(image.naturalHeight * from);
  const sourceHeight = Math.max(1, Math.round(image.naturalHeight * (to - from)));
  // Preserve the original image proportions: the three canvases nest into a whole character.
  canvas.width = image.naturalWidth;
  canvas.height = sourceHeight;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, sourceY, image.naturalWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
}
function move(part, direction) { if (!library.length) return; selected[part] += direction; update(); }
document.querySelectorAll('.flap-row').forEach(row => {
  const part = Number(row.dataset.part);
  row.querySelector('.previous').addEventListener('click', () => move(part, -1));
  row.querySelector('.next').addEventListener('click', () => move(part, 1));
});
$('#shuffleButton').addEventListener('click', () => {
  if (!library.length) return;
  selected = selected.map(() => Math.floor(Math.random() * library.length));
  update();
});
function mixedMonsterDataUrl() {
  const canvas = document.createElement('canvas');
  canvas.width = 800; canvas.height = 800;
  const context = canvas.getContext('2d');
  for (let part = 0; part < 3; part++) {
    const image = library[selected[part]].image;
    const from = part === 0 ? 0 : cuts[part - 1] / 100;
    const to = part === 2 ? 1 : cuts[part] / 100;
    const sourceY = Math.round(image.naturalHeight * from);
    const sourceHeight = Math.round(image.naturalHeight * (to - from));
    const destinationY = Math.round(800 * from);
    const destinationHeight = Math.round(800 * (to - from));
    context.drawImage(image, 0, sourceY, image.naturalWidth, sourceHeight, 0, destinationY, 800, destinationHeight);
  }
  return canvas.toDataURL('image/png');
}
$('#saveMonsterButton').addEventListener('click', () => {
  if (!library.length) return;
  const link = document.createElement('a');
  link.href = mixedMonsterDataUrl(); link.download = 'my-mixed-monster.png'; link.click();
});
$('#manageButton').addEventListener('click', () => {
  const manager = $('#libraryManager'); manager.hidden = !manager.hidden;
  $('#manageButton').textContent = manager.hidden ? 'Manage library' : 'Close library';
});
$('#filePicker').addEventListener('change', async (event) => {
  const files = [...event.target.files].filter(file => file.type.startsWith('image/'));
  for (const file of files) {
    const record = { id: crypto.randomUUID(), name: file.name, src: await fileToDataUrl(file) };
    await saveCharacter(record);
    library.push(await imageReady(record));
  }
  event.target.value = '';
  update();
});
function fileToDataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }); }

// The preparation studio turns any source into the common compact 800 × 800 canvas.
const templateCanvas = $('#templateCanvas');
const templateContext = templateCanvas.getContext('2d');
function drawTemplate() {
  templateContext.clearRect(0, 0, 800, 800);
  if (!templateImage) return;
  const naturalFit = Math.min(800 / templateImage.naturalWidth, 800 / templateImage.naturalHeight);
  const scale = naturalFit * templateTransform.scale;
  const width = templateImage.naturalWidth * scale;
  const height = templateImage.naturalHeight * scale;
  templateContext.drawImage(templateImage, 400 - width / 2 + templateTransform.x, 400 - height / 2 + templateTransform.y, width, height);
}
function updateTemplateControls() {
  $('#scaleOutput').value = `${Math.round(templateTransform.scale * 100)}%`;
  $('#xOutput').value = Math.round(templateTransform.x); $('#yOutput').value = Math.round(templateTransform.y);
  drawTemplate();
}
function updatePrepGuides() {
  $('#guideCutOne').setAttribute('d', `M0 ${prepCuts[0]} H800`);
  $('#guideCutTwo').setAttribute('d', `M0 ${prepCuts[1]} H800`);
  $('#prepCutOne').value = Math.round(prepCuts[0] / 8);
  $('#prepCutTwo').value = Math.round(prepCuts[1] / 8);
  $('#prepCutOneOutput').value = `${Math.round(prepCuts[0] / 8)}%`;
  $('#prepCutTwoOutput').value = `${Math.round(prepCuts[1] / 8)}%`;
}
function setPrepCut(index, pixels) {
  const lower = index === 0 ? 190 : prepCuts[0] + 100;
  const upper = index === 0 ? prepCuts[1] - 100 : 610;
  prepCuts[index] = Math.round(Math.max(lower, Math.min(upper, pixels)));
  updatePrepGuides();
}
$('#prepPicker').addEventListener('change', async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  templateImage = await imageReady({ src: await fileToDataUrl(file), name: file.name }).then(entry => entry.image);
  templateTransform = { scale: .82, x: 0, y: 0 };
  prepCuts = [284, 500];
  $('#scaleControl').value = 82; $('#xControl').value = 0; $('#yControl').value = 0;
  $('#addPreparedButton').disabled = false; $('#downloadPreparedButton').disabled = false;
  updateTemplateControls(); event.target.value = '';
});
$('#scaleControl').addEventListener('input', e => { templateTransform.scale = Number(e.target.value) / 100; updateTemplateControls(); });
$('#xControl').addEventListener('input', e => { templateTransform.x = Number(e.target.value); updateTemplateControls(); });
$('#yControl').addEventListener('input', e => { templateTransform.y = Number(e.target.value); updateTemplateControls(); });
$('#prepCutOne').addEventListener('input', e => setPrepCut(0, Number(e.target.value) * 8));
$('#prepCutTwo').addEventListener('input', e => setPrepCut(1, Number(e.target.value) * 8));
$('#centreButton').addEventListener('click', () => { templateTransform = { scale: .82, x: 0, y: 0 }; $('#scaleControl').value = 82; $('#xControl').value = 0; $('#yControl').value = 0; updateTemplateControls(); });
const guide = $('.pose-guide');
let draggedCut = null;
guide.addEventListener('pointerdown', event => {
  const rect = guide.getBoundingClientRect();
  const y = (event.clientY - rect.top) * 800 / rect.height;
  draggedCut = Math.abs(y - prepCuts[0]) < Math.abs(y - prepCuts[1]) ? 0 : 1;
  guide.setPointerCapture(event.pointerId); setPrepCut(draggedCut, y);
});
guide.addEventListener('pointermove', event => {
  if (draggedCut === null) return;
  const rect = guide.getBoundingClientRect(); setPrepCut(draggedCut, (event.clientY - rect.top) * 800 / rect.height);
});
guide.addEventListener('pointerup', () => { draggedCut = null; });
function preparedDataUrl() {
  drawTemplate();
  const output = document.createElement('canvas'); output.width = 800; output.height = 800;
  const context = output.getContext('2d');
  const sourceBounds = [0, ...prepCuts, 800];
  const destinationBounds = [0, cuts[0] * 8, cuts[1] * 8, 800];
  for (let part = 0; part < 3; part++) {
    const sourceY = sourceBounds[part], sourceHeight = sourceBounds[part + 1] - sourceY;
    const destinationY = destinationBounds[part], destinationHeight = destinationBounds[part + 1] - destinationY;
    context.drawImage(templateCanvas, 0, sourceY, 800, sourceHeight, 0, destinationY, 800, destinationHeight);
  }
  return output.toDataURL('image/png');
}
$('#addPreparedButton').addEventListener('click', async () => {
  if (!templateImage) return;
  const record = { id: crypto.randomUUID(), name: `prepared-${Date.now()}.png`, src: preparedDataUrl() };
  await saveCharacter(record); library.push(await imageReady(record)); update();
  document.querySelector('[data-page="mixer"]').click();
});
$('#downloadPreparedButton').addEventListener('click', () => {
  if (!templateImage) return;
  const link = document.createElement('a'); link.href = preparedDataUrl(); link.download = 'flip-flap-character.png'; link.click();
});
document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
  const page = tab.dataset.page;
  document.querySelectorAll('.tab').forEach(button => button.classList.toggle('active', button === tab));
  document.querySelectorAll('.page').forEach(section => { section.hidden = section.id !== `${page}Page`; section.classList.toggle('active', !section.hidden); });
}));
updatePrepGuides();
start();
