// ── STATE ─────────────────────────────────────────────────────────────────────

var appState = {
  config: null,
  currentGame: null,
  characters: [],
  meta: [],
  banner: null,
  selectedCharacterId: null,
  rosters: {},
  evaluationResult: null,
  previewMeta: {}
};

// ── INTERNAL ──────────────────────────────────────────────────────────────────
// Section 9: Character Detail Modal state

var _detailCharId = null;
var _detailChar   = null;
var _detailDraft  = null;

var _charEdits    = {};
var _charAdds     = [];
var _editCharId   = null;
var _editDraft    = null;
var _editIsCreate = false;

var CHAR_ROLES    = ['attack', 'stun', 'anomaly', 'support', 'defense', 'rupture'];
var CHAR_ELEMENTS = ['physical', 'fire', 'ice', 'electric', 'ether', 'wind'];
var CHAR_ROLE_LABELS    = { attack: '강공', stun: '격파', anomaly: '이상', support: '지원', defense: '방어', rupture: '명파' };
var CHAR_ELEMENT_LABELS = { physical: '물리', fire: '불', ice: '얼음', electric: '전기', ether: '에테르', wind: '바람' };

// ── Game Meta (icon colors & abbreviations) ───────────────────────────────────

var GAME_META = {
  zzz:      { iconText: 'ZZ', iconBg: '#1a0f2e', iconColor: '#fbbf24' },
  hsr:      { iconText: 'SR', iconBg: '#1a1040', iconColor: '#a78bfa' },
  wuwa:     { iconText: 'WW', iconBg: '#0a1f1a', iconColor: '#34d399' },
  endfield: { iconText: 'EF', iconBg: '#0d1f0a', iconColor: '#4ade80' }
};

// ── Currency ──────────────────────────────────────────────────────────────────

var _currencyTab      = null;
var _charCustomOrder  = null;

// 카드 그리드를 지원하는 게임과 게임별 표시 설정.
// iconExt: 등급/역할/속성 아이콘 파일 확장자 (zzz는 webp, hsr은 StarRailRes png)
// rarityIcon: 등급 아이콘 파일(rarity_S 등) 보유 여부 — hsr은 없음(5성만 표시라 불필요)
// minRarity: 카드로 표시할 최소 등급 — hsr은 5성만, zzz는 전체
// iconBackdrop: 아이콘 뒤 반투명 검은 배경 (배경 없는 흰색 문양 아이콘의 시인성 확보용)
// roleField: 역할 아이콘에 쓸 필드 (명조는 role이 없어 무기 종류를 대신 표시)
// excludeNamePattern: 카드에서 제외할 플레이어 아바타 계열 이름 패턴
var CARD_GRID_CONFIG = {
  zzz:      { iconExt: '.webp', rarityIcon: true,  minRarity: 0, iconBackdrop: false },
  hsr:      { iconExt: '.png',  rarityIcon: false, minRarity: 5, iconBackdrop: true },
  wuwa:     { iconExt: '.png',  rarityIcon: false, minRarity: 5, iconBackdrop: true, roleField: 'weaponType', excludeNamePattern: /^Rover:/i },
  endfield: { iconExt: '.png',  rarityIcon: false, minRarity: 5, iconBackdrop: true, excludeNamePattern: /^Endministrator/i }
};
// 서버 /api/sync-characters 가 자동 동기화(신규 캐릭터/이미지/아이콘/출시일)를
// 지원하는 게임 목록 — server.js의 SYNC_HANDLERS와 맞춰서 관리한다.
var CARD_SYNC_GAMES = ['hsr', 'wuwa', 'endfield'];
function isCardGridGame(gameId) { return !!CARD_GRID_CONFIG[gameId]; }
var _cardDragging     = false;
var _cardHintDismissed = false;
var _plannerCurHalf  = 'first';
var _plannerNextHalf = 'first';
var _plannerCurOpen  = false;
var _plannerNextOpen = false;

var DEFAULT_PASS_DATA = {
  zzz: {
    monthly: { composition: '모노크롬 300 + 폴리크롬 2,700', conversion: '18.75뽑' },
    regular: { composition: '폴리크롬 총 1,480 상당',         conversion: '9.25뽑'  }
  },
  hsr: {
    monthly: { composition: '오래된 꿈 300 + 성옥 2,700',    conversion: '18.75뽑' },
    regular: { composition: '성옥 680 + 전용 티켓 4장',       conversion: '8.25뽑'  }
  },
  wuwa: {
    monthly: { composition: '달빛 300 + 별의 소리 2,700',     conversion: '18.75뽑' },
    regular: { composition: '별의 소리 680 + 한정권 5장',     conversion: '9.25뽑'  }
  },
  endfield: {
    monthly: { composition: '오리지오메트리 12 + 오로베릴 6,000', conversion: '13.8뽑' },
    regular: { composition: '오리지오메트리 총 36 + 무기고 티켓 2,400', conversion: '캐릭터 5.4뽑 + 무기 약 10뽑' }
  }
};

var CURRENCY_CONFIG = {
  zzz: {
    name: '젠레스 존 제로',
    currencies: [
      { id: 'polychrome',    name: '폴리크롬',          icon: 'assets/icons/zzz/polychrome.png',    rate: 160, desc: '160개 = 1뽑',     note: null, type: 'common'    },
      { id: 'limitedTicket', name: '암호화 마스터 테이프', icon: 'assets/icons/zzz/limited_ticket.png', rate: 1,   desc: '1개 = 1뽑 (한정)', note: null, type: 'character' }
    ]
  },
  hsr: {
    name: '붕괴: 스타레일',
    currencies: [
      { id: 'jade',        name: '성옥',            icon: 'assets/icons/hsr/jade.png',         rate: 160, desc: '160개 = 1뽑',     note: null, type: 'common'    },
      { id: 'limitedPass', name: '별의 궤도 특별 패스', icon: 'assets/icons/hsr/limited_pass.png', rate: 1,   desc: '1개 = 1뽑 (한정)', note: null, type: 'character' }
    ]
  },
  wuwa: {
    name: '명조: 워더링 웨이브',
    currencies: [
      { id: 'astrite',     name: '별의 소리',    icon: 'assets/icons/wuwa/astrite.png',      rate: 160, desc: '160개 = 1뽑',     note: null, type: 'common'    },
      { id: 'limitedTide', name: '금빛 파도 티켓', icon: 'assets/icons/wuwa/limited_tide.png', rate: 1,   desc: '1개 = 1뽑 (한정)', note: null, type: 'character' }
    ]
  },
  endfield: {
    name: '아크나이츠: 엔드필드',
    currencies: [
      { id: 'crystal',       name: '오리지늄',   icon: 'assets/icons/endfield/crystal.png',        rate: 500, desc: '500개 = 1뽑',     note: null, type: 'common'    },
      { id: 'limitedPermit', name: '채용 허가증', icon: 'assets/icons/endfield/limited_permit.png', rate: 1,   desc: '1개 = 1뽑 (한정)', note: null, type: 'character' }
    ]
  }
};

var GACHA_CONFIG = {
  zzz:      { charPity: 90, weaponPity: 80, pullCost: 160, packagePrice: 0, packagePulls: 0 },
  hsr:      { charPity: 90, weaponPity: 80, pullCost: 160, packagePrice: 0, packagePulls: 0 },
  wuwa:     { charPity: 80, weaponPity: 80, pullCost: 160, packagePrice: 0, packagePulls: 0 },
  endfield: { charPity: 80, weaponPity: 80, pullCost: 160, packagePrice: 0, packagePulls: 0 },
  nte:      { charPity: 90, weaponPity: 80, pullCost: 160, packagePrice: 0, packagePulls: 0 }
};

// ── INTERNAL ──────────────────────────────────────────────────────────────────
// Section 1: Utilities

function getRosterKey(gameId) {
  return "pickup_manager_roster_" + gameId;
}

// ── INTERNAL ──────────────────────────────────────────────────────────────────
// Section 2: Data Loading

function loadConfig() {
  return fetch("data/config.json")
    .then(function(res) { return res.json(); })
    .catch(function(err) {
      console.error("config 로드 실패:", err);
      throw err;
    });
}

function loadGachaRules(gameId) {
  return fetch('data/gachaRules/' + gameId + '.json')
    .then(function(res) { return res.json(); })
    .catch(function() { return null; });
}

function loadGameData(gameId) {
  return Promise.all([
    fetch("data/games/" + gameId + "/characters.json").then(function(res) { return res.json(); }),
    fetch("data/games/" + gameId + "/meta.json").then(function(res) { return res.json(); }),
    fetch("data/games/" + gameId + "/banner.json").then(function(res) { return res.json(); })
  ])
    .then(function(results) {
      return { characters: results[0], meta: results[1], banner: results[2] };
    })
    .catch(function(err) {
      console.error("게임 데이터 로드 실패 [" + gameId + "]:", err);
      throw err;
    });
}

function loadRoster(gameId) {
  try {
    var saved = localStorage.getItem(getRosterKey(gameId));
    if (saved) {
      return JSON.parse(saved);
    }
    return { gameId: gameId, updatedAt: new Date().toISOString(), characters: [] };
  } catch (err) {
    console.warn("로스터 로드 실패 [" + gameId + "]:", err);
    return { gameId: gameId, updatedAt: new Date().toISOString(), characters: [] };
  }
}

function syncRosterFromFile() {
  return fetch('data/user/roster.json')
    .then(function(res) {
      if (!res.ok) throw new Error('status ' + res.status);
      return res.json();
    })
    .then(function(data) {
      var games = data.games || {};
      var supported = (appState.config && appState.config.supportedGames) || ['zzz', 'hsr', 'wuwa', 'endfield'];
      var migrated = false;
      for (var i = 0; i < supported.length; i++) {
        var gid = supported[i];
        var gameData = games[gid] || { updatedAt: '', characters: [] };
        var hasJson = gameData.characters && gameData.characters.length > 0;

        var localRaw  = localStorage.getItem(getRosterKey(gid));
        var localData = null;
        var hasLocal  = false;
        if (localRaw) {
          try { localData = JSON.parse(localRaw); } catch (e) {}
          hasLocal = !!(localData && localData.characters && localData.characters.length > 0);
        }

        if (hasJson && hasLocal) {
          var jsonTime  = gameData.updatedAt  || '';
          var localTime = localData.updatedAt || '';
          if (localTime > jsonTime) {
            appState.rosters[gid] = localData;
            migrated = true;
          } else {
            appState.rosters[gid] = {
              gameId: gid,
              updatedAt: gameData.updatedAt || new Date().toISOString(),
              characters: gameData.characters
            };
            localStorage.setItem(getRosterKey(gid), JSON.stringify(appState.rosters[gid]));
          }
        } else if (hasJson) {
          appState.rosters[gid] = {
            gameId: gid,
            updatedAt: gameData.updatedAt || new Date().toISOString(),
            characters: gameData.characters
          };
          localStorage.setItem(getRosterKey(gid), JSON.stringify(appState.rosters[gid]));
        } else if (hasLocal) {
          appState.rosters[gid] = localData;
          migrated = true;
        }
      }
      if (migrated) {
        fetch('http://localhost:3001/api/save-roster', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildRosterPayload())
        }).catch(function(err) {
          console.warn('[roster] migration 저장 실패:', err.message);
        });
        console.log('[roster] localStorage → roster.json migration 완료');
      }
    })
    .catch(function(err) {
      console.warn('[roster] roster.json 로드 실패, localStorage 사용:', err.message);
    });
}

// ── INTERNAL ──────────────────────────────────────────────────────────────────
// Section 3: Data Saving

function buildRosterPayload() {
  var now = new Date().toISOString();
  var supported = (appState.config && appState.config.supportedGames) || ['zzz', 'hsr', 'wuwa', 'endfield'];
  var games = {};
  for (var i = 0; i < supported.length; i++) {
    var gid = supported[i];
    if (appState.rosters[gid]) {
      games[gid] = {
        updatedAt: appState.rosters[gid].updatedAt || now,
        characters: appState.rosters[gid].characters || []
      };
    } else {
      games[gid] = { updatedAt: now, characters: [] };
    }
  }
  return { version: '1.0', updatedAt: now, games: games };
}

function saveRoster(gameId) {
  try {
    var roster = appState.rosters[gameId];
    roster.updatedAt = new Date().toISOString();
    localStorage.setItem(getRosterKey(gameId), JSON.stringify(roster));
  } catch (err) {
    console.error("로스터 저장 실패:", err);
  }
  fetch('http://localhost:3001/api/save-roster', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildRosterPayload())
  }).catch(function(err) {
    console.warn('[roster] roster.json 저장 실패 (서버 미실행 시 정상):', err.message);
  });
}

