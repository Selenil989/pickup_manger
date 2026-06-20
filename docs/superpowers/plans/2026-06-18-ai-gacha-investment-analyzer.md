# AI Gacha Investment Analyzer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pure HTML/CSS/JS local app that analyzes whether a gacha pickup character is worth pulling, based on user roster and meta data.

**Architecture:** Static JSON data files feed a pure-function evaluation engine (`evaluationEngine.js`). `app.js` owns all DOM interaction, data loading, and localStorage roster management. No backend, no build step — open `index.html` directly in any browser.

**Tech Stack:** Vanilla HTML5 / CSS3 / ES6 JavaScript. No frameworks, no npm, no bundler.

---

## File Map

| File | Responsibility |
|------|---------------|
| `data/config.json` | Weights, supported games list |
| `data/games/{game}/characters.json` | Character base data (all characters incl. unreleased) |
| `data/games/{game}/meta.json` | Meta analysis data per character |
| `data/games/{game}/banner.json` | Current pickup banner info |
| `evaluationEngine.js` | Pure evaluation functions — zero DOM, zero fetch |
| `app.js` | Data loading, localStorage roster, UI events, result rendering |
| `index.html` | HTML shell: game selector, character selector, roster panel, results panel |
| `style.css` | Dark theme, card layout, score gauges |

---

## Task 1: data/config.json

**Files:**
- Create: `data/config.json`

- [ ] **Step 1: Create config.json**

```json
{
  "version": "1.0",
  "supportedGames": ["zzz", "hsr", "wuwa", "endfield"],
  "evaluationWeights": {
    "ownPerformance":  0.25,
    "accountGrowth":   0.30,
    "futureMetaValue": 0.25,
    "replaceability":  0.10,
    "itemValue":       0.10
  },
  "itemSubWeights": {
    "characterValue":    0.50,
    "weaponValue":       0.35,
    "breakthroughValue": 0.15
  },
  "accountGrowthMethod": "mvp"
}
```

- [ ] **Step 2: Verify**

Open browser console and run:
```javascript
fetch('data/config.json').then(r => r.json()).then(d => console.log(d))
```
Expected: object with `supportedGames` array of 4 items, weights summing to 1.00.

---

## Task 2: data/games/zzz/characters.json

**Files:**
- Create: `data/games/zzz/characters.json`

- [ ] **Step 1: Create characters.json**

```json
[
  {
    "id": "velina",
    "name": "Velina",
    "gameId": "zzz",
    "rarity": 5,
    "role": "anomaly",
    "element": "wind",
    "basePerformance": 9.5,
    "releaseDate": "2026-06-01",
    "isReleased": true
  },
  {
    "id": "remiel",
    "name": "Remiel",
    "gameId": "zzz",
    "rarity": 5,
    "role": "support",
    "element": "wind",
    "basePerformance": 9.0,
    "releaseDate": "2026-09-01",
    "isReleased": false
  },
  {
    "id": "lycaon",
    "name": "Von Lycaon",
    "gameId": "zzz",
    "rarity": 5,
    "role": "stun",
    "element": "ice",
    "basePerformance": 8.5,
    "releaseDate": "2024-07-04",
    "isReleased": true
  },
  {
    "id": "jane",
    "name": "Jane Doe",
    "gameId": "zzz",
    "rarity": 5,
    "role": "anomaly",
    "element": "fire",
    "basePerformance": 8.8,
    "releaseDate": "2024-09-25",
    "isReleased": true
  },
  {
    "id": "miyabi",
    "name": "Miyabi",
    "gameId": "zzz",
    "rarity": 5,
    "role": "anomaly",
    "element": "ice",
    "basePerformance": 9.8,
    "releaseDate": "2024-12-25",
    "isReleased": true
  }
]
```

---

## Task 3: data/games/zzz/meta.json

**Files:**
- Create: `data/games/zzz/meta.json`

- [ ] **Step 1: Create meta.json**

