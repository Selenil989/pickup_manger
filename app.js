// ── STATE ─────────────────────────────────────────────────────────────────────

var appState = {
  config: null,
  currentGame: null,
  characters: [],
  meta: [],
  banner: null,
  selectedCharacterId: null,
  rosters: {},
  evaluationResult: null
};

// ── INTERNAL ──────────────────────────────────────────────────────────────────
// Section 9: Character Detail Modal state

var _detailCharId = null;
var _detailChar   = null;
var _detailDraft  = null;

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

// ── INTERNAL ──────────────────────────────────────────────────────────────────
// Section 3: Data Saving

function saveRoster(gameId) {
  try {
    var roster = appState.rosters[gameId];
    roster.updatedAt = new Date().toISOString();
    localStorage.setItem(getRosterKey(gameId), JSON.stringify(roster));
  } catch (err) {
    console.error("로스터 저장 실패:", err);
  }
}

// ── INTERNAL ──────────────────────────────────────────────────────────────────
// Section 4: State Mutations

function setGame(gameId) {
  appState.currentGame = gameId;
  return loadGameData(gameId)
    .then(function(data) {
      appState.characters = data.characters;
      appState.meta = data.meta;
      appState.banner = data.banner;

      if (!appState.rosters[gameId]) {
        appState.rosters[gameId] = loadRoster(gameId);
      }

      appState.selectedCharacterId = null;
      appState.evaluationResult = null;

      renderCharacterSelect();
      renderRoster();
      if (gameId === 'zzz') {
        renderCardGrid();
      } else {
        renderPlaceholder("캐릭터를 선택하고 분석하기를 누르세요.");
      }

      document.getElementById("characterSelect").disabled = false;
      document.getElementById("analyzeBtn").disabled = false;
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
  } else if (appState.currentGame === 'zzz') {
    renderCardGrid();
  }
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

  var meta = null;
  for (var j = 0; j < appState.meta.length; j++) {
    if (appState.meta[j].characterId === appState.selectedCharacterId) {
      meta = appState.meta[j];
      break;
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
  }
}

// ── INTERNAL ──────────────────────────────────────────────────────────────────
// Section 6: Rendering

function renderGameSelect() {
  var gameLabels = {
    zzz: "젠레스 존 제로",
    hsr: "붕괴: 스타레일",
    wuwa: "명조: 워더링 웨이브",
    endfield: "아크나이츠: 엔드필드"
  };

  var select = document.getElementById("gameSelect");
  select.innerHTML = '<option value="">게임 선택</option>';

  var games = appState.config.supportedGames;
  for (var i = 0; i < games.length; i++) {
    var gameId = games[i];
    var option = document.createElement("option");
    option.value = gameId;
    option.textContent = gameLabels[gameId] || gameId;
    select.appendChild(option);
  }
}

function renderCharacterSelect() {
  var select = document.getElementById("characterSelect");
  select.innerHTML = '<option value="">캐릭터 선택</option>';

  for (var i = 0; i < appState.characters.length; i++) {
    var char = appState.characters[i];
    var label = (char.nameKo || char.name) + (char.isReleased ? "" : " [출시 예정]");
    var option = document.createElement("option");
    option.value = char.id;
    option.textContent = label;
    select.appendChild(option);
  }
}

function renderCardGrid() {
  var imgBase = 'data/games/zzz/images/';
  var roster = appState.rosters['zzz'] || { characters: [] };
  var ownedMap = {};
  for (var o = 0; o < roster.characters.length; o++) {
    ownedMap[roster.characters[o].characterId] = true;
  }

  var html = '<div class="card-grid">';
  for (var i = 0; i < appState.characters.length; i++) {
    var char = appState.characters[i];
    var owned = ownedMap[char.id] ? true : false;

    var elementFile = char.specialElement
      ? 'element_' + char.specialElement + '.webp'
      : (char.element ? 'element_' + char.element + '.webp' : '');
    var rarityFile = char.rarity === 5 ? 'rarity_S.webp'
      : (char.rarity === 4 ? 'rarity_A.webp' : '');
    var roleFile = char.role ? 'role_' + char.role + '.webp' : '';

    html += '<div class="char-card' + (owned ? ' owned' : '') + '" data-char-id="' + char.id + '">';

    if (char.image) {
      html += '<img class="char-card-image" src="' + imgBase + char.image + '" alt="' + char.name + '" loading="lazy">';
    } else {
      html += '<div class="char-card-image char-card-no-img"></div>';
    }

    html += '<div class="char-card-icons">';
    html += '<div class="char-card-icons-left">';
    if (rarityFile) {
      html += '<img class="char-card-icon" src="' + imgBase + rarityFile + '" alt="">';
    }
    html += '</div>';
    html += '<div class="char-card-icons-right">';
    if (roleFile) {
      html += '<img class="char-card-icon" src="' + imgBase + roleFile + '" alt="">';
    }
    if (elementFile) {
      html += '<img class="char-card-icon" src="' + imgBase + elementFile + '" alt="">';
    }
    html += '</div>';
    html += '</div>';

    if (owned) {
      html += '<div class="char-card-owned-overlay"></div>';
    }

    html += '<div class="char-card-name">' + (char.nameKo || char.name) + '</div>';
    html += '<button class="card-quick-toggle" data-toggle-id="' + char.id + '">&#10003;</button>';
    html += '</div>';
  }
  html += '</div>';

  var panel = document.getElementById('resultsPanel');
  panel.innerHTML = html;

  var cards = panel.querySelectorAll('.char-card');
  for (var j = 0; j < cards.length; j++) {
    (function(card) {
      card.onclick = function() {
        openCharacterDetail(card.getAttribute('data-char-id'));
      };
    })(cards[j]);
  }

  var toggleBtns = panel.querySelectorAll('.card-quick-toggle');
  for (var k = 0; k < toggleBtns.length; k++) {
    (function(btn) {
      btn.onclick = function(e) {
        e.stopPropagation();
        toggleRosterCharacter(btn.getAttribute('data-toggle-id'));
      };
    })(toggleBtns[k]);
  }
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
  } else if (appState.currentGame === 'zzz') {
    renderCardGrid();
  }
  closeCharacterDetail();
}

function closeCharacterDetail() {
  _detailCharId = null;
  _detailChar   = null;
  _detailDraft  = null;
  var modal = document.getElementById('charDetailModal');
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

function renderResults(result) {
  function scoreBar(score) {
    var pct = Math.round((score / 10) * 100);
    return '<div class="score-bar-wrap"><div class="score-bar" style="width:' + pct + '%"></div><span>' + score + '</span></div>';
  }

  function priorityBadge(priority) {
    return '<span class="badge badge-' + priority + '">' + priority + '</span>';
  }

  var character = result.character;
  var meta = result.meta;
  var pullClass = meta.recommendation.pull.replace(/_/g, "-");
  var finalPct = Math.round((result.finalScore / 10) * 100);

  var html = '';

  html += '<div class="results-container">';

  // Block 1: Final score
  html += '<div class="result-block result-final pull-' + pullClass + '">';
  html += '<div class="result-label">최종 추천도</div>';
  html += '<div class="final-score">' + result.finalScore + ' / 10</div>';
  html += '<div class="score-bar-wrap"><div class="score-bar" style="width:' + finalPct + '%"></div><span>' + result.finalScore + '</span></div>';
  if (result.isCurrentPickup) {
    html += '<div class="pickup-badge">현재 픽업 중</div>';
  }
  html += '</div>';

  // Block 2: Investment types
  html += '<div class="result-block">';
  html += '<div class="result-label">투자 유형</div>';
  html += '<div class="investment-types">';
  var labels = result.investmentTypeLabels;
  for (var i = 0; i < labels.length; i++) {
    html += '<span class="inv-badge">' + labels[i] + '</span>';
  }
  html += '</div>';
  html += '</div>';

  // Block 3: Pull reasons
  html += '<div class="result-block">';
  html += '<div class="result-label">뽑아야 할 이유</div>';
  html += '<ul class="reason-list">';
  var pullReasons = meta.pullReasons || [];
  for (var j = 0; j < pullReasons.length; j++) {
    html += '<li>' + pullReasons[j] + '</li>';
  }
  html += '</ul>';
  html += '</div>';

  // Block 4: Base performance
  html += '<div class="result-block">';
  html += '<div class="result-label">캐릭터 자체 성능</div>';
  html += scoreBar(character.basePerformance);
  html += '</div>';

  // Block 5: Meta score
  html += '<div class="result-block">';
  html += '<div class="result-label">현재 메타 점수<span class="confidence-label">신뢰도 ' + Math.round(meta.confidence * 100) + '%</span></div>';
  html += scoreBar(meta.metaScore);
  html += '</div>';

  // Block 6: Account growth
  html += '<div class="result-block">';
  html += '<div class="result-label">계정 체급 상승량</div>';
  html += scoreBar(result.accountGrowth);
  html += '</div>';

  // Block 7: Future meta value
  html += '<div class="result-block">';
  html += '<div class="result-label">미래 메타 가치</div>';
  html += scoreBar(meta.futureScore);
  html += '</div>';

  // Block 8: Replaceability
  html += '<div class="result-block">';
  html += '<div class="result-label">대체 가능성</div>';
  html += scoreBar(meta.replacementScore);
  html += '<div class="sub-note">점수 높을수록 대체 용이 → 투자 가치 하락</div>';
  html += '</div>';

  // Block 9: Character recommendation
  html += '<div class="result-block">';
  html += '<div class="result-label">명함 가치' + priorityBadge(meta.characterRecommendation.priority) + '</div>';
  html += scoreBar(meta.characterRecommendation.score);
  html += '<div class="sub-note">' + meta.characterRecommendation.reason + '</div>';
  html += '</div>';

  // Block 10: Breakthrough recommendation
  html += '<div class="result-block">';
  html += '<div class="result-label">돌파 가치' + priorityBadge(meta.breakthroughRecommendation.priority) + '</div>';
  html += scoreBar(meta.breakthroughRecommendation.score);
  html += '<div class="sub-note">' + meta.breakthroughRecommendation.reason + '</div>';
  html += '</div>';

  // Block 11: Weapon recommendation
  html += '<div class="result-block">';
  html += '<div class="result-label">전무 가치' + priorityBadge(meta.weaponRecommendation.priority) + '</div>';
  html += scoreBar(meta.weaponRecommendation.score);
  html += '<div class="sub-note">' + meta.weaponRecommendation.reason + '</div>';
  html += '</div>';

  // Block 12: Future synergy links
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

  // Block 13: Skip reasons
  html += '<div class="result-block">';
  html += '<div class="result-label">뽑지 말아야 할 이유</div>';
  html += '<ul class="reason-list reason-skip">';
  var skipReasons = meta.skipReasons || [];
  for (var k2 = 0; k2 < skipReasons.length; k2++) {
    html += '<li>' + skipReasons[k2] + '</li>';
  }
  html += '</ul>';
  html += '</div>';

  // Block 14: Final verdict
  html += '<div class="result-block result-verdict pull-' + pullClass + '">';
  html += '<div class="result-label">최종 추천</div>';
  html += '<div class="verdict">' + result.recommendationLabel + '</div>';
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
    document.getElementById("characterSelect").disabled = true;
    document.getElementById("analyzeBtn").disabled = true;
    renderPlaceholder("게임을 선택해주세요.");
    return;
  }
  setGame(gameId);
}

function onCharacterChange(characterId) {
  appState.selectedCharacterId = characterId || null;
  if (appState.selectedCharacterId) {
    runAnalysis();
  } else if (appState.currentGame === 'zzz') {
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

// ── INTERNAL ──────────────────────────────────────────────────────────────────
// Section 8: Init

function init() {
  loadConfig()
    .then(function(config) {
      appState.config = config;
      renderGameSelect();
      document.getElementById("characterSelect").disabled = true;
      document.getElementById("analyzeBtn").disabled = true;
      renderPlaceholder("게임을 선택해주세요.");

      document.getElementById("gameSelect").onchange = function() {
        onGameChange(this.value);
      };
      document.getElementById("characterSelect").onchange = function() {
        onCharacterChange(this.value);
      };
      document.getElementById("analyzeBtn").onclick = function() {
        onAnalyzeClick();
      };
    })
    .catch(function() {
      renderError("설정 파일을 불러오지 못했습니다. 페이지를 새로고침해주세요.");
    });
}

document.addEventListener("DOMContentLoaded", init);
