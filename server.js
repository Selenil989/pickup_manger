'use strict';
require('dotenv').config();

const express       = require('express');
const cors          = require('cors');
const OpenAI        = require('openai');
const fs            = require('fs');
const path          = require('path');
const { spawn }     = require('child_process');

const app = express();
const PORT = process.env.PORT || 3001;

// ── AI Provider 설정 ───────────────────────────────────────────────────────────
// AI_PROVIDER=openai     : OpenAI를 직접 호출 (기본값, 기존 방식과 동일)
// AI_PROVIDER=openrouter : OpenRouter 경유로 Claude 등 다른 모델 호출
//
// OpenRouter는 OpenAI 호환 API 스펙을 그대로 따르므로, 기존 `openai` SDK를
// baseURL만 바꿔서 재사용한다 (신규 SDK 의존성 추가 없음).
//
// ⚠️ 검색 관련 이력 (STEP 7-2에서 OpenRouter Web Search Server Tool로 해결됨):
// gpt-4o-search-preview는 OpenAI 자체에 내장된 웹 브라우징이 있어 과거에는
// SYSTEM_PROMPT가 모델에게 "직접 검색하라"고 지시했다. 이제는 provider와
// 무관하게 서버가 OpenRouter의 `openrouter:web_search` 서버 툴을 여러 검색
// 모델(AI_SEARCH_MODELS)에 붙여 먼저 근거 자료를 수집하고(아래
// collectSearchResults), 최종 분석 모델(AI_ANALYSIS_MODEL)에는 "이미 수집된
// 자료"만 넘겨 분석만 맡긴다. openai/openrouter 둘 다 동일하게 동작한다.
const AI_PROVIDER = (process.env.AI_PROVIDER || 'openai').toLowerCase();

function createAIClient() {
  if (AI_PROVIDER === 'openrouter') {
    return {
      client: new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1'
      }),
      // AI_ANALYSIS_MODEL이 새 이름, AI_MODEL은 STEP 7-1 하위호환용 폴백
      model: process.env.AI_ANALYSIS_MODEL || process.env.AI_MODEL || 'anthropic/claude-sonnet-4',
      keyEnvName: 'OPENROUTER_API_KEY'
    };
  }

  // 기본값: openai (기존 방식과 동일한 하위호환 경로)
  return {
    client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    keyEnvName: 'OPENAI_API_KEY'
  };
}

const AI = createAIClient();
const openai = AI.client; // 기존 코드 호환용 별칭
const MODEL  = AI.model;

app.use(cors());
app.use(express.json());

// ── Search Pipeline (OpenRouter Web Search Server Tool) ───────────────────────
// AI가 직접 검색한다고 가정하지 않는다. 서버가 data/aliases/{gameId}.json을
// 읽어 검색 대상 이름/키워드를 구성하고, OpenRouter의 `openrouter:web_search`
// 서버 툴을 여러 검색 모델(AI_SEARCH_MODELS)에 붙여 실제 검색 결과를 수집한
// 뒤, URL 기준 중복 제거·출처별 그룹화까지 마친 evidence만 최종 분석
// 모델(AI_ANALYSIS_MODEL)에 컨텍스트로 전달해 분석만 맡긴다. (STEP 7-2)
//
// Google CSE(:online 서픽스, plugins:[{id:'web'}] 방식)는 사용하지 않는다 —
// OpenRouter 공식 Web Search Server Tool(`tools: [{type: "openrouter:web_search"}]`)로
// 대체되었다.
//
// ⚠️ `openrouter:web_search` 툴은 OpenRouter API 전용이다. AI_PROVIDER=openai로
// 분석 모델을 OpenAI 직접 호출로 설정해도, 검색 단계는 항상 OpenRouter를 통해서만
// 동작해야 하므로 분석용 `openai`(AI.client)와는 별개로 전용 클라이언트를 둔다.
const openrouterSearchClient = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1'
});

const AI_SEARCH_MODELS = (process.env.AI_SEARCH_MODELS || '')
  .split(',').map(s => s.trim()).filter(Boolean);
const AI_SEARCH_MAX_MODELS       = parseInt(process.env.AI_SEARCH_MAX_MODELS, 10) || 2;
const AI_SEARCH_ENGINE           = process.env.AI_SEARCH_ENGINE || 'auto';
const AI_SEARCH_MAX_RESULTS      = parseInt(process.env.AI_SEARCH_MAX_RESULTS, 10) || 5;
const AI_SEARCH_MAX_TOTAL_RESULTS = parseInt(process.env.AI_SEARCH_MAX_TOTAL_RESULTS, 10) || 20;

// 커뮤니티 우선순위: 아카라이브 > 디시인사이드 > Reddit > NGA > Bilibili
// web_search 툴의 allowed_domains 로도 그대로 전달되어 검색 자체를 이 도메인으로 제한한다.
const COMMUNITY_HOSTS = [
  { label: '아카라이브',   match: 'arca.live' },
  { label: '디시인사이드', match: 'gall.dcinside.com' },
  { label: 'Reddit',       match: 'reddit.com' },
  { label: 'NGA',          match: 'nga.cn' },
  { label: 'Bilibili',     match: 'bilibili.com' }
];
const ALLOWED_DOMAINS = COMMUNITY_HOSTS.map(h => h.match);

// 게임별 전무/전광/돌파 등 표기 체계 (검색 키워드 세트 구성용)
const GAME_TERMS = {
  zzz:      { weapon: '전무',        breakthrough: '돌파 M1 M2 M6' },
  hsr:      { weapon: '전광 광추',   breakthrough: '돌파 E1 E2 E6' },
  wuwa:     { weapon: '전무',        breakthrough: '돌파 1돌 2돌 6돌' },
  endfield: { weapon: '전용무기',    breakthrough: '돌파 S1 S5' }
};

// data/aliases/{gameId}.json 로드 — 파일/캐릭터 항목이 없으면 null 반환 (폴백은 호출부에서 처리)
function loadAliasEntry(gameId, characterId) {
  try {
    const filePath = path.join(__dirname, 'data', 'aliases', gameId + '.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return (data.characters && data.characters[characterId]) || null;
  } catch (err) {
    return null;
  }
}

// aliases.json 항목(공식명/영문명/별칭·줄임말) + 클라이언트가 보낸 이름을 합친다
function resolveNames(gameId, characterId, characterName, characterNameKo) {
  const entry = loadAliasEntry(gameId, characterId);
  return {
    official: (entry && entry.official) || characterNameKo || characterName || characterId,
    nameEn:   (entry && entry.nameEn)   || characterName    || characterId,
    aliases:  (entry && entry.aliases)  || []
  };
}

// 검색 모델에게 넘길 프롬프트. 검색 모델은 분석하지 않고 web_search 도구만
// (필요한 만큼 여러 번) 호출해 관련 게시물을 찾는 역할만 수행한다.
function buildSearchPrompt(gameId, names) {
  const terms = GAME_TERMS[gameId] || { weapon: '전용 무기', breakthrough: '돌파' };
  const nameCandidates = Array.from(new Set([names.official, names.nameEn].concat(names.aliases).filter(Boolean)));

  return [
    '당신은 검색 실행 전용 모델입니다. 의견이나 분석을 작성하지 마세요.',
    'web_search 도구를 필요한 만큼 여러 번 호출해 아래 캐릭터에 대한 커뮤니티 게시물을 최대한 다양하게 찾으세요.',
    '',
    '검색 대상 이름(공식 한글명/영문명/별칭/줄임말): ' + nameCandidates.join(', '),
    '',
    '검색할 키워드 조합:',
    '  일반  : 실사용 후기, 성능, 평가, 조합, 단점',
    '  무기  : ' + terms.weapon,
    '  돌파  : ' + terms.breakthrough,
    '',
    '이름 후보와 키워드를 조합해 여러 번 검색하세요 (예: "이름 실사용 후기", "이름 ' + terms.weapon + '").',
    '검색 결과에 대한 요약, 평가, 의견은 절대 작성하지 마세요. 검색만 수행하면 됩니다.'
  ].join('\n');
}

// OpenRouter 응답의 url_citation annotations에서 URL/제목/내용을 추출한다.
// 스키마 변형에 대비해 nested(url_citation.*)와 flat(annotation.*) 양쪽을 모두 시도한다.
function extractCitations(message) {
  if (!message || !Array.isArray(message.annotations)) return [];
  const out = [];
  for (const ann of message.annotations) {
    if (ann.type !== 'url_citation') continue;
    const c = ann.url_citation || ann;
    if (!c || !c.url) continue;
    out.push({
      url:     c.url,
      title:   c.title || '',
      content: c.content || c.text || c.snippet || ''
    });
  }
  return out;
}

// URL의 호스트로 우선순위 커뮤니티인지 판별. 5개 커뮤니티 외 출처는 null(제외)
function detectSource(url) {
  try {
    const host = new URL(url).hostname;
    for (const c of COMMUNITY_HOSTS) {
      if (host.includes(c.match)) return c.label;
    }
    return null;
  } catch (err) {
    return null;
  }
}

// URL 기준 중복 제거용 정규화 (호스트+경로, 끝 슬래시/대소문자 무시)
function normalizeUrl(url) {
  try {
    const u = new URL(url);
    return (u.hostname + u.pathname).replace(/\/+$/, '').toLowerCase();
  } catch (err) {
    return url;
  }
}

// 검색 모델 1개를 실행해 openrouter:web_search 서버 툴로 수집된 자료를
// {source, title, url, content, query, searchModel} 형태로 정리해 반환한다.
// 개별 검색 모델이 실패해도 예외를 던지지 않고 빈 배열을 반환한다(요구사항 9).
async function runSearchModel(modelId, gameId, names) {
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('[검색 모델 오류] ' + modelId + ': OPENROUTER_API_KEY가 설정되지 않았습니다.');
    return [];
  }
  try {
    const completion = await openrouterSearchClient.chat.completions.create({
      model: modelId,
      messages: [{ role: 'user', content: buildSearchPrompt(gameId, names) }],
      tools: [{
        type: 'openrouter:web_search',
        parameters: {
          engine:            AI_SEARCH_ENGINE,
          max_results:       AI_SEARCH_MAX_RESULTS,
          max_total_results: AI_SEARCH_MAX_TOTAL_RESULTS,
          allowed_domains:   ALLOWED_DOMAINS
        }
      }]
    });

    const message   = completion.choices && completion.choices[0] && completion.choices[0].message;
    const citations = extractCitations(message);

    const items = [];
    for (const c of citations) {
      const source = detectSource(c.url);
      if (!source) continue; // 5개 우선순위 커뮤니티 외 출처는 근거로 사용하지 않음
      items.push({
        source:      source,
        title:       c.title,
        url:         c.url,
        content:     c.content,
        query:       '실사용 후기/성능/전무/돌파 통합검색',
        searchModel: modelId
      });
    }
    return items;
  } catch (err) {
    console.error('[검색 모델 오류] ' + modelId + ': ' + err.message);
    return []; // 이 모델만 실패 처리 — 나머지 검색 모델 결과로 계속 진행
  }
}