```json
[
  {
    "version": "1.0",
    "characterId": "velina",
    "investmentType": ["meta", "future"],
    "metaScore": 9.5,
    "futureScore": 10,
    "replacementScore": 3,
    "confidence": 0.82,
    "futureLinks": [
      {
        "characterId": "remiel",
        "synergy": "Wind Core",
        "confidence": 0.9
      }
    ],
    "characterRecommendation": {
      "score": 9,
      "priority": "high",
      "reason": "명함만으로 핵심 성능 확보"
    },
    "breakthroughRecommendation": {
      "score": 5,
      "priority": "low",
      "reason": "초기 돌파 효율 낮음"
    },
    "weaponRecommendation": {
      "score": 8,
      "priority": "medium",
      "reason": "전무 효율 우수"
    },
    "pullReasons": [
      "레미엘 핵심 파츠",
      "미래 메타 가치 높음",
      "이상 계열 최상위 딜러"
    ],
    "skipReasons": [
      "현재 계정 즉시 상승량은 제한적",
      "미야비 보유 시 역할 중복"
    ],
    "sources": [
      { "name": "아카라이브", "weight": 0.4 },
      { "name": "레딧", "weight": 0.3 },
      { "name": "빌리빌리", "weight": 0.3 }
    ],
    "recommendation": {
      "pull": "recommended",
      "priority": "high"
    }
  },
  {
    "version": "1.0",
    "characterId": "remiel",
    "investmentType": ["future", "synergy"],
    "metaScore": 8.5,
    "futureScore": 9.5,
    "replacementScore": 5,
    "confidence": 0.70,
    "futureLinks": [
      {
        "characterId": "velina",
        "synergy": "Wind Core",
        "confidence": 0.9
      }
    ],
    "characterRecommendation": {
      "score": 8,
      "priority": "high",
      "reason": "벨리나와 핵심 시너지"
    },
    "breakthroughRecommendation": {
      "score": 4,
      "priority": "low",
      "reason": "돌파 효율 미검증"
    },
    "weaponRecommendation": {
      "score": 6,
      "priority": "medium",
      "reason": "서포터 전무 효율 보통"
    },
    "pullReasons": [
      "벨리나 보유 시 필수 파츠",
      "바람 계열 서포터 공백 해소"
    ],
    "skipReasons": [
      "벨리나 미보유 시 단독 가치 낮음",
      "미출시 캐릭터로 실성능 미검증"
    ],
    "sources": [
      { "name": "아카라이브", "weight": 0.5 },
      { "name": "레딧", "weight": 0.5 }
    ],
    "recommendation": {
      "pull": "optional",
      "priority": "medium"
    }
  }
]
```

---

## Task 4: data/games/zzz/banner.json

**Files:**
- Create: `data/games/zzz/banner.json`

- [ ] **Step 1: Create banner.json**

```json
{
  "gameId": "zzz",
  "updatedAt": "2026-06-18",
  "currentBanners": [
    {
      "characterId": "velina",
      "startDate": "2026-06-01",
      "endDate": "2026-06-21"
    }
  ]
}
```

---

## Task 5: Stub data files for HSR, WuWa, Endfield

**Files:**
- Create: `data/games/hsr/characters.json`
- Create: `data/games/hsr/meta.json`
- Create: `data/games/hsr/banner.json`
- Create: `data/games/wuwa/characters.json`
- Create: `data/games/wuwa/meta.json`
- Create: `data/games/wuwa/banner.json`
- Create: `data/games/endfield/characters.json`
- Create: `data/games/endfield/meta.json`
- Create: `data/games/endfield/banner.json`

- [ ] **Step 1: Create HSR files**

`data/games/hsr/characters.json`:
```json
[
  {
    "id": "firefly",
    "name": "Firefly",
    "gameId": "hsr",
    "rarity": 5,
    "role": "destruction",
    "element": "fire",
    "basePerformance": 9.2,
    "releaseDate": "2024-06-19",
    "isReleased": true
  }
]
```

`data/games/hsr/meta.json`:
```json
[
  {
    "version": "1.0",
    "characterId": "firefly",
    "investmentType": ["meta"],
    "metaScore": 9.2,
    "futureScore": 7.5,
    "replacementScore": 5,
    "confidence": 0.90,
    "futureLinks": [],
    "characterRecommendation": { "score": 9, "priority": "high", "reason": "파멸 최상위 딜러" },
    "breakthroughRecommendation": { "score": 7, "priority": "medium", "reason": "E1 이후 큰 향상" },
    "weaponRecommendation": { "score": 8, "priority": "medium", "reason": "전용 광추 효율 우수" },
    "pullReasons": ["파멸 계열 최상위 딜러"],
    "skipReasons": ["DHIL, Blade 보유 시 역할 중복"],
    "sources": [{ "name": "레딧", "weight": 1.0 }],
    "recommendation": { "pull": "recommended", "priority": "high" }
  }
]
```

