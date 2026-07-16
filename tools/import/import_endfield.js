// Import pipeline for Arknights: Endfield.
// Source: 3aKHP/EndFieldGameData (structured JSON mirror of the live game
// client's data tables, published as a versioned GitHub Release —
// https://github.com/3aKHP/EndFieldGameData). Ships CharacterTable.json plus
// CharProfessionTable.json (role enum) and i18n/KR.json (Korean strings)
// with proper localization already split by language, so — unlike WuWa —
// no separate TextMap join by string key is needed. Name/desc fields do use
// raw 64-bit hash ids that exceed safe JS integer precision, so this script
// reads them through the same BigInt-safe parser used for WuWa.
//
// Images: this data source ships no image references at all (text-only
// tables). Portraits are instead resolved via the Endfield Talos wiki
// (endfield.wiki.gg), which follows a predictable `{EnglishName}_icon.png`
// file-naming convention.
const path = require('path');
const { parseJsonBigIntSafe, downloadImage, imagesDir, writeCharactersJson } = require('./import_common');

const RELEASE_ASSET = 'https://github.com/3aKHP/EndFieldGameData/releases/download/v0.3.0/endfield-tables.zip';
const WIKI_API = 'https://endfield.wiki.gg/api.php';

const PROFESSION_MAP = { 0: 'guard', 2: 'defender', 4: 'support', 5: 'caster', 7: 'vanguard', 8: 'striker' };
const CHARTYPE_MAP = { Physical: 'physical', Fire: 'fire', Natural: 'nature', Cryst: 'ice', Pulse: 'electric' };

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

async function fetchWikiIconUrl(engName) {
  const title = 'File:' + engName.replace(/\s+/g, '_') + '_icon.png';
  const url = WIKI_API + '?action=query&titles=' + encodeURIComponent(title) + '&prop=imageinfo&iiprop=url&format=json';
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const j = await res.json();
    const page = Object.values(j.query.pages)[0];
    return page && page.imageinfo ? page.imageinfo[0].url : null;
  } catch (e) {
    return null;
  }
}

async function main() {
  // This module's dependency-free environment has no unzip library, so the
  // release zip is extracted up front via the shell (see run instructions in
  // tools/import/README.md); this script reads the already-extracted files.
  const fs = require('fs');
  const extractDir = path.join(__dirname, '.cache', 'endfield-tables');
  if (!fs.existsSync(path.join(extractDir, 'tables', 'CharacterTable.json'))) {
    throw new Error(
      'Extracted data not found at ' + extractDir + '.\n' +
      'Download+extract first:\n' +
      '  curl -sL "' + RELEASE_ASSET + '" -o /tmp/endfield-tables.zip\n' +
      '  unzip -o -q /tmp/endfield-tables.zip -d "' + extractDir + '"'
    );
  }

  const charTable = parseJsonBigIntSafe(fs.readFileSync(path.join(extractDir, 'tables', 'CharacterTable.json'), 'utf8'));
  const kr = parseJsonBigIntSafe(fs.readFileSync(path.join(extractDir, 'i18n', 'KR.json'), 'utf8'));

  const imgDir = imagesDir('endfield');
  const characters = [];
  const seenEngNames = new Set();
  const unmappedProfessions = new Set();
  const unmappedTypes = new Set();
  let imagesDownloaded = 0;

  for (const c of Object.values(charTable)) {
    if (seenEngNames.has(c.engName)) continue; // dedupe player-avatar gender variants (e.g. Endministrator)
    seenEngNames.add(c.engName);

    const characterId = slugify(c.engName);
    const nameKo = kr[c.name.id] || null;

    if (!(c.profession in PROFESSION_MAP)) unmappedProfessions.add(c.profession);
    if (!(c.charTypeId in CHARTYPE_MAP)) unmappedTypes.add(c.charTypeId);

    characters.push({
      id: characterId,
      name: c.engName,
      nameKo: nameKo,
      gameId: 'endfield',
      rarity: c.rarity,
      role: PROFESSION_MAP[c.profession] || null,
      element: CHARTYPE_MAP[c.charTypeId] || null,
      specialElement: null,
      image: characterId + '.png',
      basePerformance: null,
      releaseDate: null,
      isReleased: true
    });

    const iconUrl = await fetchWikiIconUrl(c.engName);
    if (iconUrl) {
      const ok = await downloadImage(iconUrl, path.join(imgDir, characterId + '.png'));
      if (ok) imagesDownloaded++;
    }
  }

  characters.sort((a, b) => a.id.localeCompare(b.id));
  const outPath = writeCharactersJson('endfield', characters);

  console.log('Endfield import complete.');
  console.log('Characters:', characters.length);
  console.log('Images downloaded:', imagesDownloaded, '/', characters.length, '->', imgDir);
  console.log('Written to:', outPath);
  if (unmappedProfessions.size) console.log('Unmapped profession ids (role left null):', [...unmappedProfessions]);
  if (unmappedTypes.size) console.log('Unmapped charType ids (element left null):', [...unmappedTypes]);
}

main().catch(err => { console.error('Endfield import failed:', err); process.exit(1); });
