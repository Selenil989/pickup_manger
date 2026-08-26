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
// 라벨은 전 게임 공통(키가 게임별로 달라 충돌 없음). 실제 옵션 목록은 편집 모달에서 현재 게임 데이터로 파생한다.
var CHAR_ROLE_LABELS = {
  attack: '강공', stun: '격파', anomaly: '이상', support: '지원', defense: '방어', rupture: '명파', armorer: '단조', // ZZZ 특성
  nihility: '공허', remembrance: '기억', erudition: '지식', hunt: '수렵', destruction: '파멸',
  harmony: '화합', preservation: '보존', abundance: '풍요', elation: '환락',                                  // HSR 운명
  vanguard: '뱅가드', striker: '스트라이커', defender: '디펜더', guard: '가드', caster: '캐스터',             // 엔드필드 클래스
  sword: '장검', broadblade: '대검', pistols: '권총', gauntlets: '권갑', rectifier: '음율기'                  // 명조 무기
};
var CHAR_ELEMENT_LABELS = {
  physical: '물리', fire: '불', ice: '얼음', electric: '전기', ether: '에테르', wind: '바람', lumiflux: '광휘', // 공통/ZZZ
  thunder: '번개', quantum: '양자', imaginary: '허수',                                                        // HSR
  aero: '기류', glacio: '냉기', fusion: '작열', havoc: '파멸', electro: '전도', spectro: '회절',              // 명조
  nature: '자연'                                                                                              // 엔드필드
};

// ── Game Meta (icon colors & abbreviations) ───────────────────────────────────

var GAME_META = {
  zzz:      { iconText: 'ZZ', iconBg: '#1a0f2e', iconColor: '#fbbf24' },
  hsr:      { iconText: 'SR', iconBg: '#1a1040', iconColor: '#a78bfa' },
  wuwa:     { iconText: 'WW', iconBg: '#0a1f1a', iconColor: '#34d399' },
  endfield: { iconText: 'EF', iconBg: '#0d1f0a', iconColor: '#4ade80' },
  nte:      { iconText: 'NE', iconBg: '#0f1a2e', iconColor: '#60a5fa' }
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
  endfield: { iconExt: '.png',  rarityIcon: false, minRarity: 5, iconBackdrop: true, excludeNamePattern: /^Endministrator/i },
  nte:      { iconExt: '.svg',  rarityIcon: false, minRarity: 4, iconBackdrop: true, roleField: '_noRoleIcon' }
};
// 서버 /api/sync-characters 가 자동 동기화(신규 캐릭터/이미지/아이콘/출시일)를
// 지원하는 게임 목록 — server.js의 SYNC_HANDLERS와 맞춰서 관리한다.
var CARD_SYNC_GAMES = ['hsr', 'wuwa', 'endfield'];
function isCardGridGame(gameId) { return !!CARD_GRID_CONFIG[gameId]; }

// 출시 여부는 releaseDate가 있으면 오늘 날짜와 비교해 동적으로 판단한다.
// (저장된 isReleased 값은 날짜가 지나도 안 바뀌므로, 출시 예정 딱지가 자동으로 떨어지도록)
function charIsReleased(dc) {
  if (dc && dc.releaseDate) {
    var r = /^\d{8}$/.test(dc.releaseDate)
      ? dc.releaseDate.slice(0, 4) + '-' + dc.releaseDate.slice(4, 6) + '-' + dc.releaseDate.slice(6)
      : dc.releaseDate;
    return r <= toLocalYMD(new Date());
  }
  return !dc || dc.isReleased !== false;
}
var _cardDragging     = false;
var _gameDragging     = false;
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
  },
  nte: {
    monthly: { composition: '이상수정 300 + 2,700 (매일 90×30)', conversion: '18.75뽑' },
    regular: { composition: '환석 680 + 무기 선택권 (추정)',        conversion: '약 9뽑'   }
  }
};

var CURRENCY_CONFIG = {
  zzz: {
    name: '젠레스 존 제로',
    currencies: [
      { id: 'monochrome',    name: '모노크롬',          icon: 'assets/icons/zzz/zz1.webp', rate: 160, desc: '160개 = 1뽑', note: null, type: 'common'    },
      { id: 'polychrome',    name: '폴리크롬',          icon: 'assets/icons/zzz/zz2.webp', rate: 160, desc: '160개 = 1뽑', note: null, type: 'common'    },
      { id: 'limitedTicket', name: '기밀 마스터 테이프', icon: 'assets/icons/zzz/zz3.webp', rate: 1,   desc: '1개 = 1뽑',   note: null, type: 'common'    }
    ]
  },
  hsr: {
    name: '붕괴: 스타레일',
    currencies: [
      { id: 'olddream',    name: '오래된 꿈',        icon: 'assets/icons/hsr/hsr1.webp', rate: 160, desc: '160개 = 1뽑', note: null, type: 'common' },
      { id: 'jade',        name: '성옥',            icon: 'assets/icons/hsr/hsr2.webp', rate: 160, desc: '160개 = 1뽑', note: null, type: 'common' },
      { id: 'limitedPass', name: '별의 궤도 전용티켓', icon: 'assets/icons/hsr/hsr3.webp', rate: 1,   desc: '1개 = 1뽑',   note: null, type: 'common' }
    ]
  },
  wuwa: {
    name: '명조: 워더링 웨이브',
    currencies: [
      { id: 'moonlight',   name: '달빛',          icon: 'assets/icons/wuwa/ww1.webp', rate: 160, desc: '160개 = 1뽑', note: null, type: 'common'    },
      { id: 'astrite',     name: '별의 소리',      icon: 'assets/icons/wuwa/ww2.webp', rate: 160, desc: '160개 = 1뽑', note: null, type: 'common'    },
      { id: 'limitedTide', name: '금빛 파도의 무늬', icon: 'assets/icons/wuwa/ww3.webp', rate: 1,   desc: '1개 = 1뽑',   note: null, type: 'character' },
      { id: 'tideRipple',  name: '울린 조수의 무늬', icon: 'assets/icons/wuwa/ww4.webp', rate: 1,   desc: '1개 = 1뽑',   note: null, type: 'weapon'    }
    ]
  },
  endfield: {
    name: '아크나이츠: 엔드필드',
    currencies: [
      { id: 'derivedOriginium', name: '파생 오리지늄',      icon: 'assets/icons/endfield/ef0.webp', rate: 500, desc: '500개 = 1뽑', note: null, type: 'common'    },
      { id: 'crystal',          name: '오로베릴',          icon: 'assets/icons/endfield/ef1.webp', rate: 500, desc: '500개 = 1뽑', note: null, type: 'common'    },
      { id: 'limitedPermit',    name: '헤드헌팅 채용 허가증', icon: 'assets/icons/endfield/ef2.webp', rate: 1,   desc: '1개 = 1뽑',   note: null, type: 'character' },
      { id: 'armoryToken',      name: '무기고 증표',        icon: 'assets/icons/endfield/ef3.webp', rate: 198, desc: '198개 = 1뽑', note: null, type: 'weapon', pullValue: 594 }
    ]
  },
  nte: {
    name: '이환',
    currencies: [
      { id: 'nteCur1', name: '이상수정',   icon: 'assets/icons/nte/nte1.webp', rate: 160, desc: '160개 = 1뽑', note: null, type: 'common'    },
      { id: 'nteCur2', name: '환석',       icon: 'assets/icons/nte/nte2.webp', rate: 160, desc: '160개 = 1뽑', note: null, type: 'common'    },
      { id: 'nteCur3', name: '진실의 주사위', icon: 'assets/icons/nte/nte3.webp', rate: 1, desc: '1개 = 1뽑', note: null, type: 'character' },
      { id: 'nteCur4', name: '삼중 열쇠',   icon: 'assets/icons/nte/nte4.webp', rate: 1, desc: '10개 = 10뽑 (10개 단위)', note: null, type: 'weapon'    }
    ]
  }
};

var GACHA_CONFIG = {
  zzz:      { charPity: 90, weaponPity: 80, pullCost: 160, packagePrice: 117800, packagePulls: 50 },
  hsr:      { charPity: 90, weaponPity: 80, pullCost: 160, packagePrice: 117800, packagePulls: 50 },
  wuwa:     { charPity: 80, weaponPity: 80, pullCost: 160, packagePrice: 117800, packagePulls: 50 },
  endfield: { charPity: 80, weaponPity: 80, pullCost: 160, packagePrice: 130000, packagePulls: 50 },
  nte:      { charPity: 90, weaponPity: 80, pullCost: 160, packagePrice: 117800, packagePulls: 50 }
};

