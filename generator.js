var genState = {
  gameId: null,
  existingIds: [],
  images: []
};

var IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'webp'];

function init() {
  document.getElementById('gameSelect').onchange = function() { onGameChange(this.value); };
  document.getElementById('folderBtn').onclick = function() { document.getElementById('folderInput').click(); };
  document.getElementById('folderInput').onchange = function() { onFolderSelect(this.files); };
  document.getElementById('generateBtn').onclick = onGenerateClick;
  document.getElementById('renameListBtn').onclick = onRenameListClick;
  document.getElementById('psScriptBtn').onclick = onPSScriptClick;
  document.getElementById('copyJsonBtn').onclick = function() { copyToClipboard('jsonOutput'); };
  document.getElementById('copyPSBtn').onclick = function() { copyToClipboard('psOutput'); };

  document.getElementById('entryTableBody').addEventListener('input', function(e) {
    if (e.target && e.target.getAttribute('data-field') === 'id') {
      checkDuplicate(e.target);
    }
  });
}

function onGameChange(gameId) {
  genState.gameId = gameId || null;
  genState.existingIds = [];
  if (!gameId) {
    document.getElementById('existingStatus').textContent = '';
    return;
  }
  loadExistingCharacters(gameId);
}

function loadExistingCharacters(gameId) {
  document.getElementById('existingStatus').textContent = '로딩 중...';
  fetch('data/games/' + gameId + '/characters.json')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      genState.existingIds = data.map(function(c) { return c.id; });
      document.getElementById('existingStatus').textContent =
        '기존 캐릭터 ' + genState.existingIds.length + '개 로드됨';
    })
    .catch(function() {
      genState.existingIds = [];
      document.getElementById('existingStatus').textContent =
        'characters.json 로드 실패 — 중복 검사 없이 진행';
    });
}

function onFolderSelect(fileList) {
  var images = [];
  for (var i = 0; i < fileList.length; i++) {
    var file = fileList[i];
    var lastDot = file.name.lastIndexOf('.');
    if (lastDot === -1) continue;
    var ext = file.name.slice(lastDot + 1).toLowerCase();
    if (IMAGE_EXTS.indexOf(ext) === -1) continue;
    images.push({
      filename: file.name,
      nameKo: file.name.slice(0, lastDot),
      ext: ext
    });
  }
  genState.images = images;

  document.getElementById('scanStatus').textContent =
    images.length + '개 이미지 발견 (.png / .jpg / .jpeg / .webp)';

  renderScanResults(images);
  renderEntryForm(images);

  document.getElementById('stepScan').classList.remove('gen-hidden');
  document.getElementById('stepForm').classList.remove('gen-hidden');
  document.getElementById('stepOutput').classList.remove('gen-hidden');
}

function renderScanResults(images) {
  var rows = '';
  for (var i = 0; i < images.length; i++) {
    rows += '<tr><td>' + (i + 1) + '</td><td>' + escHtml(images[i].filename) +
      '</td><td>' + escHtml(images[i].nameKo) + '</td><td>' + escHtml(images[i].ext) + '</td></tr>';
  }
  document.getElementById('scanResults').innerHTML =
    '<table class="gen-table"><thead><tr><th>#</th><th>파일명</th><th>nameKo (추출)</th><th>확장자</th></tr></thead>' +
    '<tbody>' + rows + '</tbody></table>';
}

function renderEntryForm(images) {
  var rows = '';
  for (var i = 0; i < images.length; i++) {
    var img = images[i];
    rows +=
      '<tr data-idx="' + i + '">' +
      '<td>' + (i + 1) + '</td>' +
      '<td style="white-space:nowrap;font-size:12px;color:var(--muted);">' + escHtml(img.filename) + '</td>' +
      '<td><input class="gen-input" data-field="nameKo" value="' + escAttr(img.nameKo) + '" style="min-width:80px;"></td>' +
      '<td><input class="gen-input" data-field="id" placeholder="영문_id" style="min-width:100px;"></td>' +
      '<td><input class="gen-input" data-field="nameEn" placeholder="English name" style="min-width:110px;"></td>' +
      '<td><input class="gen-input" data-field="role" placeholder="anomaly, dps..." style="min-width:90px;"></td>' +
      '<td><input class="gen-input" data-field="element" placeholder="wind, ice..." style="min-width:80px;"></td>' +
      '<td><select class="gen-select" data-field="rarity"><option value="5">5★</option><option value="4">4★</option></select></td>' +
      '<td><input class="gen-input" data-field="basePerformance" type="number" min="0" max="10" step="0.1" value="0" style="width:64px;"></td>' +
      '<td><input class="gen-input" data-field="releaseDate" type="date" style="min-width:130px;"></td>' +
      '<td style="text-align:center;"><input type="checkbox" data-field="isReleased" checked></td>' +
      '</tr>';
  }
  document.getElementById('entryTableBody').innerHTML = rows;
}