`data/games/hsr/banner.json`:
```json
{ "gameId": "hsr", "updatedAt": "2026-06-18", "currentBanners": [] }
```

- [ ] **Step 2: Create WuWa files**

`data/games/wuwa/characters.json`:
```json
[
  {
    "id": "camellya",
    "name": "Camellya",
    "gameId": "wuwa",
    "rarity": 5,
    "role": "dps",
    "element": "havoc",
    "basePerformance": 9.6,
    "releaseDate": "2024-11-14",
    "isReleased": true
  }
]
```

`data/games/wuwa/meta.json`:
```json
[
  {
    "version": "1.0",
    "characterId": "camellya",
    "investmentType": ["meta"],
    "metaScore": 9.6,
    "futureScore": 8.0,
    "replacementScore": 4,
    "confidence": 0.88,
    "futureLinks": [],
    "characterRecommendation": { "score": 9, "priority": "high", "reason": "혼돈 계열 최상위" },
    "breakthroughRecommendation": { "score": 6, "priority": "medium", "reason": "S1 이후 효율 향상" },
    "weaponRecommendation": { "score": 8, "priority": "medium", "reason": "전용 무기 효율 우수" },
    "pullReasons": ["혼돈 계열 독보적 성능"],
    "skipReasons": ["Havoc Rover 보유 시 역할 일부 중복"],
    "sources": [{ "name": "레딧", "weight": 1.0 }],
    "recommendation": { "pull": "recommended", "priority": "high" }
  }
]
```

`data/games/wuwa/banner.json`:
```json
{ "gameId": "wuwa", "updatedAt": "2026-06-18", "currentBanners": [] }
```

- [ ] **Step 3: Create Endfield files**

`data/games/endfield/characters.json`:
```json
[
  {
    "id": "perlica",
    "name": "Perlica",
    "gameId": "endfield",
    "rarity": 5,
    "role": "caster",
    "element": "fire",
    "basePerformance": 8.8,
    "releaseDate": "2025-01-16",
    "isReleased": true
  }
]
```

`data/games/endfield/meta.json`:
```json
[
  {
    "version": "1.0",
    "characterId": "perlica",
    "investmentType": ["meta", "synergy"],
    "metaScore": 8.8,
    "futureScore": 8.5,
    "replacementScore": 6,
    "confidence": 0.75,
    "futureLinks": [],
    "characterRecommendation": { "score": 8, "priority": "high", "reason": "화염 캐스터 핵심" },
    "breakthroughRecommendation": { "score": 5, "priority": "low", "reason": "돌파 효율 낮음" },
    "weaponRecommendation": { "score": 7, "priority": "medium", "reason": "전용 무기 권장" },
    "pullReasons": ["화염 계열 핵심 캐스터"],
    "skipReasons": ["화염 딜러 보유 시 시너지 제한"],
    "sources": [{ "name": "아카라이브", "weight": 1.0 }],
    "recommendation": { "pull": "optional", "priority": "medium" }
  }
]
```

`data/games/endfield/banner.json`:
```json
{ "gameId": "endfield", "updatedAt": "2026-06-18", "currentBanners": [] }
```

---

## Task 6: evaluationEngine.js

**Files:**
- Create: `evaluationEngine.js`

This file has zero DOM access, zero fetch calls. Pure input-output functions only.

- [ ] **Step 1: Create evaluationEngine.js**