function exportPersonalSettings() {
  var config = getGameConfig();
  var currency = {};
  Object.keys(config).forEach(function(gid) {
    currency[gid] = loadCurrencyData(gid);
  });

  var settings = {
    version: 1,
    exportedAt: new Date().toISOString(),
    rosters: appState.rosters,
    currency: currency
  };

  var blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href     = url;
  a.download = 'pickup_settings_' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importPersonalSettings() {
  var input   = document.createElement('input');
  input.type  = 'file';
  input.accept = '.json';
  input.onchange = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      try {
        var settings = JSON.parse(ev.target.result);
        if (!settings.version || !settings.rosters) {
          alert('올바른 개인 설정 파일이 아닙니다.');
          return;
        }
        // 로스터 복원
        Object.keys(settings.rosters).forEach(function(gid) {
          appState.rosters[gid] = settings.rosters[gid];
          saveRoster(gid);
        });
        // 재화 복원
        if (settings.currency) {
          Object.keys(settings.currency).forEach(function(gid) {
            try { localStorage.setItem('pickup_manager_currency_' + gid, JSON.stringify(settings.currency[gid])); } catch(err) {}
          });
        }
        // 현재 화면 갱신
        renderRoster();
        if (isCardGridGame(appState.currentGame)) renderCardGrid();
        if (document.getElementById('tabCurrency').style.display !== 'none') renderCurrencyPage();
        alert('개인 설정을 불러왔습니다.');
      } catch(err) {
        alert('파일을 읽는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// ── INTERNAL ──────────────────────────────────────────────────────────────────
// Section 4: State Mutations

function setGame(gameId) {
  appState.currentGame = gameId;
  return loadGameData(gameId)
    .then(function(data) {
      var savedChars = loadCharactersFromLocalStorage(gameId);
      appState.characters = savedChars && savedChars.length > 0 ? savedChars : data.characters;
      appState.meta = data.meta;
      appState.banner = data.banner;

      if (!appState.rosters[gameId]) {
        appState.rosters[gameId] = loadRoster(gameId);
      }

      appState.selectedCharacterId = null;
      appState.evaluationResult = null;
      _charCustomOrder = null; // 게임 전환 시 카드 순서 캐시 초기화 (게임별 저장 키가 다름)

      renderCharacterSelect();
      renderRoster();
      if (isCardGridGame(gameId)) {
        renderCardGrid();
      } else {
        renderPlaceholder("캐릭터를 선택하고 분석하기를 누르세요.");
      }

      document.getElementById("characterSelect").disabled = false;
      document.getElementById("analyzeBtn").disabled = false;
      document.getElementById("metaUpdateBtn").disabled = (gameId !== 'zzz');
      document.getElementById("metaUpdateClaudeCodeBtn").disabled = false;
      document.getElementById("cardSyncBtn").disabled = (CARD_SYNC_GAMES.indexOf(gameId) === -1);
    })
    .catch(function() {
      renderError("게임 데이터를 불러오지 못했습니다.");
    });
}

function toggleRosterCharacter(characterId) {
  if (!appState.currentGame || !appState.rosters[appState.currentGame]) return;
  var roster = appState.rosters[appState.currentGame];
  var idx = -1;
  for (var i = 0; i < roster.characters.length; i++) {
    if (roster.characters[i].characterId === characterId) {
      idx = i;
      break;
    }
  }

  if (idx !== -1) {
    roster.characters.splice(idx, 1);
  } else {
    roster.characters.push({
      characterId: characterId,
      dupeLevel: 0,
      weapon: { hasSignature: false, refinement: 0 },
      isLeveledUp: false,
      memo: ''
    });
  }

  saveRoster(appState.currentGame);
  renderRoster();

  if (appState.selectedCharacterId) {
    runAnalysis();
  } else if (isCardGridGame(appState.currentGame)) {
    renderCardGrid();
  }
}

function addRosterCharacter(characterId) {
  if (!appState.currentGame || !appState.rosters[appState.currentGame]) return;
  var roster = appState.rosters[appState.currentGame];
  for (var i = 0; i < roster.characters.length; i++) {
    if (roster.characters[i].characterId === characterId) return;
  }
  roster.characters.push({ characterId: characterId, dupeLevel: 0, weapon: { hasSignature: false, refinement: 0 }, isLeveledUp: false, memo: '' });
  saveRoster(appState.currentGame);
  renderRoster();
  if (appState.selectedCharacterId) { runAnalysis(); } else if (isCardGridGame(appState.currentGame)) { renderCardGrid(); }
}

function removeRosterCharacter(characterId) {
  if (!appState.currentGame || !appState.rosters[appState.currentGame]) return;
  var roster = appState.rosters[appState.currentGame];
  var idx = -1;
  for (var i = 0; i < roster.characters.length; i++) {
    if (roster.characters[i].characterId === characterId) { idx = i; break; }
  }
  if (idx === -1) return;
  roster.characters.splice(idx, 1);
  saveRoster(appState.currentGame);
  renderRoster();
  if (appState.selectedCharacterId) { runAnalysis(); } else if (isCardGridGame(appState.currentGame)) { renderCardGrid(); }
}

function loadCharCustomOrder(gameId) {
  try { return JSON.parse(localStorage.getItem('pickup_manager_char_order_' + gameId) || 'null'); } catch(e) { return null; }
}

function saveCharCustomOrder(gameId, order) {
  try { localStorage.setItem('pickup_manager_char_order_' + gameId, JSON.stringify(order)); } catch(e) {}
}

// ── INTERNAL ──────────────────────────────────────────────────────────────────
// Section 5: Analysis

function runAnalysis() {
  var character = null;
  for (var i = 0; i < appState.characters.length; i++) {
    if (appState.characters[i].id === appState.selectedCharacterId) {
      character = appState.characters[i];
      break;
    }
  }

  var meta = appState.previewMeta[appState.selectedCharacterId] || null;
  if (!meta) {
    for (var j = 0; j < appState.meta.length; j++) {
      if (appState.meta[j].characterId === appState.selectedCharacterId) {
        meta = appState.meta[j];
        break;
      }
    }
  }

  var roster = appState.rosters[appState.currentGame];

  if (!character || !roster) {
    return;
  }

  var result = evaluate(character, meta, roster, appState.characters, appState.banner, appState.config);
  appState.evaluationResult = result;

  if (result.noMetaData) {
    renderNoMeta(character);
  } else {
    renderResults(result);
    if (meta && meta._isPreview) {
      var _panel = document.getElementById('resultsPanel');
      var _banner = document.createElement('div');
      _banner.className = 'preview-banner';
      _banner.textContent = '⚡ GPT Preview 데이터 적용 중 — meta.json은 변경되지 않습니다';
      _panel.insertBefore(_banner, _panel.firstChild);
    }
  }
}

// ── INTERNAL ──────────────────────────────────────────────────────────────────
// Section 6: Rendering

function renderGameSelect() {
  var config = getGameConfig();
  var list = document.getElementById('gameList');
  list.innerHTML = '';

  var gameIds = Object.keys(config);
  for (var i = 0; i < gameIds.length; i++) {
    var gameId = gameIds[i];
    var meta = GAME_META[gameId] || { iconText: gameId.slice(0, 2).toUpperCase(), iconBg: '#1a1a2e', iconColor: 'var(--muted)' };
    var iconInner = '<img src="assets/icons/' + gameId + '/icon.png" alt="" '
      + 'style="width:100%;height:100%;object-fit:cover;border-radius:6px;" '
      + 'onerror="if(this.src.indexOf(\'.webp\')===-1){this.src=\'assets/icons/' + gameId + '/icon.webp\'}else{this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'}" />'
      + '<span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;">' + meta.iconText + '</span>';
    var iconHtml = '<span class="game-card-icon" style="background:' + meta.iconBg + ';color:' + meta.iconColor + '">' + iconInner + '</span>';
    var btn = document.createElement('button');
    btn.className = 'game-card' + (gameId === appState.currentGame ? ' active' : '');
    btn.dataset.game = gameId;
    btn.innerHTML = iconHtml + '<span class="game-card-name">' + (config[gameId].name || gameId) + '</span>';
    list.appendChild(btn);
  }
}

function renderCharacterSelect() {
  var select = document.getElementById("characterSelect");
  select.innerHTML = '<option value="">캐릭터 선택</option>';

  var filtered = appState.characters.filter(function(c) {
    var dc = _charEdits[c.id] ? Object.assign({}, c, _charEdits[c.id]) : c;
    return (dc.rarity || 5) === 5;
  });

  filtered.sort(function(a, b) {
    var da = _charEdits[a.id] ? Object.assign({}, a, _charEdits[a.id]) : a;
    var db = _charEdits[b.id] ? Object.assign({}, b, _charEdits[b.id]) : b;
    var ga = !da.isReleased ? 0 : (da.releaseDate ? 1 : 2);
    var gb = !db.isReleased ? 0 : (db.releaseDate ? 1 : 2);
    if (ga !== gb) return ga - gb;
    if (ga === 1) {
      var ra = /^\d{8}$/.test(da.releaseDate) ? da.releaseDate.slice(0,4)+'-'+da.releaseDate.slice(4,6)+'-'+da.releaseDate.slice(6) : da.releaseDate;
      var rb = /^\d{8}$/.test(db.releaseDate) ? db.releaseDate.slice(0,4)+'-'+db.releaseDate.slice(4,6)+'-'+db.releaseDate.slice(6) : db.releaseDate;
      if (ra > rb) return -1;
      if (ra < rb) return 1;
      if ((db.rarity || 0) !== (da.rarity || 0)) return (db.rarity || 0) - (da.rarity || 0);
      var oa = da.releaseOrder || 999999;
      var ob = db.releaseOrder || 999999;
      if (oa !== ob) return oa - ob;
    }
    var na = da.nameKo || da.name || '';
    var nb = db.nameKo || db.name || '';
    return na < nb ? -1 : na > nb ? 1 : 0;
  });

  for (var i = 0; i < filtered.length; i++) {
    var char = filtered[i];
    var dc = _charEdits[char.id] ? Object.assign({}, char, _charEdits[char.id]) : char;
    var label = (dc.nameKo || dc.name) + (dc.isReleased ? "" : " [출시 예정]");
    var option = document.createElement("option");
    option.value = char.id;
    option.textContent = label;
    select.appendChild(option);
  }
}

function renderCardGrid() {
  var gameId  = appState.currentGame;
  var cfg     = CARD_GRID_CONFIG[gameId] || CARD_GRID_CONFIG.zzz;
  var imgBase = 'assets/images/' + gameId + '/';
  var roster = appState.rosters[gameId] || { characters: [] };
  var ownedMap = {};
  for (var o = 0; o < roster.characters.length; o++) {
    ownedMap[roster.characters[o].characterId] = true;
  }

  var html = '';

  if (!_cardHintDismissed) {
    html += '<div class="card-hint-bar" id="cardHintBar">' +
      '<span class="card-hint-item"><span class="card-hint-icon">👆</span> 클릭 — 보유 토글</span>' +
      '<span class="card-hint-sep">·</span>' +
      '<span class="card-hint-item"><span class="card-hint-icon">✌</span> 더블클릭 — 설정</span>' +
      '<span class="card-hint-sep">·</span>' +
      '<span class="card-hint-item"><span class="card-hint-icon">✥</span> 드래그 — 순서 변경</span>' +
      '<button class="card-hint-close" id="cardHintClose">✕</button>' +
      '</div>';
  }

  if (_charCustomOrder === null) {
    _charCustomOrder = loadCharCustomOrder(gameId) || [];
  }

  // 게임별 최소 등급 필터 (hsr은 5성만, zzz는 전체)
  // 플레이어 아바타 항목(개척자/로버 등)은 카드에서 제외
  var sortedChars = appState.characters.filter(function(c) {
    var dc = _charEdits[c.id] ? Object.assign({}, c, _charEdits[c.id]) : c;
    if (((dc.name || '') + (dc.nameKo || '')).indexOf('{NICKNAME}') !== -1) return false;
    if (cfg.excludeNamePattern && cfg.excludeNamePattern.test(dc.name || '')) return false;
    return (dc.rarity || 5) >= cfg.minRarity;
  });
  if (_charCustomOrder.length > 0) {
    var orderMap = {};
    for (var oi = 0; oi < _charCustomOrder.length; oi++) orderMap[_charCustomOrder[oi]] = oi;
    sortedChars.sort(function(a, b) {
      var ia = orderMap[a.id] !== undefined ? orderMap[a.id] : 99999;
      var ib = orderMap[b.id] !== undefined ? orderMap[b.id] : 99999;
      return ia - ib;
    });
  } else {
    sortedChars.sort(function(a, b) {
      var da = _charEdits[a.id] ? Object.assign({}, a, _charEdits[a.id]) : a;
      var db = _charEdits[b.id] ? Object.assign({}, b, _charEdits[b.id]) : b;
      var ga = !da.isReleased ? 0 : (da.releaseDate ? 1 : 2);
      var gb = !db.isReleased ? 0 : (db.releaseDate ? 1 : 2);
      if (ga !== gb) return ga - gb;
      if (ga === 1) {
        var ra = /^\d{8}$/.test(da.releaseDate) ? da.releaseDate.slice(0,4)+'-'+da.releaseDate.slice(4,6)+'-'+da.releaseDate.slice(6) : da.releaseDate;
        var rb = /^\d{8}$/.test(db.releaseDate) ? db.releaseDate.slice(0,4)+'-'+db.releaseDate.slice(4,6)+'-'+db.releaseDate.slice(6) : db.releaseDate;
        if (ra > rb) return -1;
        if (ra < rb) return 1;
        if ((db.rarity || 0) !== (da.rarity || 0)) return (db.rarity || 0) - (da.rarity || 0);
        var oa = da.releaseOrder || 999999;
        var ob = db.releaseOrder || 999999;
        if (oa !== ob) return oa - ob;
      }
      var na = da.nameKo || da.name || '';
      var nb = db.nameKo || db.name || '';
      return na < nb ? -1 : na > nb ? 1 : 0;
    });
  }

  html += '<div class="card-grid">';

  for (var i = 0; i < sortedChars.length; i++) {
    var char = sortedChars[i];
    var dc = _charEdits[char.id] ? Object.assign({}, char, _charEdits[char.id]) : char;
    var owned = ownedMap[char.id] ? true : false;

    var elementFile = dc.specialElement
      ? 'element_' + dc.specialElement + cfg.iconExt
      : (dc.element ? 'element_' + dc.element + cfg.iconExt : '');
    var rarityFile = !cfg.rarityIcon ? ''
      : dc.rarity === 5 ? 'rarity_S' + cfg.iconExt
      : (dc.rarity === 4 ? 'rarity_A' + cfg.iconExt : '');
    var roleVal = dc[cfg.roleField || 'role'];
    var roleFile = roleVal ? 'role_' + roleVal + cfg.iconExt : '';

    html += '<div class="char-card' + (owned ? ' owned' : '') + '" draggable="true" data-char-id="' + char.id + '">';
    if (dc.image) {
      html += '<img class="char-card-image" src="' + imgBase + dc.image + '" alt="' + dc.name + '" loading="lazy">';
    } else {
      html += '<div class="char-card-image char-card-no-img"></div>';
    }
    var iconCls = 'char-card-icon' + (cfg.iconBackdrop ? ' char-card-icon--backdrop' : '');
    html += '<div class="char-card-icons"><div class="char-card-icons-left">';
    if (rarityFile) html += '<img class="' + iconCls + '" src="' + imgBase + rarityFile + '" alt="">';
    html += '</div><div class="char-card-icons-right">';
    if (roleFile) html += '<img class="' + iconCls + '" src="' + imgBase + roleFile + '" alt="">';
    if (elementFile) html += '<img class="' + iconCls + '" src="' + imgBase + elementFile + '" alt="">';
    html += '</div></div>';
    if (owned) html += '<div class="char-card-owned-overlay"></div>';
    if (!dc.isReleased) html += '<span class="char-card-unreleased-badge">출시 예정</span>';
    html += '<div class="char-card-name">' + (dc.nameKo || dc.name) + '</div>';
    html += '</div>';
  }

  html += '<div class="char-card-add"><div class="char-card-add-icon">+</div>' +
    '<div class="char-card-add-label">캐릭터 추가</div></div>';
  html += '</div>';

  var panel = document.getElementById('resultsPanel');
  panel.innerHTML = html;

  // 일반 카드: 클릭=보유 토글, 더블클릭=설정창
  var regularCards = panel.querySelectorAll('.char-card');
  for (var j = 0; j < regularCards.length; j++) {
    (function(card) {
      var charId = card.getAttribute('data-char-id');
      var clickTimer = null;
      card.addEventListener('click', function(e) {
        if (_cardDragging) return;
        clearTimeout(clickTimer);
        clickTimer = setTimeout(function() { toggleRosterCharacter(charId); }, 220);
      });
      card.addEventListener('dblclick', function(e) {
        clearTimeout(clickTimer);
        openCharacterDetail(charId);
      });
    })(regularCards[j]);
  }

  var addCard = panel.querySelector('.char-card-add');
  if (addCard) addCard.onclick = openCharacterCreate;

  var hintClose = document.getElementById('cardHintClose');
  if (hintClose) {
    hintClose.addEventListener('click', function() {
      _cardHintDismissed = true;
      var bar = document.getElementById('cardHintBar');
      if (bar) bar.remove();
    });
  }

  // 드래그앤드롭 순서 변경 (placeholder 방식)
  var grid = panel.querySelector('.card-grid');
  var dragSrcId = null;
  var dragPlaceholder = null;

  grid.addEventListener('dragstart', function(e) {
    var card = e.target.closest('.char-card');
    if (!card) { e.preventDefault(); return; }
    dragSrcId = card.getAttribute('data-char-id');
    _cardDragging = true;

    dragPlaceholder = document.createElement('div');
    dragPlaceholder.className = 'card-drag-placeholder';
    grid.insertBefore(dragPlaceholder, card.nextSibling);

    setTimeout(function() { card.classList.add('card-dragging'); }, 0);
    e.dataTransfer.effectAllowed = 'move';
  });

  grid.addEventListener('dragend', function() {
    panel.querySelectorAll('.char-card.card-dragging').forEach(function(c) { c.classList.remove('card-dragging'); });
    if (dragPlaceholder && dragPlaceholder.parentNode) dragPlaceholder.parentNode.removeChild(dragPlaceholder);
    dragPlaceholder = null;
    setTimeout(function() { _cardDragging = false; }, 0);
  });

  grid.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dragPlaceholder) return;
    var card = e.target.closest('.char-card:not(.card-dragging)');
    if (!card) return;
    var rect = card.getBoundingClientRect();
    if (e.clientX < rect.left + rect.width / 2) {
      grid.insertBefore(dragPlaceholder, card);
    } else {
      grid.insertBefore(dragPlaceholder, card.nextSibling);
    }
  });

  grid.addEventListener('drop', function(e) {
    e.preventDefault();
    if (!dragSrcId || !dragPlaceholder) return;
    var srcCard = panel.querySelector('[data-char-id="' + dragSrcId + '"]');
    if (srcCard && dragPlaceholder.parentNode) {
      dragPlaceholder.parentNode.insertBefore(srcCard, dragPlaceholder);
      dragPlaceholder.parentNode.removeChild(dragPlaceholder);
      dragPlaceholder = null;
    }
    var allCards = Array.from(panel.querySelectorAll('.char-card'));
    _charCustomOrder = allCards.map(function(c) { return c.getAttribute('data-char-id'); });
    saveCharCustomOrder(gameId, _charCustomOrder);
    renderCardGrid();
  });
}

function openCharacterDetail(charId) {
  _detailCharId = charId;
  _detailChar = null;
  for (var i = 0; i < appState.characters.length; i++) {
    if (appState.characters[i].id === charId) { _detailChar = appState.characters[i]; break; }
  }
  if (!_detailChar) return;

  var roster = appState.rosters[appState.currentGame] || { characters: [] };
  var entry = null;
  for (var j = 0; j < roster.characters.length; j++) {
    if (roster.characters[j].characterId === charId) { entry = roster.characters[j]; break; }
  }

  _detailDraft = entry ? {
    owned:        true,
    dupeLevel:    entry.dupeLevel  || 0,
    hasSignature: entry.weapon ? (entry.weapon.hasSignature || false) : false,
    refinement:   entry.weapon ? (entry.weapon.refinement   || 1)     : 1,
    isLeveledUp:  entry.isLeveledUp || false,
    memo:         entry.memo || ''
  } : {
    owned: false, dupeLevel: 0, hasSignature: false,
    refinement: 1, isLeveledUp: false, memo: ''
  };

  renderCharacterDetailModal();
  document.getElementById('charDetailModal').style.display = 'block';
}

function syncDetailMemo() {
  var el = document.getElementById('det-memo');
  if (el) _detailDraft.memo = el.value;
}

