const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('fetch failed ' + res.status + ' ' + url);
  return res.text();
}

async function fetchJson(url) {
  return JSON.parse(await fetchText(url));
}

// Some datamined tables use raw 64-bit integer localization hash ids that
// exceed Number.MAX_SAFE_INTEGER. JSON.parse silently rounds these, breaking
// exact-match lookups against the localization tables. This wraps any bare
// integer literal of 15+ digits in quotes before parsing so it survives as
// an exact string.
function parseJsonBigIntSafe(text) {
  const safe = text.replace(/([:\[,]\s*)(-?\d{15,})(\s*[,\]\}])/g, '$1"$2"$3');
  return JSON.parse(safe);
}

async function fetchJsonBigIntSafe(url) {
  return parseJsonBigIntSafe(await fetchText(url));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function downloadImage(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) return false;
  const buf = Buffer.from(await res.arrayBuffer());
  ensureDir(path.dirname(destPath));
  fs.writeFileSync(destPath, buf);
  return true;
}

function readExistingCharacters(gameId) {
  const p = path.join(PROJECT_ROOT, 'data', 'games', gameId, 'characters.json');
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeCharactersJson(gameId, characters) {
  const dir = path.join(PROJECT_ROOT, 'data', 'games', gameId);
  ensureDir(dir);
  const p = path.join(dir, 'characters.json');
  const json = JSON.stringify(characters, null, 2) + '\n';
  JSON.parse(json); // validate before writing
  fs.writeFileSync(p, json, 'utf8');
  return p;
}

function imagesDir(gameId) {
  return path.join(PROJECT_ROOT, 'assets', 'images', gameId);
}

module.exports = {
  PROJECT_ROOT,
  fetchText,
  fetchJson,
  parseJsonBigIntSafe,
  fetchJsonBigIntSafe,
  ensureDir,
  downloadImage,
  readExistingCharacters,
  writeCharactersJson,
  imagesDir
};