```javascript
const ACCOUNT_GROWTH_METHODS = {
  mvp: calculateAccountGrowth_mvp,
  synergy: null  // reserved for future implementation
};

function calculateAccountGrowth_mvp(character, meta, userRoster, allCharacters) {
  // 역할 공백 점수 (0–4): fewer same-role chars owned → higher gap
  const ownedData = userRoster.characters
    .map(rc => allCharacters.find(c => c.id === rc.characterId))
    .filter(Boolean);
  const sameRoleCount = ownedData.filter(c => c.role === character.role).length;
  const roleGapScore = Math.max(0, 4 - sameRoleCount * 2);

  // 현재 시너지 점수 (0–3): futureLinks partners user already owns
  const futureLinksIds = (meta.futureLinks || []).map(fl => fl.characterId);
  const ownedLinkCount = userRoster.characters
    .filter(rc => futureLinksIds.includes(rc.characterId)).length;
  const currentSynergyScore = Math.min(3, ownedLinkCount * 1.5);

  // 미래 시너지 기대치 (0–3): average confidence of futureLinks × 3
  const links = meta.futureLinks || [];
  const futureSynergyScore = links.length > 0
    ? (links.reduce((s, fl) => s + fl.confidence, 0) / links.length) * 3
    : 0;

  return Math.min(10, roleGapScore + currentSynergyScore + futureSynergyScore);
}

function calculateItemAverageScore(meta, itemSubWeights) {
  const charScore        = meta.characterRecommendation.score;
  const breakthroughScore = meta.breakthroughRecommendation.score;
  const weaponScore      = meta.weaponRecommendation.score;
  return (charScore        * itemSubWeights.characterValue)
       + (breakthroughScore * itemSubWeights.breakthroughValue)
       + (weaponScore       * itemSubWeights.weaponValue);
}

function calculateFinalScore(character, meta, accountGrowth, config) {
  const w = config.evaluationWeights;
  const itemScore = calculateItemAverageScore(meta, config.itemSubWeights);

  return (
    (character.basePerformance          * w.ownPerformance)  +
    (accountGrowth                       * w.accountGrowth)   +
    (meta.futureScore                    * w.futureMetaValue) +
    ((10 - meta.replacementScore)        * w.replaceability)  +
    (itemScore                           * w.itemValue)
  );
}

function getRecommendationLabel(pull) {
  const labels = {
    must_pull:   '필수 뽑기',
    recommended: '추천',
    optional:    '선택',
    skip:        '스킵'
  };
  return labels[pull] || pull;
}

function getInvestmentTypeLabel(type) {
  const labels = {
    meta:       '현재 메타',
    future:     '미래 가치',
    synergy:    '시너지',
    collection: '컬렉션'
  };
  return labels[type] || type;
}

function isCurrentPickup(characterId, banner) {
  return banner.currentBanners.some(b => b.characterId === characterId);
}

function evaluate(character, meta, userRoster, allCharacters, banner, config) {
  const growthFn = ACCOUNT_GROWTH_METHODS[config.accountGrowthMethod];
  if (!growthFn) throw new Error(`Unknown accountGrowthMethod: ${config.accountGrowthMethod}`);

  const accountGrowth = growthFn(character, meta, userRoster, allCharacters);
  const finalScore    = calculateFinalScore(character, meta, accountGrowth, config);

  return {
    character,
    meta,
    accountGrowth,
    itemAverageScore: calculateItemAverageScore(meta, config.itemSubWeights),
    finalScore: Math.round(finalScore * 10) / 10,
    isCurrentPickup: isCurrentPickup(character.id, banner),
    recommendationLabel: getRecommendationLabel(meta.recommendation.pull),
    investmentTypeLabels: meta.investmentType.map(getInvestmentTypeLabel)
  };
}
```

- [ ] **Step 2: Console-verify evaluation logic**

After `index.html` has the script tag, open browser console and run:
```javascript
// Expect: finalScore between 0 and 10, accountGrowth 0–10
const testChar = { id: 'velina', role: 'anomaly', element: 'wind', basePerformance: 9.5 };
const testMeta = {
  futureScore: 10, replacementScore: 3, confidence: 0.82,
  futureLinks: [{ characterId: 'remiel', synergy: 'Wind Core', confidence: 0.9 }],
  characterRecommendation: { score: 9 },
  breakthroughRecommendation: { score: 5 },
  weaponRecommendation: { score: 8 },
  investmentType: ['meta', 'future'],
  recommendation: { pull: 'recommended' }
};
const testRoster = { characters: [] };
const testConfig = {
  evaluationWeights: { ownPerformance: 0.25, accountGrowth: 0.30, futureMetaValue: 0.25, replaceability: 0.10, itemValue: 0.10 },
  itemSubWeights: { characterValue: 0.50, weaponValue: 0.35, breakthroughValue: 0.15 },
  accountGrowthMethod: 'mvp'
};
const testBanner = { currentBanners: [{ characterId: 'velina' }] };
const result = evaluate(testChar, testMeta, testRoster, [testChar], testBanner, testConfig);
console.log('finalScore:', result.finalScore);   // Expected: ~7.5–8.5
console.log('accountGrowth:', result.accountGrowth);  // Expected: 4+3 = 7 (no roster, no owned links, remiel confidence 0.9→2.7)
console.log('isCurrentPickup:', result.isCurrentPickup);  // Expected: true
```

---

## Task 7: index.html

**Files:**
- Create: `index.html`

