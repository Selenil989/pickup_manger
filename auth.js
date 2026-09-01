// Supabase 계정 로그인 + 계정별 데이터 동기화.
// localStorage의 pickup_manager_* 뭉치를 유저당 jsonb 한 칸(user_data.data)에 통째로 저장/복원.
// 앱의 기존 저장 로직은 안 고침 — setItem만 한 곳에서 가로채 자동 업로드.
// ponytail: last-write-wins (여러 기기 동시편집 시 마지막 저장이 이김). 개인용이라 충분.
//          로그인 시 이전 계정 데이터를 비우고 그 계정 것만 복원 → 계정 전환 시 데이터 유출 방지.
var SUPABASE_URL = 'https://fqbpjvycdbicbbshxkyb.supabase.co';
var SUPABASE_KEY = 'sb_publishable_bXR-gFa8AVTBWAn3nOT4HQ_N_bq7kSI';
var ADMIN_EMAIL = 'dbdjvmfos@gmail.com';   // 이 계정만 관리자(메타/카드 갱신 버튼)
// flowType 'implicit': OAuth 리턴 시 토큰을 URL 해시로 바로 받음(code 교환 없음).
// PKCE(기본)는 모바일 크롬에서 code_verifier 교환이 실패하는 경우가 있어, 모바일 구글 로그인 안정성을 위해 implicit 사용.
var sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { flowType: 'implicit' } });

var origSet = localStorage.setItem.bind(localStorage);
var syncTimer = null, currentUid = null, loaded = false, dirty = {}, rtChannel = null;   // loaded: 원격 복원 끝나기 전엔 업로드 금지
                                                                        // dirty: 이 기기가 마지막 push 이후 실제로 바꾼 키만 추적. rtChannel: 실시간 구독
