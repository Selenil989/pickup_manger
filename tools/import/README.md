# Import Pipeline

Regenerates `data/games/{gameId}/characters.json` and `assets/images/{gameId}/`
from third-party structured game-data mirrors, instead of hand-curating or
scraping wikis one character at a time.

## Running an import

```
node tools/import/import_hsr.js
node tools/import/import_wuwa.js
```

`import_endfield.js` needs its source data extracted once first (the release
asset is a zip, and this environment has no unzip library):

```
curl -sL "https://github.com/3aKHP/EndFieldGameData/releases/download/v0.3.0/endfield-tables.zip" -o /tmp/endfield-tables.zip
unzip -o -q /tmp/endfield-tables.zip -d tools/import/.cache/endfield-tables
node tools/import/import_endfield.js
```

Re-running an import script fully overwrites that game's `characters.json`
and re-downloads its images — this is how a new character release gets
picked up: bump nothing, just re-run once the upstream source has updated.

## Sources per game

| Game | Source | Why |
|------|--------|-----|
| HSR | [Mar-7th/StarRailRes](https://github.com/Mar-7th/StarRailRes) | Community-maintained, pre-joined index (name/rarity/Path/element already resolved per locale incl. Korean), updated same-day as patches. No fan-DB or wiki was this clean. |
| WuWa | [Dimbreath/WutheringData](https://github.com/Dimbreath/WutheringData) `ConfigDB/RoleInfo.json` + `TextMap/{ko,en}` | Raw datamine (needs manual table join), but it's the only reliable structured source found — hakush.in-style aggregators were unreachable from this environment. Images come from the Fandom wiki's MediaWiki API (`action=query&prop=pageimages`), which is not blocked the way normal page rendering is. |
| Endfield | [3aKHP/EndFieldGameData](https://github.com/3aKHP/EndFieldGameData) (GitHub Release asset) | Versioned, documented mirror with Korean localization already split out. Images come from endfield.wiki.gg's MediaWiki API (`File:{Name}_icon.png` convention), since the data source itself ships no art references. |
| NTE | none found | Game is too new; no datamine/fan-DB repo exists yet. `import_nte.js` is not implemented — revisit once one appears, or fall back to manual per-character verification as was done for ZZZ. |
| ZZZ | none needed | `characters.json` was already hand-built and complete before this pipeline existed. |

## Design notes

- `import_common.js` holds the only genuinely shared logic: fetch/download
  helpers and a `parseJsonBigIntSafe` reader. Several of these datamines
  store text-localization keys as raw 64-bit integers (e.g.
  `-7078064683023630592`) that plain `JSON.parse` silently rounds to an
  imprecise float, breaking exact-match lookups against the localization
  table. The safe reader re-quotes any bare 15+ digit integer literal before
  parsing so it survives as an exact string.
- Numeric enum fields (element ids, Path codenames, weapon types, profession
  ids) are mapped to the project's lowercase-English convention inside each
  script. Where a source's meaning wasn't self-evident (e.g. WuWa's
  `WeaponType` has no lookup table in the repo at all), the mapping was
  derived empirically by cross-referencing a handful of independently
  verified characters, documented in that script's header comment — not
  guessed wholesale.
- Fields the current schema doesn't have a home for (WuWa's weapon type,
  combat role classifications like dps/healer/support) are left off rather
  than stuffed into an unrelated field or invented as a new schema key.
- `basePerformance`, `releaseDate`, and `version` are not available from any
  of these sources and are written as `null`. They were hand-curated
  guesses before the pipeline existed; re-running an import clears them.