- [ ] **Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>가챠 투자 분석기</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <header class="app-header">
    <h1>가챠 투자 분석기</h1>
    <select id="gameSelect" class="game-select">
      <option value="">게임 선택</option>
    </select>
  </header>

  <main class="app-main">
    <!-- Left Panel -->
    <aside class="panel panel-left">
      <section class="character-section">
        <h2>분석 대상</h2>
        <select id="characterSelect" class="character-select" disabled>
          <option value="">캐릭터 선택</option>
        </select>
        <button id="analyzeBtn" class="btn-primary" disabled>분석하기</button>
      </section>

      <section class="roster-section">
        <h2>보유 캐릭터 <span id="rosterCount" class="badge">0</span></h2>
        <div id="rosterList" class="roster-list"></div>
      </section>
    </aside>

    <!-- Right Panel: Results -->
    <section class="panel panel-right" id="resultsPanel">
      <div class="results-placeholder">
        <p>게임과 캐릭터를 선택한 후 분석하기를 누르세요.</p>
      </div>
    </section>
  </main>

  <script src="evaluationEngine.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

---

## Task 8: app.js

**Files:**
- Create: `app.js`

- [ ] **Step 1: Create app.js**

```javascript
// ── State ─────────────────────────────────────────────────────────────────────
let appConfig     = null;
let allCharacters = [];
let allMeta       = [];
let currentBanner = null;

// ── localStorage helpers ───────────────────────────────────────────────────────
function getRosterKey(gameId) {
  return `pickup_manager_roster_${gameId}`;
}

function loadRoster(gameId) {
  const raw = localStorage.getItem(getRosterKey(gameId));
  if (!raw) return { gameId, updatedAt: new Date().toISOString(), characters: [] };
  return JSON.parse(raw);
}

function saveRoster(gameId, roster) {
  roster.updatedAt = new Date().toISOString();
  localStorage.setItem(getRosterKey(gameId), JSON.stringify(roster));
}

function toggleRosterCharacter(gameId, characterId) {
  const roster = loadRoster(gameId);
  const idx = roster.characters.findIndex(c => c.characterId === characterId);
  if (idx >= 0) {
    roster.characters.splice(idx, 1);
  } else {
    roster.characters.push({ characterId, dupeLevel: 0, weapon: { hasSignature: false, refinement: 0 } });
  }
  saveRoster(gameId, roster);
  renderRoster(gameId);
}

// ── Data loading ───────────────────────────────────────────────────────────────
async function loadConfig() {
  const res = await fetch('data/config.json');
  return res.json();
}

async function loadGameData(gameId) {
  const [characters, meta, banner] = await Promise.all([
    fetch(`data/games/${gameId}/characters.json`).then(r => r.json()),
    fetch(`data/games/${gameId}/meta.json`).then(r => r.json()),
    fetch(`data/games/${gameId}/banner.json`).then(r => r.json())
  ]);
  return { characters, meta, banner };
}

// ── UI: Game selector ─────────────────────────────────────────────────────────
function populateGameSelect(supportedGames) {
  const sel = document.getElementById('gameSelect');
  supportedGames.forEach(gameId => {
    const opt = document.createElement('option');
    opt.value = gameId;
    opt.textContent = gameId.toUpperCase();
    sel.appendChild(opt);
  });
}

// ── UI: Character selector ────────────────────────────────────────────────────
function populateCharacterSelect(characters) {
  const sel = document.getElementById('characterSelect');
  sel.innerHTML = '<option value="">캐릭터 선택</option>';
  characters.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    const tag = c.isReleased ? '' : ' [출시 예정]';
    opt.textContent = `${c.name}${tag}`;
    sel.appendChild(opt);
  });
  sel.disabled = false;
}

// ── UI: Roster panel ──────────────────────────────────────────────────────────
function renderRoster(gameId) {
  const roster = loadRoster(gameId);
  const list = document.getElementById('rosterList');
  const count = document.getElementById('rosterCount');
  count.textContent = roster.characters.length;

  list.innerHTML = '';
  allCharacters.forEach(c => {
    const owned = roster.characters.some(rc => rc.characterId === c.id);
    const div = document.createElement('div');
    div.className = `roster-item ${owned ? 'owned' : ''}`;
    div.textContent = c.name + (c.isReleased ? '' : ' ✦');
    div.title = c.isReleased ? '' : '출시 예정';
    div.addEventListener('click', () => {
      toggleRosterCharacter(gameId, c.id);
    });
    list.appendChild(div);
  });
}

// ── UI: Results rendering ─────────────────────────────────────────────────────
function scoreBar(score, max = 10) {
  const pct = Math.round((score / max) * 100);
  return `<div class="score-bar-wrap"><div class="score-bar" style="width:${pct}%"></div><span>${score}</span></div>`;
}

function priorityBadge(priority) {
  return `<span class="badge badge-${priority}">${priority}</span>`;
}

function renderResults(result) {
  const { character, meta, accountGrowth, itemAverageScore, finalScore,
          isCurrentPickup, recommendationLabel, investmentTypeLabels } = result;

  const pullClass = meta.recommendation.pull.replace('_', '-');

  const html = `
    <div class="results-container">

      <div class="result-block result-final pull-${pullClass}">
        <div class="result-label">최종 추천도</div>
        <div class="final-score">${finalScore} / 10</div>
        ${scoreBar(finalScore)}
        ${isCurrentPickup ? '<span class="pickup-badge">현재 픽업 중</span>' : ''}
      </div>

      <div class="result-block">
        <div class="result-label">투자 유형</div>
        <div class="investment-types">
          ${investmentTypeLabels.map(t => `<span class="inv-badge">${t}</span>`).join('')}
        </div>
      </div>

      <div class="result-block">
        <div class="result-label">뽑아야 할 이유</div>
        <ul class="reason-list">
          ${meta.pullReasons.map(r => `<li>${r}</li>`).join('')}
        </ul>
      </div>

      <div class="result-block">
        <div class="result-label">캐릭터 자체 성능</div>
        ${scoreBar(character.basePerformance)}
      </div>

      <div class="result-block">
        <div class="result-label">현재 메타 점수
          <span class="confidence-label">신뢰도 ${Math.round(meta.confidence * 100)}%</span>
        </div>
        ${scoreBar(meta.metaScore)}
      </div>

      <div class="result-block">
        <div class="result-label">계정 체급 상승량</div>
        ${scoreBar(Math.round(accountGrowth * 10) / 10)}
      </div>

      <div class="result-block">
        <div class="result-label">미래 메타 가치</div>
        ${scoreBar(meta.futureScore)}
      </div>

      <div class="result-block">
        <div class="result-label">대체 가능성</div>
        ${scoreBar(meta.replacementScore)}
        <div class="sub-note">점수 높을수록 대체 용이 → 투자 가치 하락</div>
      </div>

      <div class="result-block">
        <div class="result-label">명함 가치 ${priorityBadge(meta.characterRecommendation.priority)}</div>
        ${scoreBar(meta.characterRecommendation.score)}
        <div class="sub-note">${meta.characterRecommendation.reason}</div>
      </div>

      <div class="result-block">
        <div class="result-label">돌파 가치 ${priorityBadge(meta.breakthroughRecommendation.priority)}</div>
        ${scoreBar(meta.breakthroughRecommendation.score)}
        <div class="sub-note">${meta.breakthroughRecommendation.reason}</div>
      </div>

      <div class="result-block">
        <div class="result-label">전무 가치 ${priorityBadge(meta.weaponRecommendation.priority)}</div>
        ${scoreBar(meta.weaponRecommendation.score)}
        <div class="sub-note">${meta.weaponRecommendation.reason}</div>
      </div>

      <div class="result-block">
        <div class="result-label">향후 시너지 캐릭터</div>
        ${meta.futureLinks.length > 0
          ? meta.futureLinks.map(fl => {
              const linked = allCharacters.find(c => c.id === fl.characterId);
              const name = linked ? linked.name : fl.characterId;
              const released = linked ? linked.isReleased : true;
              return `<div class="future-link">
                <span class="future-name">${name}${released ? '' : ' <em>[출시 예정]</em>'}</span>
                <span class="future-synergy">${fl.synergy}</span>
                <span class="future-conf">확률 ${Math.round(fl.confidence * 100)}%</span>
              </div>`;
            }).join('')
          : '<p class="no-data">등록된 시너지 없음</p>'
        }
      </div>

      <div class="result-block">
        <div class="result-label">뽑지 말아야 할 이유</div>
        <ul class="reason-list reason-skip">
          ${meta.skipReasons.map(r => `<li>${r}</li>`).join('')}
        </ul>
      </div>

      <div class="result-block result-verdict pull-${pullClass}">
        <div class="result-label">최종 추천</div>
        <div class="verdict">${recommendationLabel}</div>
      </div>

    </div>
  `;

  document.getElementById('resultsPanel').innerHTML = html;
}

// ── Analysis trigger ──────────────────────────────────────────────────────────
function runAnalysis() {
  const gameId = document.getElementById('gameSelect').value;
  const characterId = document.getElementById('characterSelect').value;
  if (!gameId || !characterId) return;

  const character = allCharacters.find(c => c.id === characterId);
  const meta      = allMeta.find(m => m.characterId === characterId);
  if (!character || !meta) {
    document.getElementById('resultsPanel').innerHTML =
      '<div class="results-placeholder"><p>이 캐릭터의 메타 데이터가 없습니다.</p></div>';
    return;
  }

  const roster = loadRoster(gameId);
  const result = evaluate(character, meta, roster, allCharacters, currentBanner, appConfig);
  renderResults(result);
}

// ── Event wiring ──────────────────────────────────────────────────────────────
document.getElementById('gameSelect').addEventListener('change', async (e) => {
  const gameId = e.target.value;
  const analyzeBtn = document.getElementById('analyzeBtn');
  const charSel    = document.getElementById('characterSelect');

  if (!gameId) {
    charSel.disabled = true;
    analyzeBtn.disabled = true;
    return;
  }

  const { characters, meta, banner } = await loadGameData(gameId);
  allCharacters = characters;
  allMeta       = meta;
  currentBanner = banner;

  populateCharacterSelect(characters);
  renderRoster(gameId);
  analyzeBtn.disabled = false;
  document.getElementById('resultsPanel').innerHTML =
    '<div class="results-placeholder"><p>캐릭터를 선택하고 분석하기를 누르세요.</p></div>';
});

document.getElementById('characterSelect').addEventListener('change', () => {
  const gameId = document.getElementById('gameSelect').value;
  if (gameId) runAnalysis();
});

document.getElementById('analyzeBtn').addEventListener('click', runAnalysis);

// ── Init ──────────────────────────────────────────────────────────────────────
(async function init() {
  appConfig = await loadConfig();
  populateGameSelect(appConfig.supportedGames);
})();
```

