// Import pipeline for Wuthering Waves.
// Source: Dimbreath/WutheringData (raw datamined ConfigDB + TextMap tables,
// mirrored from the live game client — https://github.com/Dimbreath/WutheringData).
// Unlike StarRailRes, this source ships raw config tables rather than a
// pre-joined character index, so this script performs the join itself:
// RoleInfo.json (stats/ids) -> TextMap/{ko,en}/MultiText.json (string-key
// localization lookup) -> project characters.json.
//
// Element/weapon numeric ids are not documented in a lookup table in this
// repo. Element ids were derived from their icon filenames (ElementInfo.json
// icon path literally encodes the element, e.g. "IconElementIce1" = Ice).
// Weapon type ids have no such self-describing table, so they were
// determined empirically by cross-referencing several characters with
// independently verified real weapon types (Calcharo=Broadblade,
// Yinlin/Encore/Verina=Rectifier, Chixia/Carlotta=Pistols), then resolving
// the remaining two ids (Sword, Gauntlets) by elimination. Stored as a
// `weaponType` field alongside the existing schema fields (additive only).
//
// The playable-avatar "Rover" is 6 separate RoleInfo entries (3 elements x
// male/female) that all share the display name "Rover: <Element>" — see
// characterId() below for how these are disambiguated into distinct ids.
const path = require('path');
const { fetchText, fetchJson, parseJsonBigIntSafe, downloadImage, imagesDir, writeCharactersJson } = require('./import_common');

const DATA_BASE = 'https://raw.githubusercontent.com/Dimbreath/WutheringData/master';
const WIKI_API = 'https://wutheringwaves.fandom.com/api.php';

const ELEMENT_MAP = { 0: 'neutral', 1: 'glacio', 2: 'fusion', 3: 'electro', 4: 'aero', 5: 'spectro', 6: 'havoc' };
const WEAPON_MAP = { 1: 'broadblade', 2: 'sword', 3: 'pistols', 4: 'gauntlets', 5: 'rectifier' };

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

// The playable-avatar "Rover" exists as 6 distinct RoleInfo entries (3
// elements x male/female), all sharing the display name "Rover: <Element>".
// A plain name-based slug collapses all 6 into one id, so Rover is
// disambiguated using RoleBody ("MaleM"/"FemaleM") instead.
function characterId(nameEn, roleBody) {
  const isRover = /^Rover:/i.test(nameEn);
  if (isRover) {
    const element = nameEn.split(':')[1].trim().toLowerCase();
    const gender = /^female/i.test(roleBody) ? 'female' : 'male';
    return 'rover_' + element + '_' + gender;
  }
  return slugify(nameEn.replace(/[·:].*$/, '').trim());
}

async function fetchWikiImageUrl(title) {
  const url = WIKI_API + '?action=query&titles=' + encodeURIComponent(title) +
    '&prop=pageimages&piprop=original&format=json';
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const j = await res.json();
    const pages = j.query && j.query.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0];
    return page && page.original ? page.original.source : null;
  } catch (e) {
    return null;
  }
}

async function main() {
  const [roleInfoText, koText, enText] = await Promise.all([
    fetchText(DATA_BASE + '/ConfigDB/RoleInfo.json'),
    fetchText(DATA_BASE + '/TextMap/ko/MultiText.json'),
    fetchText(DATA_BASE + '/TextMap/en/MultiText.json')
  ]);

  const roles = parseJsonBigIntSafe(roleInfoText).filter(c => c.RoleType === 1);
  const ko = JSON.parse(koText);
  const en = JSON.parse(enText);

  const imgDir = imagesDir('wuwa');
  const characters = [];
  const unmappedElements = new Set();
  const unmappedWeapons = new Set();
  let imagesDownloaded = 0;

  for (const c of roles) {
    const nameEn = en['RoleInfo_' + c.Id + '_Name'];
    const nameKo = ko['RoleInfo_' + c.Id + '_Name'];
    if (!nameEn) continue;

    const id = characterId(nameEn, c.RoleBody) || String(c.Id);
    const isRover = /^Rover:/i.test(nameEn);

    if (!(c.ElementId in ELEMENT_MAP)) unmappedElements.add(c.ElementId);
    if (!(c.WeaponType in WEAPON_MAP)) unmappedWeapons.add(c.WeaponType);

    characters.push({
      id: id,
      name: nameEn,
      nameKo: nameKo || null,
      gameId: 'wuwa',
      rarity: c.QualityId,
      role: null,
      element: ELEMENT_MAP[c.ElementId] || null,
      specialElement: null,
      weaponType: WEAPON_MAP[c.WeaponType] || null,
      image: id + '.webp',
      basePerformance: null,
      releaseDate: null,
      isReleased: true
    });

    // The wiki has no per-element/gender Rover sub-pages, only one shared
    // "Rover" page — every Rover variant intentionally resolves to that
    // single image rather than failing 6 separate lookups.
    const wikiTitle = isRover ? 'Rover' : nameEn.replace(/[:]/g, '');
    const imgUrl = await fetchWikiImageUrl(wikiTitle);
    if (imgUrl) {
      const ext = imgUrl.match(/\.(webp|png|jpg)(?:\/|\?|$)/i);
      const destExt = ext ? ext[1].toLowerCase() : 'webp';
      const ok = await downloadImage(imgUrl, path.join(imgDir, id + '.' + destExt));
      if (ok) imagesDownloaded++;
    }
  }

  characters.sort((a, b) => a.id.localeCompare(b.id));
  const outPath = writeCharactersJson('wuwa', characters);

  console.log('WuWa import complete.');
  console.log('Characters:', characters.length);
  console.log('Images downloaded:', imagesDownloaded, '/', characters.length, '->', imgDir);
  console.log('Written to:', outPath);
  if (unmappedElements.size) console.log('Unmapped ElementId values (left null):', [...unmappedElements]);
  if (unmappedWeapons.size) console.log('Unmapped WeaponType values (weapon field not stored in current schema anyway):', [...unmappedWeapons]);
}

main().catch(err => { console.error('WuWa import failed:', err); process.exit(1); });