function renderCharacterDetailModal() {
  var char   = _detailChar;
  var d      = _detailDraft;
  var dis    = d.owned ? '' : ' disabled';
  var disSig = (d.owned && d.hasSignature) ? '' : ' disabled';

  var releaseLabel = char.isReleased
    ? '<span class="detail-release detail-release-out">출시</span>'
    : '<span class="detail-release detail-release-pre">출시 예정</span>';

  var dupeHtml = '';
  for (var i = 0; i <= 6; i++) {
    dupeHtml += '<button class="num-btn' + (d.dupeLevel === i ? ' active' : '') + '"' + dis +
      ' onclick="detailSetDupe(' + i + ')">' + i + '</button>';
  }

  var refHtml = '';
  for (var r = 1; r <= 5; r++) {
    refHtml += '<button class="num-btn' + (d.refinement === r ? ' active' : '') + '"' + disSig +
      ' onclick="detailSetRefinement(' + r + ')">R' + r + '</button>';
  }

  var safeMemo = (d.memo || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');

  var html =
    '<div class="char-detail-overlay" onclick="if(event.target===this)closeCharacterDetail()">' +
    '<div class="char-detail-panel">' +
    '<div class="detail-header">' +
    '<div class="detail-header-info">' +
    '<span class="detail-header-name">' + (char.nameKo || char.name) + '</span>' +
    releaseLabel +
    '</div>' +
    '<button class="detail-close-btn" onclick="closeCharacterDetail()">&#x2715;</button>' +
    '</div>' +
    '<div class="detail-body">' +
    '<div class="detail-row"><label class="detail-label">보유 여부</label>' +
    '<button class="toggle-btn' + (d.owned ? ' active' : '') + '" onclick="detailToggleOwned()">' +
    (d.owned ? '보유' : '미보유') + '</button></div>' +
    '<div class="detail-row"><label class="detail-label">돌파 수</label>' +
    '<div class="num-btn-group">' + dupeHtml + '</div></div>' +
    '<div class="detail-row"><label class="detail-label">전무 보유</label>' +
    '<button class="toggle-btn' + (d.hasSignature ? ' active' : '') + '"' + dis +
    ' onclick="detailToggleSignature()">' + (d.hasSignature ? '보유' : '미보유') + '</button></div>' +
    '<div class="detail-row"><label class="detail-label">전무 정련</label>' +
    '<div class="num-btn-group">' + refHtml + '</div></div>' +
    '<div class="detail-row"><label class="detail-label">육성 완료</label>' +
    '<button class="toggle-btn' + (d.isLeveledUp ? ' active' : '') + '"' + dis +
    ' onclick="detailToggleLeveledUp()">' + (d.isLeveledUp ? '완료' : '미완료') + '</button></div>' +
    '<div class="detail-row"><label class="detail-label">메모</label>' +
    '<input class="detail-memo-input" id="det-memo" type="text" maxlength="100"' +
    ' value="' + safeMemo + '"' + dis + ' placeholder="최대 100자"></div>' +
    '</div>' +
    '<div class="detail-footer">' +
    '<button class="detail-gear-btn" onclick="openCharacterEditFromModal()">&#9881;&#65039;</button>' +
    '<button class="detail-delete-btn" onclick="deleteCharacterFromDetail()">삭제</button>' +
    '<button class="detail-btn-cancel" onclick="closeCharacterDetail()">취소</button>' +
    '<button class="detail-btn-save" onclick="saveCharacterDetail()">저장</button>' +
    '</div></div></div>';

  document.getElementById('charDetailModal').innerHTML = html;
}

function detailToggleOwned() {
  syncDetailMemo();
  _detailDraft.owned = !_detailDraft.owned;
  renderCharacterDetailModal();
}

function detailToggleSignature() {
  syncDetailMemo();
  _detailDraft.hasSignature = !_detailDraft.hasSignature;
  renderCharacterDetailModal();
}

function detailToggleLeveledUp() {
  syncDetailMemo();
  _detailDraft.isLeveledUp = !_detailDraft.isLeveledUp;
  renderCharacterDetailModal();
}

function detailSetDupe(level) {
  syncDetailMemo();
  _detailDraft.dupeLevel = level;
  renderCharacterDetailModal();
}

function detailSetRefinement(level) {
  syncDetailMemo();
  _detailDraft.refinement = level;
  renderCharacterDetailModal();
}

function saveCharacterDetail() {
  if (!_detailCharId || !appState.currentGame) return;
  syncDetailMemo();

  var roster = appState.rosters[appState.currentGame];
  var idx = -1;
  for (var i = 0; i < roster.characters.length; i++) {
    if (roster.characters[i].characterId === _detailCharId) { idx = i; break; }
  }

  if (_detailDraft.owned) {
    var entry = {
      characterId: _detailCharId,
      dupeLevel:   _detailDraft.dupeLevel,
      weapon:      { hasSignature: _detailDraft.hasSignature, refinement: _detailDraft.refinement },
      isLeveledUp: _detailDraft.isLeveledUp,
      memo:        _detailDraft.memo
    };
    if (idx !== -1) { roster.characters[idx] = entry; } else { roster.characters.push(entry); }
  } else {
    if (idx !== -1) { roster.characters.splice(idx, 1); }
  }

  saveRoster(appState.currentGame);
  renderRoster();
  if (appState.selectedCharacterId) {
    runAnalysis();
  } else if (isCardGridGame(appState.currentGame)) {
    renderCardGrid();
  }
  closeCharacterDetail();
}

function deleteCharacterFromDetail() {
  if (!_detailCharId) return;
  if (!confirm('"' + (_detailChar && (_detailChar.nameKo || _detailChar.name) || _detailCharId) + '" 캐릭터를 삭제하시겠습니까?')) return;
  var id = _detailCharId;
  appState.characters = appState.characters.filter(function(c) { return c.id !== id; });
  saveCharactersToLocalStorage(appState.currentGame);
  closeCharacterDetail();
  renderCardGrid();
}

function closeCharacterDetail() {
  _detailCharId = null;
  _detailChar   = null;
  _detailDraft  = null;
  var modal = document.getElementById('charDetailModal');
  modal.style.display = 'none';
  modal.innerHTML = '';
}

function openCharacterEditFromModal() {
  var charId = _detailCharId;
  closeCharacterDetail();
  openCharacterEdit(charId);
}

// ── INTERNAL ──────────────────────────────────────────────────────────────────
// Section 10: Character Manager (Edit / Create)

function openCharacterEdit(charId) {
  _editCharId   = charId;
  _editIsCreate = false;
  var base = null;
  for (var i = 0; i < appState.characters.length; i++) {
    if (appState.characters[i].id === charId) { base = appState.characters[i]; break; }
  }
  if (!base) {
    for (var j = 0; j < _charAdds.length; j++) {
      if (_charAdds[j].id === charId) { base = _charAdds[j]; break; }
    }
  }
  if (!base) return;
  var cur = _charEdits[charId] ? Object.assign({}, base, _charEdits[charId]) : base;
  _editDraft = {
    name:           cur.name || '',
    nameKo:         cur.nameKo || '',
    image:          cur.image || '',
    rarity:         cur.rarity || 5,
    role:           cur.role || '',
    element:        cur.element || '',
    specialElement: cur.specialElement || '',
    releaseDate:    cur.releaseDate || '',
    releaseOrder:   cur.releaseOrder || null,
    isReleased:     cur.isReleased !== false
  };
  renderCharacterEditModal();
  document.getElementById('charEditModal').style.display = 'block';
}

function openCharacterCreate() {
  _editCharId   = null;
  _editIsCreate = true;
  _editDraft = {
    id: '', name: '', nameKo: '', image: '',
    rarity: 5, role: 'attack', element: 'physical',
    specialElement: '', releaseDate: '', releaseOrder: null, isReleased: true
  };
  renderCharacterEditModal();
  document.getElementById('charEditModal').style.display = 'block';
}

function renderCharacterEditModal() {
  var d        = _editDraft;
  var isCreate = _editIsCreate;

  var roleOpts = '<option value="">-</option>';
  for (var r = 0; r < CHAR_ROLES.length; r++) {
    roleOpts += '<option value="' + CHAR_ROLES[r] + '"' + (d.role === CHAR_ROLES[r] ? ' selected' : '') + '>' + (CHAR_ROLE_LABELS[CHAR_ROLES[r]] || CHAR_ROLES[r]) + '</option>';
  }
  var elemOpts = '<option value="">-</option>';
  for (var e = 0; e < CHAR_ELEMENTS.length; e++) {
    elemOpts += '<option value="' + CHAR_ELEMENTS[e] + '"' + (d.element === CHAR_ELEMENTS[e] ? ' selected' : '') + '>' + (CHAR_ELEMENT_LABELS[CHAR_ELEMENTS[e]] || CHAR_ELEMENTS[e]) + '</option>';
  }

  var topSection = isCreate
    ? '<div class="edit-row"><label class="edit-label">ID <span class="edit-required">*</span></label>' +
      '<div class="edit-id-wrap"><input class="edit-input" id="edit-id-field" type="text" value="' + (d.id || '') + '" ' +
      'placeholder="영문 소문자, 언더스코어" oninput="validateCreateId(this.value)">' +
      '<span class="edit-id-hint" id="edit-id-hint"></span></div></div>'
    : '<div class="edit-id-display"><span class="edit-id-label">ID</span><span class="edit-id-value">' + _editCharId + '</span></div>';

  var html =
    '<div class="char-detail-overlay" onclick="if(event.target===this)closeCharacterEdit()">' +
    '<div class="char-detail-panel char-edit-panel">' +
    '<div class="detail-header">' +
    '<span class="detail-header-name">' + (isCreate ? '캐릭터 추가' : '캐릭터 수정') + '</span>' +
    '<button class="detail-close-btn" onclick="closeCharacterEdit()">&#x2715;</button>' +
    '</div>' +
    '<div class="detail-body">' +
    topSection +
    '<div class="edit-row"><label class="edit-label">이름 (영문)</label>' +
    '<input class="edit-input" id="edit-name" type="text" value="' + (d.name || '').replace(/"/g, '&quot;') + '"></div>' +
    '<div class="edit-row"><label class="edit-label">이름 (한글)</label>' +
    '<input class="edit-input" id="edit-nameKo" type="text" value="' + (d.nameKo || '').replace(/"/g, '&quot;') + '"></div>' +
    '<div class="edit-row"><label class="edit-label">이미지 파일</label>' +
    '<input class="edit-input" id="edit-image" type="text" value="' + (d.image || '').replace(/"/g, '&quot;') + '" placeholder="예: 벨리나.webp"></div>' +
    '<div class="edit-row"><label class="edit-label">희귀도</label>' +
    '<select class="edit-select" id="edit-rarity">' +
    '<option value="5"' + (d.rarity === 5 ? ' selected' : '') + '>S (5성)</option>' +
    '<option value="4"' + (d.rarity === 4 ? ' selected' : '') + '>A (4성)</option>' +
    '</select></div>' +
    '<div class="edit-row"><label class="edit-label">역할</label>' +
    '<select class="edit-select" id="edit-role">' + roleOpts + '</select></div>' +
    '<div class="edit-row"><label class="edit-label">속성</label>' +
    '<select class="edit-select" id="edit-element">' + elemOpts + '</select></div>' +
    '<div class="edit-row"><label class="edit-label">특수속성</label>' +
    '<input class="edit-input" id="edit-specialElement" type="text" value="' + (d.specialElement || '') + '" placeholder="MIYABI / YIXUAN / SHUNGUANG"></div>' +
    '<div class="edit-row"><label class="edit-label">출시일</label>' +
    '<input class="edit-input" id="edit-releaseDate" type="text" value="' + (d.releaseDate || '') + '" placeholder="yyyy-mm-dd"></div>' +
    '<div class="edit-row"><label class="edit-label">출시 순서</label>' +
    '<input class="edit-input" id="edit-releaseOrder" type="number" min="1" value="' + (d.releaseOrder || '') + '" placeholder="미입력 시 자동"></div>' +
    '<div class="edit-row"><label class="edit-label">출시 여부</label>' +
    '<button class="toggle-btn' + (d.isReleased ? ' active' : '') + '" onclick="editToggleReleased()">' + (d.isReleased ? '출시' : '출시 예정') + '</button></div>' +
    '</div>' +
    '<div class="detail-footer">' +
    '<button class="detail-btn-cancel" onclick="closeCharacterEdit()">취소</button>' +
    '<button class="detail-btn-save" id="edit-save-btn"' + (isCreate && !d.id ? ' disabled' : '') +
    ' onclick="saveCharacterEdit()">' + (isCreate ? '추가' : '저장') + '</button>' +
    '</div></div></div>';

  document.getElementById('charEditModal').innerHTML = html;
}

function editToggleReleased() {
  _editDraft.isReleased = !_editDraft.isReleased;
  var btn = document.querySelector('[onclick="editToggleReleased()"]');
  if (btn) {
    btn.classList.toggle('active', _editDraft.isReleased);
    btn.textContent = _editDraft.isReleased ? '출시' : '출시 예정';
  }
}

function validateCreateId(rawId) {
  var sanitized = rawId.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  _editDraft.id = sanitized;
  var hint    = document.getElementById('edit-id-hint');
  var saveBtn = document.getElementById('edit-save-btn');

  if (!sanitized) {
    if (hint) { hint.textContent = 'ID는 필수입니다.'; hint.className = 'edit-id-hint hint-error'; }
    if (saveBtn) saveBtn.disabled = true;
    return;
  }

  var isDupe = false;
  for (var i = 0; i < appState.characters.length; i++) {
    if (appState.characters[i].id === sanitized) { isDupe = true; break; }
  }
  if (!isDupe) {
    for (var j = 0; j < _charAdds.length; j++) {
      if (_charAdds[j].id === sanitized) { isDupe = true; break; }
    }
  }

  if (isDupe) {
    if (hint) { hint.textContent = '중복된 ID입니다.'; hint.className = 'edit-id-hint hint-error'; }
    if (saveBtn) saveBtn.disabled = true;
  } else {
    if (hint) { hint.textContent = sanitized !== rawId ? '→ ' + sanitized : ''; hint.className = 'edit-id-hint hint-ok'; }
    if (saveBtn) saveBtn.disabled = false;
  }
}

function saveCharacterEdit() {
  if (_editIsCreate && !_editDraft.id) return;

  function gv(id) { var el = document.getElementById(id); return el ? el.value : ''; }
  var updates = {
    name:           gv('edit-name'),
    nameKo:         gv('edit-nameKo'),
    image:          gv('edit-image'),
    rarity:         parseInt(gv('edit-rarity')) || 5,
    role:           gv('edit-role') || null,
    element:        gv('edit-element') || null,
    specialElement: gv('edit-specialElement') || null,
    releaseDate:    gv('edit-releaseDate'),
    releaseOrder:   parseInt(gv('edit-releaseOrder')) || null,
    isReleased:     _editDraft.isReleased
  };

  if (_editIsCreate) {
    var newChar = Object.assign({ id: _editDraft.id, gameId: appState.currentGame, basePerformance: null }, updates);
    appState.characters.push(newChar);
  } else {
    for (var si = 0; si < appState.characters.length; si++) {
      if (appState.characters[si].id === _editCharId) {
        appState.characters[si] = Object.assign({}, appState.characters[si], updates);
        break;
      }
    }
  }
  _charEdits = {};
  _charAdds  = [];
  saveCharactersToLocalStorage(appState.currentGame);

  renderCardGrid();
  closeCharacterEdit();
}

function saveCharactersToLocalStorage(gameId) {
  try { localStorage.setItem('pickup_manager_characters_' + gameId, JSON.stringify(appState.characters)); } catch(e) {}
}

function loadCharactersFromLocalStorage(gameId) {
  try {
    var raw = localStorage.getItem('pickup_manager_characters_' + gameId);
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function downloadCharactersPreview() {
  var blob = new Blob([JSON.stringify(appState.characters, null, 2)], { type: 'application/json' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href = url;
  a.download = 'zzz.characters.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function closeCharacterEdit() {
  _editCharId   = null;
  _editDraft    = null;
  _editIsCreate = false;
  var modal = document.getElementById('charEditModal');
  modal.style.display = 'none';
  modal.innerHTML = '';
}

function renderRoster() {
  var roster = appState.currentGame ? appState.rosters[appState.currentGame] : null;

  var rosterCount = document.getElementById("rosterCount");
  rosterCount.textContent = roster ? roster.characters.length : 0;

  var rosterList = document.getElementById("rosterList");
  rosterList.innerHTML = "";

  if (!roster) {
    return;
  }

  for (var i = 0; i < appState.characters.length; i++) {
    var char = appState.characters[i];
    var owned = false;
    for (var j = 0; j < roster.characters.length; j++) {
      if (roster.characters[j].characterId === char.id) {
        owned = true;
        break;
      }
    }

    var div = document.createElement("div");
    div.className = "roster-item" + (owned ? " owned" : "");
    div.textContent = (char.nameKo || char.name) + (char.isReleased ? "" : " ✦");
    div.title = char.isReleased ? "" : "출시 예정";
    (function(charId) {
      div.onclick = function() { toggleRosterCharacter(charId); };
    })(char.id);

    rosterList.appendChild(div);
  }
}

// gachaGuide는 표시 전용이다 — 여기서는 아무것도 계산하지 않고, 계정 상태와도
// 비교하지 않는다(보유 여부/파티 중복/투자선 계산은 이후 evaluationEngine 단계).
// meta.gachaGuide가 없으면 빈 문자열을 반환해 기존 화면과 완전히 동일하게 둔다.
function renderGachaGuideSection(meta) {
  var guide = meta.gachaGuide;
  if (!guide) return '';

  var GG_ROLE_LABEL = {
    support: '지원', harmony: '화합', debuffer: '디버퍼', healer: '힐러', tank: '탱커',
    attack: '강공', stun: '격파', anomaly: '이상', defense: '방어', rupture: '명파'
  };
  function ggRoleLabel(r) { return GG_ROLE_LABEL[r] || r; }

  function ggCharName(id) {
    for (var i = 0; i < appState.characters.length; i++) {
      if (appState.characters[i].id === id) {
        return appState.characters[i].nameKo || appState.characters[i].name || id;
      }
    }
    return id;
  }
  function ggCharNames(ids) {
    if (!ids || ids.length === 0) return '';
    var names = [];
    for (var i = 0; i < ids.length; i++) names.push(ggCharName(ids[i]));
    return names.join(', ');
  }

  var GG_REQ_TYPE_LABEL = { all: '전원 필요', one_of: '택 1', role: '역할 조건' };

  var html = '';
  html += '<div class="gg-heading">📖 가챠 가이드</div>';

  // 1. 캐릭터 특징
  var keyFeatures = guide.keyFeatures || [];
  if (keyFeatures.length > 0) {
    html += '<div class="result-block">';
    html += '<div class="result-label">캐릭터 특징</div>';
    html += '<div class="gg-feature-grid">';
    for (var i = 0; i < keyFeatures.length; i++) {
      var f = keyFeatures[i];
      if (!f) continue;
      html += '<div class="gg-feature-card">';
      html += '<div class="gg-feature-title">' + (f.title || '') + '</div>';
      html += '<div class="gg-feature-desc">' + (f.description || '') + '</div>';
      html += '</div>';
    }
    html += '</div>';
    html += '</div>';
  }

  // 2. 파티 구성 조건 — 시스템 작동 조건. 고점 추천 파티가 아님을 명시.
  var partyReq = guide.partyRequirements || [];
  if (partyReq.length > 0) {
    html += '<div class="result-block">';
    html += '<div class="result-label">파티 구성 조건</div>';
    html += '<div class="gg-hint">스킬이 정상 작동하기 위한 시스템 조건입니다 — 고점 추천 조합이 아닙니다.</div>';
    for (var i = 0; i < partyReq.length; i++) {
      var r = partyReq[i];
      if (!r) continue;
      html += '<div class="gg-req-row">';
      html += '<span class="badge">' + (GG_REQ_TYPE_LABEL[r.type] || r.type || '조건') + '</span>';
      var reqNames = ggCharNames(r.characterIds);
      var reqRoles = (r.roles || []).map(ggRoleLabel).join(', ');
      if (reqNames) html += '<span class="gg-req-targets">' + reqNames + '</span>';
      if (reqRoles) html += '<span class="gg-req-targets">' + reqRoles + '</span>';
      if (r.description) html += '<div class="gg-req-desc">' + r.description + '</div>';
      html += '</div>';
    }
    html += '</div>';
  }

  // 3. 핵심 파츠 — 시스템 조건과는 별도 블록
  var coreP = guide.corePartners || [];
  if (coreP.length > 0) {
    html += '<div class="result-block">';
    html += '<div class="result-label">핵심 파츠</div>';
    for (var i = 0; i < coreP.length; i++) {
      var p = coreP[i];
      if (!p) continue;
      html += '<div class="gg-partner-row">';
      html += '<div class="gg-partner-names">' + (ggCharNames(p.characterIds) || '(대상 없음)') + '</div>';
      if (p.description) html += '<div class="gg-partner-desc">' + p.description + '</div>';
      html += '</div>';
    }
    html += '</div>';
  }

  // 4. 대체 및 범용 파츠
  var altP = guide.alternativePartners || [];
  if (altP.length > 0) {
    html += '<div class="result-block">';
    html += '<div class="result-label">대체 및 범용 파츠</div>';
    for (var i = 0; i < altP.length; i++) {
      var ap = altP[i];
      if (!ap) continue;
      var apRoles = (ap.roles || []).map(ggRoleLabel).join(', ');
      html += '<div class="gg-partner-row">';
      html += '<div class="gg-partner-names">' + (ggCharNames(ap.characterIds) || '(대상 없음)') + (apRoles ? ' <span class="gg-partner-role">' + apRoles + '</span>' : '') + '</div>';
      if (ap.description) html += '<div class="gg-partner-desc">' + ap.description + '</div>';
      html += '</div>';
    }
    html += '</div>';
  }

  // 5. 대체 장비 — 비어있으면 섹션 숨김
  var altEq = guide.alternativeEquipment || [];
  if (altEq.length > 0) {
    html += '<div class="result-block">';
    html += '<div class="result-label">대체 장비</div>';
    for (var i = 0; i < altEq.length; i++) {
      var e = altEq[i];
      if (!e) continue;
      html += '<div class="gg-partner-row">';
      html += '<div class="gg-partner-names">' + (e.name || '') + '</div>';
      if (e.description) html += '<div class="gg-partner-desc">' + e.description + '</div>';
      html += '</div>';
    }
    html += '</div>';
  }

  // 6. 이런 계정에 추천 — 계정과 실제 비교하지 않은 일반 조건, 체크리스트로 표시
  var recFor = guide.recommendedFor || [];
  if (recFor.length > 0) {
    html += '<div class="result-block">';
    html += '<div class="result-label">이런 계정에 추천</div>';
    html += '<div class="gg-hint">계정과 직접 비교한 결과가 아닌 일반 조건입니다 — 자신의 상황과 비교해보세요.</div>';
    html += '<ul class="gg-checklist">';
    for (var i = 0; i < recFor.length; i++) html += '<li>' + recFor[i] + '</li>';
    html += '</ul>';
    html += '</div>';
  }

  // 7. 이런 경우에는 다시 생각 — 경고/재고 영역으로 구분
  var reconsider = guide.reconsiderIf || [];
  if (reconsider.length > 0) {
    html += '<div class="result-block gg-warn-block">';
    html += '<div class="result-label">⚠️ 이런 경우에는 다시 생각</div>';
    html += '<div class="gg-hint">계정과 직접 비교한 결과가 아닌 일반 조건입니다.</div>';
    html += '<ul class="gg-checklist gg-checklist-warn">';
    for (var i = 0; i < reconsider.length; i++) html += '<li>' + reconsider[i] + '</li>';
    html += '</ul>';
    html += '</div>';
  }

  // 8. GOOD / BAD — 새 데이터 없이 기존 pullReasons/skipReasons 재사용.
  // 가이드가 있는 캐릭터는 여기서만 렌더링하고, renderResults 본문의 기존 두 이유
  // 블록은 hasGuide가 true일 때 건너뛰어 중복 표시를 막는다(아래 renderResults 참고).
  var pullReasons = meta.pullReasons || [];
  var skipReasons = meta.skipReasons || [];
  if (pullReasons.length > 0 || skipReasons.length > 0) {
    html += '<div class="two-col-grid">';
    html += '<div class="result-block">';
    html += '<div class="result-label">👍 뽑아야 할 이유</div>';
    html += '<ul class="reason-list">';
    for (var i = 0; i < pullReasons.length; i++) html += '<li>' + pullReasons[i] + '</li>';
    html += '</ul>';
    html += '</div>';
    html += '<div class="result-block">';
    html += '<div class="result-label">👎 뽑지 말아야 할 이유</div>';
    html += '<ul class="reason-list reason-skip">';
    for (var i = 0; i < skipReasons.length; i++) html += '<li>' + skipReasons[i] + '</li>';
    html += '</ul>';
    html += '</div>';
    html += '</div>';
  }

  // 9. 출처 — 없으면 섹션 숨김. 공식 자료/커뮤니티 참고 자료 구분은 sources[].name
  // 텍스트에 이미 반영되어 있으므로(예: "(공식 자료)"/"(참고 가이드 평가)") 그대로 노출.
  var sources = meta.sources || [];
  if (sources.length > 0) {
    html += '<details class="result-block gg-sources"><summary class="result-label">출처</summary>';
    html += '<ul class="gg-source-list">';
    for (var i = 0; i < sources.length; i++) {
      var s = sources[i];
      if (!s) continue;
      html += '<li>';
      if (s.url) {
        html += '<a href="' + escAttr(s.url) + '" target="_blank" rel="noopener noreferrer">' + (s.name || s.url) + '</a>';
      } else {
        html += (s.name || '');
      }
      html += '</li>';
    }
    html += '</ul>';
    html += '</details>';
  }

  return html;
}

function renderResults(result) {
  function scoreBadge(score) {
    if (score == null) return '';
    var cls   = score >= 9.0 ? 'badge-high'   : score >= 6.0 ? 'badge-medium'   : 'badge-low';
    var label = score >= 9.0 ? 'HIGH'          : score >= 6.0 ? 'MEDIUM'          : 'LOW';
    return '<span class="badge ' + cls + '">' + label + '</span>';
  }

  var character = result.character;
  var meta = result.meta;
  var finalPct = Math.round((result.finalScore / 10) * 100);

  var roster = appState.rosters[appState.currentGame] || { characters: [] };
  var isOwned = roster.characters.some(function(e) { return e.characterId === character.id; });
  var verdictLabel = result.finalScore >= 8.5 ? '필수 뽑기'
                   : result.finalScore >= 7.0 ? '추천'
                   : result.finalScore >= 5.5 ? '선택'
                   : '비추천';
  var pullClass = result.finalScore >= 8.5 ? 'must-pull'
                : result.finalScore >= 7.0 ? 'recommended'
                : result.finalScore >= 5.5 ? 'optional'
                : 'skip';

  var uncScore  = (meta.uncertainty && meta.uncertainty.score != null) ? meta.uncertainty.score : 0;
  var fomoScore = (meta.fomoRisk && meta.fomoRisk.score != null) ? meta.fomoRisk.score : 0;
  var action = (function() {
    var fs = result.finalScore, ag = result.accountGrowth, rs = meta.replacementScore || 0;
    var ws = meta.weaponRecommendation ? meta.weaponRecommendation.score : 0;
    if (fs < 5.5) return 'skip';
    if (uncScore >= 7) return 'wait';
    var ww = ws >= 7 && uncScore < 5 && ag >= 6 && rs <= 6;
    if (fs >= 8.5 && ww && rs <= 4) return 'full';
    if (fs >= 7.0 && ws >= 7 && uncScore >= 5) return 'hold_weapon';
    if (fs >= 7.0 && ww) return 'full';
    return 'char_only';
  })();

  function kpiTile(icon, label, score, badgeHtml, captionHtml) {
    var pct = Math.round((score / 10) * 100);
    var display = parseFloat(score.toFixed(1));
    return '<div class="kpi-tile">' +
      '<div class="kpi-tile-head"><span class="kpi-tile-icon">' + icon + '</span>' + label + '</div>' +
      '<div class="kpi-tile-value-row"><span class="kpi-tile-value">' + display + '</span>' + (badgeHtml || '') + '</div>' +
      '<div class="kpi-tile-bar-track"><div class="kpi-tile-bar" style="width:' + pct + '%;background:var(--accent)"></div></div>' +
      (captionHtml || '') +
      '</div>';
  }

  var html = '';

  html += '<div class="results-container">';

  // Verdict Hero: 최종 추천도 + 추천 행동 통합
  var inlineBadge = isOwned
    ? '<span class="verdict-inline verdict-owned">보유중</span>'
    : '<span class="verdict-inline">' + verdictLabel + '</span>';
  var _aLabels = { full: '명전 추천', hold_weapon: '명함만 확보 후 전무 보류', wait: '2주 대기', char_only: '명함 추천', skip: '스킵' };
  var _aCss    = { full: 'action-full', hold_weapon: 'action-hold', wait: 'action-wait', char_only: 'action-char', skip: 'action-skip' };
  html += '<div class="result-block verdict-hero pull-' + pullClass + ' ' + (_aCss[action] || '') + '">';
  html += '<div class="verdict-hero-top"><div class="result-label">최종 추천도' + inlineBadge + '</div></div>';
  html += '<div class="verdict-hero-score-row">';
  html += '<div class="final-score verdict-hero-score">' + parseFloat(result.finalScore.toFixed(1)) + '<span class="verdict-hero-score-unit"> / 10</span></div>';
  html += '<div class="verdict-hero-bar-col"><div class="score-bar-wrap"><div class="score-bar-track"><div class="score-bar" style="width:' + finalPct + '%"></div></div></div></div>';
  html += '</div>';
  html += '<div class="verdict-hero-action"><span>추천 행동</span><span class="verdict-hero-action-arrow">▸</span><span class="action-label">' + (_aLabels[action] || '') + '</span></div>';
  if (result.isCurrentPickup) html += '<div class="pickup-badge">현재 픽업 중</div>';
  if (fomoScore >= 7) html += '<div class="fomo-warn">⚠️ 불안 과금 주의 — 충분히 고민 후 결정하세요</div>';
  if (action === 'wait' && meta.uncertainty && meta.uncertainty.reasons && meta.uncertainty.reasons.length > 0) {
    html += '<div class="sub-note">불확실 요인 : ' + meta.uncertainty.reasons.join(' / ') + '</div>';
  }
  html += '</div>';

  // 가챠 가이드 — meta.gachaGuide가 있는 캐릭터에서만 표시(없으면 빈 문자열이라
  // 기존 화면과 완전히 동일). 최상단 추천 결과 다음, 세부 점수 카드 이전에 배치.
  var hasGuide = !!meta.gachaGuide;
  html += renderGachaGuideSection(meta);

  // KPI 타일 그리드: 메타성능 / 계정체급 / 미래가치 / 대체가능성 / 불확실성 / FOMO
  var confClass = meta.confidence >= 0.80 ? 'confidence-high'
                : meta.confidence >= 0.60 ? 'confidence-mid'
                : 'confidence-low';
  html += '<div class="kpi-grid">';
  html += kpiTile('📈', '메타 성능', meta.metaScore, scoreBadge(meta.metaScore),
    '<div class="kpi-tile-caption confidence-note ' + confClass + '">신뢰도 ' + Math.round(meta.confidence * 100) + '%</div>');
  html += kpiTile('🏦', '계정 체급', result.accountGrowth, scoreBadge(result.accountGrowth));
  html += kpiTile('🔮', '미래 가치', meta.futureScore, scoreBadge(meta.futureScore));
  html += kpiTile('♻️', '대체 가능성', meta.replacementScore, '',
    '<div class="kpi-tile-caption">높을수록 대체 용이</div>');
  html += kpiTile('❓', '불확실성', uncScore, '');
  html += kpiTile('🔥', 'FOMO', fomoScore, '', fomoScore >= 7 ? '<div class="kpi-tile-caption is-warn">⚠️ 주의</div>' : '');
  html += '</div>';

  // KPI Notes: 불확실 요인 / FOMO 사유 (보조 정보)
  var uncReasons = (meta.uncertainty && meta.uncertainty.reasons) || [];
  var fomoReason = meta.fomoRisk && meta.fomoRisk.reason;
  if (uncReasons.length > 0 || fomoReason) {
    html += '<div class="kpi-notes">';
    if (uncReasons.length > 0) html += '<div><strong>불확실 요인</strong> · ' + uncReasons.join(' / ') + '</div>';
    if (fomoReason) html += '<div><strong>FOMO 사유</strong> · ' + fomoReason + '</div>';
    html += '</div>';
  }

  // Trio Split: 명함 / 돌파 / 전무
  var btRecommended = meta.breakthroughRecommendation.recommendedBreakthrough;
  html += '<div class="trio-split">';
  html += '<div class="trio-col">';
  html += '<div class="trio-label">명함 추천도' + scoreBadge(meta.characterRecommendation.score) + '</div>';
  html += '<div class="trio-value">' + parseFloat(meta.characterRecommendation.score.toFixed(1)) + '</div>';
  html += '<div class="trio-sub">' + meta.characterRecommendation.reason + '</div>';
  html += '</div>';
  html += '<div class="trio-col">';
  html += '<div class="trio-label">돌파 추천도' + scoreBadge(meta.breakthroughRecommendation.score) + '</div>';
  html += '<div class="trio-value">' + parseFloat(meta.breakthroughRecommendation.score.toFixed(1)) + '</div>';
  html += '<div class="trio-sub">추천 돌파 : ' + (btRecommended || '정보 없음') + '<br>' + meta.breakthroughRecommendation.reason + '</div>';
  html += '</div>';
  html += '<div class="trio-col">';
  html += '<div class="trio-label">전무 가치' + scoreBadge(meta.weaponRecommendation.score) + '</div>';
  html += '<div class="trio-value">' + parseFloat(meta.weaponRecommendation.score.toFixed(1)) + '</div>';
  html += '<div class="trio-sub">' + meta.weaponRecommendation.reason + '</div>';
  html += '</div>';
  html += '</div>';

  // Two-Col: 뽑아야 할 이유 / 뽑지 말아야 할 이유
  // gachaGuide가 있는 캐릭터는 이 내용을 가이드 섹션의 "GOOD/BAD"에서 이미
  // 표시했으므로, 여기서는 gachaGuide가 없을 때만 렌더링해 중복을 막는다.
  if (!hasGuide) {
    html += '<div class="two-col-grid">';
    html += '<div class="result-block">';
    html += '<div class="result-label">👍 뽑아야 할 이유</div>';
    html += '<ul class="reason-list">';
    var pullReasons = meta.pullReasons || [];
    for (var j = 0; j < pullReasons.length; j++) {
      html += '<li>' + pullReasons[j] + '</li>';
    }
    html += '</ul>';
    html += '</div>';
    html += '<div class="result-block">';
    html += '<div class="result-label">👎 뽑지 말아야 할 이유</div>';
    html += '<ul class="reason-list reason-skip">';
    var skipReasons = meta.skipReasons || [];
    for (var k2 = 0; k2 < skipReasons.length; k2++) {
      html += '<li>' + skipReasons[k2] + '</li>';
    }
    html += '</ul>';
    html += '</div>';
    html += '</div>';
  }

  // Two-Col: 커뮤니티 투자 분석 / 향후 시너지 캐릭터
  html += '<div class="two-col-grid">';

  html += '<div class="result-block">';
  html += '<div class="result-label">커뮤니티 투자 분석</div>';
  var commSummary = meta.communitySummary || null;
  var hasNewComm = commSummary && (commSummary.metaPosition || commSummary.commonEvaluation || commSummary.pros || commSummary.cons);
  var hasOldComm = commSummary && (commSummary.positive || commSummary.negative || commSummary.commonOpinion);
  if (hasNewComm) {
    if (commSummary.metaPosition)     html += '<div class="summary-section"><div class="summary-label">메타 위치</div><div class="summary-text">' + commSummary.metaPosition + '</div></div>';
    if (commSummary.commonEvaluation) html += '<div class="summary-section"><div class="summary-label">공통 평가</div><div class="summary-text">' + commSummary.commonEvaluation + '</div></div>';
    if (commSummary.pros && commSummary.pros.length > 0) {
      html += '<div class="summary-section"><div class="summary-label comm-pos">장점</div><ul class="reason-list">';
      for (var pi = 0; pi < commSummary.pros.length; pi++) { html += '<li>' + commSummary.pros[pi] + '</li>'; }
      html += '</ul></div>';
    }
    if (commSummary.cons && commSummary.cons.length > 0) {
      html += '<div class="summary-section"><div class="summary-label comm-neg">단점</div><ul class="reason-list reason-skip">';
      for (var ci = 0; ci < commSummary.cons.length; ci++) { html += '<li>' + commSummary.cons[ci] + '</li>'; }
      html += '</ul></div>';
    }
    if (commSummary.concerns)      html += '<div class="summary-section"><div class="summary-label comm-note">실전 우려</div><div class="summary-text">' + commSummary.concerns + '</div></div>';
    if (commSummary.investmentNote) html += '<div class="summary-section"><div class="summary-label">투자 메모</div><div class="summary-text">' + commSummary.investmentNote + '</div></div>';
  } else if (hasOldComm) {
    if (commSummary.commonOpinion) html += '<div class="summary-section"><div class="summary-label">공통 의견</div><div class="summary-text">' + commSummary.commonOpinion + '</div></div>';
    if (commSummary.positive && commSummary.positive.length > 0) {
      html += '<div class="summary-section"><div class="summary-label comm-pos">긍정</div><ul class="reason-list">';
      for (var oi = 0; oi < commSummary.positive.length; oi++) { html += '<li>' + commSummary.positive[oi] + '</li>'; }
      html += '</ul></div>';
    }
    if (commSummary.negative && commSummary.negative.length > 0) {
      html += '<div class="summary-section"><div class="summary-label comm-neg">부정</div><ul class="reason-list reason-skip">';
      for (var ni = 0; ni < commSummary.negative.length; ni++) { html += '<li>' + commSummary.negative[ni] + '</li>'; }
      html += '</ul></div>';
    }
    if (commSummary.concern) html += '<div class="summary-section"><div class="summary-label comm-note">우려</div><div class="summary-text">' + commSummary.concern + '</div></div>';
  } else {
    html += '<p class="no-data">커뮤니티 분석 미등록</p>';
  }
  html += '</div>';

  html += '<div class="result-block">';
  html += '<div class="result-label">향후 시너지 캐릭터</div>';
  var futureLinks = meta.futureLinks || [];
  if (futureLinks.length === 0) {
    html += '<p class="no-data">등록된 시너지 없음</p>';
  } else {
    for (var k = 0; k < futureLinks.length; k++) {
      var fl = futureLinks[k];
      var linkedChar = null;
      for (var m = 0; m < appState.characters.length; m++) {
        if (appState.characters[m].id === fl.characterId) {
          linkedChar = appState.characters[m];
          break;
        }
      }
      var flName = linkedChar ? linkedChar.name : fl.characterId;
      var flReleased = linkedChar ? linkedChar.isReleased : false;
      html += '<div class="future-link">';
      html += '<div class="future-name">' + flName + (flReleased ? "" : " [출시 예정]") + '</div>';
      html += '<div class="future-synergy">' + fl.synergy + '</div>';
      html += '<div class="future-conf">확률 ' + Math.round(fl.confidence * 100) + '%</div>';
      html += '</div>';
    }
  }
  html += '</div>';

  html += '</div>';

  // Verdict Callout: 최종 판단 문장
  var _vName    = character.nameKo || character.name;
  var _vActions = { full: '명전 투자를 추천합니다', hold_weapon: '명함 확보 후 전무는 보류를 추천합니다', wait: '2주 대기 후 재평가를 추천합니다', char_only: '명함 확보를 추천합니다', skip: '이번 픽업 스킵을 추천합니다' };
  var _vParts   = [_vName + ': ' + (_vActions[action] || '') + '.'];
  if (result.accountGrowth < 5) _vParts.push('내 계정 기여 제한적.');
  if (meta.replacementScore >= 7) _vParts.push('대체 가능성 높음.');
  if (isOwned) _vParts.push('이미 보유 중 — 추가 투자를 신중히 검토하세요.');
  if (fomoScore >= 7) _vParts.push('⚠️ 불안 과금 주의 — 충분히 고민 후 결정하세요.');
  html += '<div class="result-block verdict-block verdict-callout">';
  html += '<div class="result-label">📌 최종 판단</div>';
  html += '<div class="verdict-sentence">' + _vParts.join(' ') + '</div>';
  html += '</div>';

  html += '</div>';

  document.getElementById("resultsPanel").innerHTML = html;
}

function renderNoMeta(character) {
  document.getElementById("resultsPanel").innerHTML =
    '<div class="results-placeholder">' +
    '<p><strong>' + (character.nameKo || character.name) + '</strong>의 메타 데이터가 아직 등록되지 않았습니다.</p>' +
    '<p class="sub-note">현재 픽업 캐릭터의 메타 분석이 완료되면 자동으로 표시됩니다.</p>' +
    '</div>';
}

function renderPlaceholder(message) {
  document.getElementById("resultsPanel").innerHTML =
    '<div class="results-placeholder"><p>' + message + '</p></div>';
}

function renderError(message) {
  document.getElementById("resultsPanel").innerHTML =
    '<div class="results-placeholder results-error"><p>' + message + '</p></div>';
}

// ── PUBLIC ────────────────────────────────────────────────────────────────────
// Section 7: Public Event Handlers

function onGameChange(gameId) {
  if (!gameId) {
    appState.currentGame = null;
    appState.previewMeta = {};
    document.getElementById("characterSelect").disabled = true;
    document.getElementById("analyzeBtn").disabled = true;
    document.getElementById("metaUpdateBtn").disabled = true;
    document.getElementById("metaUpdateClaudeCodeBtn").disabled = true;
    document.getElementById("cardSyncBtn").disabled = true;
    renderPlaceholder("게임을 선택해주세요.");
    return;
  }
  var config = getGameConfig();
  if (config[gameId] && config[gameId].isCustom) {
    appState.currentGame = gameId;
    appState.characters = [];
    appState.meta = [];
    appState.banner = null;
    appState.selectedCharacterId = null;
    appState.previewMeta = {};
    document.getElementById("characterSelect").disabled = true;
    document.getElementById("analyzeBtn").disabled = true;
    document.getElementById("metaUpdateBtn").disabled = true;
    document.getElementById("metaUpdateClaudeCodeBtn").disabled = true;
    document.getElementById("cardSyncBtn").disabled = true;
    renderPlaceholder("이 게임은 가챠 분석 데이터가 없습니다.\n보유 재화 탭에서 재화를 관리할 수 있습니다.");
    return;
  }
  setGame(gameId);
}

function onCharacterChange(characterId) {
  appState.selectedCharacterId = characterId || null;
  if (appState.selectedCharacterId) {
    runAnalysis();
  } else if (isCardGridGame(appState.currentGame)) {
    renderCardGrid();
  } else {
    renderPlaceholder("캐릭터를 선택해주세요.");
  }
}

function onAnalyzeClick() {
  if (appState.selectedCharacterId) {
    runAnalysis();
  }
}

function runMetaUpdate() {
  var characterId = appState.selectedCharacterId;
  var gameId      = appState.currentGame;
  if (!characterId || gameId !== 'zzz') return;

  var baseMeta = null;
  for (var i = 0; i < appState.meta.length; i++) {
    if (appState.meta[i].characterId === characterId) {
      baseMeta = appState.meta[i];
      break;
    }
  }
  if (!baseMeta) {
    alert('메타 데이터가 없는 캐릭터는 업데이트할 수 없습니다.\n먼저 meta.json에 기본 데이터를 등록하세요.');
    return;
  }

  var btn = document.getElementById('metaUpdateBtn');
  btn.disabled    = true;
  btn.textContent = '분석 중…';

  var character = null;
  for (var ci = 0; ci < appState.characters.length; ci++) {
    if (appState.characters[ci].id === characterId) {
      character = appState.characters[ci];
      break;
    }
  }

  fetch('http://localhost:3001/api/meta-update', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      gameId:           gameId,
      characterId:      characterId,
      characterName:    character ? (character.name    || '') : '',
      characterNameKo:  character ? (character.nameKo  || '') : ''
    })
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (!data.success || !data.preview) {
      throw new Error(data.error || '서버 오류');
    }
    var previewMeta = Object.assign({}, baseMeta, {
      communitySummary: data.preview.communitySummary,
      uncertainty:      data.preview.uncertainty,
      fomoRisk:         data.preview.fomoRisk,
      _isPreview:       true
    });
    appState.previewMeta[characterId] = previewMeta;
    runAnalysis();
  })
  .catch(function(err) {
    alert('메타 업데이트 실패\n\n' + err.message + '\n\nNode 서버가 실행 중인지 확인하세요.\n실행 방법: node server.js');
  })
  .finally(function() {
    btn.disabled    = false;
    btn.textContent = '메타 업데이트';
  });
}

function runClaudeCodeMetaUpdate() {
  var characterId = appState.selectedCharacterId;
  var gameId      = appState.currentGame;
  if (!characterId || !gameId) return;

  var btn = document.getElementById('metaUpdateClaudeCodeBtn');
  if (btn.disabled) return; // 실행 중 중복 클릭 방지
  var originalLabel = btn.textContent;
  btn.disabled    = true;
  btn.textContent = 'Claude Code 검색·분석 중...';

  var character = null;
  for (var ci = 0; ci < appState.characters.length; ci++) {
    if (appState.characters[ci].id === characterId) {
      character = appState.characters[ci];
      break;
    }
  }

  fetch('http://localhost:3001/api/meta-update-claude-code', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      gameId:           gameId,
      characterId:      characterId,
      characterName:    character ? (character.name   || '') : '',
      characterNameKo:  character ? (character.nameKo || '') : ''
    })
  })
  .then(function(res) {
    return res.json().then(function(data) { return { status: res.status, data: data }; });
  })
  .then(function(result) {
    var data = result.data;
    if (!data.success || !data.meta) {
      throw new Error(data.error || '서버 오류');
    }

    // meta.json에 실제로 저장된 항목으로 appState.meta를 갱신 (미리보기 아님)
    var idx = -1;
    for (var i = 0; i < appState.meta.length; i++) {
      if (appState.meta[i].characterId === characterId) { idx = i; break; }
    }
    if (idx >= 0) {
      appState.meta[idx] = data.meta;
    } else {
      appState.meta.push(data.meta);
    }

    // 기존 OpenRouter 미리보기 상태와 충돌 방지 — 실제 저장된 데이터가 우선이므로
    // 남아있던 미리보기(_isPreview) 데이터는 제거하고 즉시 재렌더링한다.
    delete appState.previewMeta[characterId];
    runAnalysis();

    btn.textContent = '메타 갱신 완료';
  })
  .catch(function(err) {
    btn.textContent = originalLabel;
    alert('Claude Code 메타 갱신 실패\n\n' + err.message);
  })
  .finally(function() {
    btn.disabled = false;
    setTimeout(function() {
      if (!btn.disabled) btn.textContent = originalLabel;
    }, 2000);
  });
}

// "카드 데이터 갱신" — 서버가 외부 소스에서 신규 캐릭터/이미지/아이콘/출시일을
// 자동 수집·저장하면, 프론트는 게임 데이터를 다시 불러와 카드를 재정렬해 보여준다.
function runCardSync() {
  var gameId = appState.currentGame;
  if (!gameId || CARD_SYNC_GAMES.indexOf(gameId) === -1) return;

  var btn = document.getElementById('cardSyncBtn');
  if (btn.disabled) return;
  var originalLabel = btn.textContent;
  btn.disabled    = true;
  btn.textContent = '자료 수집 중...';

  fetch('http://localhost:3001/api/sync-characters', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ gameId: gameId })
  })
  .then(function(res) {
    return res.json().then(function(data) { return { status: res.status, data: data }; });
  })
  .then(function(result) {
    var data = result.data;
    if (!data.success || !data.report) {
      throw new Error(data.error || '서버 오류');
    }
    var r = data.report;

    // 파일이 갱신됐으므로 localStorage 캐릭터 캐시를 비우고 파일 기준으로 재로딩
    try { localStorage.removeItem('pickup_manager_characters_' + gameId); } catch (e) {}

    return setGame(gameId).then(function() {
      btn.textContent = '갱신 완료';
      alert('카드 데이터 갱신 완료\n\n' +
        '신규 캐릭터: ' + r.added.length + '명' + (r.added.length ? ' (' + r.added.join(', ') + ')' : '') + '\n' +
        '이미지 다운로드: ' + r.imagesDownloaded + '개\n' +
        '아이콘 다운로드: ' + r.iconsDownloaded + '개\n' +
        '출시일 갱신: ' + r.datesUpdated + '건\n' +
        '한글명 보충: ' + r.nameKoFilled + '건');
    });
  })
  .catch(function(err) {
    btn.textContent = originalLabel;
    alert('카드 데이터 갱신 실패\n\n' + err.message + '\n\nNode 서버가 실행 중인지 확인하세요.\n실행 방법: node server.js');
  })
  .finally(function() {
    btn.disabled = (CARD_SYNC_GAMES.indexOf(appState.currentGame) === -1);
    setTimeout(function() {
      if (!btn.disabled) btn.textContent = originalLabel;
    }, 2000);
  });
}