---

## Task 9: style.css

**Files:**
- Create: `style.css`

- [ ] **Step 1: Create style.css**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:        #0d0d14;
  --surface:   #16161f;
  --border:    #2a2a3a;
  --accent:    #7b6cff;
  --text:      #e8e8f0;
  --muted:     #888899;
  --must:      #ff4d6d;
  --rec:       #4dff91;
  --opt:       #ffd24d;
  --skip:      #888;
  --high:      #4dff91;
  --medium:    #ffd24d;
  --low:       #ff8c42;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-size: 14px;
  min-height: 100vh;
}

/* Header */
.app-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.app-header h1 { font-size: 18px; color: var(--accent); }

.game-select {
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
}

/* Layout */
.app-main {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 0;
  height: calc(100vh - 57px);
  overflow: hidden;
}

.panel {
  overflow-y: auto;
  padding: 16px;
}

.panel-left {
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.panel-right { background: var(--bg); }

/* Sections */
.character-section h2,
.roster-section h2 {
  font-size: 13px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 10px;
}

.character-select {
  width: 100%;
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
  padding: 8px 10px;
  border-radius: 6px;
  margin-bottom: 10px;
}

.btn-primary {
  width: 100%;
  background: var(--accent);
  color: #fff;
  border: none;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: opacity 0.2s;
}
.btn-primary:disabled { opacity: 0.4; cursor: default; }
.btn-primary:hover:not(:disabled) { opacity: 0.85; }

/* Roster */
.roster-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: calc(100vh - 280px);
  overflow-y: auto;
}

