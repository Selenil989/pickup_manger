// Import pipeline for Honkai: Star Rail.
// Source: Mar-7th/StarRailRes (community-maintained, actively updated mirror
// of official game data — https://github.com/Mar-7th/StarRailRes).
// Provides pre-resolved KR/EN names, rarity, Path, Element and image paths,
// so no localization-hash lookup step is needed (unlike the Endfield/WuWa
// raw datamine sources).
const path = require('path');
const { fetchJson, downloadImage, imagesDir, writeCharactersJson } = require('./import_common');

const BASE = 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master';

// Internal Path codename -> project convention (lowercase English path name).
// Mapping is well-established for the original 7 Paths; "Elation" is a Path
// introduced after our reference knowledge cutoff and is passed through
// verbatim (lowercased) rather than guessed.
const PATH_MAP = {
  Warrior: 'destruction',
  Rogue: 'hunt',
  Mage: 'erudition',
  Shaman: 'harmony',
  Warlock: 'nihility',
  Knight: 'preservation',
  Priest: 'abundance',
  Memory: 'remembrance',
  Elation: 'elation'
};

async function main() {
  const [krData, enData] = await Promise.all([
    fetchJson(BASE + '/index_min/kr/characters.json'),
    fetchJson(BASE + '/index_min/en/characters.json')
  ]);

  const ids = Object.keys(krData);
  const characters = [];
  const imgDir = imagesDir('hsr');
  let imagesDownloaded = 0;
  const unmappedPaths = new Set();

  for (const id of ids) {
    const kr = krData[id];
    const en = enData[id] || {};
    const characterId = kr.tag;
    if (!characterId) continue;

    const mappedRole = PATH_MAP[kr.path];
    if (!mappedRole) unmappedPaths.add(kr.path);

    characters.push({
      id: characterId,
      name: en.name || kr.name,
      nameKo: kr.name,
      gameId: 'hsr',
      rarity: kr.rarity,
      role: mappedRole || (kr.path || '').toLowerCase(),
      element: (kr.element || '').toLowerCase(),
      specialElement: null,
      image: characterId + '.png',
      basePerformance: null,
      releaseDate: null,
      isReleased: true
    });

    const ok = await downloadImage(BASE + '/' + kr.preview, path.join(imgDir, characterId + '.png'));
    if (ok) imagesDownloaded++;
  }

  characters.sort((a, b) => a.id.localeCompare(b.id));
  const outPath = writeCharactersJson('hsr', characters);

  console.log('HSR import complete.');
  console.log('Characters:', characters.length);
  console.log('Images downloaded:', imagesDownloaded, '->', imgDir);
  console.log('Written to:', outPath);
  if (unmappedPaths.size) console.log('Unmapped Path codenames (kept lowercase as-is):', [...unmappedPaths]);
}

main().catch(err => { console.error('HSR import failed:', err); process.exit(1); });