// ── INTERNAL ──────────────────────────────────────────────────────────────────
// Section 10: Currency

function getGachaConfig(gameId) {
  var cfg = getGameConfig()[gameId] || {};
  var def = GACHA_CONFIG[gameId] || { charPity: 90, weaponPity: 80, pullCost: 160, packagePrice: 0, packagePulls: 0 };
  return {
    charPity:     cfg.charPity     != null ? cfg.charPity     : def.charPity,
    weaponPity:   cfg.weaponPity   != null ? cfg.weaponPity   : def.weaponPity,
    pullCost:     cfg.pullCost     != null ? cfg.pullCost     : def.pullCost,
    packagePrice: cfg.packagePrice != null ? cfg.packagePrice : def.packagePrice,
    packagePulls: cfg.packagePulls != null ? cfg.packagePulls : def.packagePulls
  };
}

function saveGachaConfig(gameId, charPity, weaponPity, pullCost, packagePrice, packagePulls) {
  var config = getGameConfig();
  if (!config[gameId]) return;
  config[gameId].charPity     = charPity;
  config[gameId].weaponPity   = weaponPity;
  config[gameId].pullCost     = pullCost;
  config[gameId].packagePrice = packagePrice;
  config[gameId].packagePulls = packagePulls;
  saveGameConfig(config);
}

function editCurrencyType(gameId, curId, type) {
  var config = getGameConfig();
  if (!config[gameId]) return;
  var currencies = config[gameId].currencies;
  for (var i = 0; i < currencies.length; i++) {
    if (currencies[i].id === curId) { currencies[i].type = type; break; }
  }
  saveGameConfig(config);
}

function calcPitySummary(gameId) {
  var cfg = getGameConfig()[gameId];
  if (!cfg) return null;
  var saved  = loadCurrencyData(gameId);
  var gacha  = getGachaConfig(gameId);
  var common = 0, charOnly = 0, weaponOnly = 0;
  (cfg.currencies || []).forEach(function(cur) {
    var pulls = Math.floor(Math.max(0, parseInt(saved[cur.id]) || 0) / (cur.rate || 1));
    var t = cur.type || 'common';
    if      (t === 'character') charOnly   += pulls;
    else if (t === 'weapon')    weaponOnly += pulls;
    else                        common     += pulls;
  });
  var totalChar   = common + charOnly;
  var totalWeapon = common + weaponOnly;
  return {
    commonPulls:        common,
    characterOnlyPulls: charOnly,
    weaponOnlyPulls:    weaponOnly,
    // 기존 display 호환 유지 (총 예상 뽑기 표시용)
    charPulls:          totalChar,
    weaponPulls:        totalWeapon,
    charPity:           gacha.charPity,
    weaponPity:         gacha.weaponPity,
    charPityCount:      gacha.charPity   > 0 ? (totalChar   / gacha.charPity).toFixed(2)   : '0.00',
    weaponPityCount:    gacha.weaponPity > 0 ? (totalWeapon / gacha.weaponPity).toFixed(2) : '0.00'
  };
}

function refreshPitySummary(gameId) {
  var pity = calcPitySummary(gameId);
  if (!pity) return;
  var el;
  el = document.getElementById('pityCharPulls');   if (el) el.textContent = pity.charPulls;
  el = document.getElementById('pityCharCount');   if (el) el.textContent = pity.charPityCount;
  el = document.getElementById('pityWeaponPulls'); if (el) el.textContent = pity.weaponPulls;
  el = document.getElementById('pityWeaponCount'); if (el) el.textContent = pity.weaponPityCount;
}

// ── Planner helpers ───────────────────────────────────────────

function loadPlannerData(gameId) {
  try {
    var raw = localStorage.getItem('pickup_manager_planner_' + gameId);
    var pd  = raw ? JSON.parse(raw) : {};
    // migrate from old flat structure
    if (!pd.cur) {
      pd.cur = {
        firstHalf:  { charGoal: parseInt(pd.charGoal)      || 0, weaponGoal: parseInt(pd.weaponGoal)      || 0 },
        secondHalf: { charGoal: 0, weaponGoal: 0 }
      };
    }
    if (!pd.next) {
      pd.next = {
        firstHalf:  { charGoal: parseInt(pd.nextCharGoal)  || 0, weaponGoal: parseInt(pd.nextWeaponGoal)  || 0 },
        secondHalf: { charGoal: 0, weaponGoal: 0 }
      };
    }
    return plannerMaybeRollover(gameId, pd);
  } catch(e) {
    return {
      cur:  { firstHalf: { charGoal: 0, weaponGoal: 0 }, secondHalf: { charGoal: 0, weaponGoal: 0 } },
      next: { firstHalf: { charGoal: 0, weaponGoal: 0 }, secondHalf: { charGoal: 0, weaponGoal: 0 } }
    };
  }
}