// AI_SEARCH_MODELS 중 AI_SEARCH_MAX_MODELS개까지 병렬 실행 → 병합 →
// URL 기준 중복 제거 → 출처별 그룹화로 evidenceStrength(복수/단일) 표기.
async function collectSearchResults(gameId, names) {
  const models = AI_SEARCH_MODELS.slice(0, AI_SEARCH_MAX_MODELS);
  if (models.length === 0) return [];

  const settled = await Promise.allSettled(models.map(m => runSearchModel(m, gameId, names)));
  const merged = [];
  for (const r of settled) {
    if (r.status === 'fulfilled') merged.push(...r.value);
    // rejected는 이미 runSearchModel 내부에서 잡아 [] 로 처리되므로 도달하지 않음(안전망)
  }

  // URL 기준 중복 제거 (동일 게시물) — 먼저 발견된 항목을 유지
  const seen = new Map();
  for (const item of merged) {
    const key = normalizeUrl(item.url);
    if (!seen.has(key)) seen.set(key, item);
  }
  const deduped = Array.from(seen.values());

  // 출처별 그룹화 → 단일 게시글 과대반영 방지용 근거 강도(복수/단일) 표기
  const countBySource = {};
  for (const r of deduped) countBySource[r.source] = (countBySource[r.source] || 0) + 1;
  for (const r of deduped) {
    r.evidenceStrength = countBySource[r.source] >= 2 ? '복수' : '단일';
  }

  return deduped;
}

// ── System Prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = [
  '당신은 가챠 게임 커뮤니티 기반 투자 분석 전문가입니다.',
  '목적: "이 캐릭터를 지금 내 계정에 뽑을 가치가 있는가?"',
  '',
  '=== 역할 ===',
  '공식 스킬 설명을 요약하는 AI가 아닙니다.',
  '당신은 검색을 직접 수행하지 않습니다. 서버가 아카라이브/디시인사이드/Reddit/NGA/Bilibili에서',
  '이미 검색을 수행해 사용자 메시지의 "수집된 커뮤니티 자료" 섹션으로 전달합니다.',
  '당신의 역할은 그 자료를 읽고 투자 분석 리포트로 정리하는 것뿐입니다.',
  '사용자가 원하는 것은 "그래서 지금 뽑아야 하나?" 에 대한 판단입니다.',
  '',
  '=== 절대 금지 ===',
  '"수집된 커뮤니티 자료"에 없는 내용을 지어내거나 추측해서 작성 금지',
  '"수집된 커뮤니티 자료"에 없는 게시물을 실제로 검색된 것처럼 sources 에 만들어내지 않는다',
  '공식 홈페이지 / 공식 스킬 설명 요약 금지 — 그것은 이 AI의 역할이 아닙니다',
  '티어 점수 · 랭킹 수치를 근거로 사용 금지 (티어표 사이트는 애초에 서버가 걸러서 전달하지 않는다)',
  'evidenceStrength 가 "단일" 로 표기된 항목만으로 pros/cons 를 구성 금지 — "복수" 로 표기된 항목을 우선 사용',
  '정보가 부족할 때 추측으로 채우는 것 금지 → 대신 uncertainty 상승',
  '출처 없는 주장 금지',
  '',
  '=== 정보 부족 처리 규칙 ===',
  '"수집된 커뮤니티 자료"가 비어 있거나 부족하면 해당 필드에 "충분한 커뮤니티 의견 없음" 으로 명시',
  '모르면 추측하지 않고 uncertainty.score 를 올린다',
  '',
  '반드시 JSON만 반환하세요. 마크다운 코드블록 없이 순수 JSON만 응답하세요.'
].join('\n');

// ── Prompt Builder ────────────────────────────────────────────────────────────

function formatSearchResultsBlock(searchResults) {
  if (!searchResults || searchResults.length === 0) {
    return [
      '=== 수집된 커뮤니티 자료 ===',
      '(검색 결과 없음 — AI_SEARCH_MODELS 미설정이거나 검색된 게시물이 없습니다.)',
      '이 경우 communitySummary 의 모든 필드는 "충분한 커뮤니티 의견 없음"으로 작성하고,',
      'uncertainty.score 는 최소 7 이상으로 설정하세요.'
    ].join('\n');
  }

  const byQuery = {};
  for (const r of searchResults) {
    if (!byQuery[r.query]) byQuery[r.query] = [];
    byQuery[r.query].push(r);
  }

  const lines = ['=== 수집된 커뮤니티 자료 (OpenRouter 검색 모델이 사전 검색 완료) ===',
    '아래 목록에 없는 내용은 절대 사용하지 마세요. 목록에 없으면 sources 를 비우고 uncertainty 를 높이세요.', ''];

  for (const topic of Object.keys(byQuery)) {
    lines.push('[검색어: ' + topic + ']');
    byQuery[topic].forEach((r, i) => {
      lines.push(
        (i + 1) + '. [' + r.source + ' / 근거강도: ' + r.evidenceStrength + ' / 검색모델: ' + r.searchModel + '] ' + r.title +
        '\n   URL: ' + r.url +
        '\n   내용: ' + r.content
      );
    });
    lines.push('');
  }

  return lines.join('\n');
}

function buildPrompt(gameId, characterId, characterName, characterNameKo, searchResults) {
  var koName  = characterNameKo || characterName || characterId;
  var enName  = characterName   || characterId;

  return [
    '=== 분석 대상 ===',
    '게임        : ' + gameId,
    '캐릭터 ID   : ' + characterId,
    '영문 이름   : ' + enName,
    '한국어 이름 : ' + koName,
    '',
    formatSearchResultsBlock(searchResults),
    '',
    '=== communitySummary — 가챠 투자 리포트 ===',
    '"이 캐릭터를 지금 뽑아야 하는가?" — 이 질문에 답하는 투자 리포트를 작성한다.',
    '위 "수집된 커뮤니티 자료"에서 확인한 내용만 작성한다. 확인되지 않은 내용은 해당 필드에 "충분한 커뮤니티 의견 없음"으로 표시한다.',
    '이 프롬프트의 문장을 그대로 복사하거나 변형하여 communitySummary 에 작성하지 않는다.',
    '',
    '분석 목표: 뽑을 가치 / 스킵 이유 / 복각 희소성 / 메타 위치 / 명함 vs 전무 / 투자 우선순위',
    '무시할 자료: 빌드 가이드 / 스킬 메커니즘 / 장비 추천 / 세팅 공략 / 코스튬 / 외형 관련',
    '혼합 자료: 투자 의견이 포함된 경우 그 부분만 추출',
    '',
    'metaPosition    : 현재 투자 가치 위치 1문장 — 위 수집된 자료에서 확인한 내용만 작성',
    'pros            : 지금 뽑아야 하는 이유 (배열, 최대 3개)',
    '                  기준: 메타 독점성 / 복각 희소성 / 미래 시너지 / 투자 효율',
    '                  없으면 빈 배열 []',
    'cons            : 뽑지 않아도 되는 이유 (배열, 최대 3개)',
    '                  기준: 대체 캐릭터 존재 / 역할 중복 / 조만간 복각 / 투자 우선순위 낮음',
    '                  없으면 빈 배열 []',
    'concerns        : cons 와 다른 별도 투자 우려 1문장',
    '                  기준: 복각 주기 불명확 / 미래 메타 불확실 / 시너지 파티 부재',
    '                  없으면 "주요 우려 없음"',
    'investmentNote  : 투자 한줄평 — 명함으로 충분한가 / 전무까지 필요한가 / 스킵 가능한가',
    '                  위 수집된 자료에서 확인된 의견만 작성. 확인 불가시 "투자 수준 의견 없음"',
    'commonEvaluation: 복수 커뮤니티 공통 투자 판단 의견 1문장',
    '                  해당 없으면 "충분한 커뮤니티 의견 없음"',
    '',
    '=== uncertainty 계산 규칙 ===',
    '아래 항목 각 해당 시 점수를 더하거나 뺀다 (합산):',
    '  수집된 커뮤니티 게시물 5개 미만          : +3',
    '  커뮤니티 긍정/부정 의견 비율 비슷         : +2',
    '  미출시 또는 출시 1개월 이내               : +2',
    '  한국어/영어/중국어 자료 모두 부족         : +2',
    '  최근 패치로 인해 평가가 변동 중           : +1',
    '  출시 3개월 이상 + 복수 패치 후에도 메타 위치 안정적 : -1 (score 계산에만 반영, reasons 에 기재 금지)',
    '출시 완료 + 장기 검증 + 평가 안정 캐릭터는 최종 score 를 0~2 범위로 제한한다.',
    '최종 score 가 0 미만이면 0으로, 10 초과이면 10으로 설정',
    '계산 결과를 score 에 기입하고, 가산(+) 항목만 reasons 배열에 기입 (감점 보정 항목은 reasons 에서 제외)',
    '수집된 커뮤니티 자료가 0건이면 uncertainty.score 는 최소 7 이상으로 설정한다.',
    '수집된 자료가 충분하지 않은데 uncertainty 를 낮게 계산하지 않는다.',
    '',
    '=== uncertainty 일관성 기준 ===',
    'uncertainty.score 는 communitySummary 내용과 반드시 일치해야 한다:',
    '  0~2 : 다수 커뮤니티 의견 일치 → pros/cons 각 2개 이상 필수',
    '  3~4 : 일부 불확실 → commonEvaluation 에 불확실성 표현 포함',
    '  5~6 : 정보 부족 또는 의견 대립 → pros/cons 각 1개 이하로 제한',
    '  7 이상 : 커뮤니티 접근 불가 또는 미출시 → commonEvaluation 반드시 "충분한 커뮤니티 의견 없음"',
    'score 와 communitySummary 내용이 불일치하면 score 를 올린다',
    '',
    '=== fomoRisk 판단 규칙 ===',
    'FOMO 는 캐릭터 강도가 아니라 아래 기준으로 판단:',
    '  계정 내 역할 대체 캐릭터 없음      : +3',
    '  복각 주기가 길거나 첫 복각 미정    : +2',
    '  향후 출시 예정 캐릭터와 시너지     : +2',
    '  지금 미획득 시 콘텐츠 진행 지연    : +2',
    '  이미 역할 대체 캐릭터 보유         : -3',
    '  가까운 시일 내 복각 예정           : -2',
    '합산 결과(0~10)를 score 에 기입하고 판단 근거를 reason 에 1문장으로 기입',
    '',
    '아래 JSON 구조를 그대로 채워서 순수 JSON만 반환하세요.',
    '',
    '{',
    '  "communitySummary": {',
    '    "metaPosition": "현재 투자 가치 위치 1문장",',
    '    "commonEvaluation": "복수 커뮤니티 공통 투자 판단 의견 1문장",',
    '    "pros": ["지금 뽑아야 하는 이유"],',
    '    "cons": ["뽑지 않아도 되는 이유"],',
    '    "concerns": "별도 투자 우려 1문장",',
    '    "investmentNote": "투자 한줄평 (명함/전무/스킵)"',
    '  },',
    '  "uncertainty": {',
    '    "score": 0,',
    '    "reasons": ["해당된 불확실 요인"]',
    '  },',
    '  "fomoRisk": {',
    '    "score": 0,',
    '    "reason": "FOMO 판단 근거 1문장 (대체 가능성/복각/시너지 기준)"',
    '  },',
    '  "sources": [',
    '    {"type": "community", "title": "출처 이름", "reason": "이 출처를 사용한 근거"}',
    '  ]',
    '}'
  ].join('\n');
}