.roster-item {
  padding: 7px 10px;
  border-radius: 5px;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.15s;
  color: var(--muted);
}
.roster-item:hover { background: var(--border); }
.roster-item.owned {
  background: rgba(123, 108, 255, 0.15);
  border-color: var(--accent);
  color: var(--text);
}

/* Badges */
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  background: var(--border);
  color: var(--muted);
}
.badge-high   { background: rgba(77,255,145,0.2); color: var(--high); }
.badge-medium { background: rgba(255,210,77,0.2); color: var(--opt); }
.badge-low    { background: rgba(255,140,66,0.2); color: var(--low); }

/* Pickup badge */
.pickup-badge {
  display: inline-block;
  margin-top: 6px;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  background: rgba(255,77,109,0.2);
  color: var(--must);
  border: 1px solid var(--must);
}

/* Results */
.results-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--muted);
}

.results-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px;
}

.result-block {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 16px;
}

.result-label {
  font-size: 12px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.confidence-label {
  font-size: 11px;
  color: var(--opt);
  text-transform: none;
  letter-spacing: 0;
}

/* Score bar */
.score-bar-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.score-bar-wrap > span {
  min-width: 28px;
  text-align: right;
  font-weight: 700;
  font-size: 15px;
}

.score-bar {
  height: 8px;
  background: var(--accent);
  border-radius: 4px;
  flex: 1;
  max-width: calc(100% - 40px);
  transition: width 0.4s ease;
}

.sub-note {
  font-size: 11px;
  color: var(--muted);
  margin-top: 6px;
}

/* Final score block */
.result-final .final-score {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
}
.pull-must-pull  { border-color: var(--must); }
.pull-must-pull  .final-score { color: var(--must); }
.pull-recommended .final-score { color: var(--rec); }
.pull-optional   .final-score { color: var(--opt); }
.pull-skip       .final-score { color: var(--skip); }

/* Verdict */
.result-verdict .verdict {
  font-size: 22px;
  font-weight: 700;
}
.pull-must-pull  .verdict { color: var(--must); }
.pull-recommended .verdict { color: var(--rec); }
.pull-optional   .verdict { color: var(--opt); }
.pull-skip       .verdict { color: var(--skip); }

/* Investment type badges */
.investment-types { display: flex; flex-wrap: wrap; gap: 6px; }
.inv-badge {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  background: rgba(123,108,255,0.2);
  color: var(--accent);
  border: 1px solid var(--accent);
}

/* Reason lists */
.reason-list { padding-left: 16px; display: flex; flex-direction: column; gap: 4px; }
.reason-list li { font-size: 13px; }
.reason-skip li { color: var(--muted); }

/* Future links */
.future-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}
.future-link:last-child { border-bottom: none; }
.future-name  { font-weight: 600; flex: 1; }
.future-synergy { color: var(--muted); font-size: 12px; }
.future-conf  { color: var(--opt); font-size: 11px; }
em { font-style: normal; color: var(--opt); font-size: 11px; }