// 뽑기 원가 — 깡트럭 뽑당 원 + 평균 명함/전무 뽑수(기댓값). 엔드필드는 재화 구조가 달라
// 뽑당 원가가 조금 높고, 전무는 대부분 부산물로 충당돼 실질 합계(sumAvg)를 따로 둔다.
var PULL_COST = {
  hsr:      { won: 2356, charAvg: 94, weaponAvg: 65 },
  zzz:      { won: 2356, charAvg: 94, weaponAvg: 65 },
  wuwa:     { won: 2356, charAvg: 87, weaponAvg: 55 },
  nte:      { won: 2356, charAvg: 70, weaponAvg: 60 },
  endfield: { won: 2600, charAvg: 79, weaponAvg: 56, sumAvg: 86, note: '전무는 대부분 부산물로 충당' }
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

// 배포 버전(index.html의 app.js?v=…)을 읽어 데이터 fetch에 붙인다.
// 배포할 때마다 값이 바뀌므로, 카드 데이터(characters/meta/banner)가 배포 즉시
// 자동 갱신되고(브라우저 캐시 무효화), 배포 사이엔 캐시를 재사용한다.
function assetVersion() {
  try {
    var ss = document.getElementsByTagName('script');
    for (var i = 0; i < ss.length; i++) {
      var m = (ss[i].src || '').match(/[?&]v=(\d+)/);
      if (m) return m[1];
    }
  } catch (e) {}
  return '';
}

function loadGameData(gameId) {
  var v = assetVersion();
  var q = v ? '?v=' + v : '';
  return Promise.all([
    fetch("data/games/" + gameId + "/characters.json" + q).then(function(res) { return res.json(); }),
    fetch("data/games/" + gameId + "/meta.json" + q).then(function(res) { return res.json(); }),
    fetch("data/games/" + gameId + "/banner.json" + q).then(function(res) { return res.json(); })
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
  a.download = 'pickup_settings_' + toLocalYMD(new Date()) + '.json';
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
      if (savedChars && savedChars.length > 0) {
        // 저장 목록(순서·사용자 생성)을 유지하며 source(characters.json)와 병합한다.
        // 게임별로 정본이 다르다:
        //  - 동기화 게임(CARD_SYNC_GAMES: hsr/wuwa/endfield)은 "카드 데이터 갱신"으로
        //    localStorage에 최신 데이터가 들어오므로 localStorage를 정본으로 유지한다.
        //    (여기서 source로 덮으면 동기화된 이름/이미지가 리포 값으로 되돌아가 깨진다)
        //  - 비동기 게임(nte/zzz)은 리포 source가 정본 → 기존 캐릭터도 source 최신값으로
        //    대체해 이름·속성 정정(예: 잔코우→잔홍)이 캐시된 사용자에게도 반영되게 한다.
        // 두 경우 모두: source에 새로 추가된 캐릭터는 append, 사용자 생성 캐릭터는 보존.
        var _sourceWins = CARD_SYNC_GAMES.indexOf(gameId) === -1;
        var _srcById = {};
        for (var _i = 0; _i < data.characters.length; _i++) _srcById[data.characters[_i].id] = data.characters[_i];
        var _used = {};
        var _merged = [];
        for (var _j = 0; _j < savedChars.length; _j++) {
          var _sc = savedChars[_j];
          if (_used[_sc.id]) continue;
          if (_srcById[_sc.id]) { _merged.push(_sourceWins ? _srcById[_sc.id] : _sc); }
          else { _merged.push(_sc); }  // 사용자 생성 캐릭터
          _used[_sc.id] = true;
        }
        for (var _k = 0; _k < data.characters.length; _k++) {
          if (!_used[data.characters[_k].id]) { _merged.push(data.characters[_k]); _used[data.characters[_k].id] = true; }
        }
        appState.characters = _merged;
      } else {
        appState.characters = data.characters;
      }
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

      document.getElementById("metaUpdateBtn").disabled = false;
      document.getElementById("cardSyncBtn").disabled = false;
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
    btn.draggable = true;
    btn.innerHTML = iconHtml + '<span class="game-card-name">' + (config[gameId].name || gameId) + '</span>';
    list.appendChild(btn);
  }
}

function renderCharacterSelect() {
  var select = document.getElementById("characterSelect");
  if (!select) return; // 드롭박스는 카드 클릭 방식으로 대체되어 제거됨
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
  var _av = assetVersion(); var imgQ = _av ? '?v=' + _av : '';   // 배포 버전으로 이미지 캐시버스팅(교체 시 즉시 반영)
  var roster = appState.rosters[gameId] || { characters: [] };
  var ownedMap = {};
  for (var o = 0; o < roster.characters.length; o++) {
    ownedMap[roster.characters[o].characterId] = roster.characters[o];  // 돌파/전무 뱃지용 전체 엔트리
  }

  var html = '';

  if (!_cardHintDismissed) {
    html += '<div class="card-hint-bar" id="cardHintBar">' +
      '<span class="card-hint-item"><span class="card-hint-icon">👆</span> 클릭 — 보유 편집</span>' +
      '<span class="card-hint-sep">·</span>' +
      '<span class="card-hint-item"><span class="card-hint-icon">✌</span> 더블클릭 — 보유 토글</span>' +
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
      var ia = orderMap[a.id] !== undefined ? orderMap[a.id] : -1;  // 커스텀 순서에 없는 신규 캐릭터는 최상단
      var ib = orderMap[b.id] !== undefined ? orderMap[b.id] : -1;
      return ia - ib;
    });
  } else {
    sortedChars.sort(function(a, b) {
      var da = _charEdits[a.id] ? Object.assign({}, a, _charEdits[a.id]) : a;
      var db = _charEdits[b.id] ? Object.assign({}, b, _charEdits[b.id]) : b;
      var ga = !charIsReleased(da) ? 0 : (da.releaseDate ? 1 : 2);
      var gb = !charIsReleased(db) ? 0 : (db.releaseDate ? 1 : 2);
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
      html += '<img class="char-card-image" src="' + imgBase + dc.image + imgQ + '" alt="' + dc.name + '" loading="lazy">';
    } else {
      html += '<div class="char-card-image char-card-no-img"></div>';
    }
    var iconCls = 'char-card-icon' + (cfg.iconBackdrop ? ' char-card-icon--backdrop' : '');
    // 좌상단 스택: [랭크(ZZZ만)] → [출시예정] → [돌파] → [전무] 순. 랭크 없으면 출시예정이 최상단.
    html += '<div class="char-card-icons"><div class="char-card-icons-left">';
    if (rarityFile) html += '<img class="' + iconCls + '" src="' + imgBase + rarityFile + '" alt="">';
    if (!charIsReleased(dc)) html += '<span class="card-badge card-badge--upcoming">출시 예정</span>';
    if (owned) {
      var oe = ownedMap[char.id];
      html += '<span class="card-badge card-badge--dupe">' + ((oe.dupeLevel || 0) > 0 ? oe.dupeLevel + '돌' : '명함') + '</span>';
      if (oe.weapon && oe.weapon.hasSignature) html += '<span class="card-badge card-badge--weapon">전무</span>';
    }
    html += '</div><div class="char-card-icons-right">';
    if (roleFile) html += '<img class="' + iconCls + '" src="' + imgBase + roleFile + '" alt="">';
    if (elementFile) html += '<img class="' + iconCls + '" src="' + imgBase + elementFile + '" alt="">';
    html += '</div></div>';
    if (owned) html += '<div class="char-card-owned-overlay"></div>';
    html += '<div class="char-card-name">' + (dc.nameKo || dc.name) + '</div>';
    html += '</div>';
  }

  html += '<div class="char-card-add"><div class="char-card-add-icon">+</div>' +
    '<div class="char-card-add-label">캐릭터 추가</div></div>';
  html += '</div>';

  var panel = document.getElementById('resultsPanel');
  panel.innerHTML = html;

  // 일반 카드: 클릭=분석 열기, 더블클릭=보유 토글
  var regularCards = panel.querySelectorAll('.char-card');
  for (var j = 0; j < regularCards.length; j++) {
    (function(card) {
      var charId = card.getAttribute('data-char-id');
      var clickTimer = null;
      card.addEventListener('click', function(e) {
        if (_cardDragging) return;
        clearTimeout(clickTimer);
        clickTimer = setTimeout(function() { openCharacterDetail(charId); }, 220);
      });
      card.addEventListener('dblclick', function(e) {
        clearTimeout(clickTimer);
        toggleRosterCharacter(charId);
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

  var releaseLabel = charIsReleased(char)
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

  _persistAndReanalyze();
  closeCharacterDetail();
}

// roster 변경 후 저장 + 로스터/분석/카드 갱신 (모달 저장·인라인 컨트롤 공용)
function _persistAndReanalyze() {
  saveRoster(appState.currentGame);
  renderRoster();
  if (appState.selectedCharacterId) runAnalysis();
  else if (isCardGridGame(appState.currentGame)) renderCardGrid();
}

// 분석 top strip 인라인 보유/돌파/전무 컨트롤 — 모달 없이 roster에 즉시 반영.
function _ownEntry(charId) {
  var roster = appState.rosters[appState.currentGame];
  if (!roster) return null;
  for (var i = 0; i < roster.characters.length; i++) {
    if (roster.characters[i].characterId === charId) return roster.characters[i];
  }
  return null;
}
function inlineSetOwned(charId, owned) {
  if (!appState.rosters[appState.currentGame]) appState.rosters[appState.currentGame] = { characters: [] };
  var roster = appState.rosters[appState.currentGame];
  var idx = -1;
  for (var i = 0; i < roster.characters.length; i++) if (roster.characters[i].characterId === charId) { idx = i; break; }
  if (owned && idx === -1) {
    roster.characters.push({ characterId: charId, dupeLevel: 0, weapon: { hasSignature: false, refinement: 1 }, isLeveledUp: false, memo: '' });
  } else if (!owned && idx !== -1) {
    roster.characters.splice(idx, 1);
  }
  _persistAndReanalyze();
}
function inlineSetDupe(charId, level) {
  var e = _ownEntry(charId);
  if (!e) return;                 // 미보유 시 무시 (버튼 disabled)
  e.dupeLevel = level;
  _persistAndReanalyze();
}
function inlineToggleSig(charId) {
  var e = _ownEntry(charId);
  if (!e) return;
  if (!e.weapon) e.weapon = { hasSignature: false, refinement: 1 };
  e.weapon.hasSignature = !e.weapon.hasSignature;
  _persistAndReanalyze();
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
    weaponType:     cur.weaponType || '',
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
    rarity: 5, role: '', weaponType: '', element: '',
    specialElement: '', releaseDate: '', releaseOrder: null, isReleased: true
  };
  renderCharacterEditModal();
  document.getElementById('charEditModal').style.display = 'block';
}

function renderCharacterEditModal() {
  var d        = _editDraft;
  var isCreate = _editIsCreate;

  // 게임별 포지션 필드: 명조는 role이 없어 weaponType(무기)을 편집한다.
  var _rf      = (CARD_GRID_CONFIG[appState.currentGame] || {}).roleField || 'role';
  var posValue = _rf === 'weaponType' ? (d.weaponType || '') : (d.role || '');
  var posLabel = _rf === 'weaponType' ? '무기' : '역할';

  // ZZZ 전용 하드코딩 대신 현재 게임 데이터에서 실제 값을 파생. 편집 중인 값은 항상 포함해 유실을 막는다.
  function _distinctVals(field, keep) {
    var seen = {}, out = [];
    for (var i = 0; i < appState.characters.length; i++) {
      var v = appState.characters[i][field];
      if (v && !seen[v]) { seen[v] = 1; out.push(v); }
    }
    if (keep && !seen[keep]) out.push(keep);
    return out.sort();
  }
  function _selOpts(vals, sel, labels) {
    var h = '<option value="">-</option>';
    for (var i = 0; i < vals.length; i++) {
      h += '<option value="' + vals[i] + '"' + (sel === vals[i] ? ' selected' : '') + '>' + (labels[vals[i]] || vals[i]) + '</option>';
    }
    return h;
  }
  var roleOpts = _selOpts(_distinctVals(_rf, posValue), posValue, CHAR_ROLE_LABELS);
  var elemOpts = _selOpts(_distinctVals('element', d.element), d.element, CHAR_ELEMENT_LABELS);

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
    '<div class="edit-row"><label class="edit-label">' + posLabel + '</label>' +
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
    element:        gv('edit-element') || null,
    specialElement: gv('edit-specialElement') || null,
    releaseDate:    gv('edit-releaseDate'),
    releaseOrder:   parseInt(gv('edit-releaseOrder')) || null,
    isReleased:     _editDraft.isReleased
  };
  // 포지션 값은 게임별 필드에 저장 (명조=weaponType, 그 외=role)
  var _saveRf = (CARD_GRID_CONFIG[appState.currentGame] || {}).roleField || 'role';
  updates[_saveRf] = gv('edit-role') || null;

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
  a.download = appState.currentGame + '.characters.json';
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
    div.textContent = (char.nameKo || char.name) + (charIsReleased(char) ? "" : " ✦");
    div.title = charIsReleased(char) ? "" : "출시 예정";
    (function(charId) {
      div.onclick = function() { toggleRosterCharacter(charId); };
    })(char.id);

    rosterList.appendChild(div);
  }
}

// gachaGuide는 표시 전용이다 — app.js는 계산하지 않는다.
// 파츠 보유 판단은 evaluationEngine이 계산한 guideAccount로 받아서 표시만 한다.
// meta.gachaGuide가 없으면 빈 문자열을 반환해 기존 화면과 완전히 동일하게 둔다.
// 향후 시너지(futureLinks)를 "뽑을 이유(긍정 요인)" 문구로 변환한다.
// 사용자 요청: 향후 시너지를 별도 섹션이 아니라 긍정 요인에 합쳐서 표시.
function futureSynergyReasons(meta) {
  return (meta.futureLinks || []).map(function(fl) {
    var name = fl.characterId;
    for (var i = 0; i < appState.characters.length; i++) {
      if (appState.characters[i].id === fl.characterId) {
        name = appState.characters[i].nameKo || appState.characters[i].name;
        break;
      }
    }
    return name + '와 향후 시너지' + (fl.synergy ? ' (' + fl.synergy + ')' : '');
  });
}

function renderGachaGuideSection(meta, guideAccount) {
  var guide = meta.gachaGuide;
  // gachaGuide가 없어도 parts 객체를 반환해야 renderResults의 gg.party 등이 undefined(→NaN)가 안 된다.
  var EMPTY_PARTS = { features: '', party: '', coreParts: '', altParts: '', altEquip: '', recommendReconsider: '', sources: '' };
  if (!guide) return EMPTY_PARTS;

  // guideAccount(evaluationEngine 계산): 이 가이드의 파츠 중 내가 보유한 id 모음.
  // guideAccount가 없으면(계정 판단 미수행) 뱃지 없이 이름만 표시한다.
  var ownedMap = {};
  if (guideAccount) {
    function collectOwned(blocks) {
      (blocks || []).forEach(function(b) {
        (b.ownedCharacterIds || []).forEach(function(id) { ownedMap[id] = true; });
      });
    }
    collectOwned(guideAccount.partyRequirements);
    collectOwned(guideAccount.corePartners);
    collectOwned(guideAccount.alternativePartners);
  }

  var GG_ROLE_LABEL = {
    // 공통/개념
    support: '지원', debuffer: '디버퍼', healer: '힐러', tank: '탱커',
    // ZZZ
    attack: '강공', stun: '격파', anomaly: '이상', defense: '방어', rupture: '명파',
    // HSR (운명)
    nihility: '공허', erudition: '지식', hunt: '수렵', destruction: '파멸',
    harmony: '화합', preservation: '보존', abundance: '풍요', remembrance: '기억', elation: '환락'
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
  // 계정 판단이 있으면 캐릭터 이름 옆에 보유/미보유 뱃지를 붙인다.
  function ggCharTag(id) {
    var name = ggCharName(id);
    if (!guideAccount) return name;
    return ownedMap[id]
      ? name + '<span class="own-badge own-yes">보유</span>'
      : name + '<span class="own-badge own-no">미보유</span>';
  }
  function ggCharNames(ids) {
    if (!ids || ids.length === 0) return '';
    var out = [];
    for (var i = 0; i < ids.length; i++) out.push(ggCharTag(ids[i]));
    return out.join(' ');
  }

  // 파티 조건 충족 상태 뱃지
  var GG_STATUS = {
    met:     { t: '조건 충족',   c: 'gg-st-met' },
    partial: { t: '일부 보유',   c: 'gg-st-partial' },
    unmet:   { t: '조건 미충족', c: 'gg-st-unmet' },
    unknown: { t: '확인 불가',   c: 'gg-st-unknown' }
  };
  function statusBadge(status) {
    var s = GG_STATUS[status] || GG_STATUS.unknown;
    return '<span class="gg-status ' + s.c + '">' + s.t + '</span>';
  }

  var GG_REQ_TYPE_LABEL = { all: '전원 필요', one_of: '택 1', role: '역할 조건' };

  // 각 섹션을 문자열로 따로 담아 반환한다. renderResults가 3단 구조
  // (결론 → 핵심 근거 → 접힌 상세)로 순서를 제어한다.
  var parts = {
    features: '', party: '', coreParts: '', altParts: '',
    altEquip: '', recommendReconsider: '', sources: ''
  };

  // 캐릭터 특징 (상세 — 접기)
  var keyFeatures = guide.keyFeatures || [];
  if (keyFeatures.length > 0) {
    var fh = '<details class="result-block gg-collapsible"><summary class="result-label">캐릭터 특징</summary>';
    fh += '<div class="gg-feature-grid">';
    for (var i = 0; i < keyFeatures.length; i++) {
      var f = keyFeatures[i];
      if (!f) continue;
      fh += '<div class="gg-feature-card">';
      fh += '<div class="gg-feature-title">' + (f.title || '') + '</div>';
      fh += '<div class="gg-feature-desc">' + (f.description || '') + '</div>';
      fh += '</div>';
    }
    fh += '</div></details>';
    parts.features = fh;
  }

  // 파티 구성 조건 (핵심 — 항상). 시스템 작동 조건이며 고점 추천 파티가 아님을 명시.
  var partyReq = guide.partyRequirements || [];
  if (partyReq.length > 0) {
    var ph = '<div class="result-block"><div class="result-label">파티 구성 조건</div>';
    ph += '<div class="gg-hint">스킬이 정상 작동하기 위한 시스템 조건입니다 — 고점 추천 조합이 아닙니다.</div>';
    for (var i = 0; i < partyReq.length; i++) {
      var r = partyReq[i];
      if (!r) continue;
      var reqAcc = guideAccount && guideAccount.partyRequirements ? guideAccount.partyRequirements[i] : null;
      ph += '<div class="gg-req-row">';
      ph += '<span class="badge">' + (GG_REQ_TYPE_LABEL[r.type] || r.type || '조건') + '</span>';
      if (reqAcc) ph += statusBadge(reqAcc.status);
      var reqNames = ggCharNames(r.characterIds);
      var reqRoles = (r.roles || []).map(ggRoleLabel).join(', ');
      if (reqNames) ph += '<span class="gg-req-targets">' + reqNames + '</span>';
      if (reqRoles) ph += '<span class="gg-req-targets">' + reqRoles + '</span>';
      if (r.description) ph += '<div class="gg-req-desc">' + r.description + '</div>';
      ph += '</div>';
    }
    ph += '</div>';
    parts.party = ph;
  }

  // 핵심 파츠 (핵심 — 항상)
  var coreP = guide.corePartners || [];
  if (coreP.length > 0) {
    var ch = '<div class="result-block"><div class="result-label">핵심 파츠</div>';
    for (var i = 0; i < coreP.length; i++) {
      var p = coreP[i];
      if (!p) continue;
      ch += '<div class="gg-partner-row">';
      ch += '<div class="gg-partner-names">' + (ggCharNames(p.characterIds) || '(대상 없음)') + '</div>';
      if (p.description) ch += '<div class="gg-partner-desc">' + p.description + '</div>';
      ch += '</div>';
    }
    ch += '</div>';
    parts.coreParts = ch;
  }

  // 대체 및 범용 파츠 (핵심 — 항상)
  var altP = guide.alternativePartners || [];
  if (altP.length > 0) {
    var ah = '<div class="result-block"><div class="result-label">대체 및 범용 파츠</div>';
    for (var i = 0; i < altP.length; i++) {
      var ap = altP[i];
      if (!ap) continue;
      var apRoles = (ap.roles || []).map(ggRoleLabel).join(', ');
      ah += '<div class="gg-partner-row">';
      ah += '<div class="gg-partner-names">' + (ggCharNames(ap.characterIds) || '(대상 없음)') + (apRoles ? ' <span class="gg-partner-role">' + apRoles + '</span>' : '') + '</div>';
      if (ap.description) ah += '<div class="gg-partner-desc">' + ap.description + '</div>';
      ah += '</div>';
    }
    ah += '</div>';
    parts.altParts = ah;
  }

  // 대체 장비 (상세 — 접기)
  var altEq = guide.alternativeEquipment || [];
  if (altEq.length > 0) {
    var eh = '<details class="result-block gg-collapsible"><summary class="result-label">대체 장비</summary>';
    for (var i = 0; i < altEq.length; i++) {
      var e = altEq[i];
      if (!e) continue;
      eh += '<div class="gg-partner-row">';
      eh += '<div class="gg-partner-names">' + (e.name || '') + '</div>';
      if (e.description) eh += '<div class="gg-partner-desc">' + e.description + '</div>';
      eh += '</div>';
    }
    eh += '</details>';
    parts.altEquip = eh;
  }

  // 이런 계정에 추천 · 다시 생각 (상세 — 접기, 하나의 접이식으로 묶음)
  // 계정과 직접 비교한 결과가 아닌 일반 조건이므로 상세로 내린다.
  var recFor = guide.recommendedFor || [];
  var reconsider = guide.reconsiderIf || [];
  if (recFor.length > 0 || reconsider.length > 0) {
    var rh = '<details class="result-block gg-collapsible"><summary class="result-label">이런 계정에 추천 · 다시 생각</summary>';
    rh += '<div class="gg-hint">계정과 직접 비교한 결과가 아닌 일반 조건입니다 — 자신의 상황과 비교해보세요.</div>';
    if (recFor.length > 0) {
      rh += '<div class="gg-sublabel">👍 이런 계정에 추천</div><ul class="gg-checklist">';
      for (var i = 0; i < recFor.length; i++) rh += '<li>' + recFor[i] + '</li>';
      rh += '</ul>';
    }
    if (reconsider.length > 0) {
      rh += '<div class="gg-sublabel gg-sublabel-warn">⚠️ 이런 경우 다시 생각</div><ul class="gg-checklist gg-checklist-warn">';
      for (var i = 0; i < reconsider.length; i++) rh += '<li>' + reconsider[i] + '</li>';
      rh += '</ul>';
    }
    rh += '</details>';
    parts.recommendReconsider = rh;
  }

  // 출처 (상세 — 접기). 공식/참고 구분은 sources[].name 텍스트에 이미 반영됨.
  var sources = meta.sources || [];
  if (sources.length > 0) {
    var sh = '<details class="result-block gg-sources gg-collapsible"><summary class="result-label">출처</summary>';
    sh += '<ul class="gg-source-list">';
    for (var i = 0; i < sources.length; i++) {
      var s = sources[i];
      if (!s) continue;
      sh += '<li>';
      if (s.url) {
        sh += '<a href="' + escAttr(s.url) + '" target="_blank" rel="noopener noreferrer">' + (s.name || s.url) + '</a>';
      } else {
        sh += (s.name || '');
      }
      sh += '</li>';
    }
    sh += '</ul></details>';
    parts.sources = sh;
  }

  return parts;
}

// 뽑을 이유/스킵 이유 목록에서 완전 중복(공백 정규화 후 동일)을 제거한다.
function dedupeReasons(arr) {
  var seen = {}, out = [];
  for (var i = 0; i < arr.length; i++) {
    var key = String(arr[i]).replace(/\s+/g, ' ').trim();
    if (!key || seen[key]) continue;
    seen[key] = true;
    out.push(arr[i]);
  }
  return out;
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
  var ownEntry = null;
  for (var _oi = 0; _oi < roster.characters.length; _oi++) {
    if (roster.characters[_oi].characterId === character.id) { ownEntry = roster.characters[_oi]; break; }
  }
  var isOwned = !!ownEntry;
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
  // 최종 투자선은 evaluationEngine이 계산한 값을 그대로 쓴다 (app.js는 표시만).
  var action = result.investmentTier;

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

  // 상단 바: 목록(좌) + 보유/돌파/전무 인라인 컨트롤(중) + 설정 톱니바퀴(우)
  // 인라인 컨트롤은 모달 없이 즉시 roster에 반영 → 점수·카드 뱃지 갱신. 미보유 시 돌파/전무는 비활성.
  var _dup   = ownEntry ? (ownEntry.dupeLevel || 0) : 0;
  var _sig   = ownEntry && ownEntry.weapon ? ownEntry.weapon.hasSignature : false;
  var _odis  = ownEntry ? '' : ' disabled';
  var ownCtl = '<div class="own-ctl">'
    + '<button class="own-ctl-btn' + (ownEntry ? ' active' : '') + '" onclick="inlineSetOwned(\'' + character.id + '\',' + (ownEntry ? 'false' : 'true') + ')">'
      + (ownEntry ? '✓ 보유' : '미보유') + '</button>'
    + '<span class="own-ctl-sep">돌파</span>';
  for (var _di = 0; _di <= 6; _di++) {
    ownCtl += '<button class="own-ctl-num' + (_dup === _di ? ' active' : '') + '"' + _odis
      + ' onclick="inlineSetDupe(\'' + character.id + '\',' + _di + ')">' + _di + '</button>';
  }
  ownCtl += '<button class="own-ctl-btn own-ctl-sig' + (_sig ? ' active' : '') + '"' + _odis
    + ' onclick="inlineToggleSig(\'' + character.id + '\')">전무 ' + (_sig ? '✓' : '✕') + '</button></div>';

  html += '<div class="results-topbar">'
        + '<button class="results-back-btn" onclick="goBackToCards()">← 목록</button>'
        + ownCtl
        + '<button class="results-gear-btn" title="캐릭터 설정" onclick="openCharacterDetail(\'' + character.id + '\')">⚙</button>'
        + '</div>';

  // Verdict Hero: 최종 추천도 + 추천 행동 통합
  var inlineBadge = isOwned
    ? '<span class="verdict-inline verdict-owned">보유중</span>'
    : '<span class="verdict-inline">' + verdictLabel + '</span>';
  var _aCss = {
    high_investment: 'action-full', card_weapon: 'action-hold', wait_2w: 'action-wait',
    efficient_breakthrough: 'action-full', card_only: 'action-char', skip: 'action-skip'
  };
  html += '<div class="result-block verdict-hero pull-' + pullClass + ' ' + (_aCss[action] || '') + '">';
  html += '<div class="verdict-hero-top"><div class="result-label">최종 추천도' + inlineBadge + '</div></div>';
  html += '<div class="verdict-hero-score-row">';
  html += '<div class="final-score verdict-hero-score">' + parseFloat(result.finalScore.toFixed(1)) + '<span class="verdict-hero-score-unit"> / 10</span></div>';
  html += '<div class="verdict-hero-bar-col"><div class="score-bar-wrap"><div class="score-bar-track"><div class="score-bar" style="width:' + finalPct + '%"></div></div></div></div>';
  html += '</div>';
  html += '<div class="verdict-final"><span class="verdict-final-label">내 계정 기준 투자선</span><span class="action-label verdict-final-tier">' + (result.investmentTierLabel || '') + '</span></div>';
  if (result.investmentReasons && result.investmentReasons.length > 0) {
    html += '<div class="sub-note">' + result.investmentReasons.join(' · ') + '</div>';
  }
  if (result.isCurrentPickup) html += '<div class="pickup-badge">현재 픽업 중</div>';
  if (fomoScore >= 7) html += '<div class="fomo-warn">⚠️ 불안 과금 주의 — 충분히 고민 후 결정하세요</div>';
  html += '</div>';

  // ── 가챠 가이드 파츠 (부분별로 받아 3단 구조로 배치) ──
  var gg = renderGachaGuideSection(meta, result.guideAccount);
  var hasGuide = !!meta.gachaGuide;
  if (hasGuide) html += '<div class="gg-heading">📖 가챠 가이드</div>';

  // ── Tier 2-a: 계정 맞춤 파츠 (이 앱의 핵심 — 항상 표시) ──
  html += gg.party + gg.coreParts + gg.altParts;

  // ── Tier 2-b: 숫자 요약 (KPI 타일 + 명함/돌파/전무) ──
  var confClass = meta.confidence >= 0.80 ? 'confidence-high'
                : meta.confidence >= 0.60 ? 'confidence-mid'
                : 'confidence-low';
  html += '<div class="kpi-grid">';
  html += kpiTile('📈', '메타 성능', meta.metaScore, scoreBadge(meta.metaScore),
    '<div class="kpi-tile-caption confidence-note ' + confClass + '">신뢰도 ' + Math.round(meta.confidence * 100) + '%</div>');
  html += kpiTile('🏦', '계정 체급', result.accountGrowth, scoreBadge(result.accountGrowth),
    '<div class="kpi-tile-caption">높을수록 내 계정 기여 큼</div>');
  html += kpiTile('🔮', '미래 가치', meta.futureScore, scoreBadge(meta.futureScore),
    '<div class="kpi-tile-caption">높을수록 미래에도 가치</div>');
  html += kpiTile('♻️', '대체 가능성', meta.replacementScore, '',
    '<div class="kpi-tile-caption">높을수록 대체 용이</div>');
  html += kpiTile('❓', '불확실성', uncScore, '',
    '<div class="kpi-tile-caption">높을수록 판단 보류 권장</div>');
  html += '</div>';

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

  // ── Tier 2-c: 장단점 (정리된 이유만) ──
  // 위에는 meta가 정리한 뽑을/스킵 이유만 간결하게. 커뮤니티 원문 긍정/부정은
  // 아래 '커뮤니티 원문' 접이식으로 내려 중복·장황함을 없앤다.
  var commSummary = meta.communitySummary || null;
  var pros = dedupeReasons((meta.pullReasons || []).concat(futureSynergyReasons(meta)));
  var cons = dedupeReasons((meta.skipReasons || []).slice());
  if (pros.length > 0 || cons.length > 0) {
    html += '<div class="two-col-grid">';
    html += '<div class="result-block"><div class="result-label">👍 뽑아야 할 이유</div><ul class="reason-list">';
    for (var pj = 0; pj < pros.length; pj++) html += '<li>' + pros[pj] + '</li>';
    html += '</ul></div>';
    html += '<div class="result-block"><div class="result-label">👎 뽑지 말아야 할 이유</div><ul class="reason-list reason-skip">';
    for (var cj = 0; cj < cons.length; cj++) html += '<li>' + cons[cj] + '</li>';
    html += '</ul></div>';
    html += '</div>';
  }

  // ── Tier 3: 상세 (접기 — 기본 숨김) ──
  html += gg.features;

  // 커뮤니티 원문 — 긍정/부정은 위 통합 장단점으로 흡수했고, 여기선 정성 요약만.
  var commDetail = '';
  function _csSec(label, cls, text) {
    return '<div class="summary-section"><div class="summary-label' + (cls ? ' ' + cls : '') + '">' + label + '</div><div class="summary-text">' + text + '</div></div>';
  }
  function _csList(label, cls, items, listCls) {
    var h = '<div class="summary-section"><div class="summary-label' + (cls ? ' ' + cls : '') + '">' + label + '</div><ul class="reason-list' + (listCls ? ' ' + listCls : '') + '">';
    for (var i = 0; i < items.length; i++) h += '<li>' + items[i] + '</li>';
    return h + '</ul></div>';
  }
  if (commSummary) {
    if (commSummary.metaPosition)     commDetail += _csSec('메타 위치', '', commSummary.metaPosition);
    if (commSummary.commonEvaluation) commDetail += _csSec('공통 평가', '', commSummary.commonEvaluation);
    if (commSummary.commonOpinion)    commDetail += _csSec('공통 의견', '', commSummary.commonOpinion);
    if (commSummary.pros && commSummary.pros.length)         commDetail += _csList('장점', 'comm-pos', commSummary.pros, '');
    if (commSummary.positive && commSummary.positive.length) commDetail += _csList('긍정', 'comm-pos', commSummary.positive, '');
    if (commSummary.cons && commSummary.cons.length)         commDetail += _csList('단점', 'comm-neg', commSummary.cons, 'reason-skip');
    if (commSummary.negative && commSummary.negative.length) commDetail += _csList('부정', 'comm-neg', commSummary.negative, 'reason-skip');
    if (commSummary.concerns)         commDetail += _csSec('실전 우려', 'comm-note', commSummary.concerns);
    if (commSummary.concern)          commDetail += _csSec('우려', 'comm-note', commSummary.concern);
    if (commSummary.investmentNote)   commDetail += _csSec('투자 메모', '', commSummary.investmentNote);
  }
  if (commDetail) {
    html += '<details class="result-block gg-collapsible"><summary class="result-label">커뮤니티 원문</summary>' + commDetail + '</details>';
  }

  html += gg.recommendReconsider;
  html += gg.altEquip;
  html += gg.sources;

  // 불확실 요인 — 상세로 내려 접어둠
  var uncReasons = (meta.uncertainty && meta.uncertainty.reasons) || [];
  if (uncReasons.length > 0) {
    html += '<details class="result-block gg-collapsible"><summary class="result-label">불확실 요인</summary>';
    html += '<div class="kpi-notes"><div>' + uncReasons.join(' / ') + '</div></div></details>';
  }

  html += '</div>';

  document.getElementById("resultsPanel").innerHTML = html;
}

function renderNoMeta(character) {
  document.getElementById("resultsPanel").innerHTML =
    '<div class="results-container">' +
    '<div class="results-topbar">' +
      '<button class="results-back-btn" onclick="goBackToCards()">← 목록</button>' +
      '<button class="results-gear-btn" title="캐릭터 설정" onclick="openCharacterDetail(\'' + character.id + '\')">⚙</button>' +
    '</div>' +
    '<div class="results-placeholder">' +
    '<p><strong>' + (character.nameKo || character.name) + '</strong>의 메타 데이터가 아직 등록되지 않았습니다.</p>' +
    '<p class="sub-note">현재 픽업 캐릭터의 메타 분석이 완료되면 자동으로 표시됩니다.</p>' +
    '</div></div>';
}

// 분석 화면에서 카드 목록으로 돌아가기
function goBackToCards() {
  appState.selectedCharacterId = null;
  appState.evaluationResult = null;
  if (isCardGridGame(appState.currentGame)) {
    renderCardGrid();
  } else {
    renderPlaceholder("캐릭터를 선택하세요.");
  }
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
    document.getElementById("metaUpdateBtn").disabled = true;
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
    document.getElementById("metaUpdateBtn").disabled = true;
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

// 관리자 버튼 → 대기열(data/pending-tasks.json)에 기록. Claude가 대화 중 읽어서 처리한다.
function queueAdminTask(type, characterId) {
  var game = appState.currentGame;
  if (!game) { alert('게임을 먼저 선택하세요.'); return; }
  if (type === 'meta' && !characterId) {
    alert('메타를 채울 캐릭터를 먼저 선택하세요 (카드를 클릭해 분석 화면을 여세요).');
    return;
  }
  fetch('http://localhost:3001/api/queue-task', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ type: type, game: game, characterId: characterId || null })
  })
  .then(function(res) { return res.json(); })
  .then(function(j) {
    if (j && j.success) {
      var what = type === 'meta' ? '메타 채우기' : '카드 채우기';
      alert('✅ 예약됨 — ' + what + ' (대기 ' + j.count + '건)\n다음에 Claude와 대화할 때 처리됩니다.');
    } else {
      alert('예약 실패: ' + ((j && j.error) || '알 수 없음'));
    }
  })
  .catch(function() {
    alert('예약 실패 — 로컬 서버(3001)가 실행 중인지 확인하세요.\n(배포된 Pages에서는 안 됩니다 — 관리자 로컬에서 하세요.)');
  });
}

// "메타 업데이트" — 지금 보고 있는 캐릭터의 메타를 Claude가 채우도록 예약
function runMetaUpdate() { queueAdminTask('meta', appState.selectedCharacterId); }

// "카드 데이터 갱신" — 지금 게임의 빠진 카드를 Claude가 찾아 추가하도록 예약
function runCardSync() { queueAdminTask('card', null); }

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
    // 목표·부족·과금 계산은 평균 기댓값(charAvg/weaponAvg) 기준으로 — 천장(최악)이 아닌 현실 기댓값
    charAvg:            (PULL_COST[gameId] && PULL_COST[gameId].charAvg)   || gacha.charPity,
    weaponAvg:          (PULL_COST[gameId] && PULL_COST[gameId].weaponAvg) || gacha.weaponPity,
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

// 버전 플래너 기본값 (어드민 계정 기준 현재 버전/시작일).
// 신규·빈 계정은 이 값으로 시작하고, loadPlannerData가 버전 종료일이 지나면 다음 버전으로 자동 이월한다.
// 값이 실제와 달라지면 여기만 갱신하면 전 계정 기본값이 바뀐다(어드민이 관리).
var DEFAULT_PLANNER = {
  hsr:      { version: '4.4', startDate: '2026-07-15' },
  zzz:      { version: '3.1', startDate: '2026-07-29' },
  wuwa:     { version: '3.5', startDate: '2026-07-10' },
  endfield: { version: '1.4', startDate: '2026-07-16' },
  nte:      { version: '1.3', startDate: '2026-08-19' }
};

function loadPlannerData(gameId) {
  try {
    var raw = localStorage.getItem('pickup_manager_planner_' + gameId);
    var pd  = raw ? JSON.parse(raw) : {};
    // 목표(cur/next)는 개인 데이터 — 구버전 평면 구조에서 마이그레이션
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
    // 버전/기간은 공유(어드민) 값 우선 → 없으면 코드 기본값. 게임 공통 사실이라 개인 저장분을 덮어쓴다.
    var shared = (window.getSharedPlanner && window.getSharedPlanner(gameId)) || null;
    var def    = DEFAULT_PLANNER[gameId] || {};
    pd.version   = shared ? shared.version   : (def.version   || '');
    pd.startDate = shared ? shared.startDate : (def.startDate || '');
    pd.endDate   = shared ? (shared.endDate || '') : '';
    // 종료일이 지났으면 다음 버전으로 자동 진행 — 어드민이 설정한 실제 종료일(shared)만 기준.
    // 버전 길이가 게임/버전마다 달라 42일 고정 가정은 안 함. 다음 버전 종료일은 어드민이 새로
    // 설정할 때까지 미정('')으로 둔다 → 그래서 연쇄로 여러 버전 넘어가지 않고 딱 한 단계만.
    if (pd.version && pd.endDate) {
      var today = new Date(); today.setHours(0, 0, 0, 0);
      var end = new Date(pd.endDate); end.setHours(0, 0, 0, 0);
      if (!isNaN(end.getTime()) && end < today) {   // 오늘이 마지막 날이면 아직 진행 중(< 이므로 유지)
        var nv = plannerNextVersion(pd.version);
        if (nv) { pd.version = nv; pd.startDate = pd.endDate; pd.endDate = ''; }
      }
    }
    // 목표 이월: 자동 진행/어드민 갱신으로 현재 버전이 목표 설정 시점(_seenVer)과 달라지면 cur←next 1회.
    // 결정론적이라 재로드해도 _seenVer==현재버전이면 재이월 안 함 → 목표 유실 없음.
    if (pd.version && pd._seenVer && pd._seenVer !== pd.version) {
      pd.cur = pd.next;
      pd.next = { firstHalf: { charGoal: 0, weaponGoal: 0 }, secondHalf: { charGoal: 0, weaponGoal: 0 } };
      pd._seenVer = pd.version;
      savePlannerData(gameId, pd);
    } else if (pd.version && !pd._seenVer) {
      pd._seenVer = pd.version;
      savePlannerData(gameId, pd);
    }
    return pd;
  } catch(e) {
    var d = DEFAULT_PLANNER[gameId] || {};
    return {
      version: d.version || '', startDate: d.startDate || '', endDate: '',
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

function plannerAutoEndDate(startStr) {
  if (!startStr) return '';
  var d = new Date(startStr);
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + 42);
  return toLocalYMD(d);
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
    var cReq  = cGoal * (pity.charAvg   || pity.charPity);
    var wReq  = wGoal * (pity.weaponAvg || pity.weaponPity);

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
    var cReq = cGoal * (startPity.charAvg   || startPity.charPity   || 1);
    var wReq = wGoal * (startPity.weaponAvg || startPity.weaponPity || 1);

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
      weaponPity:         startPity.weaponPity,
      charAvg:            startPity.charAvg,
      weaponAvg:          startPity.weaponAvg
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
    0, 100);  // charNeed=max(0,90-50)=40, weaponNeed=max(0,80-20)=60 → 총100, 공용400 충분

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
        '<span class="pacc-row-rate">확률 ' + rateVal + '</span>',
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
      '<div class="pacc-total-rate"><span class="pacc-total-rate-lbl">실제 성공 확률(참고) ' + tipIcon + '</span><strong class="' + (totalOk ? 'pacc-ok' : 'pacc-lack') + '">' + totalRateStr + '</strong></div>',
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
  var nextStart = effEnd || '';   // 다음 버전 시작일 = 현재 버전 종료일(같은 날)
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

  // 전반/후반 실제 날짜 구간 (전반 기간 = pd.firstHalfDays, 기본 21일)
  var firstHalfDays = (pd.firstHalfDays && pd.firstHalfDays > 0) ? pd.firstHalfDays : 21;
  function _md(x) { return x ? x.slice(5).replace('-', '/') : '?'; }
  function halfSchedHtml(s, e) {
    if (!s) return '';
    var mid = new Date(s); mid.setDate(mid.getDate() + firstHalfDays); mid = toLocalYMD(mid);
    if (e && mid > e) mid = e;
    return '<div class="planner-half-sched">'
         + '<span class="phs-first">전반 ' + _md(s) + '~' + _md(mid) + '</span>'
         + '<span class="phs-second">후반 ' + _md(mid) + '~' + _md(e || '') + '</span>'
         + '</div>';
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
    halfSchedHtml(startDate, effEnd),
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
    halfSchedHtml(nextStart, nextEnd),
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
      savePlannerData(gameId, pd);              // 현재 입력한 목표 저장 (목표 이월은 loadPlannerData가 버전변경 감지해 처리)
      var nextVer = plannerNextVersion(pd.version);
      var effEnd  = pd.endDate || plannerAutoEndDate(pd.startDate);
      var newStart = effEnd || '';   // 다음 버전 시작일 = 현재 버전 종료일(같은 날)
      var newEnd  = newStart ? plannerAutoEndDate(newStart) : '';
      // 버전/기간은 공유(어드민) — 전 유저 반영. 각 유저 목표는 다음 로드 때 cur←next 자동 이월.
      if (window.saveSharedPlanner) window.saveSharedPlanner(gameId, nextVer || pd.version, newStart || pd.startDate, newEnd);
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

// 로컬 타임존 기준 YYYY-MM-DD. toISOString()은 UTC로 변환돼 KST(UTC+9)에선 하루 밀리는
// 버그가 있어(예: +30일이 D-29로 저장됨) 로컬 날짜 문자열을 직접 만든다.
function toLocalYMD(d) {
  var y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
  return y + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
}

// 게임 일일 리셋 05:00 기준의 '오늘'. 00:00~04:59는 아직 전날로 취급 → 하루 차감이 자정이 아닌 05:00에 일어난다.
var PASS_RESET_HOUR = 5;
function passResetToday() {
  var d = new Date(Date.now() - PASS_RESET_HOUR * 3600000);
  d.setHours(0, 0, 0, 0);
  return d;
}

function calcMonthlyPassDays(endDateStr) {
  if (!endDateStr) return null;
  var today = passResetToday();
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

// ── 재화 거래 내역(영수증) 원장 ── append-only, pickup_manager_ 접두사 → 계정별 Supabase 동기화(영구)
function loadLedger(gameId) {
  try { var raw = localStorage.getItem('pickup_manager_ledger_' + gameId); return raw ? JSON.parse(raw) : []; }
  catch (e) { return []; }
}
function saveLedger(gameId, arr) {
  try { localStorage.setItem('pickup_manager_ledger_' + gameId, JSON.stringify(arr)); } catch (e) {}
}

// 달력 날짜별 커스텀 뱃지 — 더블클릭으로 추가/편집. 개인 저장(pickup_manager_ 접두사 → 계정 동기화).
function loadCalBadges(gameId) {
  try { var raw = localStorage.getItem('pickup_manager_calbadge_' + gameId); return raw ? JSON.parse(raw) : {}; }
  catch (e) { return {}; }
}
function saveCalBadges(gameId, obj) {
  try { localStorage.setItem('pickup_manager_calbadge_' + gameId, JSON.stringify(obj)); } catch (e) {}
}
function appendLedger(gameId, entry) {
  var arr = loadLedger(gameId);
  arr.push(entry);
  saveLedger(gameId, arr);
}
// 재화 id → 표시 이름
function currencyName(gameId, curId) {
  var cfg = getGameConfig()[gameId];
  if (cfg) { for (var i = 0; i < cfg.currencies.length; i++) if (cfg.currencies[i].id === curId) return cfg.currencies[i].name; }
  return curId || '';
}

var _ledgerGame = null;
var _ledgerMonth = null;  // 보고 있는 월 'YYYY-MM' (null이면 최신 월)
var _ledgerDay = null;    // 달력에서 선택한 날 'YYYY-MM-DD' (null이면 월 전체)

// 달력 커스텀 일정 뱃지 타입 (subgamecals 스타일 — 색상·아이콘으로 구분). 더블클릭으로 추가.
var CAL_BADGE_TYPES = [
  { id: 'pickup',  label: '픽업',           short: '픽업',    icon: '★',  color: '#e5486d' },
  { id: 'update',  label: '업데이트',        short: '업데이트', icon: '⚡', color: '#e5a34d' },
  { id: 'stream',  label: '공식방송',        short: '방송',    icon: '📺', color: '#40c4d6' },
  { id: 'event',   label: '이벤트',          short: '이벤트',  icon: '🎉', color: '#3ea877' },
  { id: 'offline', label: '오프라인 이벤트', short: '오프라인', icon: '📍', color: '#8b7cff' },
  { id: 'release', label: '출시',            short: '출시',    icon: '🚀', color: '#c98c42' }
];
var CAL_BADGE_MAP = {};
CAL_BADGE_TYPES.forEach(function(t) { CAL_BADGE_MAP[t.id] = t; });
var _calClickTimer = null, _calClickYmd = null;  // 단일/더블 클릭 판별

function openLedgerModal(gameId) {
  _ledgerGame = gameId;
  _ledgerMonth = null;  // 열 때마다 최신 월부터
  renderLedgerModal();
  document.getElementById('ledgerModal').style.display = 'block';
}

// ts → 'YYYY-MM'
function ledgerYM(ts) {
  var d = new Date(ts);
  var m = d.getMonth() + 1;
  return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m;
}
// 'YYYY-MM' → '2026년 8월'
function ledgerYMLabel(ym) {
  var p = ym.split('-');
  return p[0] + '년 ' + parseInt(p[1], 10) + '월';
}
function ledgerGoMonth(ym) {
  _ledgerMonth = ym;
  _ledgerDay = null;
  ledgerRerender();
}

// 활성 뷰(내역 탭 or 모달)를 다시 그림
function ledgerRerender() {
  var tab = document.getElementById('tabLedger');
  if (tab && tab.style.display !== 'none') renderLedgerPage();
  else renderLedgerModal();
  renderSidebarSpend();  // 과금액 갱신
}

function ledgerYMD(ts) {
  var d = new Date(ts), p = function(n){ return n < 10 ? '0' + n : '' + n; };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
// 'YYYY-MM' 을 delta개월 이동
function ymShift(ym, delta) {
  var d = new Date(parseInt(ym.slice(0, 4), 10), parseInt(ym.slice(5, 7), 10) - 1 + delta, 1);
  var mm = d.getMonth() + 1;
  return d.getFullYear() + '-' + (mm < 10 ? '0' : '') + mm;
}
// 게임별 재화→재화(기준재화) 환산 함수 반환. rate + pullValue(뽑 가치) 반영.
function ledgerRates(gameId) {
  var rate = {}, pullVal = {};
  [(typeof CURRENCY_CONFIG !== 'undefined' ? CURRENCY_CONFIG[gameId] : null), getGameConfig()[gameId]].forEach(function(cfg) {
    if (cfg && cfg.currencies) cfg.currencies.forEach(function(c) {
      if (rate[c.id] == null) { rate[c.id] = c.rate || 1; if (c.pullValue != null) pullVal[c.id] = c.pullValue; }
    });
  });
  var baseRate = 1;
  Object.keys(rate).forEach(function(k) { if (rate[k] > baseRate) baseRate = rate[k]; });
  return function(e) {
    var r = rate[e.currency] || baseRate;
    var pv = pullVal[e.currency] != null ? pullVal[e.currency] : baseRate;
    return Math.round(e.delta * (pv / r));
  };
}
// 큰 수 축약 (달력 셀용)
function ledgerAbbr(n) {
  var a = Math.abs(n);
  if (a >= 10000) return Math.round(n / 1000) + 'k';
  if (a >= 1000)  return (n / 1000).toFixed(1) + 'k';
  return '' + n;
}
// 원장 한 줄 HTML (auto / memo 공용) — 모달·페이지 공용
function ledgerRowHtml(gameId, e) {
  if (e.type === 'memo') {
    return '<div class="ledger-row ledger-row--memo">'
      + '<span class="ledger-date">' + ledgerFmtDate(e.ts) + '</span>'
      + '<span class="ledger-memo-mark">📝</span>'
      + '<span class="ledger-memo-text">' + ledgerEsc(e.memo)
        + (e.price != null ? '<span class="ledger-price"> · ' + e.price.toLocaleString() + '원</span>' : '')
        + '</span>'
      + '<button class="ledger-memo-btn" data-ts="' + e.ts + '" title="메모 수정">✎</button>'
      + '<button class="ledger-del-btn" data-ts="' + e.ts + '" title="삭제">🗑</button>'
      + '</div>';
  }
  var sign = e.delta > 0 ? '+' : '';
  var cls  = e.delta > 0 ? 'ledger-gain' : 'ledger-spend';
  return '<div class="ledger-row">'
    + '<span class="ledger-date">' + ledgerFmtDate(e.ts) + '</span>'
    + '<span class="ledger-cur">' + ledgerEsc(currencyName(gameId, e.currency)) + '</span>'
    + '<span class="ledger-delta ' + cls + '">' + sign + e.delta.toLocaleString() + '</span>'
    + '<span class="ledger-balance">' + (e.balanceAfter != null ? e.balanceAfter.toLocaleString() : '') + '</span>'
    + '<button class="ledger-memo-btn" data-ts="' + e.ts + '" title="이 항목 메모">📝</button>'
    + '<button class="ledger-del-btn" data-ts="' + e.ts + '" title="삭제">🗑</button>'
    + (function() {
        var split = (e.freeDelta != null && e.freeDelta !== e.delta);
        if (!e.memo && e.price == null && !split) return '';
        var s = '<span class="ledger-memo-text ledger-memo-inline">';
        if (split) s += '<span class="ledger-split-tag">무료 ' + e.freeDelta.toLocaleString() + ' · 유료 ' + (e.delta - e.freeDelta).toLocaleString() + '</span>';
        if (e.memo) s += (split ? ' ' : '') + ledgerEsc(e.memo);
        if (e.price != null) s += '<span class="ledger-price">' + ((e.memo || split) ? ' · ' : '') + e.price.toLocaleString() + '원</span>';
        return s + '</span>';
      })()
    + '</div>';
}
function ledgerSelectDay(ymd) {
  _ledgerDay = (_ledgerDay === ymd) ? null : ymd;  // 같은 날 다시 누르면 해제(월 전체)
  renderLedgerPage();
}

// 달력 날짜 더블클릭 → 일정 뱃지 유형 선택(여러 개 토글 가능)
function openCalBadgeMenu(gameId, ymd) {
  var modal = document.getElementById('ledgerModal');
  if (!modal) return;
  var dayLabel = parseInt(ymd.slice(5, 7), 10) + '월 ' + parseInt(ymd.slice(8, 10), 10) + '일';
  function curArr() { var a = loadCalBadges(gameId)[ymd]; if (!Array.isArray(a)) a = a ? [a] : []; return a; }
  var cur = curArr();
  var chips = CAL_BADGE_TYPES.map(function(t) {
    var on = cur.indexOf(t.id) !== -1;
    return '<button class="calbadge-chip' + (on ? ' calbadge-chip--on' : '') + '" data-type="' + t.id + '" style="--cbc:' + t.color + '">'
      + '<span class="calbadge-ic">' + t.icon + '</span>' + t.label + '</button>';
  }).join('');
  modal.innerHTML =
    '<div class="char-detail-overlay" id="cbmOverlay">'
    + '<div class="char-detail-panel" style="width:320px;">'
    + '<div class="detail-header"><div class="detail-header-info"><div class="detail-header-name">' + dayLabel + ' 일정 뱃지</div></div>'
    + '<button class="detail-close-btn" id="cbmClose">✕</button></div>'
    + '<div class="detail-body" style="gap:10px;"><div class="calbadge-grid">' + chips + '</div>'
    + '<p style="font-size: var(--fs-xs);color:var(--muted);margin:2px 0 0;">칩을 눌러 켜고/끄세요 · 여러 개 선택 가능</p></div>'
    + '</div></div>';
  modal.style.display = 'block';
  var close = function() { modal.style.display = 'none'; modal.innerHTML = ''; renderLedgerPage(); };
  document.getElementById('cbmClose').onclick = close;
  document.getElementById('cbmOverlay').onclick = function(e) { if (e.target === this) close(); };
  modal.querySelectorAll('.calbadge-chip').forEach(function(btn) {
    btn.onclick = function() {
      var type = this.dataset.type;
      var all = loadCalBadges(gameId);
      var arr = curArr();
      var i = arr.indexOf(type);
      if (i === -1) arr.push(type); else arr.splice(i, 1);
      if (arr.length) all[ymd] = arr; else delete all[ymd];
      saveCalBadges(gameId, all);
      this.classList.toggle('calbadge-chip--on');
    };
  });
}

// 사이드바 총 과금액 (전 게임 합산, 올해·이번 달) — 보유 캐릭터 탭에 표시
function renderSidebarSpend() {
  var el = document.getElementById('sidebarSpend');
  if (!el) return;
  var year = String(new Date().getFullYear());
  var curYm = ledgerYM(new Date().getTime());
  var yearSum = 0, monthSum = 0;
  try {
    Object.keys(getGameConfig()).forEach(function(g) {
      loadLedger(g).forEach(function(e) {
        if (e.price != null) {
          var eym = ledgerYM(e.ts);
          if (eym.slice(0, 4) === year) yearSum += e.price;
          if (eym === curYm) monthSum += e.price;
        }
      });
    });
  } catch (e) {}
  el.innerHTML = [
    '<div class="ssp-title">💳 총 과금액</div>',
    '<div class="ssp-row"><span>' + year + '년</span><b>' + yearSum.toLocaleString() + '원</b></div>',
    '<div class="ssp-row ssp-row--month"><span>이번 달</span><b>' + monthSum.toLocaleString() + '원</b></div>'
  ].join('');
}

function renderLedgerPage() {
  var gameId = _currencyTab || appState.currentGame;
  if (gameId !== _ledgerGame) { _ledgerMonth = null; _ledgerDay = null; }  // 게임 바뀌면 최신 월로
  _ledgerGame = gameId;
  var page = document.getElementById('ledgerPage');
  if (!page) return;
  if (!gameId) { page.innerHTML = '<div class="ledger-empty">게임을 선택하세요.</div>'; return; }

  var all = loadLedger(gameId).slice().sort(function(a, b) { return b.ts - a.ts; });
  var toJaehwa = ledgerRates(gameId);
  if (!_ledgerMonth) {
    var mp = [], sm = {};
    all.forEach(function(e) { var ym = ledgerYM(e.ts); if (!sm[ym]) { sm[ym] = true; mp.push(ym); } });
    _ledgerMonth = mp[0] || ledgerYM(new Date().getTime());
  }
  var y = parseInt(_ledgerMonth.slice(0, 4), 10), m = parseInt(_ledgerMonth.slice(5, 7), 10);

  var monthEntries = all.filter(function(e) { return ledgerYM(e.ts) === _ledgerMonth; });
  var dayAgg = {}, mGain = 0, mSpend = 0;
  monthEntries.forEach(function(e) {
    var d = ledgerYMD(e.ts);
    if (!dayAgg[d]) dayAgg[d] = { gain: 0, spend: 0, paid: 0 };
    if (e.type === 'auto') { var v = toJaehwa(e); if (v > 0) { dayAgg[d].gain += v; mGain += v; } else { dayAgg[d].spend += -v; mSpend += -v; } }
    if (e.price != null) dayAgg[d].paid += e.price;
  });

  // 유료/무료 집계 (월/연/총)
  var curYear = _ledgerMonth.slice(0, 4);
  var mPaid = 0, mPaidN = 0, mFree = 0, yPaid = 0, yPaidN = 0, yFree = 0, tPaid = 0, tPaidN = 0;
  all.forEach(function(e) {
    var ym = ledgerYM(e.ts), iy = ym.slice(0, 4) === curYear, im = ym === _ledgerMonth;
    // 유료: 직접 입력한 가격(원)
    if (e.price != null) { tPaid += e.price; tPaidN++; if (iy) { yPaid += e.price; yPaidN++; } if (im) { mPaid += e.price; mPaidN++; } }
    // 무료 획득: 분할됐으면 무료분(freeDelta)만, 아니면 (가격 없는) 전체 획득
    if (e.type === 'auto' && e.delta > 0) {
      var freeAmt = (e.freeDelta != null) ? e.freeDelta : (e.price != null ? 0 : e.delta);
      if (freeAmt > 0) { var v = toJaehwa({ currency: e.currency, delta: freeAmt }); if (iy) yFree += v; if (im) mFree += v; }
    }
  });

  // 버전 캘린더: 현재 버전 + 앞뒤 버전 시작일(42일 주기)을 날짜별로 마킹
  var pd = loadPlannerData(gameId);
  var verMarks = {};    // 'YYYY-MM-DD' -> 버전 문자열
  var curVerInfo = null;
  if (pd.version && pd.startDate && !isNaN(new Date(pd.startDate).getTime())) {
    // 현재 버전 실제 종료일(관리자 지정 endDate 우선). 버전 주기 = 실제 길이 → 42일 고정 가정 제거
    // (엔드필드 1.4는 7/16~9/2 = 48일이라 +42로 추정하면 다음 버전 시작이 어긋남)
    var _curEnd = pd.endDate || plannerAutoEndDate(pd.startDate);
    var _period = Math.round((new Date(_curEnd) - new Date(pd.startDate)) / 86400000);
    if (!(_period > 0)) _period = 42;
    var _addDays = function(ymd, n) { var d = new Date(ymd); d.setDate(d.getDate() + n); return toLocalYMD(d); };
    // 앞으로: 현재→다음 경계는 실제 종료일, 그 이후는 실제 주기로 추정
    var _v = pd.version, _s = pd.startDate;
    for (var _f = 0; _f < 12 && _v && _s; _f++) {
      verMarks[_s] = _v;
      var _ns = (_s === pd.startDate) ? _curEnd : _addDays(_s, _period);
      var _nv = plannerNextVersion(_v);
      if (!_ns || !_nv) break;
      _v = _nv; _s = _ns;
    }
    // 뒤로: 같은 실제 주기로 소급
    var _pv = pd.version, _ps = pd.startDate;
    for (var _b = 0; _b < 12; _b++) {
      var _pp = _pv.split('.'), _mi = parseInt(_pp[1] || 0);
      if (_mi <= 0) break;
      _ps = _addDays(_ps, -_period);
      _pv = parseInt(_pp[0] || 0) + '.' + (_mi - 1);
      verMarks[_ps] = _pv;
    }
    var _st = new Date(pd.startDate); _st.setHours(0, 0, 0, 0);
    var _td2 = new Date(); _td2.setHours(0, 0, 0, 0);
    curVerInfo = { ver: pd.version, start: pd.startDate, end: _curEnd, dplus: Math.round((_td2 - _st) / 86400000), next: plannerNextVersion(pd.version) };
  }
  // 날짜 → 그 날의 버전, 버전 → 은은한 배경색
  var verBounds = Object.keys(verMarks).sort().map(function(k) { return { d: k, v: verMarks[k] }; });
  function verForDay(ymd) { var f = null; for (var i = 0; i < verBounds.length; i++) { if (verBounds[i].d <= ymd) f = verBounds[i].v; else break; } return f; }
  var VER_COLORS = ['rgba(109,94,252,.13)', 'rgba(76,150,120,.13)', 'rgba(201,140,66,.12)', 'rgba(88,150,220,.13)', 'rgba(201,95,125,.12)', 'rgba(120,126,150,.14)'];
  var VER_COLORS_SOLID = ['#6d5efc', '#3ea877', '#c98c42', '#4f8fdc', '#d15d7d', '#7a7e96'];
  function _verIdx(v) { var p = String(v).split('.'); return (parseInt(p[0] || 0) * 10 + parseInt(p[1] || 0)) % VER_COLORS.length; }
  function verColor(v) { return v ? VER_COLORS[_verIdx(v)] : ''; }
  function verColorSolid(v) { return v ? VER_COLORS_SOLID[_verIdx(v)] : ''; }

  // 버전 전반/후반 분할 — 전반 = 시작~시작+전반기간(기본 21일=3주), 후반 = 나머지.
  // (6주 버전 → 3주+3주, 5주 버전 → 3주+2주가 자동으로 됨)
  var firstHalfDays = (pd.firstHalfDays && pd.firstHalfDays > 0) ? pd.firstHalfDays : 21;
  function ledgerMd(ymd) { return ymd ? (parseInt(ymd.slice(5, 7), 10) + '/' + parseInt(ymd.slice(8, 10), 10)) : ''; }
  var verSchedule = [];  // {ver, start, end, mid}
  for (var _vi = 0; _vi < verBounds.length; _vi++) {
    var _vs = verBounds[_vi].d;
    var _ve = (_vi + 1 < verBounds.length) ? verBounds[_vi + 1].d : plannerAutoEndDate(_vs);
    var _vm = new Date(_vs); _vm.setDate(_vm.getDate() + firstHalfDays); _vm = toLocalYMD(_vm);
    if (_ve && _vm > _ve) _vm = _ve;
    verSchedule.push({ ver: verBounds[_vi].v, start: _vs, end: _ve, mid: _vm });
  }
  var halfStart = {};  // 후반 시작일 → '후반' (달력 배지)
  verSchedule.forEach(function(vp) { if (vp.mid && vp.mid !== vp.start) halfStart[vp.mid] = '후반'; });

  // 달력 셀
  var firstWd = new Date(y, m - 1, 1).getDay();
  var daysIn = new Date(y, m, 0).getDate();
  var todayYmd = ledgerYMD(new Date().getTime());
  var wd = ['일', '월', '화', '수', '목', '금', '토'];
  var calBadges = loadCalBadges(gameId);   // 날짜별 커스텀 일정 뱃지(더블클릭)
  var cells = '';
  for (var i = 0; i < firstWd; i++) cells += '<div class="lcal-cell lcal-blank"></div>';
  for (var day = 1; day <= daysIn; day++) {
    var ymd = _ledgerMonth + '-' + (day < 10 ? '0' : '') + day;
    var ag = dayAgg[ymd];
    var col = (firstWd + day - 1) % 7;
    var cls = 'lcal-cell' + (ag ? ' lcal-has' : '') + (_ledgerDay === ymd ? ' lcal-sel' : '') + (todayYmd === ymd ? ' lcal-today' : '') + (col === 0 ? ' lcal-sun' : col === 6 ? ' lcal-sat' : '');
    var vbg = verColor(verForDay(ymd));
    cells += '<div class="' + cls + '" data-ymd="' + ymd + '"' + (vbg ? ' style="background:' + vbg + '"' : '') + '>'
      + '<span class="lcal-date">' + day + '</span>'
      + (verMarks[ymd] ? '<span class="lcal-ver' + (curVerInfo && verMarks[ymd] === curVerInfo.ver ? ' lcal-ver-cur' : '') + '">v' + verMarks[ymd] + ' 전반</span>' : '')
      + (halfStart[ymd] ? '<span class="lcal-ver lcal-ver-half">후반</span>' : '')
      + (calBadges[ymd] ? (Array.isArray(calBadges[ymd]) ? calBadges[ymd] : [calBadges[ymd]]).map(function(tid) { var t = CAL_BADGE_MAP[tid]; return t ? '<span class="lcal-badge-ev" style="--cbc:' + t.color + '">' + t.icon + '<b>' + t.label + '</b></span>' : ''; }).join('') : '')
      + (ag && ag.gain ? '<span class="lcal-amt lcal-gain">+' + ag.gain.toLocaleString() + '</span>' : '')
      + (ag && ag.spend ? '<span class="lcal-amt lcal-spend">−' + ag.spend.toLocaleString() + '</span>' : '')
      + (ag && ag.paid ? '<span class="lcal-amt lcal-paid">₩' + ag.paid.toLocaleString() + '</span>' : '')
      + '</div>';
  }

  var listEntries = _ledgerDay ? monthEntries.filter(function(e) { return ledgerYMD(e.ts) === _ledgerDay; }) : monthEntries;
  var rows = listEntries.length ? listEntries.map(function(e) { return ledgerRowHtml(gameId, e); }).join('')
    : '<div class="ledger-empty">' + (_ledgerDay ? '이 날 기록이 없습니다.' : '이 달 기록이 없습니다. 재화 수량을 바꾸면 자동으로 남습니다.') + '</div>';
  var dayLabel = _ledgerDay ? (parseInt(_ledgerDay.slice(5, 7), 10) + '월 ' + parseInt(_ledgerDay.slice(8, 10), 10) + '일') : '이 달 전체';
  var dGain = _ledgerDay && dayAgg[_ledgerDay] ? dayAgg[_ledgerDay].gain : mGain;
  var dSpend = _ledgerDay && dayAgg[_ledgerDay] ? dayAgg[_ledgerDay].spend : mSpend;

  function paidHtml(sum, n) { return '<span class="lps-paid">유료 <b>' + sum.toLocaleString() + '원</b>' + (n ? ' <em>(' + n + ')</em>' : '') + '</span>'; }
  function freeHtml(amt) { return '<span class="lps-free">무료 획득 <b>' + amt.toLocaleString() + '</b></span>'; }

  var verBanner = curVerInfo ? [
    '<div class="ledger-ver-banner">',
    '  <span class="lvb-badge">v' + curVerInfo.ver + '</span>',
    '  <span class="lvb-main">현재 버전 · ' + curVerInfo.start + ' 시작' + (curVerInfo.dplus >= 0 ? ' · D+' + curVerInfo.dplus : '') + '</span>',
    (curVerInfo.next && curVerInfo.end ? '  <span class="lvb-next">다음 v' + curVerInfo.next + ' · ' + curVerInfo.end + '</span>' : ''),
    '  <button class="planner-config-btn lvb-edit" id="lvbEditVer" title="버전 편집(관리자)">⚙</button>',
    '</div>'
  ].join('') : '';

  // 이 달에 걸치는 버전 일정 범례 (달 넘어가는 일정도 시작~종료로 명확히)
  var monthStartYmd = _ledgerMonth + '-01';
  var monthEndYmd = _ledgerMonth + '-' + (daysIn < 10 ? '0' : '') + daysIn;
  var schedRows = verSchedule.filter(function(vp) { return vp.start <= monthEndYmd && vp.end >= monthStartYmd; })
    .map(function(vp) {
      var col = verColorSolid(vp.ver) || 'rgba(255,255,255,.2)';
      var isCur = curVerInfo && vp.ver === curVerInfo.ver;
      return '<div class="lsch-row' + (isCur ? ' lsch-row--cur' : '') + '">'
        + '<span class="lsch-badge" style="background:' + col + '">v' + vp.ver + '</span>'
        + '<span class="lsch-ph"><b>전반</b> ' + ledgerMd(vp.start) + '~' + ledgerMd(vp.mid) + '</span>'
        + '<span class="lsch-ph lsch-ph2"><b>후반</b> ' + ledgerMd(vp.mid) + '~' + ledgerMd(vp.end) + '</span>'
        + '</div>';
    }).join('');
  var schedHtml = schedRows ? '<div class="ledger-sched"><div class="ledger-sched-title">이 달 버전 일정</div>' + schedRows + '</div>' : '';

  page.innerHTML = [
    '<div class="ledger-cal-head">',
    '  <button class="ledger-nav-btn" id="lpPrev" title="이전 달">◀</button>',
    '  <span class="ledger-cal-title">' + y + '년 ' + m + '월</span>',
    '  <button class="ledger-nav-btn" id="lpNext" title="다음 달">▶</button>',
    '  <a class="ledger-sched-link" href="https://www.subgamecals.com/" target="_blank" rel="noopener noreferrer" title="서브컬쳐 게임 일정 (새 탭에서 열림)">📅 게임 일정 ↗</a>',
    '</div>',
    verBanner,
    schedHtml,
    '<div class="ledger-cal">',
    '  <div class="lcal-wd">' + wd.map(function(w, ix) { return '<span' + (ix === 0 ? ' class="lcal-sun"' : ix === 6 ? ' class="lcal-sat"' : '') + '>' + w + '</span>'; }).join('') + '</div>',
    '  <div class="lcal-grid">' + cells + '</div>',
    '</div>',
    '<div class="ledger-price-summary">',
    '  <div class="lps-row"><span class="lps-label">이 달</span>' + paidHtml(mPaid, mPaidN) + freeHtml(mFree) + '</div>',
    '  <div class="lps-row"><span class="lps-label">' + curYear + '년</span>' + paidHtml(yPaid, yPaidN) + freeHtml(yFree) + '</div>',
    '  <div class="lps-row lps-total"><span class="lps-label">총합</span>' + paidHtml(tPaid, tPaidN) + '</div>',
    '</div>',
    '<div class="ledger-day-head"><span class="ledger-day-title">' + dayLabel + '</span>',
    '  <span class="ledger-day-sum"><span class="ledger-sum--gain">획득 +' + dGain.toLocaleString() + '</span> <span class="ledger-sum--spend">소모 −' + dSpend.toLocaleString() + '</span></span>',
    '</div>',
    '<div class="ledger-list">' + rows + '</div>',
    '<div class="ledger-page-footer"><button class="detail-btn-cancel" id="lpAddMemo">＋ 메모 추가</button></div>'
  ].join('');

  document.getElementById('lpPrev').addEventListener('click', function() { ledgerGoMonth(ymShift(_ledgerMonth, -1)); });
  document.getElementById('lpNext').addEventListener('click', function() { ledgerGoMonth(ymShift(_ledgerMonth, 1)); });
  var _lvbE = document.getElementById('lvbEditVer'); if (_lvbE) _lvbE.addEventListener('click', function() { openPlannerConfigModal(gameId); });
  var addb = document.getElementById('lpAddMemo'); if (addb) addb.addEventListener('click', ledgerAddMemo);
  // 단일클릭=날짜 선택, 더블클릭=일정 뱃지. 단일클릭은 재렌더로 셀을 교체하므로
  // 네이티브 dblclick이 안 잡힌다 → 단일클릭을 살짝 지연시켜 수동 판별.
  page.querySelectorAll('.lcal-cell:not(.lcal-blank)').forEach(function(c) {
    c.addEventListener('click', function() {
      var ymd = this.dataset.ymd; if (!ymd) return;
      if (_calClickTimer && _calClickYmd === ymd) {              // 두 번째 클릭 → 더블클릭
        clearTimeout(_calClickTimer); _calClickTimer = null; _calClickYmd = null;
        openCalBadgeMenu(_ledgerGame, ymd);
        return;
      }
      if (_calClickTimer) clearTimeout(_calClickTimer);
      _calClickYmd = ymd;
      _calClickTimer = setTimeout(function() { _calClickTimer = null; _calClickYmd = null; ledgerSelectDay(ymd); }, 240);
    });
  });
  page.querySelectorAll('.ledger-memo-btn').forEach(function(b) { b.addEventListener('click', function() { ledgerSetMemo(parseInt(this.dataset.ts, 10)); }); });
  page.querySelectorAll('.ledger-del-btn').forEach(function(b) { b.addEventListener('click', function() { ledgerDelete(parseInt(this.dataset.ts, 10)); }); });
}

function closeLedgerModal() {
  var m = document.getElementById('ledgerModal');
  if (m) { m.style.display = 'none'; m.innerHTML = ''; }
}

function ledgerFmtDate(ts) {
  var d = new Date(ts), p = function(n) { return n < 10 ? '0' + n : '' + n; };
  return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}
function ledgerEsc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderLedgerModal() {
  var gameId  = _ledgerGame;
  var all = loadLedger(gameId).slice().sort(function(a, b) { return b.ts - a.ts; });  // 최신순

  // 월별로 나누기: 존재하는 월 목록(최신순) + 현재 보는 월 결정
  var monthsPresent = [];
  var seenM = {};
  all.forEach(function(e) { var ym = ledgerYM(e.ts); if (!seenM[ym]) { seenM[ym] = true; monthsPresent.push(ym); } });
  if (!_ledgerMonth || monthsPresent.indexOf(_ledgerMonth) === -1) _ledgerMonth = monthsPresent[0] || null;

  var entries = _ledgerMonth ? all.filter(function(e) { return ledgerYM(e.ts) === _ledgerMonth; }) : [];
  // 재화 환산 헬퍼 (요약·집계 공용): 뽑기권(rate=1 등)도 프리미엄 재화 단위로 맞춘다.
  // 게임마다 프리미엄 재화 rate가 다르므로(환석 160, 엔드필드 오리지늄 500 …) 그 게임 재화
  // config에서 기준 rate = 가장 큰 rate를 뽑아 환산: delta × (기준rate / 재화rate).
  // rate는 코드 정본(CURRENCY_CONFIG) 우선, 없는 커스텀 재화만 사용자 config로 보충.
  var _rate = {}, _pullVal = {};
  [(typeof CURRENCY_CONFIG !== 'undefined' ? CURRENCY_CONFIG[gameId] : null), getGameConfig()[gameId]].forEach(function(cfg) {
    if (cfg && cfg.currencies) cfg.currencies.forEach(function(c) {
      if (_rate[c.id] == null) { _rate[c.id] = c.rate || 1; if (c.pullValue != null) _pullVal[c.id] = c.pullValue; }
    });
  });
  var _baseRate = 1;
  Object.keys(_rate).forEach(function(k) { if (_rate[k] > _baseRate) _baseRate = _rate[k]; });
  // pv = 이 재화 "1뽑의 재화 가치"(기본=baseRate). 무기고 증표처럼 뽑 가치가 다른 재화만 pullValue로 지정.
  function _toJaehwa(e) {
    var r  = _rate[e.currency] || _baseRate;
    var pv = _pullVal[e.currency] != null ? _pullVal[e.currency] : _baseRate;
    return Math.round(e.delta * (pv / r));
  }

  // 이 달 획득/소모 — 재화 환산으로 통일(뽑기권 포함)해 아래 무료 획득 집계와 단위를 맞춤
  var gained = 0, spent = 0;
  entries.forEach(function(e) {
    if (e.type === 'auto') { var _v = _toJaehwa(e); if (_v > 0) gained += _v; else spent += -_v; }
  });

  // 유료(가격 있음)/무료(가격 없음) 집계 — 월/연은 둘 다, 총합은 유료만
  var curYear = _ledgerMonth ? _ledgerMonth.slice(0, 4) : '';
  var mPaid = 0, mPaidN = 0, mFree = 0;   // 이 달 (mFree = 무료 획득 재화 환산)
  var yPaid = 0, yPaidN = 0, yFree = 0;   // 올해
  var tPaid = 0, tPaidN = 0;              // 전체(유료만)
  all.forEach(function(e) {
    var ym = ledgerYM(e.ts), inYear = ym.slice(0, 4) === curYear, inMonth = ym === _ledgerMonth;
    if (e.price != null) {
      tPaid += e.price; tPaidN++;
      if (inYear) { yPaid += e.price; yPaidN++; }
      if (inMonth) { mPaid += e.price; mPaidN++; }
    } else if (e.type === 'auto' && e.delta > 0) {
      // 무료 획득: 가격 없는 자동 획득분을 재화(환석 단위)로 환산해 합산
      var _jv = _toJaehwa(e);
      if (inYear) yFree += _jv;
      if (inMonth) mFree += _jv;
    }
  });
  function _paidHtml(sum, n) { return '<span class="lps-paid">유료 <b>' + sum.toLocaleString() + '원</b>' + (n ? ' <em>(' + n + ')</em>' : '') + '</span>'; }
  function _freeHtml(amt) { return '<span class="lps-free">무료 획득 <b>' + amt.toLocaleString() + '</b></span>'; }
  var priceSummary = all.length ? [
    '<div class="ledger-price-summary">',
    '  <div class="lps-row"><span class="lps-label">이 달</span>' + _paidHtml(mPaid, mPaidN) + _freeHtml(mFree) + '</div>',
    '  <div class="lps-row"><span class="lps-label">' + curYear + '년</span>' + _paidHtml(yPaid, yPaidN) + _freeHtml(yFree) + '</div>',
    '  <div class="lps-row lps-total"><span class="lps-label">총합</span>' + _paidHtml(tPaid, tPaidN) + '</div>',
    '</div>'
  ].join('') : '';

  // 월 네비게이션 (◀ 이전 달 / ▶ 다음 달, 기록 있는 달끼리 이동)
  var curIdx  = _ledgerMonth ? monthsPresent.indexOf(_ledgerMonth) : -1;
  var olderYM = curIdx >= 0 && curIdx < monthsPresent.length - 1 ? monthsPresent[curIdx + 1] : null;  // 더 과거
  var newerYM = curIdx > 0 ? monthsPresent[curIdx - 1] : null;                                        // 더 최근
  var monthNav = _ledgerMonth ? [
    '<div class="ledger-monthnav">',
    '  <button class="ledger-nav-btn" id="ledgerOlder"' + (olderYM ? ' data-ym="' + olderYM + '"' : ' disabled') + ' title="이전 달">◀</button>',
    '  <span class="ledger-month-label">' + ledgerYMLabel(_ledgerMonth) + ' <span class="ledger-month-count">· ' + entries.length + '건</span></span>',
    '  <button class="ledger-nav-btn" id="ledgerNewer"' + (newerYM ? ' data-ym="' + newerYM + '"' : ' disabled') + ' title="다음 달">▶</button>',
    '</div>'
  ].join('') : '';

  var rows = entries.length ? entries.map(function(e) {
    if (e.type === 'memo') {
      return '<div class="ledger-row ledger-row--memo">'
        + '<span class="ledger-date">' + ledgerFmtDate(e.ts) + '</span>'
        + '<span class="ledger-memo-mark">📝</span>'
        + '<span class="ledger-memo-text">' + ledgerEsc(e.memo)
          + (e.price != null ? '<span class="ledger-price"> · ' + e.price.toLocaleString() + '원</span>' : '')
          + '</span>'
        + '<button class="ledger-memo-btn" data-ts="' + e.ts + '" title="메모 수정">✎</button>'
        + '<button class="ledger-del-btn" data-ts="' + e.ts + '" title="삭제">🗑</button>'
        + '</div>';
    }
    var sign = e.delta > 0 ? '+' : '';
    var cls  = e.delta > 0 ? 'ledger-gain' : 'ledger-spend';
    return '<div class="ledger-row">'
      + '<span class="ledger-date">' + ledgerFmtDate(e.ts) + '</span>'
      + '<span class="ledger-cur">' + ledgerEsc(currencyName(gameId, e.currency)) + '</span>'
      + '<span class="ledger-delta ' + cls + '">' + sign + e.delta.toLocaleString() + '</span>'
      + '<span class="ledger-balance">' + (e.balanceAfter != null ? e.balanceAfter.toLocaleString() : '') + '</span>'
      + '<button class="ledger-memo-btn" data-ts="' + e.ts + '" title="이 항목 메모">📝</button>'
      + '<button class="ledger-del-btn" data-ts="' + e.ts + '" title="삭제">🗑</button>'
      + ((e.memo || e.price != null)
          ? '<span class="ledger-memo-text ledger-memo-inline">'
            + (e.memo ? ledgerEsc(e.memo) : '')
            + (e.price != null ? '<span class="ledger-price">' + (e.memo ? ' · ' : '') + e.price.toLocaleString() + '원</span>' : '')
            + '</span>'
          : '')
      + '</div>';
  }).join('') : '<div class="ledger-empty">아직 기록이 없습니다. 재화 수량을 바꾸면 여기에 자동으로 남습니다.</div>';

  document.getElementById('ledgerModal').innerHTML = [
    '<div class="char-detail-overlay" id="ledgerOverlay">',
    '  <div class="char-detail-panel ledger-panel">',
    '    <div class="detail-header">',
    '      <span class="detail-header-name">거래 내역 (영수증)</span>',
    '      <button class="detail-close-btn" id="ledgerCloseX">✕</button>',
    '    </div>',
    monthNav,
    '    <div class="ledger-summary">',
    '      <span class="ledger-sum ledger-sum--gain">획득 +' + gained.toLocaleString() + '</span>',
    '      <span class="ledger-sum ledger-sum--spend">소모 −' + spent.toLocaleString() + '</span>',
    '    </div>',
    priceSummary,
    '    <div class="ledger-list">' + rows + '</div>',
    '    <div class="detail-footer ledger-footer">',
    '      <button class="detail-btn-cancel" id="ledgerAddMemoBtn">＋ 메모 추가</button>',
    '      <button class="detail-btn-save" id="ledgerCloseBtn">닫기</button>',
    '    </div>',
    '  </div>',
    '</div>'
  ].join('');

  document.getElementById('ledgerOverlay').addEventListener('click', function(e) { if (e.target === this) closeLedgerModal(); });
  document.getElementById('ledgerCloseX').addEventListener('click', closeLedgerModal);
  document.getElementById('ledgerCloseBtn').addEventListener('click', closeLedgerModal);
  var _addBtn = document.getElementById('ledgerAddMemoBtn');
  if (_addBtn) _addBtn.addEventListener('click', ledgerAddMemo);
  var _older = document.getElementById('ledgerOlder'), _newer = document.getElementById('ledgerNewer');
  if (_older && _older.dataset.ym) _older.addEventListener('click', function() { ledgerGoMonth(this.dataset.ym); });
  if (_newer && _newer.dataset.ym) _newer.addEventListener('click', function() { ledgerGoMonth(this.dataset.ym); });
  document.getElementById('ledgerModal').querySelectorAll('.ledger-memo-btn').forEach(function(b) {
    b.addEventListener('click', function() { ledgerSetMemo(parseInt(this.dataset.ts, 10)); });
  });
  document.getElementById('ledgerModal').querySelectorAll('.ledger-del-btn').forEach(function(b) {
    b.addEventListener('click', function() { ledgerDelete(parseInt(this.dataset.ts, 10)); });
  });
}

function ledgerDelete(ts) {
  if (!confirm('이 내역을 삭제할까요? (되돌릴 수 없음)')) return;
  var arr = loadLedger(_ledgerGame).filter(function(e) { return e.ts !== ts; });
  saveLedger(_ledgerGame, arr);
  ledgerRerender();
}

function ledgerSetMemo(ts) {
  var arr = loadLedger(_ledgerGame);
  var e = null;
  for (var i = 0; i < arr.length; i++) if (arr[i].ts === ts) { e = arr[i]; break; }
  if (!e) return;
  _openMemoEditor(e);
}

// 새 독립 메모 항목 추가
function ledgerAddMemo() { _openMemoEditor(null); }

// entry=null이면 새 메모 생성, 아니면 해당 항목 편집.
// auto 획득 항목은 무료/유료 분할(무료분만 무료 재화로 집계) 입력을 제공한다.
var LEDGER_QUICK_AMTS = [[119000, '트럭'], [65000, '반트럭'], [12000, '패스'], [5900, '월정액']];
function _openMemoEditor(entry) {
  var isNew  = !entry;
  var isAuto = !!(entry && entry.type === 'auto' && entry.delta > 0);
  var memo   = entry ? (entry.memo || '') : '';
  var price  = entry ? entry.price : null;
  var delta  = isAuto ? entry.delta : 0;
  var freeD  = isAuto ? (entry.freeDelta != null ? entry.freeDelta : delta) : 0;

  var quickBtns = LEDGER_QUICK_AMTS.map(function(q) {
    return '<button type="button" class="ledger-quick-btn" data-amt="' + q[0] + '">' + q[0].toLocaleString() + '원<em>' + q[1] + '</em></button>';
  }).join('');
  var splitHtml = isAuto ? [
    '  <div class="ledger-split">',
    '    <div class="ledger-split-title">획득 +' + delta.toLocaleString() + ' 나누기 (개수)</div>',
    '    <div class="ledger-split-row">',
    '      <label>유료 <input type="text" inputmode="numeric" id="ledgerSplitPaid" value="' + (delta - freeD) + '"></label>',
    '      <span>무료 <b id="ledgerSplitFree">' + freeD + '</b></span>',
    '    </div>',
    '    <div class="ledger-split-note">유료분은 재화 환산하지 않습니다(결제 금액은 위 \'가격\'에 입력). 무료분만 무료 재화 획득으로 집계됩니다.</div>',
    '  </div>'
  ].join('') : '';

  var wrap = document.createElement('div');
  wrap.className = 'char-detail-overlay ledger-memo-overlay';
  wrap.innerHTML = [
    '<div class="char-detail-panel ledger-memo-editor">',
    '  <div class="detail-header"><span class="detail-header-name">' + (isNew ? '메모 추가' : '메모 · 가격') + '</span>',
    '    <button class="detail-close-btn" data-act="cancel">&#x2715;</button></div>',
    '  <div class="ledger-memo-fields">',
    '    <label class="ledger-memo-field"><span>메모</span>',
    '      <input type="text" id="ledgerMemoText" value="' + ledgerEsc(memo) + '" placeholder="예: 월정액 결제"></label>',
    '    <label class="ledger-memo-field"><span>가격 (원)</span>',
    '      <input type="text" inputmode="numeric" id="ledgerMemoPrice" value="' + (price != null ? price : '') + '" placeholder="선택 · 비우면 표시 안 함"></label>',
    '    <div class="ledger-quick-amts">' + quickBtns + '</div>',
    splitHtml,
    '  </div>',
    '  <div class="detail-footer">',
    '    <button class="detail-btn-save" id="ledgerMemoSave">저장</button>',
    '  </div>',
    '</div>'
  ].join('');
  document.body.appendChild(wrap);
  function close() { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }
  wrap.addEventListener('click', function(ev) { if (ev.target === wrap) close(); });
  wrap.querySelector('[data-act="cancel"]').addEventListener('click', close);
  wrap.querySelectorAll('.ledger-quick-btn').forEach(function(b) {
    b.addEventListener('click', function() { document.getElementById('ledgerMemoPrice').value = this.dataset.amt; });
  });
  if (isAuto) {
    document.getElementById('ledgerSplitPaid').addEventListener('input', function() {
      var v = parseInt(this.value.replace(/[^0-9]/g, ''), 10);
      if (isNaN(v)) v = 0;
      v = Math.max(0, Math.min(delta, v));
      document.getElementById('ledgerSplitFree').textContent = (delta - v);
    });
  }
  document.getElementById('ledgerMemoSave').addEventListener('click', function() {
    var m = document.getElementById('ledgerMemoText').value.trim();
    var praw = document.getElementById('ledgerMemoPrice').value.replace(/[^0-9]/g, '');
    var pv = parseInt(praw, 10);
    var hasPrice = praw !== '' && !isNaN(pv) && pv > 0;
    var freeVal = null;
    if (isAuto) {
      var praw2 = document.getElementById('ledgerSplitPaid').value.replace(/[^0-9]/g, '');
      var paidCount = (praw2 === '' || isNaN(parseInt(praw2, 10))) ? 0 : Math.max(0, Math.min(delta, parseInt(praw2, 10)));
      freeVal = delta - paidCount;  // 무료분 = 전체 − 유료 입력
    }
    if (isNew && !m && !hasPrice) { close(); return; }
    var a2 = loadLedger(_ledgerGame);
    if (isNew) {
      var ne = { ts: Date.now(), type: 'memo', memo: m };
      if (hasPrice) ne.price = pv;
      a2.push(ne);
    } else {
      for (var j = 0; j < a2.length; j++) {
        if (a2[j].ts === entry.ts) {
          a2[j].memo = m;
          if (hasPrice) a2[j].price = pv; else delete a2[j].price;
          if (isAuto && freeVal != null && freeVal !== delta) a2[j].freeDelta = freeVal;
          else if (isAuto) delete a2[j].freeDelta;
          break;
        }
      }
    }
    saveLedger(_ledgerGame, a2);
    close();
    ledgerRerender();
  });
  var _mt = document.getElementById('ledgerMemoText'); if (_mt) _mt.focus();
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
    '  <button class="ledger-open-btn" data-game="' + activeGame + '">📋 내역</button>',
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

  // 거래 내역 → 내역 탭으로 전환 (모달 대신 달력 페이지)
  page.querySelectorAll('.ledger-open-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      _currencyTab = this.dataset.game;
      var lt = document.querySelector('.nav-tab[data-tab="ledger"]');
      if (lt) lt.click();
    });
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
      this._ledgerBefore = parseCurrencyInput(this.value);   // 편집 전 값(원장 델타용)
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
      // 원장 자동 기록: 편집 전후 변동분(±)이 있으면 한 줄 남김
      if (this._ledgerBefore != null && num !== this._ledgerBefore) {
        appendLedger(this.dataset.game, {
          ts: Date.now(), type: 'auto', currency: this.dataset.id,
          delta: num - this._ledgerBefore, balanceAfter: num, memo: ''
        });
        this._ledgerBefore = num;
      }
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

  // 월정액 +30일
  var mpBtn = document.getElementById('mpAddBtn');
  if (mpBtn) {
    mpBtn.addEventListener('click', function() {
      var gid     = this.dataset.game;
      var endDate = loadMonthlyPassEndDate(gid);
      var base    = passResetToday();
      if (endDate) {
        var d = new Date(endDate); d.setHours(0,0,0,0);
        base = d;
      }
      base.setDate(base.getDate() + 30);
      var newEnd = toLocalYMD(base);
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

// 사용자가 명시적으로 삭제한 "기본 게임" id 목록 (자동 병합에서 제외해 삭제 의도 존중)
function loadDeletedDefaults() {
  try { var raw = localStorage.getItem('pickup_manager_deleted_defaults'); return raw ? JSON.parse(raw) : []; }
  catch (e) { return []; }
}

function getGameConfig() {
  var stored = null;
  try { var raw = localStorage.getItem('pickup_manager_game_config'); if (raw) stored = JSON.parse(raw); } catch (e) {}
  if (!stored) return JSON.parse(JSON.stringify(CURRENCY_CONFIG));  // 신규 계정: 전체 기본값
  // 저장된 설정에 없는 기본 게임을 복원(병합) — 단, 사용자가 삭제한 기본 게임은 제외.
  var deleted = loadDeletedDefaults();
  Object.keys(CURRENCY_CONFIG).forEach(function(gid) {
    if (!stored[gid] && deleted.indexOf(gid) === -1) stored[gid] = JSON.parse(JSON.stringify(CURRENCY_CONFIG[gid]));
  });
  return stored;
}

function saveGameConfig(config) {
  try {
    localStorage.setItem('pickup_manager_game_config', JSON.stringify(config));
  } catch (e) {}
}

// 게임 목록 순서 재정렬 — 객체 key 삽입 순서가 곧 표시 순서라, 새 순서대로 재구성해 저장한다.
function reorderGames(orderedIds) {
  var config = getGameConfig();
  var next = {};
  for (var i = 0; i < orderedIds.length; i++) {
    if (config[orderedIds[i]]) next[orderedIds[i]] = config[orderedIds[i]];
  }
  // 혹시 누락된 게임이 있으면 뒤에 보존
  Object.keys(config).forEach(function(id) { if (!next[id]) next[id] = config[id]; });
  saveGameConfig(next);
}

function addGame(name, id) {
  var config = getGameConfig();
  if (config[id]) return false;
  // id가 기본 게임이면 기본 통화까지 복원, 아니면 빈 커스텀
  config[id] = CURRENCY_CONFIG[id] ? JSON.parse(JSON.stringify(CURRENCY_CONFIG[id])) : { name: name, isCustom: true, currencies: [] };
  saveGameConfig(config);
  // 삭제 목록에서 제거(다시 추가했으므로)
  var del = loadDeletedDefaults();
  var i = del.indexOf(id);
  if (i !== -1) { del.splice(i, 1); try { localStorage.setItem('pickup_manager_deleted_defaults', JSON.stringify(del)); } catch (e) {} }
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
  // 기본 게임을 삭제하면 자동 병합에서 제외되도록 기록(삭제 의도 존중 — 커스텀 게임은 기록 안 함)
  if (CURRENCY_CONFIG[gameId]) {
    var del = loadDeletedDefaults();
    if (del.indexOf(gameId) === -1) { del.push(gameId); try { localStorage.setItem('pickup_manager_deleted_defaults', JSON.stringify(del)); } catch (e) {} }
  }
  try { localStorage.removeItem('pickup_manager_currency_' + gameId); } catch (e) {}
  if (appState.currentGame === gameId) {
    appState.currentGame = null;
    appState.characters = [];
    appState.meta = [];
    appState.banner = null;
    appState.selectedCharacterId = null;
    document.getElementById('metaUpdateBtn').disabled = true;
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
      return '<span style="width:' + d + 'px;height:' + d + 'px;border-radius:6px;background:' + meta.iconBg + ';color:' + meta.iconColor + ';font-size: var(--fs-2xs);font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;' + op + '">' + meta.iconText + '</span>';
    };

    var registeredHtml = Object.keys(config).map(function(gid) {
      var game  = config[gid];
      var gacha = getGachaConfig(gid);
      return [
        '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);">',
        iconBox(gid),
        '  <div style="flex:1;min-width:0;">',
        '    <div style="font-size: var(--fs-base);">' + escAttr(game.name) + '</div>',
        '    <div style="font-size: var(--fs-2xs);color:var(--muted);margin-top:2px;">ID: ' + gid + ' &nbsp;·&nbsp; 캐릭터 천장 ' + gacha.charPity + ' / 무기 천장 ' + gacha.weaponPity + '</div>',
        '  </div>',
        '  <button class="detail-btn-cancel gcm-gacha"  data-game="' + gid + '" style="font-size: var(--fs-xs);padding:3px 9px;" title="천장 설정">⚙</button>',
        '  <button class="detail-btn-cancel gcm-rename" data-game="' + gid + '" style="font-size: var(--fs-xs);padding:3px 9px;">이름</button>',
        '  <button class="detail-btn-cancel gcm-remove" data-game="' + gid + '" style="font-size: var(--fs-xs);padding:3px 9px;color:var(--must);border-color:var(--must);">제거</button>',
        '</div>'
      ].join('');
    }).join('') || '<p style="font-size: var(--fs-base);color:var(--muted);padding:8px 0;">등록된 게임이 없습니다.</p>';

    var removedBuiltin = builtinIds.filter(function(gid) { return !config[gid]; });
    var restoreHtml = removedBuiltin.length ? [
      '<div style="padding:12px 0 6px;font-size: var(--fs-xs);color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-top:4px;">제거된 기본 게임</div>',
      removedBuiltin.map(function(gid) {
        var name = (CURRENCY_CONFIG[gid] && CURRENCY_CONFIG[gid].name) || gid;
        return [
          '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">',
          iconBox(gid, 32, '0.45'),
          '  <span style="flex:1;font-size: var(--fs-base);color:var(--muted);">' + name + '</span>',
          '  <button class="detail-btn-save gcm-restore" data-game="' + gid + '" style="font-size: var(--fs-xs);padding:3px 9px;">복원</button>',
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
      '      <div style="padding:12px 0 6px;font-size: var(--fs-xs);color:var(--muted);text-transform:uppercase;letter-spacing:.08em;">등록된 게임</div>',
      '      <div>' + registeredHtml + '</div>',
      restoreHtml,
      '      <div style="padding:14px 0 12px;margin-top:6px;border-top:1px solid var(--border);">',
      '        <div style="font-size: var(--fs-xs);color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;">새 게임 추가</div>',
      '        <div style="display:flex;gap:8px;margin-bottom:6px;">',
      '          <input class="edit-input" id="gcmNewName" type="text" placeholder="게임 이름" style="flex:1;" />',
      '        </div>',
      '        <div style="display:flex;gap:8px;align-items:center;">',
      '          <input class="edit-input" id="gcmNewId" type="text" placeholder="게임 ID (영문/숫자/_)  예: nte" style="flex:1;" />',
      '          <button class="detail-btn-save" id="gcmAddNew" style="white-space:nowrap;flex-shrink:0;">추가</button>',
      '        </div>',
      '        <div style="font-size: var(--fs-2xs);color:var(--muted);margin-top:6px;">ID 미입력 시 자동 생성 &nbsp;·&nbsp; 아이콘: assets/icons/{ID}/icon.png</div>',
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
    '      <div style="font-size: var(--fs-2xs);color:var(--muted);padding:0 0 2px 0;">→ assets/icons/' + gameId + '/{파일명}  &nbsp;(.png / .webp 모두 지원, 확장자 미입력 시 .png)</div>',
    '      <div class="edit-row">',
    '        <label class="edit-label">환산 비율</label>',
    '        <input class="edit-input" id="ccRate" type="number" min="1" step="1" placeholder="예: 160" value="' + (cur ? cur.rate : '') + '" style="max-width:90px;" />',
    '        <span style="font-size: var(--fs-base);color:var(--muted);">개 = 1뽑</span>',
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
    '      <div style="font-size: var(--fs-2xs);color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px;">천장</div>',
    '      <div class="edit-row">',
    '        <label class="edit-label">캐릭터 천장</label>',
    '        <input class="edit-input" id="gcaCharPity" type="number" min="1" step="1" value="' + gacha.charPity + '" style="max-width:80px;" />',
    '        <span style="font-size: var(--fs-base);color:var(--muted);">뽑</span>',
    '      </div>',
    '      <div class="edit-row">',
    '        <label class="edit-label">무기 천장</label>',
    '        <input class="edit-input" id="gcaWeaponPity" type="number" min="1" step="1" value="' + gacha.weaponPity + '" style="max-width:80px;" />',
    '        <span style="font-size: var(--fs-base);color:var(--muted);">뽑</span>',
    '      </div>',
    '      <div class="edit-row">',
    '        <label class="edit-label">1뽑 재화 비용</label>',
    '        <input class="edit-input" id="gcaPullCost" type="number" min="1" step="1" value="' + gacha.pullCost + '" style="max-width:80px;" />',
    '        <span style="font-size: var(--fs-base);color:var(--muted);">개</span>',
    '      </div>',
    '      <div style="font-size: var(--fs-2xs);color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-top:8px;margin-bottom:2px;">과금 계산</div>',
    '      <div class="edit-row">',
    '        <label class="edit-label">1트럭 가격</label>',
    '        <input class="edit-input" id="gcaPkgPrice" type="number" min="0" step="1000" value="' + (gacha.packagePrice || '') + '" placeholder="예: 119000" style="max-width:110px;" />',
    '        <span style="font-size: var(--fs-base);color:var(--muted);">원</span>',
    '      </div>',
    '      <div class="edit-row">',
    '        <label class="edit-label">1트럭 뽑기</label>',
    '        <input class="edit-input" id="gcaPkgPulls" type="number" min="1" step="1" value="' + (gacha.packagePulls || '') + '" placeholder="예: 50" style="max-width:110px;" />',
    '        <span style="font-size: var(--fs-base);color:var(--muted);">회</span>',
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

function openPlannerConfigModal(gameId) {
  var pd    = loadPlannerData(gameId);
  var modal = document.getElementById('currencyConfigModal');

  var startDate = pd.startDate || '';
  var endDate   = pd.endDate   || '';
  // 다음 버전 시작일 = 현재 버전 종료일(같은 날)
  var nextStart = endDate || '';

  function calcHints(sVal, eVal) {
    var autoEndHint  = (sVal && !eVal) ? '자동 종료일: ' + plannerAutoEndDate(sVal) : '';
    var nextStartHint = eVal ? '다음 버전 시작일: ' + eVal : '';
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
    '      <div class="edit-row">',
    '        <label class="edit-label">전반 기간(일)</label>',
    '        <input class="edit-input" id="pcfFirstHalf" type="number" min="1" step="1" value="' + (parseInt(pd.firstHalfDays) || 21) + '" style="max-width:100px;" />',
    '      </div>',
    '      <p id="pcfHalfHint"    style="font-size: var(--fs-xs);color:var(--muted);margin:0;">후반 = 버전 종료일까지 나머지 (기본 전반 21일 = 3주)</p>',
    '      <p id="pcfAutoHint"    style="font-size: var(--fs-xs);color:var(--muted);margin:0;">' + initialHints.autoEndHint + '</p>',
    '      <p id="pcfNextHint"    style="font-size: var(--fs-xs);color:var(--acc,#7b68ee);margin:0;">' + initialHints.nextStartHint + '</p>',
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
    // 시작일이 비어 있으면 이전 버전 종료일(같은 날)로 보정
    if (!sDate && eDate && pd.endDate) sDate = pd.endDate;
    // 버전/기간은 공유 설정(어드민만) — Supabase에 저장돼 전 유저에 반영. 목표는 개인 유지.
    if (window.saveSharedPlanner) window.saveSharedPlanner(gameId, version, sDate, eDate);
    // 전반 기간은 개인 플래너 blob에 저장(pickup_manager_ 접두사라 계정 동기화). 기본 21일.
    var fhd = parseInt(document.getElementById('pcfFirstHalf').value) || 21;
    if (fhd < 1) fhd = 21;
    var pdNow = loadPlannerData(gameId);
    pdNow.firstHalfDays = fhd;
    savePlannerData(gameId, pdNow);
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
      document.getElementById("metaUpdateBtn").disabled = true;
    document.getElementById("cardSyncBtn").disabled = true;
      renderPlaceholder("게임을 선택해주세요.");

      document.getElementById("addGameBtn").addEventListener("click", function() { openGameConfigModal(null); });

      var gameListEl = document.getElementById("gameList");
      gameListEl.addEventListener("click", function(e) {
        if (_gameDragging) return;
        var card = e.target.closest(".game-card");
        if (!card) return;
        var gameId = card.dataset.game;
        document.querySelectorAll(".game-card").forEach(function(c) { c.classList.remove("active"); });
        card.classList.add("active");

        var activeNavTab = document.querySelector(".nav-tab.active");
        var currentTab = activeNavTab ? activeNavTab.dataset.tab : "analysis";

        if (currentTab === "currency") {
          _currencyTab = gameId;
          appState.currentGame = gameId;  // 다른 탭과 게임 동기화(탭 전환 시 옛 게임으로 덮이는 것 방지)
          renderCurrencyPage();
        } else if (currentTab === "ledger") {
          _currencyTab = gameId;
          appState.currentGame = gameId;
          renderLedgerPage();
        } else {
          onGameChange(gameId);
        }
      });

      // 게임 목록 드래그앤드롭 순서 변경 (세로 리스트 — 중점 기준 위/아래 삽입)
      var gameDragSrc = null;
      gameListEl.addEventListener("dragstart", function(e) {
        var card = e.target.closest(".game-card");
        if (!card) return;
        gameDragSrc = card;
        _gameDragging = true;
        e.dataTransfer.effectAllowed = "move";
        setTimeout(function() { card.classList.add("game-dragging"); }, 0);
      });
      gameListEl.addEventListener("dragover", function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!gameDragSrc) return;
        var card = e.target.closest(".game-card");
        if (!card || card === gameDragSrc) return;
        var rect = card.getBoundingClientRect();
        if (e.clientY > rect.top + rect.height / 2) {
          gameListEl.insertBefore(gameDragSrc, card.nextSibling);
        } else {
          gameListEl.insertBefore(gameDragSrc, card);
        }
      });
      gameListEl.addEventListener("drop", function(e) {
        e.preventDefault();
        if (!gameDragSrc) return;
        gameDragSrc.classList.remove("game-dragging");
        var order = Array.prototype.slice.call(gameListEl.querySelectorAll(".game-card"))
          .map(function(c) { return c.dataset.game; });
        reorderGames(order);
        gameDragSrc = null;
        setTimeout(function() { _gameDragging = false; }, 0);
        renderGameSelect();
      });
      gameListEl.addEventListener("dragend", function() {
        if (gameDragSrc) gameDragSrc.classList.remove("game-dragging");
        gameDragSrc = null;
        setTimeout(function() { _gameDragging = false; }, 0);
      });

      document.querySelector(".sidebar-nav").addEventListener("click", function(e) {
        var btn = e.target.closest(".nav-tab");
        if (!btn) return;
        var tab = btn.dataset.tab;
        document.querySelectorAll(".nav-tab").forEach(function(b) { b.classList.remove("active"); });
        btn.classList.add("active");
        document.getElementById("tabAnalysis").style.display  = tab === "analysis"  ? "" : "none";
        document.getElementById("tabCurrency").style.display  = tab === "currency"  ? "" : "none";
        document.getElementById("tabLedger").style.display    = tab === "ledger"    ? "" : "none";
        document.getElementById("analysisSideContent").style.display = tab === "analysis" ? "" : "none";
        // 과금액은 항상 표시(모든 탭), 카드 데이터 갱신은 보유 캐릭터 탭만(관리자)
        document.getElementById("analysisActions").style.display = (tab === "analysis" && !!window.IS_ADMIN) ? "flex" : "none";
        renderSidebarSpend();

        if (tab === "currency") {
          // 가챠 분석에서 보고 있던 게임을 재화 탭에도 반영
          if (appState.currentGame) _currencyTab = appState.currentGame;
          renderCurrencyPage();
        } else if (tab === "ledger") {
          if (appState.currentGame) _currencyTab = appState.currentGame;
          renderLedgerPage();
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

      document.getElementById("metaUpdateBtn").onclick = function() {
        runMetaUpdate();
      };
      document.getElementById("cardSyncBtn").onclick = function() {
        runCardSync();
      };
      // 초기: 과금액 표시(항상) + 카드 데이터 갱신은 보유 캐릭터 탭(관리자)만
      renderSidebarSpend();
      document.getElementById("analysisActions").style.display = window.IS_ADMIN ? "flex" : "none";

      var rosterList = document.getElementById('rosterList');
      rosterList.addEventListener('scroll', function() {
        rosterList.parentNode.classList.toggle('scroll-top', rosterList.scrollTop > 8);
      });

      return syncRosterFromFile().then(function() {
        // 브라우저 진입 시 게임 목록 최상단 게임을 기본 선택(보유 캐릭터 탭)
        var firstCard = document.querySelector("#gameList .game-card");
        if (firstCard) {
          document.querySelectorAll(".game-card").forEach(function(c) { c.classList.remove("active"); });
          firstCard.classList.add("active");
          onGameChange(firstCard.dataset.game);
        }
      });
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

window.appInit = init; // 로그인 성공 후 auth.js가 호출 (미로그인 시 앱 미초기화)
document.addEventListener("DOMContentLoaded", function() {
  testPlannerCalcInvariant(); testMonteCarlo();
  // 모바일 사이드바 서랍 토글
  var al = document.querySelector('.app-layout');
  var mt = document.getElementById('menuToggle');
  var bd = document.getElementById('navBackdrop');
  function closeNav() { if (al) al.classList.remove('nav-open'); }
  if (mt && al) mt.addEventListener('click', function() { al.classList.toggle('nav-open'); });
  if (bd) bd.addEventListener('click', closeNav);
  var gl = document.getElementById('gameList'); if (gl) gl.addEventListener('click', closeNav);
  var sn = document.querySelector('.sidebar-nav'); if (sn) sn.addEventListener('click', closeNav);
});