// ── JSON Extractor ────────────────────────────────────────────────────────────

function extractJson(text) {
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) return JSON.parse(codeBlock[1].trim());

  const jsonBlock = text.match(/\{[\s\S]*\}/);
  if (jsonBlock) return JSON.parse(jsonBlock[0]);

  throw new Error('응답에서 JSON을 추출할 수 없습니다.');
}

// ── /api/meta-update ──────────────────────────────────────────────────────────

app.post('/api/meta-update', async (req, res) => {
  const { gameId, characterId, characterName, characterNameKo } = req.body || {};

  if (!gameId || !characterId) {
    return res.status(400).json({ error: 'gameId와 characterId가 필요합니다.' });
  }
  if (gameId !== 'zzz') {
    return res.status(400).json({ error: '현재 ZZZ 게임만 지원합니다.' });
  }

  console.log('[메타 업데이트] 시작 — 게임: %s / 캐릭터: %s(%s) / 모델: %s',
    gameId, characterId, characterNameKo || characterName || '', MODEL);

  try {
    const names = resolveNames(gameId, characterId, characterName, characterNameKo);
    const searchResults = await collectSearchResults(gameId, names);

    console.log('[메타 업데이트] 검색 결과 — %s건 (근거: %s)',
      searchResults.length,
      searchResults.length ? Array.from(new Set(searchResults.map(r => r.source))).join(', ') : '없음');

    const completion = await openai.chat.completions.create({
      model:    MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: buildPrompt(gameId, characterId, names.nameEn, names.official, searchResults) }
      ],
    });

    const raw     = completion.choices[0].message.content;
    const preview = extractJson(raw);

    const required = ['communitySummary', 'uncertainty', 'fomoRisk', 'sources'];
    for (const key of required) {
      if (!preview[key]) throw new Error('필수 필드 누락: ' + key);
    }

    console.log('[메타 업데이트] 완료 — %s', characterId);
    res.json({ success: true, preview });

  } catch (err) {
    console.error('[메타 업데이트 오류]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── /api/meta-update-claude-code (로컬 Claude Code 구독 기반 메타 갱신) ────────
// OpenRouter API 과금이 아니라, 이 컴퓨터에 로그인된 Claude Pro/Max 구독 인증을
// 사용한다. Claude Code는 검색(WebSearch/WebFetch)과 분석만 수행하고 구조화된
// JSON만 반환한다 — 프로젝트 파일을 직접 읽거나 수정하지 않는다. 실제 파일 검증
// 및 meta.json 저장은 이 서버가 전담한다.

const ALLOWED_GAME_IDS = ['zzz', 'hsr', 'wuwa', 'endfield'];

let claudeCodeJobRunning = false; // 동시 실행 방지용 뮤텍스 (프로세스 내 단일 플래그)

function loadCharactersFile(gameId) {
  const filePath = path.join(__dirname, 'data', 'games', gameId, 'characters.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadMetaFile(gameId) {
  const filePath = path.join(__dirname, 'data', 'games', gameId, 'meta.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// Windows에서는 npm 전역 설치 시 <command>.cmd 셔임(shim)만 CreateProcess로 직접
// 실행 불가능한 배치 스크립트이므로 shell:true 가 필요하다(Node 자체의 알려진
// 제약). exec()나 문자열 결합 없이 spawn()의 인자 배열 + shell:true 조합을 쓰면
// Node 18.20.2/20.12.2+(CVE-2024-27980 패치 버전)부터 각 인자가 안전하게
// 이스케이프되므로 셸 인젝션 위험이 없다. 이 프로젝트는 Node 22 기준.
function resolveClaudeCommand() {
  const configured = process.env.CLAUDE_CODE_COMMAND || 'claude';
  if (process.platform === 'win32' &&
      !/\.(cmd|exe|bat)$/i.test(configured)) {
    return configured + '.cmd';
  }
  return configured;
}

// Claude Code 자식 프로세스에는 ANTHROPIC_API_KEY 등 API 과금 관련 환경변수를
// 절대 전달하지 않는다 — 목적은 API 과금이 아니라 로그인된 구독 인증 사용.
// 주의: 이건 이 자식 프로세스로 넘어가는 env 객체만 걸러내는 것이며, 실제 .env
// 파일이나 부모 프로세스(server.js)의 환경변수 자체는 전혀 건드리지 않는다.
function sanitizeChildEnv() {
  const env = Object.assign({}, process.env);
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;
  delete env.ANTHROPIC_BASE_URL;
  return env;
}

function spawnClaudeCode(args) {
  const command = resolveClaudeCommand();
  const useShell = process.platform === 'win32';
  return spawn(command, args, {
    cwd: __dirname, // 프로젝트 루트를 cwd로 사용
    shell: useShell,
    windowsHide: true,
    env: sanitizeChildEnv()
  });
}

// Windows에서는 shell:true 로 인해 실제 프로세스 트리가
// cmd.exe → <command>.cmd(또 다른 cmd.exe) → 실제 실행 파일 순으로 중첩된다.
// child.kill()은 최상위 cmd.exe만 종료시키고 하위 프로세스를 고아로 남긴다
// (taskkill 없이 직접 검증해 확인된 실제 버그) — 반드시 /T(트리 전체) 옵션의
// taskkill로 종료해야 한다. 그 외 플랫폼은 child.kill()로 충분하다(POSIX
// 프로세스 그룹 시그널이 자식에게도 전파됨).
function terminateClaudeCodeProcess(child) {
  if (process.platform === 'win32' && child.pid) {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
  } else {
    child.kill();
  }
}

function checkClaudeCodeInstalled() {
  return new Promise((resolve) => {
    let settled = false;
    let child;
    try {
      child = spawnClaudeCode(['--version']);
    } catch (err) {
      resolve({ ok: false });
      return;
    }
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      terminateClaudeCodeProcess(child);
      resolve({ ok: false });
    }, 15000);
    child.on('error', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: false });
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: code === 0 });
    });
  });
}

function checkClaudeCodeAuth() {
  return new Promise((resolve) => {
    let stdout = '';
    let settled = false;
    let child;
    try {
      child = spawnClaudeCode(['auth', 'status', '--json']);
    } catch (err) {
      resolve({ ok: false });
      return;
    }
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      terminateClaudeCodeProcess(child);
      resolve({ ok: false });
    }, 15000);
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.on('error', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: false });
    });
    child.on('close', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        const status = JSON.parse(stdout);
        resolve({ ok: !!status.loggedIn, status });
      } catch (err) {
        resolve({ ok: false });
      }
    });
  });
}

// Claude Code에게 넘길 프롬프트. 검색/분석만 지시하고 파일 수정 권한이 아예
// 없다는 점(WebSearch/WebFetch만 허용됨)을 명시해 역할을 분명히 한다.
function buildClaudeCodePrompt(gameId, characterId, names, existingEntry) {
  const terms = GAME_TERMS[gameId] || { weapon: '전용 무기', breakthrough: '돌파' };
  const nameCandidates = Array.from(new Set(
    [names.official, names.nameEn].concat(names.aliases).filter(Boolean)
  ));

  return [
    '당신은 가챠 게임 커뮤니티 기반 캐릭터 메타 분석 전문가입니다.',
    '이 작업에서 당신은 WebSearch/WebFetch 도구로 실제 커뮤니티 자료를 조사하고 분석하는 역할만 수행합니다.',
    '프로젝트 파일을 읽거나 수정하지 않습니다 — 결과는 오직 지정된 JSON 스키마로만 반환하세요.',
    '',
    '=== 분석 대상 ===',
    '게임 ID     : ' + gameId,
    '캐릭터 ID   : ' + characterId + '  (반드시 이 값 그대로 결과의 characterId 에 사용)',
    '이름 후보(공식 한글명/영문명/별칭/줄임말): ' + (nameCandidates.length ? nameCandidates.join(', ') : characterId),
    '',
    existingEntry
      ? ('=== 기존 meta 항목 (참고용 — 그대로 복사하지 말고 최신 자료로 갱신) ===\n' + JSON.stringify(existingEntry, null, 2))
      : '=== 기존 meta 항목 없음 (신규 작성) ===',
    '',
    '=== 검색 우선순위 ===',
    '1. 아카라이브   2. 디시인사이드   3. Reddit   4. NGA   5. Bilibili',
    '',
    '=== 검색할 내용 ===',
    '실사용 후기, 현재 메타 평가, 장점, 단점, 조합, 대체 가능성, 미래 가치,',
    terms.weapon + ' 가치, ' + terms.breakthrough,
    '',
    '=== 실행 예산 (반드시 준수) ===',
    'WebSearch/WebFetch 호출은 총 10회 이내로 제한합니다.',
    '우선순위가 높은 출처(1~2번)부터 조사하고, 그 안에서 유의미한 의견이 반복 확인되면',
    '나머지 출처는 생략해도 됩니다 — 5개 출처를 전부 조사할 필요는 없습니다.',
    '10회 이내로 확인한 자료만으로 반드시 최종 JSON을 완성해 반환하세요 (추가 조사를 위해 계속 검색하지 않음).',
    '조사량이 적었다면 그만큼 confidence 를 낮추고 uncertainty.score 를 높여서 솔직하게 반영하세요.',
    '',
    '=== 분석 규칙 (반드시 준수) ===',
    '공식 스킬 설명 중심 요약 금지',
    '단일 게시글 의견을 대표 의견으로 사용 금지 — 서로 다른 게시글에서 반복 확인된 의견만 반영',
    '계정 체급이나 사용자 보유 캐릭터 기준 평가 금지 — 캐릭터 자체 메타 가치만 평가',
    '근거가 부족하면 confidence 를 낮추고 uncertainty.score 를 높여 솔직하게 표현 (추측으로 채우지 않음)',
    '실제로 WebSearch/WebFetch 로 확인한 URL만 sources 에 기록 — 가상의 URL을 만들어내지 않음',
    '검색하지 않은 사실을 추측해서 채우지 않음',
    '',
    '=== 반환 형식 (매우 중요) ===',
    '조사를 마친 뒤, 다른 설명이나 마크다운 코드블록 없이 아래 구조와 정확히 일치하는',
    '순수 JSON 객체 하나만 출력하세요 (앞뒤에 다른 텍스트를 붙이지 않음):',
    '',
    JSON.stringify({
      characterId: characterId + ' (고정값, 반드시 이 문자열 그대로)',
      version: '"1.0" 같은 버전 문자열',
      investmentType: ['meta 또는 future 등 문자열 배열'],
      metaScore: '0~10 숫자',
      futureScore: '0~10 숫자',
      replacementScore: '0~10 숫자',
      confidence: '0~1 숫자',
      characterRecommendation: { score: '0~10', priority: 'high|medium|low', reason: '문자열' },
      breakthroughRecommendation: { score: '0~10', priority: 'high|medium|low', reason: '문자열' },
      weaponRecommendation: { score: '0~10', priority: 'high|medium|low', reason: '문자열' },
      pullReasons: ['문자열 배열'],
      skipReasons: ['문자열 배열'],
      sources: [{ name: '아카라이브 등 출처명', url: '실제로 확인한 URL (필수)', weight: '0~1 숫자' }],
      officialSummary: { sourceSummary: '문자열', skillSummary: '문자열', synergySummary: '문자열' },
      communitySummary: { positive: ['문자열 배열'], negative: ['문자열 배열'], commonOpinion: '문자열', concern: '문자열' },
      uncertainty: { score: '0~10', reasons: ['문자열 배열'] },
      fomoRisk: { score: '0~10', reason: '문자열' },
      recommendation: { pull: 'must_pull|recommended|optional|skip', priority: 'high|medium|low' }
    }, null, 2),
    '',
    '위 내용을 조사한 뒤, characterId="' + characterId + '" 항목 1개에 대한 위 구조의 JSON만 반환하세요.'
  ].join('\n');
}