function savePlannerData(gameId, data) {
  try {
    localStorage.setItem('pickup_manager_planner_' + gameId, JSON.stringify(data));
  } catch(e) {}
}

// 현재 버전의 종료일이 이미 지났으면, 화면에 미리보기로만 계산되던 "다음 버전"을
// 실제 현재 버전으로 승격한다 (버전/기간/목표 모두 이월). 앱을 며칠 안 켰다가
// 다시 켰을 때 여러 버전을 건너뛴 경우를 대비해 지난 기간이 없어질 때까지 반복한다.
function plannerMaybeRollover(gameId, pd) {
  var changed = false;
  var guard = 0;
  while (guard++ < 60) {
    var effEnd = pd.endDate || plannerAutoEndDate(pd.startDate);
    if (!pd.version || !effEnd) break;

    var today = new Date(); today.setHours(0, 0, 0, 0);
    var end   = new Date(effEnd); end.setHours(0, 0, 0, 0);
    if (end >= today) break; // 아직 진행 중이거나 오늘이 마지막 날 — 아직 롤오버 아님

    var nextVer = plannerNextVersion(pd.version);
    if (!nextVer) break;

    pd.version   = nextVer;
    pd.startDate = plannerNextDayStr(effEnd);
    pd.endDate   = '';
    pd.cur  = pd.next || { firstHalf: { charGoal: 0, weaponGoal: 0 }, secondHalf: { charGoal: 0, weaponGoal: 0 } };
    pd.next = { firstHalf: { charGoal: 0, weaponGoal: 0 }, secondHalf: { charGoal: 0, weaponGoal: 0 } };
    changed = true;
  }
  if (changed) savePlannerData(gameId, pd);
  return pd;
}

function plannerAutoEndDate(startStr) {
  if (!startStr) return '';
  var d = new Date(startStr);
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + 42);
  return d.toISOString().slice(0, 10);
}

function plannerNextVersion(vStr) {
  var s = String(vStr || '').trim();
  var parts = s.split('.');
  if (parts.length < 2 || !s) return '';
  return parseInt(parts[0] || 0) + '.' + (parseInt(parts[1] || 0) + 1);
}

// ── Planner Calc (계산 전용 순수 함수) ────────────────────────

function calcPlannerPhases(pd, pity) {
  var phaseData = [
    { label: '현재 전반', data: pd.cur.firstHalf  },
    { label: '현재 후반', data: pd.cur.secondHalf },
    { label: '다음 전반', data: pd.next.firstHalf  },
    { label: '다음 후반', data: pd.next.secondHalf }
  ];
  var commonRemain     = pity.commonPulls        || 0;
  var charSpecRemain   = pity.characterOnlyPulls || 0;
  var weaponSpecRemain = pity.weaponOnlyPulls    || 0;
  var totalCharReq = 0, totalWeaponReq = 0, totalSf = 0;
  var totalCharGoalCount = 0, totalWeaponGoalCount = 0;
  var phaseResults = [];

  phaseData.forEach(function(ph) {
    var cGoal = Math.max(0, parseInt(ph.data.charGoal)   || 0);
    var wGoal = Math.max(0, parseInt(ph.data.weaponGoal) || 0);
    totalCharGoalCount   += cGoal;
    totalWeaponGoalCount += wGoal;
    var cReq  = cGoal * pity.charPity;
    var wReq  = wGoal * pity.weaponPity;

    // 캐릭터 전용 재화 먼저 소비
    var cFromSpec   = Math.min(charSpecRemain, cReq);
    charSpecRemain -= cFromSpec;
    var cNeedCommon = cReq - cFromSpec;

    // 무기 전용 재화 먼저 소비
    var wFromSpec    = Math.min(weaponSpecRemain, wReq);
    weaponSpecRemain -= wFromSpec;
    var wNeedCommon  = wReq - wFromSpec;

    // 공용 재화에서 나머지 합산하여 한 번만 차감
    var totalNeedCommon = cNeedCommon + wNeedCommon;
    var phaseSf         = Math.max(0, totalNeedCommon - commonRemain);
    commonRemain        = Math.max(0, commonRemain - totalNeedCommon);

    totalSf        += phaseSf;
    totalCharReq   += cReq;
    totalWeaponReq += wReq;
    phaseResults.push({ label: ph.label, hasGoal: cGoal > 0 || wGoal > 0, totalSf: phaseSf });
  });

  var charNeedCommon   = Math.max(0, totalCharReq   - (pity.characterOnlyPulls || 0));
  var weaponNeedCommon = Math.max(0, totalWeaponReq - (pity.weaponOnlyPulls    || 0));

  return {
    commonPulls:        pity.commonPulls        || 0,
    characterOnlyPulls: pity.characterOnlyPulls || 0,
    weaponOnlyPulls:    pity.weaponOnlyPulls    || 0,
    totalCharRequired:  totalCharReq,
    totalWeaponRequired:totalWeaponReq,
    charNeedCommon:     charNeedCommon,
    weaponNeedCommon:   weaponNeedCommon,
    totalCommonNeeded:  charNeedCommon + weaponNeedCommon,
    totalShortfall:     totalSf,
    hasAnyGoal:         (totalCharReq + totalWeaponReq) > 0,
    totalCharGoalCount:   totalCharGoalCount,
    totalWeaponGoalCount: totalWeaponGoalCount,
    phaseResults:       phaseResults
  };
}

function calcSingleVersionPhases(halfDataList, startPity) {
  var commonRemain     = startPity.commonPulls        || 0;
  var charSpecRemain   = startPity.characterOnlyPulls || 0;
  var weaponSpecRemain = startPity.weaponOnlyPulls    || 0;
  var totalCharReq = 0, totalWeaponReq = 0, totalSf = 0;
  var totalCharGoalCount = 0, totalWeaponGoalCount = 0;

  halfDataList.forEach(function(halfData) {
    var cGoal = Math.max(0, parseInt(halfData.charGoal)   || 0);
    var wGoal = Math.max(0, parseInt(halfData.weaponGoal) || 0);
    totalCharGoalCount   += cGoal;
    totalWeaponGoalCount += wGoal;
    var cReq = cGoal * (startPity.charPity   || 1);
    var wReq = wGoal * (startPity.weaponPity || 1);

    var cFromSpec   = Math.min(charSpecRemain, cReq);
    charSpecRemain -= cFromSpec;
    var cNeedCommon = cReq - cFromSpec;

    var wFromSpec    = Math.min(weaponSpecRemain, wReq);
    weaponSpecRemain -= wFromSpec;
    var wNeedCommon  = wReq - wFromSpec;

    var totalNeedCommon = cNeedCommon + wNeedCommon;
    var phaseSf         = Math.max(0, totalNeedCommon - commonRemain);
    commonRemain        = Math.max(0, commonRemain - totalNeedCommon);
    totalSf        += phaseSf;
    totalCharReq   += cReq;
    totalWeaponReq += wReq;
  });

  return {
    phases: {
      commonPulls:         startPity.commonPulls        || 0,
      characterOnlyPulls:  startPity.characterOnlyPulls || 0,
      weaponOnlyPulls:     startPity.weaponOnlyPulls    || 0,
      totalCharRequired:   totalCharReq,
      totalWeaponRequired: totalWeaponReq,
      totalShortfall:      totalSf,
      hasAnyGoal:          (totalCharReq + totalWeaponReq) > 0,
      totalCharGoalCount:  totalCharGoalCount,
      totalWeaponGoalCount:totalWeaponGoalCount
    },
    residual: {
      commonPulls:        commonRemain,
      characterOnlyPulls: charSpecRemain,
      weaponOnlyPulls:    weaponSpecRemain,
      charPity:           startPity.charPity,
      weaponPity:         startPity.weaponPity
    }
  };
}

function calcCost(phases, gacha, pd) {
  var sfSum = (phases.phaseResults || []).reduce(function(s, ph) { return s + ph.totalSf; }, 0);
  console.assert(sfSum === phases.totalShortfall,
    '[planner] invariant fail: phaseSfSum(' + sfSum + ') !== totalShortfall(' + phases.totalShortfall + ')');

  var pkgPrice = Math.max(0, parseInt(gacha.packagePrice) || 0);
  var pkgPulls = Math.max(1, parseInt(gacha.packagePulls) || 1);
  var hasPkgInfo = pkgPrice > 0 && gacha.packagePulls > 0;
  var trucks    = phases.totalShortfall > 0 ? phases.totalShortfall / pkgPulls : 0;
  var totalCost = Math.round(trucks * pkgPrice);

  // 구간별 과금
  var phaseCosts = (phases.phaseResults || []).map(function(ph) {
    return { label: ph.label, hasGoal: ph.hasGoal, cost: Math.round(ph.totalSf / pkgPulls * pkgPrice) };
  });

  // 월평균: 버전 시작일~종료일 기준, halfDays = versionDays / 2
  var monthlyCost = null;
  if (hasPkgInfo && pd.startDate && pd.endDate) {
    var s = new Date(pd.startDate); s.setHours(0,0,0,0);
    var e = new Date(pd.endDate);   e.setHours(0,0,0,0);
    var versionDays = Math.max(0, (e - s) / 86400000);
    var halfDays    = versionDays / 2;
    var activeCnt   = (phases.phaseResults || []).filter(function(ph) { return ph.hasGoal; }).length;
    var goalDays    = activeCnt * halfDays;
    var months      = Math.max(1, goalDays / 30);
    monthlyCost     = Math.round(totalCost / months);
  }

  return {
    phaseCosts:     phaseCosts,
    totalShortfall: phases.totalShortfall,
    trucks:         trucks,
    totalCost:      totalCost,
    monthlyCost:    monthlyCost,
    hasPkgInfo:     hasPkgInfo
  };
}

function testPlannerCalcInvariant() {
  function run(desc, pity, pd, expTotalSf, expCommonNeeded) {
    var r = calcPlannerPhases(pd, pity);
    var sfSum = r.phaseResults.reduce(function(s, ph) { return s + ph.totalSf; }, 0);
    var pass = sfSum === r.totalShortfall
            && r.totalShortfall  === expTotalSf
            && r.totalCommonNeeded === expCommonNeeded;
    if (pass) {
      console.log('[TEST OK] ' + desc +
        ' | totalSf=' + r.totalShortfall + ' commonNeeded=' + r.totalCommonNeeded + ' phaseSfSum=' + sfSum);
    } else {
      console.error('[TEST FAIL] ' + desc, {
        sfSum: sfSum, totalShortfall: r.totalShortfall,
        totalCommonNeeded: r.totalCommonNeeded,
        expTotalSf: expTotalSf, expCommonNeeded: expCommonNeeded
      });
    }
    return pass;
  }

  var allPass = true;
  // 승인 예시: 공용167 + 캐릭터전용3 + 무기전용0, 목표 캐릭터270 + 무기80
  var p1 = { commonPulls: 167, characterOnlyPulls: 3, weaponOnlyPulls: 0,
             charPulls: 170, weaponPulls: 167, charPity: 90, weaponPity: 80 };
  allPass &= run('승인예시: 공167+캐전3+무전0, 목표캐270+무80 → 부족180 공용필요347',
    p1,
    { cur:  { firstHalf:{charGoal:0,weaponGoal:0}, secondHalf:{charGoal:3,weaponGoal:1} },
      next: { firstHalf:{charGoal:0,weaponGoal:0}, secondHalf:{charGoal:0,weaponGoal:0} } },
    180, 347);

  allPass &= run('분산목표: 현재후반캐2+무1 / 다음전반캐1 → 부족180 동일',
    p1,
    { cur:  { firstHalf:{charGoal:0,weaponGoal:0}, secondHalf:{charGoal:2,weaponGoal:1} },
      next: { firstHalf:{charGoal:1,weaponGoal:0}, secondHalf:{charGoal:0,weaponGoal:0} } },
    180, 347);

  allPass &= run('목표 없음 → 부족0',
    p1,
    { cur:  { firstHalf:{charGoal:0,weaponGoal:0}, secondHalf:{charGoal:0,weaponGoal:0} },
      next: { firstHalf:{charGoal:0,weaponGoal:0}, secondHalf:{charGoal:0,weaponGoal:0} } },
    0, 0);

  // 보유 충분 케이스
  var p2 = { commonPulls: 400, characterOnlyPulls: 50, weaponOnlyPulls: 20,
             charPulls: 450, weaponPulls: 420, charPity: 90, weaponPity: 80 };
  allPass &= run('보유충분: 공400+캐전50+무전20, 목표캐1+무1 → 부족0',
    p2,
    { cur:  { firstHalf:{charGoal:1,weaponGoal:1}, secondHalf:{charGoal:0,weaponGoal:0} },
      next: { firstHalf:{charGoal:0,weaponGoal:0}, secondHalf:{charGoal:0,weaponGoal:0} } },
    0, 120);  // charNeed=max(0,90-50)=40, weaponNeed=max(0,80-20)=60 → 총100, 공용400 충분

  console.log(allPass ? '[planner] 모든 계산 검증 통과' : '[planner] 계산 검증 실패 항목 있음');
  return !!allPass;
}

// ── Planner Render (표시 전용 — 계산 없음) ────────────────────

function renderPlannerCalcCards(curPhases, nextPhases, totalPhases, curSim, nextSim, totalSim) {
  var hasAnything = curPhases.hasAnyGoal || nextPhases.hasAnyGoal || totalPhases.hasAnyGoal;
  if (!hasAnything) {
    return '<p class="planner-hint-text">캐릭터/무기 목표를 입력하면 달성 가능 여부를 계산합니다.</p>';
  }

  var tipIcon = '<span class="cmp-tip" data-tip="현재 보유 재화, 확정 여부를 기준으로 목표한 캐릭터/무기를 획득할 확률입니다.">ⓘ</span>';

  function rateStr(sim, hasGoal, field) {
    if (!hasGoal) return '100%';
    if (!sim) return '--';
    var v = sim[field];
    if (v === null || v === undefined) return '100%';
    return (v * 100).toFixed(1) + '%';
  }

  function renderCard(title, modifier, phases, sim) {
    var dimCls     = phases.hasAnyGoal ? '' : ' pacc-card--dim';
    var charOwned  = phases.characterOnlyPulls + phases.commonPulls;
    var weaponOwned = phases.weaponOnlyPulls   + phases.commonPulls;
    var charReq    = phases.totalCharRequired;
    var weaponReq  = phases.totalWeaponRequired;
    var charShort  = Math.max(0, charReq  - charOwned);
    var weaponShort = Math.max(0, weaponReq - weaponOwned);
    var charOk     = charShort  === 0;
    var weaponOk   = weaponShort === 0;
    var totalOk    = phases.totalShortfall === 0;

    var charRateStr   = rateStr(sim, phases.hasAnyGoal, 'charRate');
    var weaponRateStr = rateStr(sim, phases.hasAnyGoal, 'weaponRate');
    var totalRateStr  = rateStr(sim, phases.hasAnyGoal, 'rate');

    function dataCol(req, owned, short, ok, rateVal) {
      var statusHtml = ok ? '충분 🟢' : '부족 ' + short + ' 🔴';
      return [
        '<div class="pacc-col-left">',
        '<span class="pacc-row-goal">목표 <strong>' + req + '</strong></span>',
        '<span class="pacc-row-status ' + (ok ? 'pacc-ok' : 'pacc-lack') + '">' + statusHtml + '</span>',
        '</div>',
        '<div class="pacc-col-right">',
        '<span class="pacc-row-owned">보유 <strong>' + owned + '</strong></span>',
        '<span class="pacc-row-rate">달성 ' + rateVal + '</span>',
        '</div>'
      ].join('');
    }

    return [
      '<div class="pacc-card' + modifier + dimCls + '">',
      '<div class="pacc-card-title">' + title + '</div>',
      '<div class="pacc-card-body">',
      '<span class="pacc-lbl">캐릭터</span>',
      dataCol(charReq,   charOwned,   charShort,   charOk,   charRateStr),
      '<div class="pacc-sep"></div>',
      '<span class="pacc-lbl">무기</span>',
      dataCol(weaponReq, weaponOwned, weaponShort, weaponOk, weaponRateStr),
      '<div class="pacc-divider"></div>',
      '<div class="pacc-total-row">',
      '<span class="pacc-total-sf ' + (totalOk ? 'pacc-ok' : 'pacc-lack') + '">',
      totalOk ? '총 부족 없음' : '총 부족 <strong>' + phases.totalShortfall + '</strong>회',
      '</span>',
      '<div class="pacc-total-rate"><span class="pacc-total-rate-lbl">총 달성 확률 ' + tipIcon + '</span><strong class="' + (totalOk ? 'pacc-ok' : 'pacc-lack') + '">' + totalRateStr + '</strong></div>',
      '</div>',
      '</div>',
      '</div>'
    ].join('');
  }

  return [
    '<div class="pacc-grid">',
    renderCard('이번 버전', ' pacc-card--cur',   curPhases,   curSim),
    renderCard('다음 버전', ' pacc-card--next',  nextPhases,  nextSim),
    renderCard('전체 합산', ' pacc-card--total', totalPhases, totalSim),
    '</div>'
  ].join('');
}

function renderPlannerCost(costResult) {
  if (!costResult || !costResult.hasPkgInfo) {
    return '<p class="planner-hint-text">게임 관리 → ⚙ 천장 설정에서 1트럭 정보를 입력하면 과금을 계산합니다.</p>';
  }

  // 버전 카드 생성
  var pc = costResult.phaseCosts || [];
  function cell(ph, halfLabel) {
    if (!ph) ph = { hasGoal: false, cost: 0 };
    return [
      '<div class="cost-phase-cell' + (!ph.hasGoal ? ' cost-phase-cell--dim' : '') + '">',
      '<span class="cost-phase-label">' + halfLabel + '</span>',
      '<span class="cost-phase-amount">' + ph.cost.toLocaleString() + '원</span>',
      '</div>'
    ].join('');
  }
  function verCard(verLabel, ph1, ph2, isCur) {
    if (!ph1.hasGoal && !ph2.hasGoal) return '';
    return [
      '<div class="cost-ver-card' + (isCur ? ' cost-ver-card--cur' : '') + '">',
      '<div class="cost-ver-label">' + verLabel + '</div>',
      '<div class="cost-ver-halves">',
      cell(ph1, '전반'), cell(ph2, '후반'),
      '</div>',
      '</div>'
    ].join('');
  }
  var curCard  = verCard('현재 버전', pc[0] || {}, pc[1] || {}, true);
  var nextCard = verCard('다음 버전', pc[2] || {}, pc[3] || {}, false);
  var hasCards = curCard || nextCard;

  var okMsg = costResult.totalShortfall === 0
    ? '<p class="planner-hint-text planner-hint-text--ok" style="margin-bottom:6px">과금 없이 달성 가능합니다.</p>'
    : '';

  var monthlyRow = costResult.monthlyCost !== null
    ? '<div class="planner-cr planner-cr--monthly"><span>월 평균</span><strong>' + costResult.monthlyCost.toLocaleString() + '</strong><span>원</span></div>'
    : '';

  return [
    hasCards ? '<div class="planner-cum-title">구간별 예상 과금</div>' : '',
    curCard, nextCard,
    hasCards ? '<div class="planner-cost-divider"></div>' : '',
    okMsg,
    '<div class="planner-calc-rows planner-calc-rows--cost">',
    '<div class="planner-cr"><span>필요 트럭</span><strong>' + costResult.trucks.toFixed(1) + '</strong><span>트럭</span></div>',
    '<div class="planner-cr"><span>총 예상 금액</span><strong>' + costResult.totalCost.toLocaleString() + '</strong><span>원</span></div>',
    monthlyRow,
    '</div>'
  ].join('');
}

function updatePlannerResult(gameId, pd) {
  var pity  = calcPitySummary(gameId);
  if (!pity) return;
  var gacha       = getGachaConfig(gameId);
  var totalPhases = calcPlannerPhases(pd, pity);
  var costResult  = calcCost(totalPhases, gacha, pd);

  var _cr    = calcSingleVersionPhases([pd.cur.firstHalf, pd.cur.secondHalf], pity);
  var _nr    = calcSingleVersionPhases([pd.next.firstHalf, pd.next.secondHalf], _cr.residual);
  var curPhases  = _cr.phases;
  var nextPhases = _nr.phases;

  var calcEl = document.getElementById('plannerCalcResult');
  var costEl = document.getElementById('plannerCostResult');
  if (calcEl) calcEl.innerHTML = renderPlannerCalcCards(curPhases, nextPhases, totalPhases, null, null, null);
  if (costEl) costEl.innerHTML = renderPlannerCost(costResult);

  if (totalPhases.hasAnyGoal) {
    getGachaRulesCached(gameId).then(function(rules) {
      var curSim   = computePlannerSim(curPhases,   rules, gameId);
      var nextSim  = computePlannerSim(nextPhases,  rules, gameId);
      var totalSim = computePlannerSim(totalPhases, rules, gameId);
      var calcEl2  = document.getElementById('plannerCalcResult');
      if (calcEl2) calcEl2.innerHTML = renderPlannerCalcCards(curPhases, nextPhases, totalPhases, curSim, nextSim, totalSim);
    });
  }
}