// pickup_manager_* 저장을 감지해 디바운스 업로드 (기존 15곳 저장 코드 무수정)
localStorage.setItem = function (k, v) {
  origSet(k, v);
  if (currentUid && loaded && k.indexOf('pickup_manager_') === 0) {
    dirty[k] = true;
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

function _parseArr(s) { try { var a = JSON.parse(s); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function _parseObj(s) { try { var o = JSON.parse(s); return (o && typeof o === 'object' && !Array.isArray(o)) ? o : {}; } catch (e) { return {}; } }
// 보유재화(상태값) 병합 — 필드별 최종수정 시각(_ts) 비교해 더 최근 값 채택.
// → 낡은 기기가 올려도 자기가 안 바꾼 재화는 서버(최근) 값 유지, 각자 다른 재화 동시수정도 둘 다 보존.
function mergeCurrency(serverVal, localVal) {
  var s = _parseObj(serverVal), l = _parseObj(localVal);
  var sT = s._ts || {}, lT = l._ts || {};
  var out = {}, oT = {}, ids = {};
  Object.keys(s).forEach(function (k) { if (k !== '_ts') ids[k] = 1; });
  Object.keys(l).forEach(function (k) { if (k !== '_ts') ids[k] = 1; });
  Object.keys(ids).forEach(function (k) {
    var st = sT[k] || 0, lt = lT[k] || 0;
    if (lt > st) { out[k] = l[k]; oT[k] = lt; }                    // 로컬이 더 최근 편집
    else { out[k] = (k in s) ? s[k] : l[k]; oT[k] = st || lt; }    // 동률/서버최근 → 서버 우선(낡은 로컬 클로버 방지)
  });
  out._ts = oT;
  return JSON.stringify(out);
}
// 원장(append형) 병합: 서버+로컬을 ts 기준 합집합 → 한 항목도 안 버림(다른 기기 기록 보존)
function mergeLedger(serverVal, localVal) {
  var byTs = {};
  _parseArr(serverVal).forEach(function (e) { if (e && e.ts != null) byTs[e.ts] = e; });
  _parseArr(localVal).forEach(function (e) { if (e && e.ts != null) byTs[e.ts] = e; });
  var out = Object.keys(byTs).map(function (t) { return byTs[t]; }).sort(function (a, b) { return a.ts - b.ts; });
  return JSON.stringify(out);
}
// 삭제 표식(ts 배열) 합집합 — 어느 기기서 지운 것이든 모두 모임 → 삭제가 전파되고 되살아나지 않음
function mergeTombstone(serverVal, localVal) {
  var set = {};
  _parseArr(serverVal).forEach(function (t) { set[t] = 1; });
  _parseArr(localVal).forEach(function (t) { set[t] = 1; });
  return JSON.stringify(Object.keys(set).map(function (t) { return Number(t); }));
}
// 통째 덮어쓰기 금지: 서버 최신을 읽어, 이 기기가 바꾼 키만 병합/적용해 저장.
// → 오래된 기기가 올려도 자기가 안 건드린 키(다른 기기 기록)는 서버 것 그대로 유지.
function pushData() {
  if (!currentUid) return Promise.resolve();
  var keys = Object.keys(dirty);
  if (!keys.length) return Promise.resolve();
  dirty = {};   // 이번 사이클에 반영할 키 캡처(이후 새 변경은 다음 사이클)
  function retry(ks, why) {   // 실패 시 dirty 복구 + 재시도 예약 (재시도 없으면 다음 로그인에 덮여 유실)
    ks.forEach(function (k) { dirty[k] = true; });
    console.warn('[sync] ' + why + ', 5초 뒤 재시도');
    clearTimeout(syncTimer); syncTimer = setTimeout(pushData, 5000);
  }
  return sb.from('user_data').select('data').eq('user_id', currentUid).maybeSingle().then(function (r) {
    if (r.error) { retry(keys, '서버 조회 실패: ' + r.error.message); return false; }
    var server = (r.data && r.data.data) || {};
    keys.forEach(function (k) {
      var lv = localStorage.getItem(k);
      if (lv == null) { delete server[k]; return; }                                          // 로컬에서 삭제된 키
      else if (k.indexOf('pickup_manager_ledgerdel_') === 0) server[k] = mergeTombstone(server[k], lv);  // 삭제표식=합집합
      else if (k.indexOf('pickup_manager_ledger_') === 0) server[k] = mergeLedger(server[k], lv);        // 원장=합집합
      else if (k.indexOf('pickup_manager_currency_') === 0) server[k] = mergeCurrency(server[k], lv);    // 보유재화=필드별 최근값
      else server[k] = lv;                                                                   // 그 외 상태값(플래너 등)=방금 편집한 로컬 우선
    });
    return sb.from('user_data').upsert({ user_id: currentUid, data: server, updated_at: new Date().toISOString() })
      .then(function (rr) { if (rr.error) { retry(keys, '업로드 실패: ' + rr.error.message); return false; } return true; },   // true=성공
            function () { retry(keys, '업로드 예외'); return false; });
  }, function () { retry(keys, '서버 조회 예외'); return false; });
}
// 디바운스 무시하고 즉시 업로드하고 끝날 때까지 기다림 — 불러오기(import) 후 새로고침 전 등에 사용.
window.flushSync = function () { clearTimeout(syncTimer); return pushData(); };

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
  loaded = false;   // 이 계정 원격 복원이 끝날 때까지 로컬 변경분 업로드 금지
  return sb.from('user_data').select('data').eq('user_id', uid).maybeSingle()
    .then(function (r) {
      if (r.error) { console.warn('[sync] 복원 실패, 로컬 유지:', r.error.message); loaded = true; return; }
      var blob = (r.data && r.data.data) || {};
      try { origSet('pickup_local_backup', JSON.stringify({ at: new Date().toISOString(), uid: uid, data: collect() })); } catch (e) {}  // 덮기 직전 로컬 백업(비동기화 키 → 사고 시 복구용)
      clearPickupKeys();                                                // 이전 계정 데이터 제거
      Object.keys(blob).forEach(function (k) { origSet(k, blob[k]); }); // origSet=복원 중 재업로드 방지
      loaded = true;                                                     // 복원 완료 → 이제부터 로컬 변경분 업로드 허용
    }, function (e) { console.warn('[sync] 복원 예외, 로컬 유지:', e && e.message); loaded = true; });  // reject도 로컬 유지+업로드 허용(loaded 멈춤 방지)
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

// 다른 기기가 서버를 바꾸면(Realtime) 로컬에 반영 + 현재 화면 갱신. 내 미저장 편집(dirty)은 안 건드림.
function applyRemote(blob) {
  if (!blob) return;
  var changed = false;
  Object.keys(blob).forEach(function (k) {
    if (k.indexOf('pickup_manager_') !== 0 || dirty[k]) return;   // 내 미저장 편집 보호
    var localVal = localStorage.getItem(k);
    var nextVal;
    if (k.indexOf('pickup_manager_ledgerdel_') === 0) nextVal = mergeTombstone(blob[k], localVal);   // 삭제표식=합집합
    else if (k.indexOf('pickup_manager_ledger_') === 0) nextVal = mergeLedger(blob[k], localVal);     // 원장=합집합
    else if (k.indexOf('pickup_manager_currency_') === 0) nextVal = mergeCurrency(blob[k], localVal); // 보유재화=필드별 최근값
    else nextVal = blob[k];
    if (nextVal !== localVal) { origSet(k, nextVal); changed = true; }   // origSet=재업로드 방지
  });
  if (changed && window.onRemoteSync) { try { window.onRemoteSync(); } catch (e) {} }
}
// 다른 기기 변경분을 보려고 매번 로그아웃/로그인 안 하도록: 탭이 다시 보이거나 포커스되면 서버 최신본을 당겨와 병합.
// Realtime(대시보드 토글) 미설정이어도 "앱 열면 최신"이 되게 하는 확실한 방법.
var _lastPull = 0;
function pullLatest() {
  if (!currentUid || !loaded) return;
  var now = Date.now();
  if (now - _lastPull < 3000) return;   // 3초 스로틀(포커스 연타 방지)
  _lastPull = now;
  sb.from('user_data').select('data').eq('user_id', currentUid).maybeSingle()
    .then(function (r) { if (!r.error && r.data) applyRemote(r.data.data); }, function () {});
}
window.pullLatest = pullLatest;
domReady(function () {
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') pullLatest(); });
  window.addEventListener('focus', pullLatest);
});
// 내 계정(user_data) 행이 바뀌면 알림받아 반영. ⚠️ Supabase 대시보드에서 user_data 테이블 Realtime 켜야 동작(안 켜도 저장 시 병합은 됨).
function subscribeRealtime(uid) {
  try {
    if (rtChannel) { sb.removeChannel(rtChannel); rtChannel = null; }
    rtChannel = sb.channel('ud_' + uid)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_data', filter: 'user_id=eq.' + uid },
        function (payload) { applyRemote(payload && payload.new && payload.new.data); })
      .subscribe();
  } catch (e) { console.warn('[realtime] 구독 실패:', e && e.message); }
}

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
    subscribeRealtime(currentUid);   // 초기 복원 후 실시간 구독 시작
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