// stdout/stderr 텍스트에서 구독 사용량 한도 초과로 보이는 신호를 찾아 사용자
// 친화적 메시지로 변환한다. 정확한 오류 스키마를 사전에 알 수 없으므로 방어적으로
// 키워드 매칭만 수행하고, 매칭 실패 시 CLI가 준 원문 일부를 그대로 노출한다.
function describeClaudeCodeFailure(outerResult, stderrText) {
  const haystack = (JSON.stringify(outerResult || {}) + '\n' + (stderrText || '')).toLowerCase();
  if (haystack.indexOf('usage limit') !== -1 || haystack.indexOf('rate limit') !== -1 ||
      haystack.indexOf('quota') !== -1 || haystack.indexOf('사용량') !== -1) {
    return 'Claude 구독 사용량 한도에 도달했습니다.';
  }
  const snippet = (outerResult && (outerResult.result || outerResult.error)) || stderrText || '알 수 없는 오류';
  return 'Claude Code 실행 중 오류가 발생했습니다: ' + String(snippet).slice(0, 300);
}

// Claude Code를 print(비대화형) 모드로 1회 실행한다. 프롬프트는 exec()나 문자열
// 결합 없이 stdin으로 전달한다 (셸 인젝션 표면을 만들지 않는다).
//
// 참고: 실측 결과 --json-schema 옵션을 WebSearch/WebFetch 도구 허용과 함께 쓰면
// 설치된 Claude Code CLI(2.1.160)가 아무 출력도 없이 무한 대기하는 현상을 확인했다
// (동일 프롬프트에서 --json-schema만 제거하면 정상적으로 수 초~수십 초 내 완료됨 —
// stream-json으로 라이브 진단해 SessionStart 훅조차 뜨지 않는 완전한 무응답을 확인).
// 그래서 --json-schema는 사용하지 않고, 대신 buildClaudeCodePrompt에 원하는 JSON
// 구조를 텍스트로 명시해 순수 JSON 텍스트로 받은 뒤 extractJson()으로 파싱하고,
// validateMetaEntry()에서 동일한 수준으로 엄격하게 서버 측 검증한다.
function runClaudeCode(prompt) {
  const model     = process.env.CLAUDE_CODE_MODEL || 'sonnet';
  const timeoutMs = parseInt(process.env.CLAUDE_CODE_TIMEOUT_MS, 10) || 600000;

  // 참고: --max-turns 는 설치된 Claude Code CLI(`claude --help`로 확인)에 존재하지
  // 않는 옵션이라 생략했다. 대신 CLAUDE_CODE_TIMEOUT_MS 로 실행 시간 상한을 둔다.
  const args = [
    '-p',
    '--output-format', 'json',
    '--permission-mode', 'dontAsk',
    '--allowedTools', 'WebSearch', 'WebFetch',
    '--no-session-persistence',
    '--model', model
  ];

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    let child;

    try {
      child = spawnClaudeCode(args);
    } catch (err) {
      resolve({ ok: false, userMessage: 'Claude Code가 설치되어 있지 않습니다.' });
      return;
    }

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      terminateClaudeCodeProcess(child);
      resolve({ ok: false, userMessage: 'Claude Code 실행 시간이 초과되었습니다.' });
    }, timeoutMs);

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('error', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: false, userMessage: 'Claude Code가 설치되어 있지 않습니다.' });
    });

    child.on('close', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      let outer;
      try {
        outer = JSON.parse(stdout);
      } catch (err) {
        resolve({ ok: false, userMessage: 'Claude Code 응답을 해석할 수 없습니다.' });
        return;
      }

      if (outer.is_error) {
        resolve({ ok: false, userMessage: describeClaudeCodeFailure(outer, stderr) });
        return;
      }

      let structuredOutput;
      try {
        structuredOutput = extractJson(String(outer.result || ''));
      } catch (err) {
        resolve({ ok: false, userMessage: 'Claude Code가 구조화된 결과를 반환하지 않았습니다.' });
        return;
      }

      resolve({ ok: true, structuredOutput: structuredOutput, raw: outer });
    });

    try {
      child.stdin.write(prompt, 'utf8');
      child.stdin.end();
    } catch (err) {
      // stdin 쓰기 실패는 close/error 이벤트로 이어져 위에서 처리됨
    }
  });
}

// Claude Code 응답 텍스트에서 추출한 JSON을 프로젝트 meta.json 스키마 기준으로
// 검증한다. 통과한 경우에만 저장 가능한 정리된 엔트리를 함께 반환한다.
// gachaGuide는 기존 meta 스키마와 완전히 분리된 선택 필드다. 없으면 그냥 생략되고,
// 있는데 형식이 잘못됐으면 저장 전체를 막지 않고 gachaGuide만 안전하게 제거한다 —
// 핵심 투자 판단 필드(metaScore 등)는 gachaGuide 없이도 완결되므로 이 필드 하나
// 때문에 나머지 정상 데이터까지 저장 실패시킬 이유가 없다.
function validateGachaGuide(guide) {
  if (guide === undefined || guide === null) return { ok: true, value: undefined };
  if (typeof guide !== 'object' || Array.isArray(guide)) return { ok: false };

  function isNonEmptyString(v) { return typeof v === 'string' && v.length > 0; }
  function isStringArray(v) { return Array.isArray(v) && v.every((x) => typeof x === 'string'); }

  const keyFeatures = Array.isArray(guide.keyFeatures) ? guide.keyFeatures : [];
  for (const f of keyFeatures) {
    if (!f || !isNonEmptyString(f.title) || !isNonEmptyString(f.description)) return { ok: false };
  }

  const partyRequirements = Array.isArray(guide.partyRequirements) ? guide.partyRequirements : [];
  for (const r of partyRequirements) {
    if (!r || ['all', 'one_of', 'role'].indexOf(r.type) === -1) return { ok: false };
    if (!isStringArray(r.characterIds || [])) return { ok: false };
    if (!isStringArray(r.roles || [])) return { ok: false };
    if (!isNonEmptyString(r.description)) return { ok: false };
  }

  // corePartners: 시스템상 필수는 아니지만(그건 partyRequirements의 역할) 실전
  // 파티 성능에서 핵심으로 평가되는 캐릭터. 검증 형태는 alternativePartners와 동일.
  const corePartners = Array.isArray(guide.corePartners) ? guide.corePartners : [];
  for (const p of corePartners) {
    if (!p) return { ok: false };
    if (!isStringArray(p.characterIds || [])) return { ok: false };
    if (!isStringArray(p.roles || [])) return { ok: false };
    if (!isNonEmptyString(p.description)) return { ok: false };
  }

  const alternativePartners = Array.isArray(guide.alternativePartners) ? guide.alternativePartners : [];
  for (const p of alternativePartners) {
    if (!p) return { ok: false };
    if (!isStringArray(p.characterIds || [])) return { ok: false };
    if (!isStringArray(p.roles || [])) return { ok: false };
    if (!isNonEmptyString(p.description)) return { ok: false };
  }

  const alternativeEquipment = Array.isArray(guide.alternativeEquipment) ? guide.alternativeEquipment : [];
  for (const e of alternativeEquipment) {
    if (!e || !isNonEmptyString(e.name) || !isNonEmptyString(e.description)) return { ok: false };
  }

  if (!isStringArray(guide.recommendedFor || [])) return { ok: false };
  if (!isStringArray(guide.reconsiderIf || [])) return { ok: false };

  return {
    ok: true,
    value: {
      version: isNonEmptyString(guide.version) ? guide.version : '1.0',
      keyFeatures: keyFeatures,
      partyRequirements: partyRequirements,
      corePartners: corePartners,
      alternativePartners: alternativePartners,
      alternativeEquipment: alternativeEquipment,
      recommendedFor: guide.recommendedFor || [],
      reconsiderIf: guide.reconsiderIf || []
    }
  };
}