function plannerDDay(effEnd) {
  if (!effEnd) return { text: '', cls: '' };
  var today = new Date(); today.setHours(0,0,0,0);
  var end   = new Date(effEnd); end.setHours(0,0,0,0);
  var diff  = Math.round((end - today) / 86400000);
  if (diff > 0)  return { text: 'D-' + diff,  cls: 'planner-dday--active' };
  if (diff === 0)return { text: 'D-Day',       cls: 'planner-dday--today'  };
  return           { text: '종료됨',           cls: 'planner-dday--ended'  };
}

function renderPlannerSummaryHtml(pd) {
  var startDate = pd.startDate || '';
  var endDate   = pd.endDate   || '';
  var autoEnd   = (startDate && !endDate) ? plannerAutoEndDate(startDate) : '';
  var effEnd    = endDate || autoEnd;
  var nextVer   = plannerNextVersion(pd.version);
  var nextStart = effEnd ? plannerNextDayStr(effEnd) : '';
  var nextEnd   = nextStart ? plannerAutoEndDate(nextStart) : '';
  var dd        = plannerDDay(effEnd);

  if (!pd.version && !startDate) return '';

  function halfToggle(pfx, open, activeHalf) {
    var fA = open && activeHalf === 'first';
    var sA = open && activeHalf === 'second';
    return [
      '<div class="planner-half-toggle">',
      '<button class="planner-half-btn' + (fA ? ' planner-half-btn--active' : '') + '" id="planner' + pfx + 'FirstBtn">전반</button>',
      '<button class="planner-half-btn' + (sA ? ' planner-half-btn--active' : '') + '" id="planner' + pfx + 'SecondBtn">후반</button>',
      '</div>'
    ].join('');
  }

  function goalInputs(domPfx, halfData) {
    return [
      '<div class="planner-sum-inputs">',
      '<div class="planner-sum-goal-row">',
      '<label class="planner-sum-goal-label">캐릭터</label>',
      '<input class="planner-input planner-num planner-num--sm" id="plan' + domPfx + 'CharGoal" type="number" min="0" step="1" value="' + (halfData.charGoal || 0) + '" />',
      '<span class="planner-unit">명</span>',
      '<label class="planner-sum-goal-label">무기</label>',
      '<input class="planner-input planner-num planner-num--sm" id="plan' + domPfx + 'WeaponGoal" type="number" min="0" step="1" value="' + (halfData.weaponGoal || 0) + '" />',
      '<span class="planner-unit">개</span>',
      '</div>',
      '</div>'
    ].join('');
  }

  var curHalfData = _plannerCurHalf === 'first' ? pd.cur.firstHalf : pd.cur.secondHalf;
  var curCard = [
    '<div class="planner-sum-card planner-sum-card--cur">',
    '<div class="planner-sum-card-info">',
    '<div class="planner-sum-next-label">현재 버전</div>',
    '<div class="planner-sum-top">',
    pd.version ? '<span class="planner-sum-ver">' + escAttr(pd.version) + '</span>' : '',
    dd.text    ? '<span class="planner-dday ' + dd.cls + '">' + dd.text + '</span>' : '',
    '</div>',
    (startDate || effEnd) ? '<div class="planner-sum-range">' + escAttr((startDate||'?') + ' ~ ' + (effEnd||'?')) + '</div>' : '',
    '</div>',
    '<div class="planner-sum-card-goal">',
    '<div class="planner-sum-goal-section-label">현재 버전 목표</div>',
    halfToggle('Cur', _plannerCurOpen, _plannerCurHalf),
    _plannerCurOpen ? goalInputs('Cur', curHalfData) : '',
    '</div>',
    '</div>'
  ].join('');

  if (!nextVer || !effEnd) {
    return '<div class="planner-summary">' + curCard + '</div>';
  }

  var nextHalfData = _plannerNextHalf === 'first' ? pd.next.firstHalf : pd.next.secondHalf;
  var nextCard = [
    '<div class="planner-sum-card planner-sum-card--next">',
    '<div class="planner-sum-card-info">',
    '<div class="planner-sum-next-label">다음 버전</div>',
    '<div class="planner-sum-next-ver">' + escAttr(nextVer) + '</div>',
    '<div class="planner-sum-range">' + escAttr(nextStart + ' ~ ' + nextEnd) + '</div>',
    '</div>',
    '<div class="planner-sum-card-goal">',
    '<div class="planner-sum-goal-section-label">다음 버전 목표</div>',
    halfToggle('Next', _plannerNextOpen, _plannerNextHalf),
    _plannerNextOpen ? goalInputs('Next', nextHalfData) : '',
    '</div>',
    '</div>'
  ].join('');

  return '<div class="planner-summary">' + curCard + nextCard + '</div>';
}

function renderPlannerSection(gameId) {
  var pd      = loadPlannerData(gameId);
  var pity    = calcPitySummary(gameId);
  var endDate = pd.endDate || plannerAutoEndDate(pd.startDate);

  var emptyPhaseResults = [
    { label: '현재 전반', hasGoal: false, totalSf: 0 },
    { label: '현재 후반', hasGoal: false, totalSf: 0 },
    { label: '다음 전반', hasGoal: false, totalSf: 0 },
    { label: '다음 후반', hasGoal: false, totalSf: 0 }
  ];
  var emptyPhases = { hasAnyGoal: false, commonPulls: 0, characterOnlyPulls: 0, weaponOnlyPulls: 0, totalCharRequired: 0, totalWeaponRequired: 0, charNeedCommon: 0, weaponNeedCommon: 0, totalCommonNeeded: 0, totalShortfall: 0, totalCharGoalCount: 0, totalWeaponGoalCount: 0, phaseResults: emptyPhaseResults };
  var gacha       = getGachaConfig(gameId);
  var totalPhases = pity ? calcPlannerPhases(pd, pity) : emptyPhases;
  var costResult  = calcCost(totalPhases, gacha, pd);

  var curPhases, nextPhases;
  if (pity) {
    var _cr  = calcSingleVersionPhases([pd.cur.firstHalf, pd.cur.secondHalf], pity);
    var _nr  = calcSingleVersionPhases([pd.next.firstHalf, pd.next.secondHalf], _cr.residual);
    curPhases  = _cr.phases;
    nextPhases = _nr.phases;
  } else {
    curPhases  = emptyPhases;
    nextPhases = emptyPhases;
  }

  return [
    '<div class="planner-section">',
    '  <div class="planner-title">버전 플래너<button class="planner-config-btn" id="plannerConfigBtn">⚙</button></div>',
    '  <div id="plannerSummary">' + renderPlannerSummaryHtml(pd) + '</div>',

    '  <div class="planner-body">',
    '  <div class="planner-bottom-row">',

    '    <div class="planner-group planner-group--full planner-group--result">',
    '      <div class="planner-group-label">달성 분석</div>',
    '      <div id="plannerCalcResult">' + renderPlannerCalcCards(curPhases, nextPhases, totalPhases, null, null, null) + '</div>',
    '    </div>',

    '    <div class="planner-group planner-group--half">',
    '      <div class="planner-group-label">과금 계산</div>',
    '      <div id="plannerCostResult">' + renderPlannerCost(costResult) + '</div>',
    '    </div>',

    '  </div>',
    '  </div>',
    '</div>'
  ].join('');
}

function bindPlannerEvents(gameId) {
  function hk(half) { return half === 'first' ? 'firstHalf' : 'secondHalf'; }

  function flushGoalInputs(pd) {
    var curCg  = document.getElementById('planCurCharGoal');
    var curWg  = document.getElementById('planCurWeaponGoal');
    var nextCg = document.getElementById('planNextCharGoal');
    var nextWg = document.getElementById('planNextWeaponGoal');
    if (curCg)  pd.cur[hk(_plannerCurHalf)]   = { charGoal: parseInt(curCg.value)  || 0, weaponGoal: parseInt(curWg  ? curWg.value  : 0) || 0 };
    if (nextCg) pd.next[hk(_plannerNextHalf)] = { charGoal: parseInt(nextCg.value) || 0, weaponGoal: parseInt(nextWg ? nextWg.value : 0) || 0 };
  }

  function refreshSummary(pd) {
    var sumEl = document.getElementById('plannerSummary');
    if (sumEl) sumEl.innerHTML = renderPlannerSummaryHtml(pd);
  }

  function refreshResult(pd) {
    updatePlannerResult(gameId, pd);
  }

  var cfgBtn = document.getElementById('plannerConfigBtn');
  if (cfgBtn) cfgBtn.addEventListener('click', function() { openPlannerConfigModal(gameId); });

  var summaryEl = document.getElementById('plannerSummary');
  if (!summaryEl) return;

  summaryEl.addEventListener('input', function(e) {
    if (!e.target.classList.contains('planner-input')) return;
    var pd = loadPlannerData(gameId);
    flushGoalInputs(pd);
    savePlannerData(gameId, pd);
    refreshResult(pd);
  });

  summaryEl.addEventListener('click', function(e) {
    var btn = e.target.closest ? e.target.closest('button') : (e.target.tagName === 'BUTTON' ? e.target : null);
    if (!btn) return;
    var id = btn.id;

    if (id === 'plannerAdvanceBtn') {
      var pd = loadPlannerData(gameId);
      flushGoalInputs(pd);
      var nextVer = plannerNextVersion(pd.version);
      var effEnd  = pd.endDate || plannerAutoEndDate(pd.startDate);
      var newStart = '';
      if (effEnd) {
        var d = new Date(effEnd); d.setDate(d.getDate() + 1);
        newStart = d.toISOString().slice(0, 10);
      }
      var newEnd  = newStart ? plannerAutoEndDate(newStart) : '';
      var newPd = {
        version:   nextVer || pd.version,
        startDate: newStart || pd.startDate,
        endDate:   newEnd,
        cur: {
          firstHalf:  { charGoal: pd.next.firstHalf.charGoal  || 0, weaponGoal: pd.next.firstHalf.weaponGoal  || 0 },
          secondHalf: { charGoal: pd.next.secondHalf.charGoal || 0, weaponGoal: pd.next.secondHalf.weaponGoal || 0 }
        },
        next: {
          firstHalf:  { charGoal: 0, weaponGoal: 0 },
          secondHalf: { charGoal: 0, weaponGoal: 0 }
        }
      };
      savePlannerData(gameId, newPd);
      renderCurrencyPage();
      return;
    }

    var halfMap = {
      plannerCurFirstBtn:   { which: 'cur',  half: 'first'  },
      plannerCurSecondBtn:  { which: 'cur',  half: 'second' },
      plannerNextFirstBtn:  { which: 'next', half: 'first'  },
      plannerNextSecondBtn: { which: 'next', half: 'second' }
    };
    var m = halfMap[id];
    if (!m) return;

    var pd = loadPlannerData(gameId);
    flushGoalInputs(pd);
    savePlannerData(gameId, pd);

    if (m.which === 'cur') {
      if (_plannerCurHalf === m.half && _plannerCurOpen) {
        _plannerCurOpen = false;
      } else {
        _plannerCurHalf = m.half;
        _plannerCurOpen = true;
      }
    } else {
      if (_plannerNextHalf === m.half && _plannerNextOpen) {
        _plannerNextOpen = false;
      } else {
        _plannerNextHalf = m.half;
        _plannerNextOpen = true;
      }
    }

    pd = loadPlannerData(gameId);
    refreshSummary(pd);
    refreshResult(pd);
  });
}

function loadPassData(gameId) {
  try {
    var raw = localStorage.getItem('pickup_manager_pass_' + gameId);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return DEFAULT_PASS_DATA[gameId] || { monthly: { composition: '', conversion: '' }, regular: { composition: '', conversion: '' } };
}

function savePassData(gameId, data) {
  try { localStorage.setItem('pickup_manager_pass_' + gameId, JSON.stringify(data)); } catch(e) {}
}

function renderPassCards(gameId) {
  var data = loadPassData(gameId);
  function card(title, type) {
    var d = (data[type] || {});
    var comp = d.composition || '';
    var conv = d.conversion  || '';
    return [
      '<div class="pass-card">',
      '  <div class="pass-card-header">',
      '    <span class="pass-card-title">' + title + '</span>',
      '  </div>',
      '  <div class="pass-card-body">',
      '    <div class="pass-card-row"><span class="pass-card-label">구성</span><span class="pass-card-value">' + (comp || '<span class="pass-empty">미등록</span>') + '</span></div>',
      '    <div class="pass-card-row pass-card-row--end"><span class="pass-card-label">환산</span><span class="pass-card-value pass-conversion">' + (conv || '') + '</span></div>',
      '  </div>',
      '  <button class="mp-cfg-btn pass-edit-btn pass-card-edit-btn" data-game="' + gameId + '" data-type="' + type + '" title="수정">⚙</button>',
      '</div>'
    ].join('');
  }
  return [
    '<div class="pass-cards">',
    card('월정액', 'monthly'),
    card('버전 패스', 'regular'),
    '</div>'
  ].join('');
}

function openPassEditModal(gameId, type) {
  var data  = loadPassData(gameId);
  var d     = data[type] || { composition: '', conversion: '' };
  var title = type === 'monthly' ? '월정액' : '버전 패스';
  var modal = document.getElementById('passEditModal');
  modal.innerHTML = [
    '<div class="char-detail-overlay" onclick="if(event.target===this)closePassEditModal()">',
    '<div class="char-detail-panel" style="max-width:420px;">',
    '<div class="detail-header">',
    '  <span class="detail-header-name">' + title + ' 수정</span>',
    '  <button class="detail-close-btn" onclick="closePassEditModal()">&#x2715;</button>',
    '</div>',
    '<div class="detail-body" style="padding:16px 20px;display:flex;flex-direction:column;gap:14px;">',
    '  <div class="edit-row"><label class="edit-label">구성</label>',
    '  <input class="edit-input" id="passEditComp" type="text" value="' + d.composition.replace(/"/g, '&quot;') + '" placeholder="예) 재화명 300 + 재화명 2,700"></div>',
    '  <div class="edit-row"><label class="edit-label">환산</label>',
    '  <input class="edit-input" id="passEditConv" type="text" value="' + d.conversion.replace(/"/g, '&quot;') + '" placeholder="예) 18.75뽑"></div>',
    '</div>',
    '<div class="detail-footer">',
    '  <button class="detail-btn-cancel" onclick="closePassEditModal()">취소</button>',
    '  <button class="detail-btn-save" onclick="savePassEditModal(\'' + gameId + '\',\'' + type + '\')">저장</button>',
    '</div>',
    '</div></div>'
  ].join('');
  modal.style.display = 'block';
}

function savePassEditModal(gameId, type) {
  var comp = document.getElementById('passEditComp').value.trim();
  var conv = document.getElementById('passEditConv').value.trim();
  var data = loadPassData(gameId);
  data[type] = { composition: comp, conversion: conv };
  savePassData(gameId, data);
  closePassEditModal();
  renderCurrencyPage();
}

function fitPassCardText() {
  document.querySelectorAll('.pass-card-value').forEach(function(el) {
    var size = 14;
    el.style.fontSize = size + 'px';
    while (el.scrollWidth > el.offsetWidth && size > 9) {
      size -= 0.5;
      el.style.fontSize = size + 'px';
    }
  });
}

function closePassEditModal() {
  var modal = document.getElementById('passEditModal');
  modal.style.display = 'none';
  modal.innerHTML = '';
}

function loadMonthlyPassEndDate(gameId) {
  try { return localStorage.getItem('pickup_manager_monthly_pass_' + gameId) || ''; } catch(e) { return ''; }
}

function saveMonthlyPassEndDate(gameId, dateStr) {
  try { localStorage.setItem('pickup_manager_monthly_pass_' + gameId, dateStr); } catch(e) {}
}

function calcMonthlyPassDays(endDateStr) {
  if (!endDateStr) return null;
  var today = new Date(); today.setHours(0,0,0,0);
  var end   = new Date(endDateStr); end.setHours(0,0,0,0);
  return Math.ceil((end - today) / 86400000);
}

function renderMonthlyPassBadge(gameId) {
  var endDate = loadMonthlyPassEndDate(gameId);
  var days    = calcMonthlyPassDays(endDate);
  var label   = (days === null || days <= 0) ? '만료' : 'D-' + days;
  var cls     = (days === null || days <= 0) ? 'mp-badge--expired' : (days <= 7 ? 'mp-badge--warn' : 'mp-badge--ok');
  return [
    '<div class="mp-badge ' + cls + '" id="monthlyPassBadge">',
    '  <span class="mp-label">월정액</span>',
    '  <span class="mp-days" id="mpDays">' + label + '</span>',
    '  <button class="mp-add-btn" id="mpAddBtn" data-game="' + gameId + '">+30일</button>',
    '  <button class="mp-cfg-btn" id="mpCfgBtn" data-game="' + gameId + '" title="날짜 직접 입력">⚙</button>',
    '  <div class="mp-cfg-popup" id="mpCfgPopup" style="display:none;">',
    '    <input type="date" id="mpCfgDate" class="mp-cfg-input">',
    '    <button class="mp-cfg-save" id="mpCfgSave">적용</button>',
    '  </div>',
    '</div>'
  ].join('');
}

function loadCurrencyData(gameId) {
  try {
    var raw = localStorage.getItem("pickup_manager_currency_" + gameId);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveCurrencyItem(gameId, curId, val) {
  try {
    var data = loadCurrencyData(gameId);
    data[curId] = val;
    localStorage.setItem("pickup_manager_currency_" + gameId, JSON.stringify(data));
  } catch (e) {}
}

function renderCurrencyPage() {
  var page = document.getElementById("currencyPage");
  if (!page) return;

  var config = getGameConfig();
  var gameIds = Object.keys(config);
  if (gameIds.length === 0) {
    page.innerHTML = '<p class="no-data" style="padding:24px;">게임이 없습니다. 게임을 추가하세요.</p>';
    return;
  }

  var activeGame = _currencyTab;
  if (!activeGame || !config[activeGame]) {
    activeGame = (appState.currentGame && config[appState.currentGame]) ? appState.currentGame : gameIds[0];
  }

  var cfg = config[activeGame];
  var saved = loadCurrencyData(activeGame);

  var rowsHtml = cfg.currencies.map(function(cur) {
    var val = saved[cur.id] || 0;
    var pulls = Math.floor(val / cur.rate);
    var iconHtml = cur.icon
      ? '<img class="currency-icon" src="' + cur.icon + '" alt="" onerror="if(this.src.indexOf(\'.webp\')===-1){this.src=this.src.replace(/\\.[^.]+$/,\'.webp\')}else{this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'}" />'
        + '<div class="currency-icon-fallback" style="display:none">' + cur.name.charAt(0) + '</div>'
      : '<div class="currency-icon-fallback" style="display:flex">' + cur.name.charAt(0) + '</div>';
    var t = cur.type || 'common';
    var typeSelect = '<select class="currency-type-select" data-game="' + activeGame + '" data-id="' + cur.id + '">'
      + '<option value="common"'    + (t === 'common'    ? ' selected' : '') + '>공용</option>'
      + '<option value="character"' + (t === 'character' ? ' selected' : '') + '>캐릭터</option>'
      + '<option value="weapon"'    + (t === 'weapon'    ? ' selected' : '') + '>무기</option>'
      + '</select>';
    var nameHtml = (cur.note ? cur.name + '<span class="currency-note">' + cur.note + '</span>' : cur.name) + typeSelect;
    return [
      '<div class="currency-row" draggable="true" data-id="' + cur.id + '">',
      '  <span class="drag-handle">⠿</span>',
      '  <div class="currency-icon-wrap">' + iconHtml + '</div>',
      '  <div class="currency-name">' + nameHtml + '</div>',
      '  <input class="currency-input" type="text" inputmode="numeric" value="' + val.toLocaleString() + '"',
      '    data-id="' + cur.id + '" data-game="' + activeGame + '" data-rate="' + cur.rate + '" />',
      '  <span class="currency-unit">개</span>',
      '  <span class="currency-equals">= <strong class="currency-pulls" data-id="' + cur.id + '">' + pulls + '</strong>뽑</span>',
      '  <span class="currency-desc">' + cur.desc + '</span>',
      '  <div class="currency-row-actions">',
      '    <button class="currency-row-btn" data-action="edit" data-game="' + activeGame + '" data-id="' + cur.id + '">✏</button>',
      '    <button class="currency-row-btn" data-action="delete" data-game="' + activeGame + '" data-id="' + cur.id + '">✕</button>',
      '  </div>',
      '</div>'
    ].join('');
  }).join('');

  var totalPulls = cfg.currencies.reduce(function(sum, cur) {
    return sum + Math.floor((saved[cur.id] || 0) / cur.rate);
  }, 0);

  var pity = calcPitySummary(activeGame);
  var pitySummaryHtml = pity ? [
    '<div class="pity-summary">',
    '  <div class="pity-card">',
    '    <span class="pity-label">캐릭터 뽑기 가능</span>',
    '    <div class="pity-value-row"><strong class="pity-value" id="pityCharPulls">' + pity.charPulls + '</strong><span class="pity-unit">회</span></div>',
    '  </div>',
    '  <div class="pity-card pity-card--accent">',
    '    <span class="pity-label">캐릭터 천장 (÷' + pity.charPity + ')</span>',
    '    <div class="pity-value-row"><strong class="pity-value" id="pityCharCount">' + pity.charPityCount + '</strong><span class="pity-unit">회</span></div>',
    '  </div>',
    '  <div class="pity-card">',
    '    <span class="pity-label">무기 뽑기 가능</span>',
    '    <div class="pity-value-row"><strong class="pity-value" id="pityWeaponPulls">' + pity.weaponPulls + '</strong><span class="pity-unit">회</span></div>',
    '  </div>',
    '  <div class="pity-card pity-card--accent">',
    '    <span class="pity-label">무기 천장 (÷' + pity.weaponPity + ')</span>',
    '    <div class="pity-value-row"><strong class="pity-value" id="pityWeaponCount">' + pity.weaponPityCount + '</strong><span class="pity-unit">회</span></div>',
    '  </div>',
    '</div>'
  ].join('') : '';

  _plannerCurHalf  = 'first';
  _plannerNextHalf = 'first';
  _plannerCurOpen  = false;
  _plannerNextOpen = false;

  page.innerHTML = [
    '<div class="currency-header">',
    '  <div class="currency-header-top">',
    '    <div class="currency-header-info">',
    '      <h2>현재 보유 재화 리스트</h2>',
    '      <p class="currency-subtitle">보유 재화를 입력하면 총 뽑기 수를 자동으로 계산합니다.</p>',
    '    </div>',
    renderPassCards(activeGame),
    '    ' + renderMonthlyPassBadge(activeGame),
    '  </div>',
    '</div>',
    '<div class="currency-content">',
    '  <div class="currency-rows">' + rowsHtml + '</div>',
    '</div>',
    '<div class="currency-add-row">',
    '  <button class="currency-add-btn" data-game="' + activeGame + '">+ 재화 추가</button>',
    '</div>',
    '<div class="currency-total">',
    '  <span>총 예상 뽑기</span>',
    '  <strong id="currencyTotalPulls">' + totalPulls + '</strong>',
    '  <span>회</span>',
    '</div>',
    pitySummaryHtml,
    renderPlannerSection(activeGame)
  ].join('');

  // 재화 추가
  page.querySelectorAll('.currency-add-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { openCurrencyConfigModal(this.dataset.game, null); });
  });

  // 재화 행 편집/삭제
  page.querySelectorAll('.currency-row-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var action = this.dataset.action;
      var gid = this.dataset.game;
      var cid = this.dataset.id;
      if (action === 'edit') {
        openCurrencyConfigModal(gid, cid);
      } else if (action === 'delete') {
        if (!confirm('이 재화를 삭제하시겠습니까?')) return;
        deleteCurrency(gid, cid);
        renderCurrencyPage();
      }
    });
  });

  // 재화 용도 변경
  page.querySelectorAll('.currency-type-select').forEach(function(sel) {
    sel.addEventListener('change', function() {
      editCurrencyType(this.dataset.game, this.dataset.id, this.value);
      refreshPitySummary(this.dataset.game);
    });
  });

  // 입력값 계산 (+ - 수식 지원)
  function parseCurrencyInput(raw) {
    var str = (raw || '').replace(/,/g, '').replace(/\s+/g, '');
    if (!str) return 0;
    // 수식이 포함된 경우
    if (/[+\-]/.test(str.slice(1))) {
      var tokens = str.split(/(?=[+\-])/);
      var result = 0;
      for (var i = 0; i < tokens.length; i++) {
        var n = parseInt(tokens[i]) || 0;
        result += n;
      }
      return Math.max(0, result);
    }
    return Math.max(0, parseInt(str) || 0);
  }

  page.querySelectorAll('.currency-input').forEach(function(input) {
    input.addEventListener('focus', function() {
      var raw = this.value.replace(/,/g, '');
      this.value = raw || '';
      var el = this;
      requestAnimationFrame(function() {
        el.setSelectionRange(el.value.length, el.value.length);
      });
    });
    input.addEventListener('blur', function() {
      var num = parseCurrencyInput(this.value);
      this.value = num.toLocaleString();
    });
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') this.blur();
    });
    input.addEventListener('input', function() {
      var gameId = this.dataset.game;
      var curId  = this.dataset.id;
      var rate   = parseInt(this.dataset.rate) || 1;
      var val    = parseCurrencyInput(this.value);
      saveCurrencyItem(gameId, curId, val);
      var pullsEl = page.querySelector('.currency-pulls[data-id="' + curId + '"]');
      if (pullsEl) pullsEl.textContent = Math.floor(val / rate);
      var totalEl = document.getElementById('currencyTotalPulls');
      if (totalEl) {
        var cfg2 = getGameConfig()[gameId];
        if (!cfg2) return;
        var total = cfg2.currencies.reduce(function(sum, cur) {
          var el = page.querySelector('.currency-input[data-id="' + cur.id + '"]');
          var v  = el ? parseCurrencyInput(el.value) : (loadCurrencyData(gameId)[cur.id] || 0);
          return sum + Math.floor(v / cur.rate);
        }, 0);
        totalEl.textContent = total;
      }
      refreshPitySummary(gameId);
      updatePlannerResult(gameId, loadPlannerData(gameId));
    });
  });

  // 패스 카드 수정 버튼
  page.querySelectorAll('.pass-edit-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      openPassEditModal(this.dataset.game, this.dataset.type);
    });
  });

  // 패스 카드 텍스트 자동 축소
  requestAnimationFrame(fitPassCardText);

  // 월정액 +30일
  var mpBtn = document.getElementById('mpAddBtn');
  if (mpBtn) {
    mpBtn.addEventListener('click', function() {
      var gid     = this.dataset.game;
      var endDate = loadMonthlyPassEndDate(gid);
      var base    = new Date(); base.setHours(0,0,0,0);
      if (endDate) {
        var d = new Date(endDate); d.setHours(0,0,0,0);
        base = d;
      }
      base.setDate(base.getDate() + 30);
      var newEnd = base.toISOString().slice(0, 10);
      saveMonthlyPassEndDate(gid, newEnd);
      var days  = calcMonthlyPassDays(newEnd);
      var label = days <= 0 ? '만료' : 'D-' + days;
      var badge = document.getElementById('monthlyPassBadge');
      if (badge) {
        badge.className = 'mp-badge ' + (days <= 0 ? 'mp-badge--expired' : days <= 7 ? 'mp-badge--warn' : 'mp-badge--ok');
        document.getElementById('mpDays').textContent = label;
      }
    });
  }

  // 월정액 ⚙ 설정 버튼
  var mpCfgBtn = document.getElementById('mpCfgBtn');
  if (mpCfgBtn) {
    mpCfgBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      var popup = document.getElementById('mpCfgPopup');
      if (!popup) return;
      if (popup.style.display === 'none') {
        var gid = this.dataset.game;
        var cur = loadMonthlyPassEndDate(gid);
        var inp = document.getElementById('mpCfgDate');
        if (inp) inp.value = cur || '';
        popup.style.display = 'flex';
      } else {
        popup.style.display = 'none';
      }
    });
  }
  var mpCfgSave = document.getElementById('mpCfgSave');
  if (mpCfgSave) {
    mpCfgSave.addEventListener('click', function() {
      var gid = (document.getElementById('mpCfgBtn') || {}).dataset && document.getElementById('mpCfgBtn').dataset.game;
      var inp = document.getElementById('mpCfgDate');
      if (!gid || !inp || !inp.value) return;
      saveMonthlyPassEndDate(gid, inp.value);
      var days  = calcMonthlyPassDays(inp.value);
      var label = (days === null || days <= 0) ? '만료' : 'D-' + days;
      var badge = document.getElementById('monthlyPassBadge');
      if (badge) {
        badge.className = 'mp-badge ' + (days === null || days <= 0 ? 'mp-badge--expired' : days <= 7 ? 'mp-badge--warn' : 'mp-badge--ok');
        document.getElementById('mpDays').textContent = label;
      }
      document.getElementById('mpCfgPopup').style.display = 'none';
    });
  }
  document.addEventListener('click', function mpCfgClose(e) {
    var popup = document.getElementById('mpCfgPopup');
    var btn   = document.getElementById('mpCfgBtn');
    if (popup && btn && !popup.contains(e.target) && !btn.contains(e.target)) {
      popup.style.display = 'none';
    }
  });

  // 드래그 앤 드롭 순서 변경
  var rowsEl = page.querySelector('.currency-rows');
  if (rowsEl) {
    var _dragSrcId = null;
    rowsEl.addEventListener('dragstart', function(e) {
      var row = e.target.closest ? e.target.closest('.currency-row[data-id]') : null;
      if (!row) return;
      _dragSrcId = row.dataset.id;
      e.dataTransfer.effectAllowed = 'move';
      row.classList.add('currency-row--dragging');
    });
    rowsEl.addEventListener('dragend', function() {
      _dragSrcId = null;
      rowsEl.querySelectorAll('.currency-row--dragging, .currency-row--drag-over').forEach(function(el) {
        el.classList.remove('currency-row--dragging', 'currency-row--drag-over');
      });
    });
    rowsEl.addEventListener('dragover', function(e) {
      var row = e.target.closest ? e.target.closest('.currency-row[data-id]') : null;
      if (!row || !_dragSrcId || row.dataset.id === _dragSrcId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      rowsEl.querySelectorAll('.currency-row--drag-over').forEach(function(el) { el.classList.remove('currency-row--drag-over'); });
      row.classList.add('currency-row--drag-over');
    });
    rowsEl.addEventListener('dragleave', function(e) {
      var row = e.target.closest ? e.target.closest('.currency-row[data-id]') : null;
      if (row) row.classList.remove('currency-row--drag-over');
    });
    rowsEl.addEventListener('drop', function(e) {
      var row = e.target.closest ? e.target.closest('.currency-row[data-id]') : null;
      if (!row || !_dragSrcId || row.dataset.id === _dragSrcId) return;
      e.preventDefault();
      reorderCurrencies(activeGame, _dragSrcId, row.dataset.id);
    });
  }

  bindPlannerEvents(activeGame);
  updatePlannerResult(activeGame, loadPlannerData(activeGame));
}

