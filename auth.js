// Supabase 계정 로그인 + 계정별 데이터 동기화.
// localStorage의 pickup_manager_* 뭉치를 유저당 jsonb 한 칸(user_data.data)에 통째로 저장/복원.
// 앱의 기존 저장 로직은 안 고침 — setItem만 한 곳에서 가로채 자동 업로드.
// ponytail: last-write-wins (여러 기기 동시편집 시 마지막 저장이 이김). 개인용이라 충분.
//          로그인 시 이전 계정 데이터를 비우고 그 계정 것만 복원 → 계정 전환 시 데이터 유출 방지.
var SUPABASE_URL = 'https://fqbpjvycdbicbbshxkyb.supabase.co';
var SUPABASE_KEY = 'sb_publishable_bXR-gFa8AVTBWAn3nOT4HQ_N_bq7kSI';
var ADMIN_EMAIL = 'dbdjvmfos@gmail.com';   // 이 계정만 관리자(메타/카드 갱신 버튼)
var sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

var origSet = localStorage.setItem.bind(localStorage);
var syncTimer = null, currentUid = null;

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

function clearPickupKeys() {
  var rm = [];
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k.indexOf('pickup_manager_') === 0) rm.push(k);
  }
  rm.forEach(function (k) { localStorage.removeItem(k); });
}

// 원격을 성공적으로 받은 뒤에만 로컬을 비우고 그 계정 데이터로 교체한다.
// (네트워크 실패 시엔 로컬을 지우지 않아 데이터 유실 방지)
function loadAccount(uid) {
  return sb.from('user_data').select('data').eq('user_id', uid).maybeSingle()
    .then(function (r) {
      if (r.error) { console.warn('[sync] 복원 실패, 로컬 유지:', r.error.message); return; }
      var blob = (r.data && r.data.data) || {};
      clearPickupKeys();                                                // 이전 계정 데이터 제거
      Object.keys(blob).forEach(function (k) { origSet(k, blob[k]); }); // origSet=복원 중 재업로드 방지
    });
}

function domReady(fn) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
  else fn();
}

// 버전 플래너 공유 설정 — 버전/기간은 게임 공통 사실이라 어드민만 쓰고 전원이 읽는다.
// pickup_manager_ 접두사가 아니므로 유저별 데이터 동기화 대상이 아니다(전역 캐시).
var SHARED_PLANNER_KEY = 'shared_planner_cache';
function fetchSharedPlanner() {
  return sb.from('shared_planner').select('game,version,start_date,end_date').then(function (r) {
    if (r.error || !r.data) return;
    var m = {};
    r.data.forEach(function (row) { m[row.game] = { version: row.version, startDate: row.start_date, endDate: row.end_date || '' }; });
    try { origSet(SHARED_PLANNER_KEY, JSON.stringify(m)); } catch (e) {}
  }, function () {});
}
window.getSharedPlanner = function (game) {
  try { var m = JSON.parse(localStorage.getItem(SHARED_PLANNER_KEY) || '{}'); return m[game] || null; } catch (e) { return null; }
};
window.saveSharedPlanner = function (game, version, startDate, endDate) {
  if (!window.IS_ADMIN) return Promise.resolve();          // 어드민만 (RLS도 이중 방어)
  var m; try { m = JSON.parse(localStorage.getItem(SHARED_PLANNER_KEY) || '{}'); } catch (e) { m = {}; }
  m[game] = { version: version, startDate: startDate, endDate: endDate || '' };
  try { origSet(SHARED_PLANNER_KEY, JSON.stringify(m)); } catch (e) {}
  return sb.from('shared_planner').upsert({ game: game, version: version, start_date: startDate, end_date: endDate || null, updated_at: new Date().toISOString() })
    .then(function (r) { if (r.error) console.warn('[shared planner] 저장 실패:', r.error.message); return r; });
};

function onAuthed(session) {
  if (session.user.id === currentUid) return;   // 같은 계정 재진입은 무시 (중복 init 방지)
  currentUid = session.user.id;
  window.IS_ADMIN = (session.user.email === ADMIN_EMAIL);
  document.body.classList.toggle('is-admin', session.user.email === ADMIN_EMAIL);
  fetchSharedPlanner();   // 병렬, fire-and-forget — 실패/지연해도 로그인은 막지 않음(코드 기본값 폴백)
  loadAccount(currentUid).then(function () {
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
  var g = document.getElementById('authGoogle');
  if (g) g.addEventListener('click', function () {
    showError('');
    sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.href } })
      .then(function (r) { if (r.error) showError(r.error.message); });
  });
  var lo = document.getElementById('logoutBtn');
  if (lo) lo.addEventListener('click', function () { sb.auth.signOut().then(function () { location.reload(); }); });
});

// 로드 시 저장된 세션이 있으면 INITIAL_SESSION, 로그인하면 SIGNED_IN 이벤트로 진입
sb.auth.onAuthStateChange(function (evt, session) {
  if (session) onAuthed(session);
  else if (evt === 'SIGNED_OUT') { currentUid = null; clearPickupKeys(); document.body.classList.remove('is-admin'); }
});