function validateMetaEntry(entry, characterId) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return { ok: false, reason: '결과가 객체가 아닙니다.' };
  }
  if (entry.characterId !== characterId) {
    return { ok: false, reason: 'characterId가 요청값과 일치하지 않습니다. (' + entry.characterId + ' != ' + characterId + ')' };
  }

  function isValidScore(v, max) {
    return typeof v === 'number' && !Number.isNaN(v) && v >= 0 && v <= max;
  }

  const scoreFields = ['metaScore', 'futureScore', 'replacementScore'];
  for (const f of scoreFields) {
    if (!isValidScore(entry[f], 10)) return { ok: false, reason: f + ' 값이 유효하지 않습니다.' };
  }
  if (!isValidScore(entry.confidence, 1)) {
    return { ok: false, reason: 'confidence 값이 유효하지 않습니다(0~1).' };
  }

  const recBlocks = ['characterRecommendation', 'breakthroughRecommendation', 'weaponRecommendation'];
  for (const key of recBlocks) {
    const block = entry[key];
    if (!block || typeof block !== 'object') return { ok: false, reason: key + ' 누락' };
    if (!isValidScore(block.score, 10)) return { ok: false, reason: key + '.score 값이 유효하지 않습니다.' };
    if (['high', 'medium', 'low'].indexOf(block.priority) === -1) {
      return { ok: false, reason: key + '.priority 값이 유효하지 않습니다.' };
    }
    if (typeof block.reason !== 'string' || !block.reason) {
      return { ok: false, reason: key + '.reason 누락' };
    }
  }

  if (!Array.isArray(entry.pullReasons) || !entry.pullReasons.every((x) => typeof x === 'string')) {
    return { ok: false, reason: 'pullReasons 배열 형식이 아닙니다.' };
  }
  if (!Array.isArray(entry.skipReasons) || !entry.skipReasons.every((x) => typeof x === 'string')) {
    return { ok: false, reason: 'skipReasons 배열 형식이 아닙니다.' };
  }

  if (!Array.isArray(entry.sources)) return { ok: false, reason: 'sources 배열이 아닙니다.' };
  for (const s of entry.sources) {
    if (!s || typeof s.name !== 'string' || !s.name) return { ok: false, reason: 'sources[].name 누락' };
    if (typeof s.url !== 'string' || !/^https?:\/\/\S+$/i.test(s.url)) {
      return { ok: false, reason: 'sources[].url 형식이 올바르지 않습니다: ' + s.url };
    }
  }

  const community = entry.communitySummary;
  if (!community || typeof community !== 'object') return { ok: false, reason: 'communitySummary 누락' };
  if (!Array.isArray(community.positive) || !Array.isArray(community.negative)) {
    return { ok: false, reason: 'communitySummary.positive/negative 배열이 아닙니다.' };
  }
  if (typeof community.commonOpinion !== 'string' || typeof community.concern !== 'string') {
    return { ok: false, reason: 'communitySummary.commonOpinion/concern 누락' };
  }

  const uncertainty = entry.uncertainty;
  if (!uncertainty || !isValidScore(uncertainty.score, 10)) {
    return { ok: false, reason: 'uncertainty.score 값이 유효하지 않습니다.' };
  }
  if (!Array.isArray(uncertainty.reasons)) return { ok: false, reason: 'uncertainty.reasons 배열이 아닙니다.' };

  const fomoRisk = entry.fomoRisk;
  if (!fomoRisk || !isValidScore(fomoRisk.score, 10)) {
    return { ok: false, reason: 'fomoRisk.score 값이 유효하지 않습니다.' };
  }
  if (typeof fomoRisk.reason !== 'string') return { ok: false, reason: 'fomoRisk.reason 누락' };

  const recommendation = entry.recommendation;
  if (!recommendation || ['must_pull', 'recommended', 'optional', 'skip'].indexOf(recommendation.pull) === -1) {
    return { ok: false, reason: 'recommendation.pull 값이 유효하지 않습니다.' };
  }
  if (!recommendation.priority || ['high', 'medium', 'low'].indexOf(recommendation.priority) === -1) {
    return { ok: false, reason: 'recommendation.priority 값이 유효하지 않습니다.' };
  }

  // 알 수 없는/불필요한 최상위 필드를 제거한 정리된 엔트리만 저장 대상으로 삼는다
  // (다른 characterId 데이터가 섞여 들어오는 것을 원천 차단).
  const cleanEntry = {
    version: typeof entry.version === 'string' && entry.version ? entry.version : '1.0',
    characterId: entry.characterId,
    investmentType: Array.isArray(entry.investmentType) ? entry.investmentType : ['meta'],
    metaScore: entry.metaScore,
    futureScore: entry.futureScore,
    replacementScore: entry.replacementScore,
    confidence: entry.confidence,
    futureLinks: Array.isArray(entry.futureLinks) ? entry.futureLinks : [],
    characterRecommendation: entry.characterRecommendation,
    breakthroughRecommendation: entry.breakthroughRecommendation,
    weaponRecommendation: entry.weaponRecommendation,
    pullReasons: entry.pullReasons,
    skipReasons: entry.skipReasons,
    sources: entry.sources,
    communitySummary: entry.communitySummary,
    uncertainty: entry.uncertainty,
    fomoRisk: entry.fomoRisk,
    recommendation: entry.recommendation
  };
  if (entry.officialSummary && typeof entry.officialSummary === 'object') {
    cleanEntry.officialSummary = entry.officialSummary;
  }

  const gachaGuideResult = validateGachaGuide(entry.gachaGuide);
  if (!gachaGuideResult.ok) {
    console.warn('[gachaGuide 검증 실패] characterId=' + entry.characterId + ' — gachaGuide 필드를 제거하고 나머지만 저장합니다.');
  } else if (gachaGuideResult.value) {
    cleanEntry.gachaGuide = gachaGuideResult.value;
  }

  return { ok: true, entry: cleanEntry };
}

// meta.json의 대상 characterId 항목 1개만 원자적으로 교체/추가한다.
// 임시 파일 기록 → 재파싱 검증 → rename 순서로, 실패 시 원본을 그대로 둔다.
function atomicUpdateMetaEntry(gameId, characterId, newEntry) {
  const metaPath = path.join(__dirname, 'data', 'games', gameId, 'meta.json');

  let metaArray;
  try {
    const original = fs.readFileSync(metaPath, 'utf8');
    metaArray = JSON.parse(original);
    if (!Array.isArray(metaArray)) throw new Error('meta.json이 배열 구조가 아닙니다.');
  } catch (err) {
    return { ok: false, reason: 'meta.json을 읽거나 파싱할 수 없습니다: ' + err.message };
  }

  const othersBefore = metaArray.filter((m) => m.characterId !== characterId);
  const hasExisting  = metaArray.some((m) => m.characterId === characterId);

  const updatedArray = hasExisting
    ? metaArray.map((m) => (m.characterId === characterId ? newEntry : m))
    : metaArray.concat([newEntry]);

  const othersAfter = updatedArray.filter((m) => m.characterId !== characterId);
  if (othersAfter.length !== othersBefore.length ||
      JSON.stringify(othersAfter) !== JSON.stringify(othersBefore)) {
    return { ok: false, reason: '대상 캐릭터 외 다른 meta 항목이 변경되어 저장을 취소했습니다.' };
  }

  const serialized = JSON.stringify(updatedArray, null, 2) + '\n';

  try {
    JSON.parse(serialized); // 저장 전 자체 재검증
  } catch (err) {
    return { ok: false, reason: '저장 전 JSON 재검증 실패: ' + err.message };
  }

  const tmpPath = metaPath + '.tmp-' + process.pid + '-' + Date.now();
  try {
    fs.writeFileSync(tmpPath, serialized, 'utf8');
    const verify = JSON.parse(fs.readFileSync(tmpPath, 'utf8')); // 임시 파일도 재검증
    if (!Array.isArray(verify)) throw new Error('임시 파일 재검증 실패');
    fs.renameSync(tmpPath, metaPath); // 같은 파일시스템 내 rename = 원자적 교체
  } catch (err) {
    try { fs.unlinkSync(tmpPath); } catch (cleanupErr) { /* 임시 파일 정리 실패는 무시 */ }
    return { ok: false, reason: '임시 파일 저장/교체 실패: ' + err.message };
  }

  return { ok: true };
}

app.post('/api/meta-update-claude-code', async (req, res) => {
  const { gameId, characterId } = req.body || {};

  if (!gameId || !characterId) {
    return res.status(400).json({ error: 'gameId와 characterId가 필요합니다.' });
  }
  if (ALLOWED_GAME_IDS.indexOf(gameId) === -1) {
    return res.status(400).json({ error: '지원하지 않는 게임입니다: ' + gameId });
  }

  let characters;
  try {
    characters = loadCharactersFile(gameId);
  } catch (err) {
    return res.status(400).json({ error: gameId + '의 characters.json을 찾을 수 없습니다.' });
  }
  const character = Array.isArray(characters) ? characters.find((c) => c.id === characterId) : null;
  if (!character) {
    return res.status(400).json({ error: '해당 게임에 존재하지 않는 characterId입니다: ' + characterId });
  }

  if (claudeCodeJobRunning) {
    return res.status(409).json({ error: '현재 다른 Claude Code 메타 갱신 작업이 실행 중입니다. 완료 후 다시 시도하세요.' });
  }
  claudeCodeJobRunning = true;

  try {
    console.log('[Claude Code 메타 갱신] 시작 — 게임: %s / 캐릭터: %s', gameId, characterId);

    const installCheck = await checkClaudeCodeInstalled();
    if (!installCheck.ok) {
      return res.status(500).json({ error: 'Claude Code가 설치되어 있지 않습니다.' });
    }

    const authCheck = await checkClaudeCodeAuth();
    if (!authCheck.ok) {
      return res.status(500).json({ error: 'Claude Code가 로그인되어 있지 않습니다.' });
    }

    // 클라이언트가 보낸 이름 문자열은 신뢰하지 않고, characters.json/aliases.json의
    // 서버 측 데이터에서만 이름/별칭을 구성한다.
    const names = resolveNames(gameId, characterId, character.name, character.nameKo);

    let existingMeta = [];
    try { existingMeta = loadMetaFile(gameId); } catch (err) { existingMeta = []; }
    const existingEntry = Array.isArray(existingMeta)
      ? (existingMeta.find((m) => m.characterId === characterId) || null)
      : null;

    const prompt = buildClaudeCodePrompt(gameId, characterId, names, existingEntry);

    const runResult = await runClaudeCode(prompt);
    if (!runResult.ok) {
      console.error('[Claude Code 메타 갱신 오류]', runResult.userMessage);
      return res.status(500).json({ error: runResult.userMessage });
    }

    const validation = validateMetaEntry(runResult.structuredOutput, characterId);
    if (!validation.ok) {
      console.error('[Claude Code 결과 검증 실패]', validation.reason);
      return res.status(500).json({ error: '분석 결과 검증 실패: ' + validation.reason });
    }

    const saveResult = atomicUpdateMetaEntry(gameId, characterId, validation.entry);
    if (!saveResult.ok) {
      console.error('[meta.json 저장 실패]', saveResult.reason);
      return res.status(500).json({ error: 'meta.json 저장 실패: ' + saveResult.reason });
    }

    console.log('[Claude Code 메타 갱신] 완료 — %s', characterId);
    res.json({ success: true, meta: validation.entry });

  } catch (err) {
    console.error('[Claude Code 메타 갱신 오류]', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    claudeCodeJobRunning = false;
  }
});

// ── /api/sync-characters (게임별 카드 데이터 자동 동기화) ─────────────────────
// "카드 데이터 갱신" 버튼용. 외부 공개 소스에서 다음을 자동 수행한다:
//   1) 업스트림 데이터 저장소 대조 → 신규 캐릭터 추가 (기존 항목의 수동 필드 보존)
//   2) 누락된 캐릭터 이미지 + 운명/속성 아이콘 다운로드
//   3) 위키에서 출시일 수집 → releaseDate 갱신 (카드 출시순 정렬의 근거)
// 로컬에만 있는 캐릭터는 절대 삭제하지 않는다. 현재 hsr만 지원하며,
// 다른 게임은 SYNC_HANDLERS에 게임별 함수를 등록해 확장한다.

let syncJobRunning = false;

async function syncFetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status + ' — ' + url);
  return res.json();
}

