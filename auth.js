// Supabase 계정 로그인 + 계정별 데이터 동기화.
// localStorage의 pickup_manager_* 뭉치를 유저당 jsonb 한 칸(user_data.data)에 통째로 저장/복원.
// 앱의 기존 저장 로직은 안 고침 — setItem만 한 곳에서 가로채 자동 업로드.
// ponytail: last-write-wins (여러 기기 동시편집 시 마지막 저장이 이김). 개인용이라 충분.
//          restore는 remote 키만 덮어씀(로컬 전용 키는 보존) → 첫 로그인 시 로컬 데이터 안 날아감.
var SUPABASE_URL = 'https://fqbpjvycdbicbbshxkyb.supabase.co';
var SUPABASE_KEY = 'sb_publishable_bXR-gFa8AVTBWAn3nOT4HQ_N_bq7kSI';
var sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

var origSet = localStorage.setItem.bind(localStorage);
var syncTimer = null, currentUid = null, inited = false;

// pickup_manager_* 저장을 감지해 디바운스 업로드 (기존 15곳 저장 코드 무수정)
localStorage.setItem = function (k, v) {
  origSet(k, v);
  if (currentUid && k.indexOf('pickup_manager_') === 0) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(pushData, 1500);
  }
};

function collect() {
  var o = {};
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k.indexOf('pickup_manager_') === 0) o[k] = localStorage.getItem(k);
  }
  return o;
}

function pushData() {
  if (!currentUid) return;
  sb.from('user_data')
    .upsert({ user_id: currentUid, data: collect(), updated_at: new Date().toISOString() })
    .then(function (r) { if (r.error) console.warn('[sync] 업로드 실패:', r.error.message); });
}

function restoreData(uid) {
  return sb.from('user_data').select('data').eq('user_id', uid).maybeSingle()
    .then(function (r) {
      if (r.error) { console.warn('[sync] 복원 실패:', r.error.message); return; }
      var blob = (r.data && r.data.data) || {};
      // origSet으로 써서 복원 도중 재업로드가 안 걸리게 함
      Object.keys(blob).forEach(function (k) { origSet(k, blob[k]); });
    });
}

function domReady(fn) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
  else fn();
}

function onAuthed(session) {
  if (inited) return;
  inited = true;
  currentUid = session.user.id;
  restoreData(currentUid).then(function () {
    var gate = document.getElementById('authGate');
    if (gate) gate.style.display = 'none';
    domReady(function () { if (window.appInit) window.appInit(); });
  });
}

function showError(msg) { var e = document.getElementById('authError'); if (e) e.textContent = msg || ''; }

domReady(function () {
  var form = document.getElementById('authForm');
  var email = document.getElementById('authEmail');
  var pw = document.getElementById('authPassword');
  form.addEventListener('submit', function (e) {
    e.preventDefault(); showError('');
    sb.auth.signInWithPassword({ email: email.value, password: pw.value })
      .then(function (r) { if (r.error) showError(r.error.message); });
  });
  document.getElementById('authSignup').addEventListener('click', function () {
    showError('');
    sb.auth.signUp({ email: email.value, password: pw.value })
      .then(function (r) {
        if (r.error) showError(r.error.message);
        else if (!r.data.session) showError('가입됨 — 이메일 확인 후 로그인하세요.');
      });
  });
  var lo = document.getElementById('logoutBtn');
  if (lo) lo.addEventListener('click', function () { sb.auth.signOut().then(function () { location.reload(); }); });
});

// 로드 시 저장된 세션이 있으면 INITIAL_SESSION, 로그인하면 SIGNED_IN 이벤트로 진입
sb.auth.onAuthStateChange(function (evt, session) {
  if (session) onAuthed(session);
  else if (evt === 'SIGNED_OUT') { inited = false; currentUid = null; }
});