// ── INTERNAL ──────────────────────────────────────────────────────────────────
// Section 11: Game Config Management

function getGameConfig() {
  try {
    var raw = localStorage.getItem('pickup_manager_game_config');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return JSON.parse(JSON.stringify(CURRENCY_CONFIG));
}

function saveGameConfig(config) {
  try {
    localStorage.setItem('pickup_manager_game_config', JSON.stringify(config));
  } catch (e) {}
}

function addGame(name, id) {
  var config = getGameConfig();
  if (config[id]) return false;
  config[id] = { name: name, isCustom: true, currencies: [] };
  saveGameConfig(config);
  return true;
}

function editGameName(gameId, newName) {
  var config = getGameConfig();
  if (!config[gameId]) return;
  config[gameId].name = newName;
  saveGameConfig(config);
}

function deleteGame(gameId) {
  var config = getGameConfig();
  delete config[gameId];
  saveGameConfig(config);
  try { localStorage.removeItem('pickup_manager_currency_' + gameId); } catch (e) {}
  if (appState.currentGame === gameId) {
    appState.currentGame = null;
    appState.characters = [];
    appState.meta = [];
    appState.banner = null;
    appState.selectedCharacterId = null;
    document.getElementById('characterSelect').disabled = true;
    document.getElementById('analyzeBtn').disabled = true;
    document.getElementById('metaUpdateBtn').disabled = true;
    document.getElementById('metaUpdateClaudeCodeBtn').disabled = true;
    document.getElementById('cardSyncBtn').disabled = true;
    renderPlaceholder('게임을 선택해주세요.');
  }
}

function addCurrency(gameId, cur) {
  var config = getGameConfig();
  if (!config[gameId]) return;
  config[gameId].currencies.push(cur);
  saveGameConfig(config);
}

function editCurrency(gameId, curId, updated) {
  var config = getGameConfig();
  if (!config[gameId]) return;
  var currencies = config[gameId].currencies;
  for (var i = 0; i < currencies.length; i++) {
    if (currencies[i].id === curId) {
      Object.assign(currencies[i], updated);
      break;
    }
  }
  saveGameConfig(config);
}

function reorderCurrencies(gameId, fromId, toId) {
  var config = getGameConfig();
  if (!config[gameId]) return;
  var arr = config[gameId].currencies;
  var fromIdx = -1, toIdx = -1;
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].id === fromId) fromIdx = i;
    if (arr[i].id === toId)   toIdx   = i;
  }
  if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
  arr.splice(toIdx, 0, arr.splice(fromIdx, 1)[0]);
  saveGameConfig(config);
  renderCurrencyPage();
}

function deleteCurrency(gameId, curId) {
  var config = getGameConfig();
  if (!config[gameId]) return;
  config[gameId].currencies = config[gameId].currencies.filter(function(c) { return c.id !== curId; });
  saveGameConfig(config);
  try {
    var data = loadCurrencyData(gameId);
    delete data[curId];
    localStorage.setItem('pickup_manager_currency_' + gameId, JSON.stringify(data));
  } catch (e) {}
}

function openGameConfigModal() {
  var modal = document.getElementById('gameConfigModal');

  function buildModal() {
    var config = getGameConfig();
    var builtinIds = Object.keys(CURRENCY_CONFIG);

    var iconBox = function(gid, dim, opacity) {
      var meta = GAME_META[gid] || { iconText: gid.slice(0, 2).toUpperCase(), iconBg: '#1a1a2e', iconColor: 'var(--muted)' };
      var d = dim || 32;
      var op = opacity ? 'opacity:' + opacity + ';' : '';
      return '<span style="width:' + d + 'px;height:' + d + 'px;border-radius:6px;background:' + meta.iconBg + ';color:' + meta.iconColor + ';font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;' + op + '">' + meta.iconText + '</span>';
    };

    var registeredHtml = Object.keys(config).map(function(gid) {
      var game  = config[gid];
      var gacha = getGachaConfig(gid);
      return [
        '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);">',
        iconBox(gid),
        '  <div style="flex:1;min-width:0;">',
        '    <div style="font-size:13px;">' + escAttr(game.name) + '</div>',
        '    <div style="font-size:10px;color:var(--muted);margin-top:2px;">ID: ' + gid + ' &nbsp;·&nbsp; 캐릭터 천장 ' + gacha.charPity + ' / 무기 천장 ' + gacha.weaponPity + '</div>',
        '  </div>',
        '  <button class="detail-btn-cancel gcm-gacha"  data-game="' + gid + '" style="font-size:11px;padding:3px 9px;" title="천장 설정">⚙</button>',
        '  <button class="detail-btn-cancel gcm-rename" data-game="' + gid + '" style="font-size:11px;padding:3px 9px;">이름</button>',
        '  <button class="detail-btn-cancel gcm-remove" data-game="' + gid + '" style="font-size:11px;padding:3px 9px;color:var(--must);border-color:var(--must);">제거</button>',
        '</div>'
      ].join('');
    }).join('') || '<p style="font-size:13px;color:var(--muted);padding:8px 0;">등록된 게임이 없습니다.</p>';

    var removedBuiltin = builtinIds.filter(function(gid) { return !config[gid]; });
    var restoreHtml = removedBuiltin.length ? [
      '<div style="padding:12px 0 6px;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-top:4px;">제거된 기본 게임</div>',
      removedBuiltin.map(function(gid) {
        var name = (CURRENCY_CONFIG[gid] && CURRENCY_CONFIG[gid].name) || gid;
        return [
          '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">',
          iconBox(gid, 32, '0.45'),
          '  <span style="flex:1;font-size:13px;color:var(--muted);">' + name + '</span>',
          '  <button class="detail-btn-save gcm-restore" data-game="' + gid + '" style="font-size:11px;padding:3px 9px;">복원</button>',
          '</div>'
        ].join('');
      }).join('')
    ].join('') : '';

    modal.innerHTML = [
      '<div class="char-detail-overlay" id="gcmOverlay">',
      '  <div class="char-detail-panel" style="width:440px;">',
      '    <div class="detail-header">',
      '      <div class="detail-header-info"><div class="detail-header-name">게임 관리</div></div>',
      '      <button class="detail-close-btn" id="gcmClose">✕</button>',
      '    </div>',
      '    <div style="padding:0 20px 4px;max-height:65vh;overflow-y:auto;">',
      '      <div style="padding:12px 0 6px;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;">등록된 게임</div>',
      '      <div>' + registeredHtml + '</div>',
      restoreHtml,
      '      <div style="padding:14px 0 12px;margin-top:6px;border-top:1px solid var(--border);">',
      '        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;">새 게임 추가</div>',
      '        <div style="display:flex;gap:8px;margin-bottom:6px;">',
      '          <input class="edit-input" id="gcmNewName" type="text" placeholder="게임 이름" style="flex:1;" />',
      '        </div>',
      '        <div style="display:flex;gap:8px;align-items:center;">',
      '          <input class="edit-input" id="gcmNewId" type="text" placeholder="게임 ID (영문/숫자/_)  예: nte" style="flex:1;" />',
      '          <button class="detail-btn-save" id="gcmAddNew" style="white-space:nowrap;flex-shrink:0;">추가</button>',
      '        </div>',
      '        <div style="font-size:10px;color:var(--muted);margin-top:6px;">ID 미입력 시 자동 생성 &nbsp;·&nbsp; 아이콘: assets/icons/{ID}/icon.png</div>',
      '      </div>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');

    var close = function() { modal.style.display = 'none'; };
    document.getElementById('gcmClose').onclick = close;
    document.getElementById('gcmOverlay').onclick = function(e) { if (e.target === this) close(); };

    modal.querySelectorAll('.gcm-gacha').forEach(function(btn) {
      btn.onclick = function() {
        openGachaConfigModal(this.dataset.game);
      };
    });

    modal.querySelectorAll('.gcm-rename').forEach(function(btn) {
      btn.onclick = function() {
        var gid = this.dataset.game;
        var cur = getGameConfig()[gid];
        var newName = prompt('새 이름:', cur ? cur.name : '');
        if (!newName || !newName.trim()) return;
        editGameName(gid, newName.trim());
        renderGameSelect();
        renderCurrencyPage();
        buildModal();
      };
    });

    modal.querySelectorAll('.gcm-remove').forEach(function(btn) {
      btn.onclick = function() {
        var gid = this.dataset.game;
        var cfg = getGameConfig();
        if (!confirm((cfg[gid] ? cfg[gid].name : gid) + '을(를) 제거하시겠습니까?')) return;
        deleteGame(gid);
        if (_currencyTab === gid) _currencyTab = null;
        renderGameSelect();
        renderCurrencyPage();
        buildModal();
      };
    });

    modal.querySelectorAll('.gcm-restore').forEach(function(btn) {
      btn.onclick = function() {
        var gid = this.dataset.game;
        var defaultData = CURRENCY_CONFIG[gid];
        if (!defaultData) return;
        var cfg = getGameConfig();
        cfg[gid] = JSON.parse(JSON.stringify(defaultData));
        saveGameConfig(cfg);
        renderGameSelect();
        renderCurrencyPage();
        buildModal();
      };
    });

    document.getElementById('gcmAddNew').onclick = function() {
      var name = document.getElementById('gcmNewName').value.trim();
      if (!name) { alert('게임 이름을 입력하세요.'); return; }
      var rawId = document.getElementById('gcmNewId').value.trim();
      var id = rawId ? rawId.replace(/[^a-z0-9_]/gi, '').toLowerCase() : 'custom_' + Date.now();
      if (!id) { alert('유효한 게임 ID를 입력하세요 (영문/숫자/언더스코어).'); return; }
      var cfg = getGameConfig();
      if (cfg[id]) { alert('이미 사용 중인 ID입니다: ' + id); return; }
      addGame(name, id);
      renderGameSelect();
      renderCurrencyPage();
      buildModal();
    };
  }

  modal.style.display = 'block';
  buildModal();
}

function openCurrencyConfigModal(gameId, curId) {
  var isEdit = !!curId;
  var config = getGameConfig();
  var game = config[gameId];
  if (!game) return;
  var cur = null;
  if (isEdit) {
    for (var i = 0; i < game.currencies.length; i++) {
      if (game.currencies[i].id === curId) { cur = game.currencies[i]; break; }
    }
  }
  var iconFile = '';
  if (cur && cur.icon) {
    var _parts = cur.icon.split('/');
    iconFile = _parts[_parts.length - 1].replace(/\.[^.]+$/, '');
  }
  var modal = document.getElementById('currencyConfigModal');

  modal.innerHTML = [
    '<div class="char-detail-overlay" id="ccOverlay">',
    '  <div class="char-detail-panel" style="width:420px;">',
    '    <div class="detail-header">',
    '      <div class="detail-header-info">',
    '        <div class="detail-header-name">' + (isEdit ? '재화 편집' : '재화 추가') + '</div>',
    '      </div>',
    '      <button class="detail-close-btn" id="ccCloseBtn">✕</button>',
    '    </div>',
    '    <div class="detail-body" style="gap:12px;">',
    '      <div class="edit-row">',
    '        <label class="edit-label">재화 이름</label>',
    '        <input class="edit-input" id="ccName" type="text" placeholder="재화 이름" value="' + (cur ? escAttr(cur.name) : '') + '" />',
    '      </div>',
    '      <div class="edit-row">',
    '        <label class="edit-label">아이콘 파일명</label>',
    '        <input class="edit-input" id="ccIconName" type="text" placeholder="예: polychrome  또는  icon.webp" value="' + escAttr(iconFile) + '" />',
    '      </div>',
    '      <div style="font-size:10px;color:var(--muted);padding:0 0 2px 0;">→ assets/icons/' + gameId + '/{파일명}  &nbsp;(.png / .webp 모두 지원, 확장자 미입력 시 .png)</div>',
    '      <div class="edit-row">',
    '        <label class="edit-label">환산 비율</label>',
    '        <input class="edit-input" id="ccRate" type="number" min="1" step="1" placeholder="예: 160" value="' + (cur ? cur.rate : '') + '" style="max-width:90px;" />',
    '        <span style="font-size:13px;color:var(--muted);">개 = 1뽑</span>',
    '      </div>',
    '      <div class="edit-row">',
    '        <label class="edit-label">메모 (선택)</label>',
    '        <input class="edit-input" id="ccNote" type="text" placeholder="예: *상점 교환 기준" value="' + (cur && cur.note ? escAttr(cur.note) : '') + '" />',
    '      </div>',
    '    </div>',
    '    <div class="detail-footer">',
    (isEdit ? '<button class="detail-btn-cancel" id="ccDeleteBtn" style="margin-right:auto;color:var(--must);border-color:var(--must);">삭제</button>' : ''),
    '      <button class="detail-btn-cancel" id="ccCancelBtn">취소</button>',
    '      <button class="detail-btn-save" id="ccSaveBtn">' + (isEdit ? '저장' : '추가') + '</button>',
    '    </div>',
    '  </div>',
    '</div>'
  ].join('');
  modal.style.display = 'block';

  var close = function() { modal.style.display = 'none'; };
  document.getElementById('ccCloseBtn').onclick = close;
  document.getElementById('ccCancelBtn').onclick = close;
  document.getElementById('ccOverlay').onclick = function(e) { if (e.target === this) close(); };

  if (isEdit) {
    document.getElementById('ccDeleteBtn').onclick = function() {
      if (!confirm('이 재화를 삭제하시겠습니까?')) return;
      deleteCurrency(gameId, curId);
      close();
      renderCurrencyPage();
    };
  }

  document.getElementById('ccSaveBtn').onclick = function() {
    var name = document.getElementById('ccName').value.trim();
    var rate = parseInt(document.getElementById('ccRate').value) || 1;
    var note = document.getElementById('ccNote').value.trim() || null;
    if (!name) { alert('재화 이름을 입력하세요.'); return; }
    var rawIcon = document.getElementById('ccIconName').value.trim().replace(/[^a-z0-9_\-\.]/gi, '').toLowerCase();
    var icon = rawIcon
      ? 'assets/icons/' + gameId + '/' + (rawIcon.indexOf('.') !== -1 ? rawIcon : rawIcon + '.png')
      : (cur ? cur.icon || '' : '');
    var desc = rate === 1 ? '1개 = 1뽑' : rate + '개 = 1뽑';
    if (isEdit) {
      editCurrency(gameId, curId, { name: name, icon: icon, rate: rate, desc: desc, note: note });
    } else {
      var newId = 'cur_' + Date.now();
      addCurrency(gameId, { id: newId, name: name, icon: icon, rate: rate, desc: desc, note: note });
    }
    close();
    renderCurrencyPage();
  };
}