async function syncDownload(url, destPath) {
  // 위키 계열 호스트의 일시적 속도 제한에 대비해 짧은 백오프로 재시도한다
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        fs.writeFileSync(destPath, Buffer.from(await res.arrayBuffer()));
        return true;
      }
    } catch (e) { /* 아래 대기 후 재시도 */ }
    await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
  }
  return false;
}

// characters.json 원자적 저장 (임시 파일 → 재파싱 검증 → rename)
function atomicWriteCharacters(gameId, arr) {
  const filePath = path.join(__dirname, 'data', 'games', gameId, 'characters.json');
  const serialized = JSON.stringify(arr, null, 2) + '\n';
  const tmpPath = filePath + '.tmp-' + process.pid + '-' + Date.now();
  try {
    JSON.parse(serialized);
    fs.writeFileSync(tmpPath, serialized, 'utf8');
    JSON.parse(fs.readFileSync(tmpPath, 'utf8'));
    fs.renameSync(tmpPath, filePath);
    return { ok: true };
  } catch (err) {
    try { fs.unlinkSync(tmpPath); } catch (e) { /* 무시 */ }
    return { ok: false, reason: err.message };
  }
}

const HSR_SYNC = {
  BASE: 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master',
  WIKI_API: 'https://honkai-star-rail.fandom.com/api.php',
  PATH_MAP: {
    Warrior: 'destruction', Rogue: 'hunt', Mage: 'erudition', Shaman: 'harmony',
    Warlock: 'nihility', Knight: 'preservation', Priest: 'abundance',
    Memory: 'remembrance', Elation: 'elation'
  },
  ROLE_ICONS: {
    destruction: ['Destruction'], hunt: ['Hunt'], erudition: ['Erudition'],
    harmony: ['Harmony'], nihility: ['Nihility'], preservation: ['Preservation'],
    abundance: ['Abundance'], remembrance: ['Remembrance'], elation: ['Elation']
  },
  ELEMENT_ICONS: {
    fire: ['Fire'], ice: ['Ice'], imaginary: ['Imaginary'],
    thunder: ['Thunder', 'Lightning'], physical: ['Physical'],
    quantum: ['Quantum'], wind: ['Wind']
  }
};

function hsrNormName(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Fandom 위키 Character/List에서 플레이어블 전원의 release_date 맵을 수집
async function fetchHsrWikiDates() {
  const listRes = await fetch(HSR_SYNC.WIKI_API + '?action=parse&page=Character/List&format=json&prop=text');
  if (!listRes.ok) throw new Error('위키 목록 조회 실패 HTTP ' + listRes.status);
  const listJson = await listRes.json();
  const html = listJson.parse.text['*'];
  const firstTable = html.indexOf('article-table sortable');
  const secondTable = html.indexOf('article-table sortable', firstTable + 10);
  const tableHtml = html.slice(firstTable, secondTable > firstTable ? secondTable : undefined);

  const rows = tableHtml.split('<tr>').slice(2);
  const titles = [];
  for (const row of rows) {
    const m = row.match(/<a href="\/wiki\/[^"]+" title="([^"]+)"/);
    if (m && titles.indexOf(m[1]) === -1) titles.push(m[1]);
  }

  const dates = {};
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const url = HSR_SYNC.WIKI_API + '?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&titles=' + encodeURIComponent(batch.join('|'));
    const j = await syncFetchJson(url);
    const pages = (j.query && j.query.pages) || {};
    for (const pid of Object.keys(pages)) {
      const p = pages[pid];
      const content = p.revisions && p.revisions[0] && p.revisions[0].slots && p.revisions[0].slots.main['*'];
      if (!content) continue;
      const m = content.match(/\|\s*release_date\s*=\s*(\d{4}-\d{2}-\d{2})/);
      if (m) dates[hsrNormName(p.title)] = m[1];
    }
  }
  return dates;
}

async function syncHsrCharacters() {
  const gameId = 'hsr';
  const imgDir = path.join(__dirname, 'assets', 'images', gameId);
  const report = { added: [], imagesDownloaded: 0, iconsDownloaded: 0, datesUpdated: 0, nameKoFilled: 0 };

  const [krIndex, wikiDates] = await Promise.all([
    syncFetchJson(HSR_SYNC.BASE + '/index_min/kr/characters.json'),
    fetchHsrWikiDates()
  ]);

  const arr = loadCharactersFile(gameId);
  const localIds = new Set(arr.map((c) => c.id));
  const today = new Date().toISOString().slice(0, 10);

  // 1) 업스트림 신규 캐릭터 추가 (플레이어 아바타 {NICKNAME} 계열은 tag로 이미 로컬 존재)
  for (const upId of Object.keys(krIndex)) {
    const up = krIndex[upId];
    if (!up.tag || localIds.has(up.tag)) continue;
    const imgOk = await syncDownload(HSR_SYNC.BASE + '/' + up.preview, path.join(imgDir, up.tag + '.png'));
    if (imgOk) report.imagesDownloaded++;
    const wikiDate = wikiDates[hsrNormName(up.name)] || null;
    arr.push({
      id: up.tag,
      name: up.name || up.tag,
      nameKo: up.name || '',
      gameId: gameId,
      rarity: up.rarity,
      role: HSR_SYNC.PATH_MAP[up.path] || (up.path || '').toLowerCase(),
      element: (up.element || '').toLowerCase(),
      specialElement: null,
      image: imgOk ? up.tag + '.png' : null,
      basePerformance: null,
      releaseDate: wikiDate,
      isReleased: wikiDate ? wikiDate <= today : false,
      version: ''
    });
    report.added.push(up.tag);
    localIds.add(up.tag);
  }

  // 2) 기존 항목 보강: 출시일 / 비어있는 한글명 / 누락 이미지 (수동 필드는 보존)
  const upByTag = {};
  for (const upId of Object.keys(krIndex)) {
    if (krIndex[upId].tag) upByTag[krIndex[upId].tag] = krIndex[upId];
  }
  for (const c of arr) {
    if ((c.name || '').indexOf('{NICKNAME}') !== -1) continue;
    // 위키가 원본과 같은 페이지를 쓰는 수렵 Mar.7th는 별도 확정일 유지
    const wikiDate = c.id === 'mar7th2' ? '2024-07-31' : wikiDates[hsrNormName(c.name)];
    if (wikiDate && c.releaseDate !== wikiDate) { c.releaseDate = wikiDate; report.datesUpdated++; }
    if (c.releaseDate) c.isReleased = c.releaseDate <= today;

    const up = upByTag[c.id];
    if (up) {
      if (!c.nameKo && up.name) { c.nameKo = up.name; report.nameKoFilled++; }
      const imgPath = c.image ? path.join(imgDir, c.image) : null;
      if ((!c.image || !fs.existsSync(imgPath)) && up.preview) {
        const ok = await syncDownload(HSR_SYNC.BASE + '/' + up.preview, path.join(imgDir, c.id + '.png'));
        if (ok) { c.image = c.id + '.png'; report.imagesDownloaded++; }
      }
    }
  }

  // 3) 누락된 운명/속성 아이콘 다운로드
  for (const [role, cands] of Object.entries(HSR_SYNC.ROLE_ICONS)) {
    const dest = path.join(imgDir, 'role_' + role + '.png');
    if (fs.existsSync(dest)) continue;
    for (const cand of cands) {
      if (await syncDownload(HSR_SYNC.BASE + '/icon/path/' + cand + '.png', dest)) { report.iconsDownloaded++; break; }
    }
  }
  for (const [el, cands] of Object.entries(HSR_SYNC.ELEMENT_ICONS)) {
    const dest = path.join(imgDir, 'element_' + el + '.png');
    if (fs.existsSync(dest)) continue;
    for (const cand of cands) {
      if (await syncDownload(HSR_SYNC.BASE + '/icon/element/' + cand + '.png', dest)) { report.iconsDownloaded++; break; }
    }
  }

  const saveResult = atomicWriteCharacters(gameId, arr);
  if (!saveResult.ok) throw new Error('characters.json 저장 실패: ' + saveResult.reason);

  report.total = arr.length;
  return report;
}

// tools/import 파이프라인과 동일한 공용 헬퍼 재사용 (BigInt-safe 파서 등)
const importCommon = require('./tools/import/import_common');

function syncSleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// MediaWiki File 페이지에서 실제 이미지 URL을 얻는다 (명조/엔드필드 아이콘용).
// wiki.gg 계열은 연속 요청에 속도 제한을 걸어 일시 오류가 나므로 재시도한다.
async function wikiFileUrl(api, title) {
  const url = api + '?action=query&titles=' + encodeURIComponent('File:' + title) + '&prop=imageinfo&iiprop=url&format=json';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const j = await res.json();
      const page = Object.values(j.query.pages)[0];
      return page && page.imageinfo ? page.imageinfo[0].url : null;
    } catch (e) {
      await syncSleep(1500 * (attempt + 1)); // 속도 제한 완화 대기 후 재시도
    }
  }
  return null;
}

