var mgState = {
  gameId: null,
  characters: []
};

var TIER_SCORE = {
  'SSS': 9.7, 'SS': 8.9, 'S': 8.0, 'A': 6.5, 'B': 4.5, 'C': 2.0
};

var TIER_CONFIDENCE = {
  'SSS': 0.90, 'SS': 0.80, 'S': 0.75, 'A': 0.65, 'B': 0.60, 'C': 0.50
};

var TIER_VALUES = ['SSS', 'SS', 'S', 'A', 'B', 'C'];

var WEAPON_DEFAULT = 6;
var BREAKTHROUGH_DEFAULT = 5;
var FUTURE_DEFAULT = 5.0;

function init() {
  document.getElementById('gameSelect').onchange = function() {
    mgState.gameId = this.value || null;
    document.getElementById('loadBtn').disabled = !this.value;
    document.getElementById('loadStatus').textContent = '';
    document.getElementById('loadStatus').className = 'gen-note';
    hide('stepTier');
    hide('stepOutput');
  };

  document.getElementById('loadBtn').onclick = onLoadClick;
  document.getElementById('generateBtn').onclick = onGenerateClick;
  document.getElementById('copyBtn').onclick = function() { copyTextarea('jsonOutput', this); };
  document.getElementById('downloadBtn').onclick = onDownloadClick;
}

function onLoadClick() {
  if (!mgState.gameId) return;
  var url = 'data/games/' + mgState.gameId + '/characters.json';
  var statusEl = document.getElementById('loadStatus');
  statusEl.textContent = '로드 중...';
  statusEl.className = 'gen-note';

  fetch(url)
    .then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function(data) {
      mgState.characters = data;
      statusEl.textContent = data.length + '개 캐릭터 로드됨';
      statusEl.className = 'gen-note gen-status-ok';
      renderTierTable(data);
      show('stepTier');
      hide('stepOutput');
    })
    .catch(function(err) {
      statusEl.textContent = '로드 실패: ' + err.message;
      statusEl.className = 'gen-note gen-status-err';
    });
}

function renderTierTable(characters) {
  var tbody = document.getElementById('tierTableBody');
  tbody.innerHTML = '';
  characters.forEach(function(char, idx) {
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td style="color:var(--muted);font-size:11px">' + (idx + 1) + '</td>' +
      '<td style="font-family:monospace;font-size:12px;color:var(--accent)">' + esc(char.id) + '</td>' +
      '<td style="font-size:12px">' + esc(char.name || '-') + '</td>' +
      '<td style="font-size:12px;color:var(--muted)">' + esc(char.role) + '</td>' +
      '<td style="font-size:12px;color:var(--muted)">' + esc(char.element) + '</td>' +
      '<td>' + buildTierSelect(char.id) + '</td>' +
      '<td>' + buildNumInput(char.id, 'weapon', '', 1, 10) + '</td>' +
      '<td>' + buildNumInput(char.id, 'breakthrough', '', 1, 10) + '</td>' +
      '<td>' + buildNumInput(char.id, 'future', String(FUTURE_DEFAULT), 1, 10) + '</td>' +
      '<td>' + buildTextInput(char.id, 'notes') + '</td>';
    tbody.appendChild(tr);
  });
}

function buildTierSelect(charId) {
  var opts = '<option value="">-</option>';
  TIER_VALUES.forEach(function(t) {
    opts += '<option value="' + t + '">' + t + '</option>';
  });
  return '<select class="gen-select" data-id="' + charId + '" data-field="tier" style="width:68px">' + opts + '</select>';
}

function buildNumInput(charId, field, val, min, max) {
  return '<input type="number" class="gen-input" data-id="' + charId + '" data-field="' + field + '"' +
    ' value="' + val + '" min="' + min + '" max="' + max + '" step="0.5" style="width:66px">';
}

function buildTextInput(charId, field) {
  return '<input type="text" class="gen-input" data-id="' + charId + '" data-field="' + field + '" style="width:120px">';
}