function openGachaConfigModal(gameId) {
  var gacha    = getGachaConfig(gameId);
  var config   = getGameConfig();
  var gameName = config[gameId] ? config[gameId].name : gameId;
  var modal    = document.getElementById('currencyConfigModal');

  modal.innerHTML = [
    '<div class="char-detail-overlay" id="gcaOverlay">',
    '  <div class="char-detail-panel" style="width:340px;">',
    '    <div class="detail-header">',
    '      <div class="detail-header-info"><div class="detail-header-name">' + escAttr(gameName) + ' · 천장 설정</div></div>',
    '      <button class="detail-close-btn" id="gcaClose">✕</button>',
    '    </div>',
    '    <div class="detail-body" style="gap:12px;">',
    '      <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px;">천장</div>',
    '      <div class="edit-row">',
    '        <label class="edit-label">캐릭터 천장</label>',
    '        <input class="edit-input" id="gcaCharPity" type="number" min="1" step="1" value="' + gacha.charPity + '" style="max-width:80px;" />',
    '        <span style="font-size:13px;color:var(--muted);">뽑</span>',
    '      </div>',
    '      <div class="edit-row">',
    '        <label class="edit-label">무기 천장</label>',
    '        <input class="edit-input" id="gcaWeaponPity" type="number" min="1" step="1" value="' + gacha.weaponPity + '" style="max-width:80px;" />',
    '        <span style="font-size:13px;color:var(--muted);">뽑</span>',
    '      </div>',
    '      <div class="edit-row">',
    '        <label class="edit-label">1뽑 재화 비용</label>',
    '        <input class="edit-input" id="gcaPullCost" type="number" min="1" step="1" value="' + gacha.pullCost + '" style="max-width:80px;" />',
    '        <span style="font-size:13px;color:var(--muted);">개</span>',
    '      </div>',
    '      <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-top:8px;margin-bottom:2px;">과금 계산</div>',
    '      <div class="edit-row">',
    '        <label class="edit-label">1트럭 가격</label>',
    '        <input class="edit-input" id="gcaPkgPrice" type="number" min="0" step="1000" value="' + (gacha.packagePrice || '') + '" placeholder="예: 119000" style="max-width:110px;" />',
    '        <span style="font-size:13px;color:var(--muted);">원</span>',
    '      </div>',
    '      <div class="edit-row">',
    '        <label class="edit-label">1트럭 뽑기</label>',
    '        <input class="edit-input" id="gcaPkgPulls" type="number" min="1" step="1" value="' + (gacha.packagePulls || '') + '" placeholder="예: 50" style="max-width:110px;" />',
    '        <span style="font-size:13px;color:var(--muted);">회</span>',
    '      </div>',
    '    </div>',
    '    <div class="detail-footer">',
    '      <button class="detail-btn-cancel" id="gcaCancelBtn">취소</button>',
    '      <button class="detail-btn-save" id="gcaSaveBtn">저장</button>',
    '    </div>',
    '  </div>',
    '</div>'
  ].join('');
  modal.style.display = 'block';

  var close = function() { modal.style.display = 'none'; };
  document.getElementById('gcaClose').onclick = close;
  document.getElementById('gcaCancelBtn').onclick = close;
  document.getElementById('gcaOverlay').onclick = function(e) { if (e.target === this) close(); };

  document.getElementById('gcaSaveBtn').onclick = function() {
    var charPity     = Math.max(1, parseInt(document.getElementById('gcaCharPity').value)   || 90);
    var weaponPity   = Math.max(1, parseInt(document.getElementById('gcaWeaponPity').value) || 80);
    var pullCost     = Math.max(1, parseInt(document.getElementById('gcaPullCost').value)   || 160);
    var packagePrice = Math.max(0, parseInt(document.getElementById('gcaPkgPrice').value)   || 0);
    var packagePulls = Math.max(0, parseInt(document.getElementById('gcaPkgPulls').value)   || 0);
    saveGachaConfig(gameId, charPity, weaponPity, pullCost, packagePrice, packagePulls);
    close();
    renderCurrencyPage();
  };
}

function plannerNextDayStr(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr); d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function openPlannerConfigModal(gameId) {
  var pd    = loadPlannerData(gameId);
  var modal = document.getElementById('currencyConfigModal');

  var startDate = pd.startDate || '';
  var endDate   = pd.endDate   || '';
  // 이미 등록된 버전이 있고 종료일이 설정된 경우 → 시작일을 종료일+1로 맞춤
  var nextStart = endDate ? plannerNextDayStr(endDate) : '';

  function calcHints(sVal, eVal) {
    var autoEndHint  = (sVal && !eVal) ? '자동 종료일: ' + plannerAutoEndDate(sVal) : '';
    var nextStartHint = eVal ? '다음 버전 시작일: ' + plannerNextDayStr(eVal) : '';
    return { autoEndHint: autoEndHint, nextStartHint: nextStartHint };
  }

  var initialHints = calcHints(startDate, endDate);

  modal.innerHTML = [
    '<div class="char-detail-overlay" id="pcfOverlay">',
    '  <div class="char-detail-panel" style="width:360px;">',
    '    <div class="detail-header">',
    '      <div class="detail-header-info"><div class="detail-header-name">버전 정보 설정</div></div>',
    '      <button class="detail-close-btn" id="pcfClose">✕</button>',
    '    </div>',
    '    <div class="detail-body" style="gap:12px;">',
    '      <div class="edit-row">',
    '        <label class="edit-label">현재 버전</label>',
    '        <input class="edit-input" id="pcfVersion" type="text" placeholder="예: 3.0" value="' + escAttr(pd.version || '') + '" style="max-width:100px;" />',
    '      </div>',
    '      <div class="edit-row">',
    '        <label class="edit-label">시작일</label>',
    '        <input class="edit-input" id="pcfStartDate" type="date" value="' + escAttr(startDate) + '" />',
    '      </div>',
    '      <div class="edit-row">',
    '        <label class="edit-label">종료일</label>',
    '        <input class="edit-input" id="pcfEndDate" type="date" value="' + escAttr(endDate) + '" />',
    '      </div>',
    '      <p id="pcfAutoHint"    style="font-size:11px;color:var(--muted);margin:0;">' + initialHints.autoEndHint + '</p>',
    '      <p id="pcfNextHint"    style="font-size:11px;color:var(--acc,#7b68ee);margin:0;">' + initialHints.nextStartHint + '</p>',
    '    </div>',
    '    <div class="detail-footer">',
    '      <button class="detail-btn-cancel" id="pcfCancelBtn">취소</button>',
    '      <button class="detail-btn-save" id="pcfSaveBtn">저장</button>',
    '    </div>',
    '  </div>',
    '</div>'
  ].join('');
  modal.style.display = 'block';

  var close = function() { modal.style.display = 'none'; };
  document.getElementById('pcfClose').onclick = close;
  document.getElementById('pcfCancelBtn').onclick = close;
  document.getElementById('pcfOverlay').onclick = function(e) { if (e.target === this) close(); };

  function refreshHints() {
    var s = document.getElementById('pcfStartDate').value;
    var e = document.getElementById('pcfEndDate').value;
    var h = calcHints(s, e);
    document.getElementById('pcfAutoHint').textContent  = h.autoEndHint;
    document.getElementById('pcfNextHint').textContent  = h.nextStartHint;
  }
  document.getElementById('pcfStartDate').addEventListener('input', refreshHints);
  document.getElementById('pcfEndDate').addEventListener('input', refreshHints);

  document.getElementById('pcfSaveBtn').onclick = function() {
    var version  = document.getElementById('pcfVersion').value.trim();
    var sDate    = document.getElementById('pcfStartDate').value;
    var eDate    = document.getElementById('pcfEndDate').value;
    if (!eDate && sDate) eDate = plannerAutoEndDate(sDate);
    // 이미 등록된 버전이 있고 종료일이 설정된 경우, 시작일이 비어 있으면 규칙 적용
    if (!sDate && eDate && pd.endDate) sDate = plannerNextDayStr(pd.endDate);
    var newPd = Object.assign({}, pd, { version: version, startDate: sDate, endDate: eDate });
    savePlannerData(gameId, newPd);
    close();
    renderCurrencyPage();
  };
}

function escAttr(s) {
  return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── INTERNAL ──────────────────────────────────────────────────────────────────
// Section 8: Init

function init() {
  loadConfig()
    .then(function(config) {
      appState.config = config;
      renderGameSelect();
      document.getElementById("characterSelect").disabled = true;
      document.getElementById("analyzeBtn").disabled = true;
      document.getElementById("metaUpdateBtn").disabled = true;
      document.getElementById("metaUpdateClaudeCodeBtn").disabled = true;
    document.getElementById("cardSyncBtn").disabled = true;
      renderPlaceholder("게임을 선택해주세요.");

      document.getElementById("addGameBtn").addEventListener("click", function() { openGameConfigModal(null); });

      document.getElementById("gameList").addEventListener("click", function(e) {
        var card = e.target.closest(".game-card");
        if (!card) return;
        var gameId = card.dataset.game;
        document.querySelectorAll(".game-card").forEach(function(c) { c.classList.remove("active"); });
        card.classList.add("active");

        var activeNavTab = document.querySelector(".nav-tab.active");
        var currentTab = activeNavTab ? activeNavTab.dataset.tab : "analysis";

        if (currentTab === "currency") {
          _currencyTab = gameId;
          renderCurrencyPage();
        } else {
          onGameChange(gameId);
        }
      });

      document.querySelector(".sidebar-nav").addEventListener("click", function(e) {
        var btn = e.target.closest(".nav-tab");
        if (!btn) return;
        var tab = btn.dataset.tab;
        document.querySelectorAll(".nav-tab").forEach(function(b) { b.classList.remove("active"); });
        btn.classList.add("active");
        document.getElementById("tabAnalysis").style.display  = tab === "analysis"  ? "" : "none";
        document.getElementById("tabCurrency").style.display  = tab === "currency"  ? "" : "none";
        document.getElementById("analysisSideContent").style.display = tab === "analysis" ? "" : "none";

        if (tab === "currency") {
          // 가챠 분석에서 보고 있던 게임을 재화 탭에도 반영
          if (appState.currentGame) _currencyTab = appState.currentGame;
          renderCurrencyPage();
        } else if (tab === "analysis") {
          // 재화 탭에서 보고 있던 게임을 가챠 분석에도 반영
          var syncGame = _currencyTab || appState.currentGame;
          if (syncGame) {
            document.querySelectorAll(".game-card").forEach(function(c) {
              c.classList.toggle("active", c.dataset.game === syncGame);
            });
            onGameChange(syncGame);
          }
        }
      });

      document.getElementById("characterSelect").onchange = function() {
        onCharacterChange(this.value);
      };
      document.getElementById("analyzeBtn").onclick = function() {
        onAnalyzeClick();
      };
      document.getElementById("metaUpdateBtn").onclick = function() {
        runMetaUpdate();
      };
      document.getElementById("metaUpdateClaudeCodeBtn").onclick = function() {
        runClaudeCodeMetaUpdate();
      };
      document.getElementById("cardSyncBtn").onclick = function() {
        runCardSync();
      };

      var rosterList = document.getElementById('rosterList');
      rosterList.addEventListener('scroll', function() {
        rosterList.parentNode.classList.toggle('scroll-top', rosterList.scrollTop > 8);
      });

      return syncRosterFromFile();
    })
    .catch(function() {
      renderError("설정 파일을 불러오지 못했습니다. 페이지를 새로고침해주세요.");
    });
}

// ── Monte Carlo Simulation ─────────────────────────────────────────────────────

function _hashStr(s) {
  var h = 5381;
  for (var i = 0; i < s.length; i++) h = (Math.imul(h, 33) ^ s.charCodeAt(i)) >>> 0;
  return h;
}

function _makePRNG(seed) {
  var s = seed >>> 0;
  return function() {
    s += 0x6D2B79F5;
    var t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function runMonteCarlo(params, charRule, weaponRule, N, rng) {
  if (!N) N = 100000;
  if (!rng) rng = Math.random.bind(Math);
  var totalCharGoal   = params.totalCharGoal   || 0;
  var totalWeaponGoal = params.totalWeaponGoal || 0;
  if (totalCharGoal === 0 && totalWeaponGoal === 0) return null;

  var success = 0, charSuccess = 0, weaponSuccess = 0;

  for (var i = 0; i < N; i++) {
    var commonRemain    = params.commonPulls     || 0;
    var charPool        = params.charOnlyPulls   || 0;
    var weaponPool      = params.weaponOnlyPulls || 0;

    // ── 캐릭터 배너
    var charAchieved   = 0;
    var charPity       = params.curCharPity       || 0;
    var charGuaranteed = params.curCharGuaranteed || false;

    if (totalCharGoal > 0 && charRule) {
      while (charAchieved < totalCharGoal) {
        if      (charPool    > 0) charPool--;
        else if (commonRemain > 0) commonRemain--;
        else break;

        charPity++;
        var rate = charRule.baseRate;
        if (charPity >= charRule.softPityStart) {
          rate = charRule.baseRate +
                 (charPity - charRule.softPityStart + 1) * charRule.softPityIncreasePerPull;
        }
        if (charPity >= charRule.hardPity) rate = 1.0;
        rate = Math.min(rate, 1.0);

        if (rng() < rate) {
          charPity = 0;
          var isFeatured = charGuaranteed || (rng() < charRule.featuredRate);
          if (charRule.guaranteeAfterLose) charGuaranteed = !isFeatured;
          if (isFeatured) charAchieved++;
        }
      }
    }

    // ── 무기 배너 (캐릭터 배너 이후 남은 공용 사용)
    var weaponAchieved   = 0;
    var weaponPity       = params.curWeaponPity       || 0;
    var weaponGuaranteed = params.curWeaponGuaranteed || false;
    var weaponCommon     = weaponPool + commonRemain;

    if (totalWeaponGoal > 0 && weaponRule) {
      while (weaponAchieved < totalWeaponGoal) {
        if (weaponCommon > 0) weaponCommon--;
        else break;

        weaponPity++;
        var wRate = weaponRule.baseRate;
        if (weaponPity >= weaponRule.softPityStart) {
          wRate = weaponRule.baseRate +
                  (weaponPity - weaponRule.softPityStart + 1) * weaponRule.softPityIncreasePerPull;
        }
        if (weaponPity >= weaponRule.hardPity) wRate = 1.0;
        wRate = Math.min(wRate, 1.0);

        if (rng() < wRate) {
          weaponPity = 0;
          var wFeatured = weaponGuaranteed || (rng() < weaponRule.featuredRate);
          if (weaponRule.guaranteeAfterLose) weaponGuaranteed = !wFeatured;
          if (wFeatured) weaponAchieved++;
        }
      }
    }

    var charOk   = charAchieved   >= totalCharGoal;
    var weaponOk = weaponAchieved >= totalWeaponGoal;
    if (charOk)   charSuccess++;
    if (weaponOk) weaponSuccess++;
    if (charOk && weaponOk) success++;
  }

  return {
    rate:    success / N, success: success, total: N,
    charRate:   totalCharGoal   > 0 ? charSuccess   / N : null,
    weaponRate: totalWeaponGoal > 0 ? weaponSuccess / N : null
  };
}

// ── Planner ↔ Monte Carlo bridge ──────────────────────────────────────────────

var _gachaRulesCache = {};
var _simCache = {}; // key: "gameId|charGoal|weaponGoal|common|charOnly|weaponOnly"

function getGachaRulesCached(gameId) {
  if (!_gachaRulesCache[gameId]) {
    _gachaRulesCache[gameId] = loadGachaRules(gameId).then(function(rules) {
      if (!rules) delete _gachaRulesCache[gameId]; // 실패 시 캐시하지 않음 — 다음 호출에서 재시도
      return rules;
    });
  }
  return _gachaRulesCache[gameId];
}

function computePlannerSim(phases, rules, gameId) {
  if (!rules) { console.error('[planner] 가챠 룰 로드 실패 — 달성 확률을 계산할 수 없습니다.'); return null; }
  if (rules.status !== 'filled') { console.warn('[planner] 가챠 룰 미완성(status=' + rules.status + ') — 달성 확률 계산을 건너뜁니다.'); return null; }
  if (!phases.hasAnyGoal) return null;

  var cacheKey = [
    gameId || '',
    phases.totalCharGoalCount   || 0,
    phases.totalWeaponGoalCount || 0,
    phases.commonPulls          || 0,
    phases.characterOnlyPulls   || 0,
    phases.weaponOnlyPulls      || 0
  ].join('|');
  if (_simCache[cacheKey]) return _simCache[cacheKey];

  var params = {
    commonPulls:         phases.commonPulls,
    charOnlyPulls:        phases.characterOnlyPulls,
    weaponOnlyPulls:      phases.weaponOnlyPulls,
    totalCharGoal:        phases.totalCharGoalCount   || 0,
    totalWeaponGoal:      phases.totalWeaponGoalCount || 0,
    curCharPity:          0,
    curWeaponPity:        0,
    curCharGuaranteed:    false,
    curWeaponGuaranteed:  false
  };
  var result = runMonteCarlo(params, rules.character || null, rules.weapon || null, 20000, _makePRNG(_hashStr(cacheKey)));
  if (result) _simCache[cacheKey] = result;
  return result;
}

function testMonteCarlo() {
  var charRule = {
    baseRate: 0.006, softPityStart: 74, softPityIncreasePerPull: 0.06,
    hardPity: 90, featuredRate: 0.5, guaranteeAfterLose: true
  };
  var weaponRule = {
    baseRate: 0.01, softPityStart: 65, softPityIncreasePerPull: 0.06,
    hardPity: 80, featuredRate: 0.75, guaranteeAfterLose: true
  };
  var base = { curCharPity: 0, curWeaponPity: 0, curCharGuaranteed: false, curWeaponGuaranteed: false };

  // TEST1: 캐릭터1목표, 공용180뽑 — 최악 90×2=180뽑이므로 이론상 100%
  var r1 = runMonteCarlo(
    Object.assign({}, base, { commonPulls: 180, charOnlyPulls: 0, weaponOnlyPulls: 0,
      totalCharGoal: 1, totalWeaponGoal: 0 }),
    charRule, null, 50000);
  console.log('[MC TEST1] 캐릭터1 공용180뽑 →', (r1.rate * 100).toFixed(1) + '% (기대: 100%)');

  // TEST2: 캐릭터1목표, 90뽑+확정 — 최악 1회 천장 이내 확정픽업, 100%
  var r2 = runMonteCarlo(
    Object.assign({}, base, { commonPulls: 90, charOnlyPulls: 0, weaponOnlyPulls: 0,
      totalCharGoal: 1, totalWeaponGoal: 0, curCharGuaranteed: true }),
    charRule, null, 50000);
  console.log('[MC TEST2] 캐릭터1 90뽑 확정 →', (r2.rate * 100).toFixed(1) + '% (기대: 100%)');

  // TEST3: 캐릭터2목표, 90뽑만 — 최악 360뽑 필요, 90뽑은 극히 부족
  var r3 = runMonteCarlo(
    Object.assign({}, base, { commonPulls: 90, charOnlyPulls: 0, weaponOnlyPulls: 0,
      totalCharGoal: 2, totalWeaponGoal: 0 }),
    charRule, null, 50000);
  console.log('[MC TEST3] 캐릭터2 90뽑만 →', (r3.rate * 100).toFixed(1) + '% (기대: 매우 낮음)');

  // TEST4: 캐릭터1+무기1, 공용270뽑 — 최악 340뽑(캐릭180+무기160), 확정 아님
  var r4 = runMonteCarlo(
    Object.assign({}, base, { commonPulls: 270, charOnlyPulls: 0, weaponOnlyPulls: 0,
      totalCharGoal: 1, totalWeaponGoal: 1 }),
    charRule, weaponRule, 50000);
  console.log('[MC TEST4] 캐릭터1+무기1 공용270뽑 →', (r4.rate * 100).toFixed(1) + '% (최악 340뽑, 비확정)');
}

document.addEventListener("DOMContentLoaded", function() { init(); testPlannerCalcInvariant(); testMonteCarlo(); });