// 후보 파일명 목록을 순서대로 시도해 아이콘을 내려받는다 (이미 있으면 건너뜀)
async function downloadWikiIcons(api, candidatesMap, imgDir, prefix, report) {
  for (const [key, cands] of Object.entries(candidatesMap)) {
    const dest = path.join(imgDir, prefix + key + '.png');
    if (fs.existsSync(dest)) continue;
    for (const cand of cands) {
      const url = await wikiFileUrl(api, cand + '.png');
      if (url && await syncDownload(url, dest)) { report.iconsDownloaded++; break; }
      await syncSleep(400); // 속도 제한 예방 간격
    }
  }
}

// ── 명조(WuWa) 동기화 ────────────────────────────────────────────────────────
const WUWA_SYNC = {
  DATA_BASE: 'https://raw.githubusercontent.com/Dimbreath/WutheringData/master',
  WIKI_API: 'https://wutheringwaves.fandom.com/api.php',
  ELEMENT_MAP: { 0: 'neutral', 1: 'glacio', 2: 'fusion', 3: 'electro', 4: 'aero', 5: 'spectro', 6: 'havoc' },
  WEAPON_MAP: { 1: 'broadblade', 2: 'sword', 3: 'pistols', 4: 'gauntlets', 5: 'rectifier' },
  ELEMENT_ICONS: { aero: ['Aero'], glacio: ['Glacio'], fusion: ['Fusion'], electro: ['Electro'], havoc: ['Havoc'], spectro: ['Spectro'] },
  // 무기 아이콘은 카드 그리드 통일성을 위해 role_ 접두사로 저장한다
  WEAPON_ICONS: { broadblade: ['Icon Broadblade'], sword: ['Icon Sword'], pistols: ['Icon Pistols'], gauntlets: ['Icon Gauntlets'], rectifier: ['Icon Rectifier'] }
};

function wuwaSlugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

// 로버(플레이어 아바타)는 6개 항목이 같은 표시 이름을 공유하므로 성별/속성으로 구분
function wuwaCharacterId(nameEn, roleBody) {
  if (/^Rover:/i.test(nameEn)) {
    const element = nameEn.split(':')[1].trim().toLowerCase();
    const gender = /^female/i.test(roleBody) ? 'female' : 'male';
    return 'rover_' + element + '_' + gender;
  }
  return wuwaSlugify(nameEn.replace(/[·:].*$/, '').trim());
}

async function wuwaWikiPortraitUrl(nameEn) {
  const title = /^Rover:/i.test(nameEn) ? 'Rover' : nameEn.replace(/[:]/g, '');
  const url = WUWA_SYNC.WIKI_API + '?action=query&titles=' + encodeURIComponent(title) + '&prop=pageimages&piprop=original&format=json';
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const j = await res.json();
    const page = Object.values(j.query.pages)[0];
    return page && page.original ? page.original.source : null;
  } catch (e) { return null; }
}

// 로컬 이미지 파일을 확장자 후보(webp/png/jpg)로 찾아 실제 존재하는 파일명을 반환
function findLocalImage(imgDir, id) {
  for (const ext of ['webp', 'png', 'jpg']) {
    if (fs.existsSync(path.join(imgDir, id + '.' + ext))) return id + '.' + ext;
  }
  return null;
}

async function fetchWuwaWikiDates(names) {
  // 캐릭터 영문명 → 위키 페이지 제목 (Rover 계열은 공용 'Rover' 페이지)
  const titles = [...new Set(names.map((n) => (/^Rover:/i.test(n) ? 'Rover' : n.replace(/[:]/g, ''))))];
  const dates = {};
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const url = WUWA_SYNC.WIKI_API + '?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&titles=' + encodeURIComponent(batch.join('|'));
    const j = await syncFetchJson(url);
    const pages = (j.query && j.query.pages) || {};
    for (const pid of Object.keys(pages)) {
      const p = pages[pid];
      const content = p.revisions && p.revisions[0] && p.revisions[0].slots && p.revisions[0].slots.main['*'];
      if (!content) continue;
      const m = content.match(/\|\s*releaseDate\s*=\s*(\d{4}-\d{2}-\d{2})/);
      if (m) dates[hsrNormName(p.title)] = m[1];
    }
  }
  return dates;
}

async function syncWuwaCharacters() {
  const gameId = 'wuwa';
  const imgDir = path.join(__dirname, 'assets', 'images', gameId);
  const report = { added: [], imagesDownloaded: 0, iconsDownloaded: 0, datesUpdated: 0, nameKoFilled: 0 };
  const today = new Date().toISOString().slice(0, 10);

  const [roleInfoText, koText, enText] = await Promise.all([
    importCommon.fetchText(WUWA_SYNC.DATA_BASE + '/ConfigDB/RoleInfo.json'),
    importCommon.fetchText(WUWA_SYNC.DATA_BASE + '/TextMap/ko/MultiText.json'),
    importCommon.fetchText(WUWA_SYNC.DATA_BASE + '/TextMap/en/MultiText.json')
  ]);
  const roles = importCommon.parseJsonBigIntSafe(roleInfoText).filter((c) => c.RoleType === 1);
  const ko = JSON.parse(koText);
  const en = JSON.parse(enText);

  const arr = loadCharactersFile(gameId);
  const localIds = new Set(arr.map((c) => c.id));

  // 1) 업스트림 신규 캐릭터 추가
  for (const c of roles) {
    const nameEn = en['RoleInfo_' + c.Id + '_Name'];
    if (!nameEn) continue;
    const id = wuwaCharacterId(nameEn, c.RoleBody) || String(c.Id);
    if (localIds.has(id)) continue;

    let image = null;
    const imgUrl = await wuwaWikiPortraitUrl(nameEn);
    if (imgUrl) {
      const extM = imgUrl.match(/\.(webp|png|jpg)(?:\/|\?|$)/i);
      const ext = extM ? extM[1].toLowerCase() : 'webp';
      if (await syncDownload(imgUrl, path.join(imgDir, id + '.' + ext))) {
        image = id + '.' + ext;
        report.imagesDownloaded++;
      }
    }
    arr.push({
      id: id, name: nameEn, nameKo: ko['RoleInfo_' + c.Id + '_Name'] || null,
      gameId: gameId, rarity: c.QualityId, role: null,
      element: WUWA_SYNC.ELEMENT_MAP[c.ElementId] || null, specialElement: null,
      weaponType: WUWA_SYNC.WEAPON_MAP[c.WeaponType] || null,
      image: image, basePerformance: null, releaseDate: null, isReleased: true, version: ''
    });
    report.added.push(id);
    localIds.add(id);
  }

  // 2) 기존 항목 보강: 이미지 확장자 불일치 교정 / 누락 이미지 다운로드 / 출시일
  const wikiDates = await fetchWuwaWikiDates(arr.map((c) => c.name).filter(Boolean));
  for (const c of arr) {
    const currentPath = c.image ? path.join(imgDir, c.image) : null;
    if (!c.image || !fs.existsSync(currentPath)) {
      const found = findLocalImage(imgDir, c.id);
      if (found) {
        c.image = found; // 과거 import가 확장자를 .webp로 잘못 기록한 항목 교정
      } else if (c.name) {
        const imgUrl = await wuwaWikiPortraitUrl(c.name);
        if (imgUrl) {
          const extM = imgUrl.match(/\.(webp|png|jpg)(?:\/|\?|$)/i);
          const ext = extM ? extM[1].toLowerCase() : 'webp';
          if (await syncDownload(imgUrl, path.join(imgDir, c.id + '.' + ext))) {
            c.image = c.id + '.' + ext;
            report.imagesDownloaded++;
          }
        }
      }
    }
    const wikiTitle = /^Rover:/i.test(c.name || '') ? 'Rover' : (c.name || '').replace(/[:]/g, '');
    const d = wikiDates[hsrNormName(wikiTitle)];
    if (d && c.releaseDate !== d) { c.releaseDate = d; report.datesUpdated++; }
    if (c.releaseDate) c.isReleased = c.releaseDate <= today;
  }

  // 3) 속성/무기 아이콘
  await downloadWikiIcons(WUWA_SYNC.WIKI_API, WUWA_SYNC.ELEMENT_ICONS, imgDir, 'element_', report);
  await downloadWikiIcons(WUWA_SYNC.WIKI_API, WUWA_SYNC.WEAPON_ICONS, imgDir, 'role_', report);

  const saveResult = atomicWriteCharacters(gameId, arr);
  if (!saveResult.ok) throw new Error('characters.json 저장 실패: ' + saveResult.reason);
  report.total = arr.length;
  return report;
}

// ── 엔드필드 동기화 ──────────────────────────────────────────────────────────
const EF_SYNC = {
  WIKI_API: 'https://endfield.wiki.gg/api.php',
  RELEASES_API: 'https://api.github.com/repos/3aKHP/EndFieldGameData/releases/latest',
  CACHE_DIR: path.join(__dirname, 'tools', 'import', '.cache', 'endfield-tables'),
  PROFESSION_MAP: { 0: 'guard', 2: 'defender', 4: 'support', 5: 'caster', 7: 'vanguard', 8: 'striker' },
  CHARTYPE_MAP: { Physical: 'physical', Fire: 'fire', Natural: 'nature', Cryst: 'ice', Pulse: 'electric' },
  ELEMENT_ICONS: { fire: ['Heat', 'Fire'], ice: ['Cryst', 'Cryo', 'Ice'], electric: ['Pulse', 'Electric'], nature: ['Nature', 'Natural'], physical: ['Physical'] },
  ROLE_ICONS: { guard: ['Guard'], defender: ['Defender'], support: ['Support'], caster: ['Caster'], vanguard: ['Vanguard'], striker: ['Striker'] }
};