function collectTableRows() {
  var rows = document.getElementById('tierTableBody').querySelectorAll('tr');
  var results = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var tierEl = row.querySelector('[data-field="tier"]');
    if (!tierEl) continue;
    var charId = tierEl.getAttribute('data-id');
    var tier = tierEl.value;

    var char = findChar(charId);
    if (!char) continue;

    var weaponEl = row.querySelector('[data-field="weapon"]');
    var breakthroughEl = row.querySelector('[data-field="breakthrough"]');
    var futureEl = row.querySelector('[data-field="future"]');
    var notesEl = row.querySelector('[data-field="notes"]');

    results.push({
      char: char,
      tier: tier,
      weaponScore: parseScore(weaponEl),
      breakthroughScore: parseScore(breakthroughEl),
      futureScore: parseScore(futureEl) !== null ? parseScore(futureEl) : FUTURE_DEFAULT,
      notes: notesEl ? notesEl.value.trim() : ''
    });
  }
  return results;
}

function parseScore(el) {
  if (!el || el.value === '') return null;
  var v = parseFloat(el.value);
  return isNaN(v) ? null : Math.min(10, Math.max(0, v));
}

function findChar(charId) {
  for (var i = 0; i < mgState.characters.length; i++) {
    if (mgState.characters[i].id === charId) return mgState.characters[i];
  }
  return null;
}

function calcReplacementScore(charId, role, activeEntries) {
  var count = 0;
  for (var i = 0; i < activeEntries.length; i++) {
    var e = activeEntries[i];
    if (e.char.role === role && e.char.id !== charId) {
      if (e.tier === 'SSS' || e.tier === 'SS') count++;
    }
  }
  return Math.min(10, count * 2);
}

function getPriority(score) {
  if (score >= 8) return 'high';
  if (score >= 6) return 'medium';
  return 'low';
}

function getInvestmentType(metaScore, futureScore) {
  var types = [];
  if (metaScore >= 8.5) types.push('meta');
  if (futureScore >= 8.0) types.push('future');
  if (types.length === 0 && metaScore < 6.0) types.push('collection');
  if (types.length === 0) types.push('meta');
  return types;
}

// recommendation.pull은 evaluationEngine 계산값이 아니라 큐레이터 판단 필드.
// tier에서 직접 매핑한다. 수동 검토 후 덮어쓰는 것이 목적.
var TIER_PULL = {
  'SSS': 'must_pull',
  'SS':  'recommended',
  'S':   'recommended',
  'A':   'optional',
  'B':   'skip',
  'C':   'skip'
};

var TIER_PULL_PRIORITY = {
  'SSS': 'high',
  'SS':  'high',
  'S':   'high',
  'A':   'medium',
  'B':   'low',
  'C':   'low'
};

function getPullDecision(tier) {
  return {
    pull: TIER_PULL[tier] || 'optional',
    priority: TIER_PULL_PRIORITY[tier] || 'medium'
  };
}

function getPullReasons(tier, role) {
  var map = {
    'SSS': role + ' 직군 현 메타 최상위',
    'SS': role + ' 직군 강력한 선택지',
    'S': role + ' 직군 안정적인 성능',
    'A': role + ' 직군 무난한 선택지',
    'B': role + ' 직군 상황에 따라 유효',
    'C': role + ' 직군 컬렉션 또는 보조용'
  };
  return [map[tier] || (tier + ' 등급 ' + role + ' 캐릭터')];
}

function getSkipReasons(tier, role) {
  if (tier === 'B' || tier === 'C') {
    return ['같은 역할 상위 캐릭터 존재', '투자 효율 낮음'];
  }
  return ['동일 ' + role + ' 직군 보유 시 우선순위 검토 필요'];
}