.no-data { color: var(--muted); font-size: 13px; }
```

---

## Task 10: Final verification

- [ ] **Step 1: Open index.html in browser**

Double-click `index.html` or open with Live Server. Check browser console for errors.

- [ ] **Step 2: Test ZZZ / Velina flow**

1. Select **ZZZ** from game dropdown
2. Roster list populates with 5 characters
3. Click **Velina** in roster → turns purple (owned)
4. Select **Velina** from character dropdown
5. Results panel updates automatically
6. Verify all 14 output sections appear
7. Check `finalScore` is between 0 and 10
8. Check `isCurrentPickup` badge appears (Velina is on banner)

- [ ] **Step 3: Test unreleased character**

1. Select **Remiel** from character dropdown
2. Results panel shows `[출시 예정]` in synergy section
3. No crash, no missing data errors

- [ ] **Step 4: Test roster persistence**

1. Click several characters in roster
2. Refresh browser
3. Selected characters remain highlighted (localStorage persisted)

- [ ] **Step 5: Test other games**

1. Switch to HSR → Firefly appears
2. Switch to WuWa → Camellya appears
3. No console errors on game switch

---

## Self-Review

**Spec coverage check:**

| Requirement | Covered in |
|-------------|------------|
| 7 evaluation metrics | Task 6 (evaluationEngine.js) |
| accountGrowth MVP (role gap + current synergy + future synergy) | Task 6 |
| itemSubWeights 0.50/0.35/0.15 | Task 1 + Task 6 |
| confidence as display-only | Task 8 (renderResults) |
| investmentType badges | Task 8 |
| banner.json separate from characters.json | Task 4 |
| isReleased for unreleased characters | Task 2 |
| userRoster localStorage | Task 8 |
| supportedGames in config.json | Task 1 |
| 14-item output order | Task 8 |
| AI-replaceable meta.json (version field) | Task 3 |
| recommendation: must_pull/recommended/optional/skip | Task 6 + Task 9 |
| ACCOUNT_GROWTH_METHODS switchable | Task 6 |

**Placeholder scan:** None found — all steps contain complete code.

**Type consistency:**
- `evaluate()` defined in Task 6, called in Task 8 with identical signature ✓
- `allCharacters`, `allMeta`, `currentBanner` globals used consistently ✓
- `meta.characterRecommendation.score` accessed identically in engine and render ✓