// 최신 데이터 zip을 받아 캐시를 갱신한다. 실패해도 기존 캐시로 계속 진행.
// 주의: "latest" 릴리스에 데이터 zip이 없는 경우가 있어(예: v0.4.0은 worldview만),
// 전체 릴리스 목록에서 tables zip을 포함한 가장 최신 릴리스를 찾는다.
async function refreshEndfieldCache() {
  try {
    const releases = await (await fetch(EF_SYNC.RELEASES_API.replace(/\/latest$/, ''), { headers: { 'User-Agent': 'PickupManger-sync' } })).json();
    let rel = null;
    let asset = null;
    for (const r of Array.isArray(releases) ? releases : []) {
      const a = (r.assets || []).find((x) => /tables\.zip$/i.test(x.name));
      if (a) { rel = r; asset = a; break; } // 릴리스 목록은 최신순
    }
    if (!asset) return { refreshed: false, reason: 'tables zip을 포함한 릴리스 없음' };

    // 이미 같은 버전을 캐시했다면 재다운로드 생략
    const versionMarker = path.join(EF_SYNC.CACHE_DIR, '.version');
    try {
      if (fs.readFileSync(versionMarker, 'utf8').trim() === rel.tag_name) {
        return { refreshed: false, reason: '이미 최신 (' + rel.tag_name + ')' };
      }
    } catch (e) { /* 마커 없음 — 계속 진행 */ }
    const tmpZip = path.join(require('os').tmpdir(), 'endfield-tables-' + Date.now() + '.zip');
    if (!(await syncDownload(asset.browser_download_url, tmpZip))) {
      return { refreshed: false, reason: 'zip 다운로드 실패' };
    }
    await new Promise((resolve, reject) => {
      const ps = spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command',
        'Expand-Archive -LiteralPath "' + tmpZip + '" -DestinationPath "' + EF_SYNC.CACHE_DIR + '" -Force'],
        { windowsHide: true });
      ps.on('close', (code) => (code === 0 ? resolve() : reject(new Error('Expand-Archive 실패 code=' + code))));
      ps.on('error', reject);
    });
    try { fs.unlinkSync(tmpZip); } catch (e) { /* 무시 */ }
    try { fs.writeFileSync(path.join(EF_SYNC.CACHE_DIR, '.version'), rel.tag_name, 'utf8'); } catch (e) { /* 무시 */ }
    return { refreshed: true, version: rel.tag_name };
  } catch (err) {
    return { refreshed: false, reason: err.message };
  }
}

// Version 페이지(버전명+시작일) → 각 버전 페이지의 신규 오퍼레이터 목록으로
// "캐릭터 → 출시일" 맵을 만든다. 어느 버전에도 없으면 런칭일로 간주한다.
async function fetchEndfieldDates() {
  async function pageWikitext(page) {
    const url = EF_SYNC.WIKI_API + '?action=parse&page=' + encodeURIComponent(page) + '&format=json&prop=wikitext';
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const j = await res.json();
        return j.error ? null : j.parse.wikitext['*'];
      } catch (e) {
        await syncSleep(1500 * (attempt + 1));
      }
    }
    return null;
  }

  const versionText = await pageWikitext('Version');
  const versions = [];
  if (versionText) {
    const cells = versionText.match(/\{\{Event list cell[\s\S]*?\}\}/g) || [];
    for (const cell of cells) {
      const ev = cell.match(/\|\s*event\s*=\s*([^\n|]+)/);
      const st = cell.match(/\|\s*start\s*=\s*(\d{4}-\d{2}-\d{2})/);
      if (ev && st) versions.push({ name: ev[1].trim(), start: st[1] });
    }
  }
  versions.sort((a, b) => a.start.localeCompare(b.start));
  const launchDate = versions.length ? versions[0].start : null;

  const dateByNorm = {};
  // 런칭 버전(첫 번째)은 전 캐릭터가 기본값이므로 이후 버전들만 조회
  for (const v of versions.slice(1)) {
    const wt = await pageWikitext(v.name);
    if (!wt) continue;
    const opSection = wt.split(/===\s*Operators?\s*===/i)[1];
    if (!opSection) continue;
    const opBlock = opSection.split(/\n==/)[0];
    for (const m of opBlock.matchAll(/^\*\s*\[\[([^\]|]+)/gm)) {
      dateByNorm[hsrNormName(m[1])] = v.start;
    }
  }
  return { dateByNorm, launchDate };
}

async function syncEndfieldCharacters() {
  const gameId = 'endfield';
  const imgDir = path.join(__dirname, 'assets', 'images', gameId);
  const report = { added: [], imagesDownloaded: 0, iconsDownloaded: 0, datesUpdated: 0, nameKoFilled: 0 };
  const today = new Date().toISOString().slice(0, 10);

  const cacheStatus = await refreshEndfieldCache();
  console.log('[카드 동기화] endfield 데이터 캐시:', cacheStatus.refreshed ? ('갱신됨 ' + cacheStatus.version) : ('기존 캐시 사용 (' + cacheStatus.reason + ')'));

  const tablePath = path.join(EF_SYNC.CACHE_DIR, 'tables', 'CharacterTable.json');
  if (!fs.existsSync(tablePath)) throw new Error('엔드필드 데이터 캐시가 없습니다 (zip 다운로드도 실패).');
  const charTable = importCommon.parseJsonBigIntSafe(fs.readFileSync(tablePath, 'utf8'));
  const kr = importCommon.parseJsonBigIntSafe(fs.readFileSync(path.join(EF_SYNC.CACHE_DIR, 'i18n', 'KR.json'), 'utf8'));

  const arr = loadCharactersFile(gameId);
  const localIds = new Set(arr.map((c) => c.id));
  const seenEngNames = new Set();

  // 1) 신규 캐릭터 추가 (플레이어 아바타 성별 변형은 engName 기준 dedupe)
  for (const c of Object.values(charTable)) {
    if (!c.engName || seenEngNames.has(c.engName)) continue;
    seenEngNames.add(c.engName);
    const id = wuwaSlugify(c.engName);
    if (localIds.has(id)) continue;

    let image = null;
    const iconUrl = await wikiFileUrl(EF_SYNC.WIKI_API, c.engName.replace(/\s+/g, '_') + '_icon.png');
    if (iconUrl && await syncDownload(iconUrl, path.join(imgDir, id + '.png'))) {
      image = id + '.png';
      report.imagesDownloaded++;
    }
    arr.push({
      id: id, name: c.engName, nameKo: kr[c.name && c.name.id] || null,
      gameId: gameId, rarity: c.rarity,
      role: EF_SYNC.PROFESSION_MAP[c.profession] || null,
      element: EF_SYNC.CHARTYPE_MAP[c.charTypeId] || null,
      specialElement: null, image: image, basePerformance: null,
      releaseDate: null, isReleased: true, version: ''
    });
    report.added.push(id);
    localIds.add(id);
  }

  // 2) 출시일: 버전 페이지 역산.
  // 명시적 버전 매칭만 기존 날짜를 덮어쓸 수 있고, 런칭일 폴백은 날짜가 아예
  // 없을 때만 채운다 — 버전 페이지 조회가 일시 실패해도 이미 확보한 정확한
  // 날짜가 런칭일로 되돌아가는 일이 없도록 한다.
  const { dateByNorm, launchDate } = await fetchEndfieldDates();
  for (const c of arr) {
    const explicit = dateByNorm[hsrNormName(c.name)];
    const d = explicit || (!c.releaseDate ? launchDate : null);
    if (d && c.releaseDate !== d) { c.releaseDate = d; report.datesUpdated++; }
    if (c.releaseDate) c.isReleased = c.releaseDate <= today;
    // 비어있는 한글명 보충
    if (!c.nameKo) {
      const up = Object.values(charTable).find((u) => u.engName && wuwaSlugify(u.engName) === c.id);
      if (up && kr[up.name && up.name.id]) { c.nameKo = kr[up.name.id]; report.nameKoFilled++; }
    }
  }

  // 3) 속성/직업 아이콘
  await downloadWikiIcons(EF_SYNC.WIKI_API, EF_SYNC.ELEMENT_ICONS, imgDir, 'element_', report);
  await downloadWikiIcons(EF_SYNC.WIKI_API, EF_SYNC.ROLE_ICONS, imgDir, 'role_', report);

  const saveResult = atomicWriteCharacters(gameId, arr);
  if (!saveResult.ok) throw new Error('characters.json 저장 실패: ' + saveResult.reason);
  report.total = arr.length;
  return report;
}

const SYNC_HANDLERS = { hsr: syncHsrCharacters, wuwa: syncWuwaCharacters, endfield: syncEndfieldCharacters };

app.post('/api/sync-characters', async (req, res) => {
  const { gameId } = req.body || {};
  if (!gameId || !SYNC_HANDLERS[gameId]) {
    return res.status(400).json({ error: '자동 동기화를 지원하지 않는 게임입니다: ' + (gameId || '(없음)') });
  }
  if (syncJobRunning) {
    return res.status(409).json({ error: '현재 다른 동기화 작업이 실행 중입니다. 완료 후 다시 시도하세요.' });
  }
  syncJobRunning = true;
  try {
    console.log('[카드 동기화] 시작 — %s', gameId);
    const report = await SYNC_HANDLERS[gameId]();
    console.log('[카드 동기화] 완료 — 신규 %s명 / 이미지 %s / 아이콘 %s / 출시일 %s건',
      report.added.length, report.imagesDownloaded, report.iconsDownloaded, report.datesUpdated);
    res.json({ success: true, report: report });
  } catch (err) {
    console.error('[카드 동기화 오류]', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    syncJobRunning = false;
  }
});

// ── /api/save-roster ─────────────────────────────────────────────────────────

app.post('/api/save-roster', (req, res) => {
  const payload = req.body;
  if (!payload || !payload.games) {
    return res.status(400).json({ error: 'games 필드가 필요합니다.' });
  }

  const filePath = path.join(__dirname, 'data', 'user', 'roster.json');
  try {
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
    console.log('[roster] 저장 완료 — %s', new Date().toISOString());
    res.json({ success: true });
  } catch (err) {
    console.error('[roster 저장 오류]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── /api/health ───────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, provider: AI_PROVIDER, model: MODEL });
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log('메타 업데이트 서버: http://localhost:' + PORT);
  console.log('AI_PROVIDER: ' + AI_PROVIDER);
  console.log('사용 모델: ' + MODEL);
  if (!process.env[AI.keyEnvName]) {
    console.warn('⚠️  ' + AI.keyEnvName + '가 설정되지 않았습니다. .env 파일을 확인하세요.');
  }
  if (AI_SEARCH_MODELS.length === 0) {
    console.warn('⚠️  AI_SEARCH_MODELS가 설정되지 않았습니다. 검색 결과 없이 uncertainty가 높게 산출됩니다.');
  } else {
    console.log('검색 모델: ' + AI_SEARCH_MODELS.slice(0, AI_SEARCH_MAX_MODELS).join(', ') +
      ' (최대 ' + AI_SEARCH_MAX_MODELS + '개 사용)');
    if (!process.env.OPENROUTER_API_KEY) {
      console.warn('⚠️  OPENROUTER_API_KEY가 설정되지 않았습니다. openrouter:web_search 검색 툴은 ' +
        'AI_PROVIDER 설정과 무관하게 항상 OpenRouter API를 사용하므로, AI_PROVIDER=openai여도 ' +
        '이 키가 없으면 검색이 전부 실패 처리됩니다.');
    }
  }
});