function checkDuplicate(input) {
  var val = input.value.trim();
  if (val && genState.existingIds.indexOf(val) !== -1) {
    input.classList.add('dup');
    input.title = '이미 등록된 id입니다';
  } else {
    input.classList.remove('dup');
    input.title = '';
  }
}

function collectFormData() {
  var rows = document.getElementById('entryTableBody').querySelectorAll('tr');
  var entries = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var idx = parseInt(row.getAttribute('data-idx'), 10);
    var img = genState.images[idx];
    var id = row.querySelector('[data-field="id"]').value.trim();
    entries.push({
      id: id,
      nameKo: row.querySelector('[data-field="nameKo"]').value.trim(),
      nameEn: row.querySelector('[data-field="nameEn"]').value.trim(),
      gameId: genState.gameId || '',
      rarity: parseInt(row.querySelector('[data-field="rarity"]').value, 10),
      role: row.querySelector('[data-field="role"]').value.trim(),
      element: row.querySelector('[data-field="element"]').value.trim(),
      basePerformance: parseFloat(row.querySelector('[data-field="basePerformance"]').value) || 0,
      releaseDate: row.querySelector('[data-field="releaseDate"]').value,
      isReleased: row.querySelector('[data-field="isReleased"]').checked,
      image: id ? 'images/' + id + '.' + img.ext : '',
      _origFilename: img.filename,
      _ext: img.ext
    });
  }
  return entries;
}

function onGenerateClick() {
  var entries = collectFormData();
  var output = entries.map(function(e) {
    return {
      id: e.id,
      nameKo: e.nameKo,
      nameEn: e.nameEn,
      gameId: e.gameId,
      rarity: e.rarity,
      role: e.role,
      element: e.element,
      basePerformance: e.basePerformance,
      releaseDate: e.releaseDate,
      isReleased: e.isReleased,
      image: e.image
    };
  });
  document.getElementById('jsonOutput').value = JSON.stringify(output, null, 2);
  document.getElementById('jsonSection').classList.remove('gen-hidden');
}

function onRenameListClick() {
  var entries = collectFormData();
  var rows = '';
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    if (!e.id) continue;
    var newName = e.id + '.' + e._ext;
    if (e._origFilename === newName) continue;
    rows += '<tr><td>' + escHtml(e._origFilename) + '</td>' +
      '<td style="color:var(--muted);padding:0 4px;">→</td>' +
      '<td>' + escHtml(newName) + '</td></tr>';
  }
  document.getElementById('renameList').innerHTML = rows
    ? '<table class="gen-table"><thead><tr><th>원본 파일명</th><th></th><th>변환 후 파일명</th></tr></thead><tbody>' + rows + '</tbody></table>'
    : '<p class="gen-note">rename이 필요한 파일 없음 (id를 입력한 뒤 다시 시도하세요)</p>';
  document.getElementById('renameSection').classList.remove('gen-hidden');
}

function onPSScriptClick() {
  var entries = collectFormData();
  var gameId = genState.gameId || '{gameId}';
  var lines = ['# data\\games\\' + gameId + '\\images\\ 폴더에서 실행'];
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    if (!e.id) continue;
    var newName = e.id + '.' + e._ext;
    if (e._origFilename === newName) continue;
    var orig = e._origFilename.replace(/"/g, '`"');
    var next = newName.replace(/"/g, '`"');
    lines.push('Rename-Item "' + orig + '" "' + next + '"');
  }
  document.getElementById('psOutput').value = lines.length > 1
    ? lines.join('\n')
    : lines[0] + '\n# rename이 필요한 파일 없음';
  document.getElementById('psSection').classList.remove('gen-hidden');
}

function copyToClipboard(elementId) {
  var text = document.getElementById(elementId).value;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  } else {
    var el = document.getElementById(elementId);
    el.select();
    document.execCommand('copy');
  }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', init);