function buildMetaEntry(entry, activeEntries, today) {
  var tier = entry.tier;
  var char = entry.char;
  var metaScore = TIER_SCORE[tier];
  var confidence = TIER_CONFIDENCE[tier];
  var futureScore = entry.futureScore;
  var replacementScore = calcReplacementScore(char.id, char.role, activeEntries);
  var weaponScore = entry.weaponScore !== null ? entry.weaponScore : WEAPON_DEFAULT;
  var breakthroughScore = entry.breakthroughScore !== null ? entry.breakthroughScore : BREAKTHROUGH_DEFAULT;
  var charRecScore = Math.round(metaScore);
  var investmentType = getInvestmentType(metaScore, futureScore);
  var pullDecision = getPullDecision(tier);

  var obj = {
    '_preview': true,
    '_tierInput': tier,
    '_generatedAt': today
  };
  if (entry.notes) obj['_notes'] = entry.notes;

  obj['version'] = '1.0';
  obj['characterId'] = char.id;
  obj['investmentType'] = investmentType;
  obj['metaScore'] = metaScore;
  obj['futureScore'] = futureScore;
  obj['replacementScore'] = replacementScore;
  obj['confidence'] = confidence;
  obj['futureLinks'] = [];
  obj['characterRecommendation'] = {
    score: charRecScore,
    priority: getPriority(charRecScore),
    reason: tier + ' 등급 / ' + char.role + ' 직군'
  };
  obj['breakthroughRecommendation'] = {
    score: breakthroughScore,
    priority: getPriority(breakthroughScore),
    reason: '돌파 효율 검토 필요'
  };
  obj['weaponRecommendation'] = {
    score: weaponScore,
    priority: getPriority(weaponScore),
    reason: '전무 효율 검토 필요'
  };
  obj['pullReasons'] = getPullReasons(tier, char.role);
  obj['skipReasons'] = getSkipReasons(tier, char.role);
  obj['sources'] = [{ name: 'manual-tier-input', weight: 1.0 }];
  obj['recommendation'] = pullDecision;

  return obj;
}

function onGenerateClick() {
  var allRows = collectTableRows();
  var activeEntries = allRows.filter(function(e) { return e.tier !== ''; });

  if (activeEntries.length === 0) {
    alert('tier를 입력한 캐릭터가 없습니다. 최소 1개 이상 입력하세요.');
    return;
  }

  var today = new Date().toISOString().slice(0, 10);
  var output = activeEntries.map(function(e) {
    return buildMetaEntry(e, activeEntries, today);
  });

  var counts = { must_pull: 0, recommended: 0, optional: 0, skip: 0 };
  output.forEach(function(e) {
    var p = e.recommendation.pull;
    if (counts[p] !== undefined) counts[p]++;
  });

  document.getElementById('genSummary').innerHTML =
    '<div class="gen-summary-chip">총 <span>' + output.length + '</span>개</div>' +
    '<div class="gen-summary-chip">필수뽑기 <span>' + counts.must_pull + '</span></div>' +
    '<div class="gen-summary-chip">추천 <span>' + counts.recommended + '</span></div>' +
    '<div class="gen-summary-chip">선택 <span>' + counts.optional + '</span></div>' +
    '<div class="gen-summary-chip">스킵 <span>' + counts.skip + '</span></div>';

  document.getElementById('jsonOutput').value = JSON.stringify(output, null, 2);
  show('stepOutput');
  document.getElementById('stepOutput').scrollIntoView({ behavior: 'smooth' });
}

function onDownloadClick() {
  var json = document.getElementById('jsonOutput').value;
  if (!json) return;
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'meta.preview.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function copyTextarea(id, btn) {
  var el = document.getElementById(id);
  el.select();
  document.execCommand('copy');
  var orig = btn.textContent;
  btn.textContent = '복사됨!';
  setTimeout(function() { btn.textContent = orig; }, 1500);
}

function show(id) {
  document.getElementById(id).classList.remove('gen-hidden');
}

function hide(id) {
  document.getElementById(id).classList.add('gen-hidden');
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

window.onload = init;
