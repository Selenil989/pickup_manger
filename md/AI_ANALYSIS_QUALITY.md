# AI_ANALYSIS_QUALITY.md

## Document Version

| Version | 날짜 | 내용 |
|---|---|---|
| 1.0 | 2026-06-21 | 기본 투자 판단 규칙 (Chat History 12개 섹션) |
| 1.1 | 2026-06-21 | 구현 현황 점검 추가 (PROJECT_STATUS.md 1:1 비교, R01~R23) |
| 1.2 | 2026-06-21 | 벨리나 Standard Rules 추가 (Rule 01~09) |
| 1.3 | 2026-06-21 | meta.json 32개 작성 체크리스트 추가 (Phase 1~8) |
| 1.4 | 2026-06-21 | Architecture Rules 추가 (Rule A~G, Layer 1~4 책임 정의) |

**현재 버전: 1.4**

---

## 목적

이 문서는 이 프로젝트의 투자 판단 품질 기준을 정의한다.

"ChatGPT가 초기에 수행했던 투자 판단 품질을 프로젝트에서 재현한다"는 목표 아래,
Chat History에서 추출한 판단 규칙을 기록하고 유지한다.

---

## Project Goal Freeze

이 문서는 아래 목표를 기준으로 품질을 판단한다.

**내 계정 기준 가챠 투자 의사결정 시스템**

품질 판단 기준:

이 규칙 또는 데이터가
"내 계정 기준 신규 캐릭터 투자 판단"
에 직접 기여하는가?

---

## Chat History에서 추출한 투자 판단 규칙

> 출처: Gpt_Chat_History.md (사용자와 GPT 간 초기 투자 분석 대화 전체)
> 추출 원칙: 문장 복사 금지. 반드시 "판단 규칙" 형태로 추출.

---

### 1. 판단 순서 규칙

| 순서 | 규칙 |
|---|---|
| 1 | 계정 보유 캐릭터 전체를 먼저 파악한다 |
| 2 | 현재 완성된 파티와 역할을 확인한다 |
| 3 | 계정에서 부재한 속성 / 역할 공백을 식별한다 |
| 4 | 신규 픽업 캐릭터가 해당 공백을 채우는지 판단한다 |
| 5 | 5단계 투자 등급으로 분류한다 |

**5단계 투자 등급 (GPT 원형)**

```
무조건 뽑아야 함
명전 추천 (명함 + 전무)
명함만
완전 스킵
계정에 필요 없음 (스킵의 이유가 "강함"이 아니라 "이미 커버됨"일 때)
```

---

### 2. 중요하게 사용한 정보

**반드시 판단에 포함되는 정보:**

- 계정의 속성별 커버 현황 (어떤 속성이 강한가 / 어떤 속성이 비어 있는가)
- 현재 완성된 파티 목록과 구성원 (파티 완성도)
- 신규 캐릭터의 역할 분류 (메인딜 / 이상트리거 / 서포터 / 방어)
- 커뮤니티 여론 (아카라이브 / 디시인사이드 / Reddit / 빌리빌리)
- 동일 역할 보유 캐릭터 수 (대체 가능성)

---

### 3. 무시한 정보

**투자 판단에 직접 반영하지 않는 정보:**

- 티어표 단독 점수 (Prydwen / Game8 점수를 그대로 반영하지 않는다)
- 캐릭터 자체 강도 (계정에 필요 없으면 강해도 스킵)
- 커뮤니티 단일 게시물 의견 (반복 확인된 의견만 사용)
- 출처 불명확한 주장 (아카라이브/디시/Reddit 이외 출처는 검증 필요)

---

### 4. 공식 정보 vs. 커뮤니티 정보 비교 규칙

- 공식 정보 (스킬 설명 / 방송 / PV) → 캐릭터 메커니즘과 시너지 파악에 사용
- 커뮤니티 정보 → 실전 성능 평가, 팀 구성 여론, 단점 파악에 사용
- 둘이 충돌할 경우 → 커뮤니티 실전 여론을 우선으로 하되, 공식 정보로 근거를 보완
- 공식 정보만 있고 커뮤니티 정보가 없는 경우 → uncertainty 상승

---

### 5. uncertainty 상승 조건

아래 중 하나라도 해당하면 uncertainty 상승:

- 현재 픽업 배너 정보가 없을 때 (판단 자체를 보류)
- 미출시 캐릭터 또는 출시 직후 커뮤니티 의견 부족
- 커뮤니티 여론이 긍정과 부정으로 나뉘어 공통 의견이 없을 때
- 공식 스킬 설명이 미공개 상태
- 수집된 커뮤니티 게시물이 5개 미만

**규칙:** 정보가 불확실한 상태에서 강행 판단하지 않는다. 불확실하면 uncertainty를 올리고 "2주 대기"를 기본 출력으로 한다.

---

### 6. 스킵 추천 조건

아래 중 하나라도 해당하면 스킵 또는 낮은 우선순위:

- 해당 역할 / 속성에 이미 완성된 파티가 존재한다
- 해당 속성에 이미 동급 이상의 캐릭터가 있다
- 신규 캐릭터의 역할이 계정의 현재 공백과 무관하다
- 계정이 지원 캐릭터는 많고 딜러가 없는데 지원형 신캐가 나왔다

**핵심 규칙:** "캐릭터가 강한가?"가 아니라 "내 계정에서 체급이 올라가는가?"로 스킵 여부를 판단한다.

---

### 7. 명함 추천 조건

- 계정 체급 상승이 확인되지만 전무 없이도 기능이 완성된다
- 동일 역할 대체 캐릭터가 있어 전무가 없어도 파티 구성 가능
- 전무 추천 조건을 충족하지 않는 나머지 경우

---

### 8. 전무(명전) 추천 조건

- 전무가 캐릭터의 핵심 메커니즘을 직접 강화하는 경우
- 해당 캐릭터가 메인딜러이고 전무가 유의미한 딜 상승을 만드는 경우
- 향후 시너지 예정 캐릭터와 함께 사용 시 전무 시너지가 뚜렷한 경우
- 대체 불가능한 역할이고 장기적으로 사용할 계획이 확실한 경우

**반대 조건 (전무 보류):** 캐릭터 강도가 높아도 복각이 잦거나, uncertainty가 높거나, 전무 효율이 캐릭터 본체 대비 낮으면 전무 보류를 권장한다.

---

### 9. 계정 정보 활용 규칙

GPT는 계정 정보를 다음 방식으로 활용했다:

- **속성 커버 맵 구성:** 계정의 모든 S급을 속성별로 분류 → 공백 속성 식별
- **역할 커버 분류:** 메인딜 / 이상트리거 / 서포터 / 방어로 분류 → 역할 공백 확인
- **완성 파티 우선순위:** 이미 1티어 완성 파티가 있으면 동일 역할 신캐 투자 우선순위 하락
- **기존 캐릭터 활용 가능성 선 검토:** 신캐 투자 전에 기존 보유 캐릭터로 새 파티 구성 가능한지 먼저 확인
- **하이퍼캐리 딜러 부재 시 1순위:** 계정에 최신 하이퍼캐리 딜러가 없으면 딜러형 신캐가 1순위

---

### 10. 최종 추천 문장 생성 논리

GPT의 최종 추천은 다음 요소를 조합해서 만들었다:

```
[캐릭터명] + [역할 판단] + [계정 공백 여부] + [대체 가능성] + [투자 등급]
```

**예시 논리 흐름:**

```
1. 이 캐릭터의 역할은 무엇인가?
     ↓
2. 내 계정에 이 역할이 비어 있는가?
     ↓
3. 비어 있다면 → 체급 상승 확인
   이미 있다면 → 대체 가능성 확인
     ↓
4. 전무가 필요한가?
     ↓
5. 최종 등급 결정 (명전 / 명함 / 보류 / 스킵)
```

**규칙:** 최종 판단 문장은 "강하다/약하다" 표현을 쓰지 않는다. 반드시 "내 계정에서 어떤 역할을 하는가"를 기준으로 작성한다.

---

### 11. 메타 데이터 수집 규칙 (GPT 명시)

GPT가 명시적으로 설명한 메타 수집 방법:

**수집 순서:**
```
아카라이브 → 디시인사이드 → Reddit → 빌리빌리 → 티어표 참고
```

**수집 항목:**
- metaScore (커뮤니티 여론 종합 → 수치화)
- futureScore (미래 메타 예측)
- replacementScore (동일 역할 대체 가능성)
- pullReasons (뽑아야 할 이유)
- skipReasons (스킵해야 할 이유)
- characterRecommendation / breakthroughRecommendation / weaponRecommendation
- sources (출처 + 가중치)

**수집 금지:**
- 계정 체급 상승량 → evaluationEngine 영역
- 추천 파티 결과 → evaluationEngine 영역
- 보유 여부 → userRoster 영역

**meta.json = 캐릭터 자체 가치 / evaluationEngine = 계정 반응 계산 (두 영역 절대 혼재 금지)**

---

### 12. 투자 판단의 핵심 기준 (GPT 요약 원문에서 추출)

```
"이 기능이 '내 계정 기준 가챠 투자 의사결정'에 직접 기여하는가?"
YES → 포함
NO  → 제외
```

이 기준은 기능 구현뿐 아니라 메타 데이터 항목 선정에도 동일하게 적용된다.

---

## 메타 데이터 품질 표준 규칙 (Standard Rules)

> 벨리나 출시 후 재검증(2026-06-21)에서 추출한 규칙을 전체 캐릭터에 공통 적용합니다.
> 이 규칙은 meta.json 작성·수정 시 반드시 준수해야 하는 체크 기준입니다.

---

### Rule 01 — 미출시 표현 제거 규칙

> **Origin:** Velina Review (2026-06-21) — 벨리나 재검증 시 concern/skillSummary에 "미출시 미검증" 표현 잔존 발견

**규칙:** 캐릭터 출시 후에는 미출시 기준의 문장을 반드시 제거한다.

제거 대상 표현:
- "미출시 캐릭터 실성능 미검증"
- "스킬 세부 사항 미확정"
- "실성능 및 구체 스킬 미확정"
- "픽업 후 평가 변동 가능성"

적용 시점: 캐릭터 출시 직후 해당 필드 전면 검토.

---

### Rule 02 — skillSummary 메커니즘 명칭 규칙

> **Origin:** Velina Review (2026-06-21) — 벨리나 skillSummary의 "핵폭 메커니즘"이 커뮤니티 별칭임을 확인. 실제 명칭은 Windswept/Vortex/Gale Field.

**규칙:** skillSummary에는 반드시 **공식 메커니즘 명칭**을 사용한다. 커뮤니티 별칭은 사용하지 않는다.

| 허용 | 금지 |
|---|---|
| Windswept, Vortex, Gale Field | 핵폭 메커니즘 |
| 이상 폭발, 격파 게이지, 감전 지속 | 뇌폭, 버폭 |
| Freeze + Anomaly 복합 | 얼음뻥, 이중뻥 |

**기준:** 공식 스킬 설명 원문 또는 공식 번역에 등장하는 명칭만 사용.

---

### Rule 03 — skipReasons 작성 규칙

> **Origin:** Velina Review (2026-06-21) + Chat History — 벨리나 skipReasons에 "계정 즉시 상승량 제한적"(evaluationEngine 영역 침범) 및 "미야비 역할 중복"(사실 오류) 발견. Chat History에서 meta.json 영역 분리 원칙으로 보강.

**규칙:** skipReasons에는 **계정 조건 기반** 항목만 작성한다. 캐릭터 절대 강도 판단, 계정 체급 상승량은 작성하지 않는다.

**금지 표현:**
- "현재 계정 즉시 상승량은 제한적" → evaluationEngine 영역
- "딜러 체감은 적음" → 역할 특성이지 스킵 이유가 아님
- "강도가 낮음" → meta.json 절대 금지

**허용 표현 (계정 조건 기반):**
- "[속성/역할] 파티 미운영 계정은 효과 제한적"
- "[캐릭터명] 이미 보유 시 역할 중복"
- "[파트너 캐릭터] 픽업 계획 없는 계정은 단독 가치 제한적"
- "복각 대기 가능 (복각 주기 X개월 예상)"

**추가 금지:** 특정 캐릭터와 "역할 중복"을 skipReason으로 사용할 때, 반드시 실제 역할 중복인지 **메커니즘 비호환**인지 구분한다.

- 역할 중복 → skipReason 가능
- 메커니즘 비호환 → negative 또는 concern으로 이동

---

### Rule 04 — fomoRisk 계산 규칙

> **Origin:** Chat History + Velina Review (2026-06-21) — Chat History에서 FOMO 판단 3기준(복각/대체/시너지) 확인. 벨리나 재검증에서 기존 score 4가 레미엘 연계 FOMO를 미반영했음을 발견 → score 7로 상향.

**규칙:** fomoRisk는 반드시 아래 3가지 기준으로 계산한다.

| 기준 | 점수 | 적용 조건 |
|---|---|---|
| 역할 대체 캐릭터 없음 | +3 | 해당 역할/속성 보유 캐릭터 없을 때 |
| 복각 주기 불명확 또는 장기 | +2 | 첫 복각 미정 또는 6개월 이상 |
| 필수 시너지 파트너 미래 출시 예정 | +2 | 페어 캐릭터가 미출시 상태 |
| 지금 미획득 시 콘텐츠 진행 지연 | +2 | 계정 상황 의존 — 계정 정보 없으면 보수적 적용 |
| 역할 대체 캐릭터 이미 보유 | -3 | 계정 정보 있을 때만 적용 |
| 복각 확정 또는 단기 예정 | -2 | 공식 확정 정보 있을 때만 |

**reason 작성 기준:** 1문장. 반드시 위 적용 기준 중 가장 영향이 큰 1~2가지를 명시.

---

### Rule 05 — 3항목 일관성 규칙

> **Origin:** Velina Review (2026-06-21) + 구현 현황 점검 — remiel의 uncertainty 8인데 pull "optional" 불일치 사례 발견. 구현 현황 점검에서 7개 캐릭터 전체에 걸쳐 유사 불일치 다수 확인.

**규칙:** `recommendation.pull` / `confidence` / `uncertainty.score` 세 값은 반드시 논리적으로 일관되어야 한다.

| uncertainty.score | 허용 recommendation | confidence 범위 |
|---|---|---|
| 0 ~ 2 | must_pull 또는 recommended | 0.85 ~ 1.0 |
| 3 ~ 4 | recommended 또는 optional | 0.70 ~ 0.90 |
| 5 ~ 6 | optional 또는 wait_2w | 0.55 ~ 0.75 |
| 7 이상 | wait_2w 또는 skip | 0.30 ~ 0.60 |

**위반 사례 (벨리나 원본):**
- uncertainty 3인데 confidence 0.82 → 허용 범위 내 (적절)
- uncertainty 8인데 remiel의 pull "optional" → 규칙 위반 (wait_2w 이어야 함)

---

### Rule 06 — concern 작성 규칙

> **Origin:** Phase3 Validation + Velina Review (2026-06-21) — Phase3 검증에서 trigger의 concern "격파 파티 구성 여부가 가치를 결정"이 우려가 아닌 조건 설명임을 확인. Velina에서 동일 패턴 재확인.

**규칙:** `communitySummary.concern`은 반드시 **실전 사용자의 우려**를 작성한다. 조건 설명이나 캐릭터 특성 서술은 concern이 아니다.

| 유형 | 예시 | 판정 |
|---|---|---|
| concern ✅ | "레미엘 출시 지연 시 투자 가치 검증 장기화" | 허용 |
| concern ✅ | "재픽업 주기가 길어질 경우 투자 기회 손실 위험" | 허용 |
| concern ❌ | "격파 파티 구성 여부가 가치를 결정" | 조건 설명 — negative로 이동 |
| concern ❌ | "없음" | 무성의 입력. 최소 "주요 우려 없음"으로 |

---

### Rule 07 — synergySummary 출시 상태 반영 규칙

> **Origin:** Velina Review (2026-06-21) — 벨리나 synergySummary가 "레미엘 보유 여부가 가치 결정"으로 기재됐으나, 레미엘이 여전히 미출시임을 확인. 파트너 출시 상태를 기재하지 않으면 사실 오류 발생.

**규칙:** synergySummary에서 시너지 파트너 캐릭터를 언급할 때, 해당 파트너의 **현재 출시 상태**를 반드시 반영한다.

| 파트너 상태 | 작성 방식 |
|---|---|
| 출시 완료 | "[파트너]와 [시너지명]으로 최대 효율" |
| 미출시 예정 | "[파트너] 출시 예정 — 현재 범용 이상 파티에서 성능 검증 완료" |
| 미정 | "[파트너] 미확정 — 단독 또는 범용 파티 운용 가능" |

---

### Rule 08 — confidence 갱신 규칙

> **Origin:** Velina Review (2026-06-21) + 구현 현황 점검 — 벨리나 confidence 0.82는 미출시 기반 수치가 출시 후 갱신되지 않았음. remiel confidence 0.7은 미출시 기준으로 적절. 출시 상태별 범위 기준 수립 필요성 확인.

**규칙:** confidence는 캐릭터 출시 상태에 따라 반드시 갱신한다.

| 상태 | confidence 범위 |
|---|---|
| 미출시 (사전 정보 기반) | 0.50 ~ 0.75 |
| 출시 직후 (1개월 이내) | 0.75 ~ 0.88 |
| 출시 후 커뮤니티 검증 완료 | 0.88 ~ 0.95 |
| 장기 메타 안정화 확인 | 0.92 ~ 0.98 |

---

### Rule 09 — communitySummary 최소 수량 규칙

> **Origin:** Phase3 Validation + 구현 현황 점검 — Phase3 검증에서 GPT가 단일 출처 의견을 communitySummary에 반영하는 문제 확인. 구현 현황 점검에서 7개 캐릭터의 negative가 1개뿐인 경우 다수 발견.

**규칙:** communitySummary의 각 항목은 **반드시 2개 이상의 서로 다른 출처**에서 반복 확인된 의견만 포함한다.

| 항목 | 최솟값 | 미달 시 처리 |
|---|---|---|
| positive | 2개 이상 | 1개면 삭제 또는 합산 |
| negative | 1개 이상 | 없으면 "주요 부정 의견 없음" |
| commonOpinion | 2개 플랫폼 공통 | 미달이면 "커뮤니티 공통 의견 없음" |
| concern | 1개 이상 | 없으면 "주요 우려 없음" |

---

## Architecture Rules (Layer 책임 정의)

> 이 규칙은 Version 2.0 Architecture PRD에서 추출된 구조 원칙입니다.
> meta.json 작성, evaluationEngine 수정, UI 변경 시 반드시 준수해야 합니다.

---

### Rule A — meta.json 계정 의존 데이터 금지

> **Origin:** Version 2.0 Architecture PRD (2026-06-22)

**규칙:** meta.json의 어떤 필드에도 계정 상태를 전제로 한 계산 결과를 넣지 않는다.

| 금지 표현 | 대체 처리 |
|---|---|
| "현재 계정 즉시 상승량은 제한적" | 삭제 — evaluationEngine의 accountGrowth가 이미 처리 |
| "파티 완성도가 낮아 효율 감소" | 삭제 — evaluationEngine의 파티 판단 영역 |
| fomoRisk 계정 보정 완료값 | evaluationEngine이 baseScore에서 조정하여 출력 |

---

### Rule B — evaluationEngine이 유일한 계산 레이어

> **Origin:** Version 2.0 Architecture PRD (2026-06-22)

**규칙:** 계정 정보(userRoster)를 사용하는 모든 계산은 evaluationEngine에서만 수행한다. app.js, index.html에서 계산 로직 작성 금지.

**현재 위반 사례 (v2.0 이관 예정):**
- app.js의 추천 행동 분기 (`finalScore < 5.5 → 스킵`, `uncertainty >= 7 → 2주 대기`) → evaluationEngine 이관 예정

---

### Rule C — UI는 계산하지 않고 표시만 한다

> **Origin:** Version 2.0 Architecture PRD (2026-06-22)

**규칙:** app.js는 evaluationEngine.evaluate()의 출력을 받아 화면에 표시하는 역할만 한다. 점수 계산, 추천 분기, FOMO 판단은 app.js에서 작성하지 않는다.

---

### Rule D — characters.json은 게임 사실만 저장한다

> **Origin:** Version 2.0 Architecture PRD (2026-06-22)

**규칙:** characters.json에는 게임 자체에서 정의된 데이터만 저장한다. 투자 가치, 커뮤니티 의견, 메타 점수는 포함하지 않는다.

---

### Rule E — Layer 단방향 의존 원칙

> **Origin:** Version 2.0 Architecture PRD (2026-06-22)

**규칙:** 데이터는 반드시 L1 → L2 → L3 → L4 방향으로만 흐른다.

```
Layer 1: characters.json  → 게임 공식 사실
    ↓
Layer 2: meta.json        → 캐릭터 고유 투자 가치 (계정 무관)
    ↓
Layer 3: evaluationEngine → 계정 기반 계산 (유일한 계산 레이어)
    ↓
Layer 4: app.js           → 표시 전용 (계산 없음)
```

| 금지 패턴 | 이유 |
|---|---|
| L2(meta.json)가 L3 계산 결과를 저장 | 역방향 의존 |
| app.js(L4)가 meta.json(L2)을 evaluationEngine 없이 직접 읽어 판단 | Layer 3 우회 |
| evaluationEngine(L3)이 DOM(L4)에 접근 | 역방향 의존 |

---

### Rule F — fomoRisk 이중 구조 원칙

> **Origin:** Version 2.0 Architecture PRD (2026-06-22)

**규칙:** meta.json에는 fomoRisk 기준값(계정 무관)만 저장한다. 계정 보정(역할 대체 캐릭터 보유 시 -3 등)은 evaluationEngine이 계산하여 adjustedScore로 출력한다.

```
meta.json.fomoRisk.score → 기준값 (계정 무관, L2)
    ↓
evaluationEngine: score + 계정 보정 (역할 대체 보유 -3 등)
    ↓
result.fomoRisk.adjustedScore (L3 출력)
    ↓
app.js: adjustedScore ≥ 7 경고 표시 (L4)
```

**현재 상태:** meta.json에 `score` 단일 저장 중 (기준값 역할 수행) → v2.0에서 evaluationEngine 보정 로직 추가 예정

---

### Rule G — skipReasons 조건 기술 형태만 허용

> **Origin:** Version 2.0 Architecture PRD (2026-06-22)

**규칙:** meta.json의 skipReasons는 반드시 계정 조건을 기술하는 형태로만 작성한다. 계정 계산 결과를 서술하지 않는다.

| 허용 형태 | 금지 형태 |
|---|---|
| "[캐릭터] 미보유 시 단독 가치 제한적" | "현재 계정 즉시 상승량은 제한적" |
| "[파티/속성] 파티 미운영 시 효율 감소" | "딜러 체감은 적음" |
| "복각 대기 가능 (복각 주기 미정)" | "파티 완성도 기준으로 스킵" |

---

## meta.json 작성 체크리스트

> meta.json 신규 작성 또는 기존 수정 시 반드시 이 체크리스트를 통과해야 합니다.

### Phase 1 — 사전 확인

```
□ 캐릭터 출시 여부 확인 (출시 / 미출시 / 출시 X일 경과)
□ 데이터 수집 출처 2개 이상 확보 (아카라이브 + Reddit or 빌리빌리)
□ 티어표(Game8/Prydwen) 단독 사용 여부 확인 → 사용 금지
□ 단일 게시글 의견 포함 여부 확인 → 포함 금지
```

### Phase 2 — officialSummary 검증

```
□ skillSummary: 공식 메커니즘 명칭 사용 여부 (Rule 02)
□ skillSummary: 커뮤니티 별칭("핵폭" 등) 미포함 여부 (Rule 02)
□ synergySummary: 시너지 파트너 출시 상태 반영 여부 (Rule 07)
□ sourceSummary: "확인 완료" 외 구체적 출처 명시 여부
□ 미출시 시: 모든 항목에 "미공개/미확정" 명시
□ 출시 후: "미출시", "미검증", "미확정" 문장 전면 제거 (Rule 01)
```

### Phase 3 — communitySummary 검증

```
□ positive: 2개 이상, 반복 확인 여부 (Rule 09)
□ negative: 1개 이상 또는 "주요 부정 의견 없음" 명시
□ commonOpinion: 2개 이상 플랫폼 공통 확인 여부
□ concern: 조건 설명이 아닌 실제 우려 여부 (Rule 06)
□ 미출시 표현 포함 여부 → 포함 금지 (출시 후)
```

### Phase 4 — uncertainty 검증

```
□ score가 buildPrompt 5개 항목 기반 누적 계산인지 확인
□ reasons 항목이 buildPrompt 항목과 일치하는지 확인
□ 미출시 캐릭터: score 최소 5 이상
□ 출시 1개월 이내: score 2~4 범위
□ 출시 검증 완료: score 0~3 범위
```

### Phase 5 — fomoRisk 검증

```
□ score가 Rule 04 기준 3항목 기반 계산인지 확인
□ reason에 복각/대체가능성/시너지 중 1가지 이상 명시
□ 계정 정보 없이 계산 시: 보수적(중간값) 적용 명시
□ "심리 주의"만 있는 reason → 구체적 근거로 교체 (Rule 04)
```

### Phase 6 — 3항목 일관성 검증 (Rule 05)

```
□ uncertainty.score와 recommendation.pull 매핑 일치 여부
□ uncertainty.score와 confidence 범위 일치 여부
□ recommendation.pull과 confidence 값 일치 여부

검증표:
  uncertainty 0~2 → must_pull 또는 recommended, confidence 0.85+
  uncertainty 3~4 → recommended 또는 optional, confidence 0.70~0.90
  uncertainty 5~6 → optional 또는 wait_2w, confidence 0.55~0.75
  uncertainty 7+  → wait_2w 또는 skip, confidence 0.30~0.60
```

### Phase 7 — skipReasons 검증 (Rule 03)

```
□ evaluationEngine 영역 침범 표현 미포함 여부
  ("계정 즉시 상승량", "체급 상승 제한" 등)
□ 계정 조건 기반 표현 사용 여부
  ("[파티/역할] 없으면", "[캐릭터명] 보유 시" 등)
□ "역할 중복"과 "메커니즘 비호환" 구분 여부
□ skipReasons가 1개뿐인 경우: 추가 발굴 또는 이유 명시
```

### Phase 8 — 최종 점수 검증

```
□ characterRecommendation.score와 metaScore 비례 관계 확인
□ weaponRecommendation.reason에 구체적 메커니즘 연결 여부
□ breakthroughRecommendation.score와 돌파 효율 관계 확인
□ confidence 출시 상태 반영 여부 (Rule 08)
```

---

## 현재 프로젝트에 반영 여부

| 규칙 | 현재 반영 여부 | 비고 |
|---|---|---|
| 5단계 투자 등급 | ✅ 부분 반영 | 스킵/2주대기/명전/명함+전무보류/명함 5단계 구현 |
| 계정 속성 공백 감지 | ❌ 미반영 | accountGrowth에 역할 공백만 있고 속성 공백은 없음 |
| 완성 파티 우선 검토 | ❌ 미반영 | 파티 완성도 지표 없음 |
| 기존 캐릭터 활용 가능성 검토 | ❌ 미반영 | 현재 신캐만 평가, 기존 캐릭터 활용도 고려 없음 |
| 메타 수집 출처 가중치 | ❌ 미반영 | sources 필드 있으나 가중치 계산 미구현 |
| 전무 보류 조건 세분화 | ✅ 반영 | uncertainty >= 5 이면 전무 보류 구현됨 |
| 커뮤니티 단일 게시물 금지 | ❌ 미반영 | 프롬프트에는 있으나 GPT가 지키지 않는 경우 있음 |
| uncertainty 상승 조건 5개 | ✅ 반영 | 서버 buildPrompt에 5개 항목 포함 |
| FOMO 계정 기반 판단 | ❌ 미반영 | 현재 계정 정보 없이 FOMO 판단 |
| 최종 판단 문장 논리 | ✅ 부분 반영 | 자동 조합 텍스트 있으나 GPT 원형과 차이 있음 |

---

## 구현 현황 점검 (PROJECT_STATUS.md 1:1 비교)

> 점검 기준일: 2026-06-21
> 비교 대상: AI_ANALYSIS_QUALITY.md 규칙 vs PROJECT_STATUS.md 구현 상태

---

### R01. 계정 보유 캐릭터 파악

| 항목 | 내용 |
|---|---|
| 현재 상태 | ✅ 구현 완료 |
| 관련 파일 | app.js (appState.rosters) / localStorage |
| 현재 구현 방식 | localStorage에 gameId별 roster 저장. 보유 여부/명수/전무 입력 가능 |
| 미구현 이유 | — |
| 구현 난이도 | — |
| 투자 판단 영향도 | 높음 |
| 우선순위 | 완료 |

---

### R02. 완성된 파티 현황 파악

| 항목 | 내용 |
|---|---|
| 현재 상태 | ❌ 미구현 |
| 관련 파일 | evaluationEngine.js / app.js |
| 현재 구현 방식 | 없음. 개별 캐릭터 보유 여부만 저장. 파티 구성 개념 없음 |
| 미구현 이유 | 파티 구성 데이터 구조 미설계 |
| 구현 난이도 | 높음 |
| 투자 판단 영향도 | 높음 |
| 우선순위 | P1 |

---

### R03. 계정 속성 공백 식별

| 항목 | 내용 |
|---|---|
| 현재 상태 | ❌ 미구현 |
| 관련 파일 | evaluationEngine.js / data/games/zzz/characters.json |
| 현재 구현 방식 | characters.json에 element 필드는 있음. accountGrowth에 속성 공백 계산 없음 |
| 미구현 이유 | accountGrowth에 역할 공백만 반영. 속성별 커버 맵 로직 미추가 |
| 구현 난이도 | 보통 |
| 투자 판단 영향도 | 높음 |
| 우선순위 | P0 |

---

### R04. 역할 공백 식별

| 항목 | 내용 |
|---|---|
| 현재 상태 | ⚠️ 일부 구현 |
| 관련 파일 | evaluationEngine.js (accountGrowth) |
| 현재 구현 방식 | accountGrowth에 역할 공백(roleGap) 반영. 그러나 역할 분류가 meta.json의 고정값에 의존 |
| 미구현 이유 | 보유 캐릭터 전체의 역할 분포 계산 없음. 메인딜/서포터/이상트리거 불균형 감지 없음 |
| 구현 난이도 | 보통 |
| 투자 판단 영향도 | 높음 |
| 우선순위 | P0 |

---

### R05. 5단계 투자 등급 분류

| 항목 | 내용 |
|---|---|
| 현재 상태 | ⚠️ 일부 구현 |
| 관련 파일 | evaluationEngine.js / app.js |
| 현재 구현 방식 | 스킵/2주대기/명전추천/명함+전무보류/명함추천 5단계 존재 |
| 미구현 이유 | "계정에 필요 없음"(계정 커버됨 이유의 스킵)과 "캐릭터 약함"이유 스킵이 구분되지 않음 |
| 구현 난이도 | 낮음 |
| 투자 판단 영향도 | 보통 |
| 우선순위 | P2 |

---

### R06. 역할 분류 (메인딜/서포터/이상트리거)

| 항목 | 내용 |
|---|---|
| 현재 상태 | ✅ 구현 완료 |
| 관련 파일 | data/games/zzz/characters.json (role 필드) |
| 현재 구현 방식 | 55개 캐릭터 전체에 role 필드 존재 |
| 미구현 이유 | — |
| 구현 난이도 | — |
| 투자 판단 영향도 | 높음 |
| 우선순위 | 완료 |

---

### R07. 커뮤니티 여론 반영

| 항목 | 내용 |
|---|---|
| 현재 상태 | ⚠️ 일부 구현 |
| 관련 파일 | data/games/zzz/meta.json / server.js |
| 현재 구현 방식 | meta.json 7개 캐릭터에 communitySummary 필드 완비. GPT API로 신규 생성 가능 |
| 미구현 이유 | 7/55개만 입력. GPT가 한국 커뮤니티(아카라이브/디시) 실제 접근 불가 |
| 구현 난이도 | 높음 (실제 스크래핑), 낮음 (수동 입력) |
| 투자 판단 영향도 | 높음 |
| 우선순위 | P0 |

---

### R08. 동일 역할 보유 캐릭터 수 반영 (replacementScore)

| 항목 | 내용 |
|---|---|
| 현재 상태 | ✅ 구현 완료 |
| 관련 파일 | evaluationEngine.js / meta.json (replacementScore 필드) |
| 현재 구현 방식 | replacementScore: 대체 가능한 캐릭터 많을수록 finalScore 감소 |
| 미구현 이유 | — |
| 구현 난이도 | — |
| 투자 판단 영향도 | 높음 |
| 우선순위 | 완료 |

---

### R09. 티어표 단독 점수 금지

| 항목 | 내용 |
|---|---|
| 현재 상태 | ✅ 구현 완료 |
| 관련 파일 | server.js (SYSTEM_PROMPT) / PROJECT_STATUS.md (프로젝트 전용 규칙) |
| 현재 구현 방식 | SYSTEM_PROMPT에 "Game8/Prydwen/티어표 참조 금지" 명시. 프로젝트 규칙에도 기재 |
| 미구현 이유 | — |
| 구현 난이도 | — |
| 투자 판단 영향도 | 보통 |
| 우선순위 | 완료 |

---

### R10. 단일 게시물 의견 금지

| 항목 | 내용 |
|---|---|
| 현재 상태 | ⚠️ 일부 구현 |
| 관련 파일 | server.js (SYSTEM_PROMPT + buildPrompt) |
| 현재 구현 방식 | 프롬프트에 "단일 게시물 금지" 명시. 그러나 GPT가 준수하지 않는 사례 확인 (Phase3 검증) |
| 미구현 이유 | 서버 사이드 필터링 없음. GPT 자유 검색에 의존 |
| 구현 난이도 | 높음 (서버 사이드 스크래핑 필요) |
| 투자 판단 영향도 | 높음 |
| 우선순위 | P1 |

---

### R11. 공식/커뮤니티 데이터 분리

| 항목 | 내용 |
|---|---|
| 현재 상태 | ✅ 구현 완료 |
| 관련 파일 | meta.json (officialSummary / communitySummary 분리) / server.js |
| 현재 구현 방식 | officialSummary = 공식 출처만. communitySummary = 커뮤니티만. UI 블록 14/15 분리 렌더링 |
| 미구현 이유 | — |
| 구현 난이도 | — |
| 투자 판단 영향도 | 보통 |
| 우선순위 | 완료 |

---

### R12. uncertainty 상승 조건 (5개 중 4개)

| 항목 | 내용 |
|---|---|
| 현재 상태 | ⚠️ 일부 구현 |
| 관련 파일 | server.js (buildPrompt) / meta.json (uncertainty 필드) / app.js (블록 12) |
| 현재 구현 방식 | 공식스킬미공개+3 / 게시물5개미만+2 / 긍부정비율+2 / 미출시+2 / 자료부족+1 = 4개 |
| 미구현 이유 | "픽업 배너 정보 없음" 조건이 buildPrompt에 없음 |
| 구현 난이도 | 낮음 |
| 투자 판단 영향도 | 보통 |
| 우선순위 | P2 |

---

### R13. 스킵 조건 - 완성 파티 존재

| 항목 | 내용 |
|---|---|
| 현재 상태 | ❌ 미구현 |
| 관련 파일 | evaluationEngine.js |
| 현재 구현 방식 | 없음. 동일 역할 캐릭터 수는 있으나 "파티 완성도" 개념 없음 |
| 미구현 이유 | 파티 구성 데이터 구조 미설계 (R02와 같은 원인) |
| 구현 난이도 | 높음 |
| 투자 판단 영향도 | 높음 |
| 우선순위 | P1 |

---

### R14. 스킵 조건 - 동급 이상 캐릭터 이미 보유

| 항목 | 내용 |
|---|---|
| 현재 상태 | ⚠️ 일부 구현 |
| 관련 파일 | evaluationEngine.js (replacementScore → finalScore 감소) |
| 현재 구현 방식 | replacementScore가 높으면 finalScore 낮아져 간접적으로 스킵 유도. 직접 비교 없음 |
| 미구현 이유 | "이미 보유한 동급 캐릭터"를 명시적으로 비교하는 로직 없음 |
| 구현 난이도 | 보통 |
| 투자 판단 영향도 | 높음 |
| 우선순위 | P1 |

---

### R15. 스킵 조건 - 지원/딜러 불균형

| 항목 | 내용 |
|---|---|
| 현재 상태 | ❌ 미구현 |
| 관련 파일 | evaluationEngine.js |
| 현재 구현 방식 | 없음 |
| 미구현 이유 | 보유 캐릭터 전체의 역할 분포 분석 없음 |
| 구현 난이도 | 높음 |
| 투자 판단 영향도 | 보통 |
| 우선순위 | P2 |

---

### R16. 명함/명전 추천 조건

| 항목 | 내용 |
|---|---|
| 현재 상태 | ⚠️ 일부 구현 |
| 관련 파일 | evaluationEngine.js / app.js |
| 현재 구현 방식 | finalScore + weaponScore + uncertainty 조합으로 명함/명전 판단. 세부 시너지 조건 없음 |
| 미구현 이유 | "전무가 핵심 메커니즘 강화" "미래 시너지 + 전무 시너지" 등 세부 조건 없음 |
| 구현 난이도 | 보통 |
| 투자 판단 영향도 | 높음 |
| 우선순위 | P1 |

---

### R17. 전무 보류 조건

| 항목 | 내용 |
|---|---|
| 현재 상태 | ⚠️ 일부 구현 |
| 관련 파일 | evaluationEngine.js / app.js |
| 현재 구현 방식 | uncertainty >= 5 이면 "명함만 확보 후 전무 보류" 출력 |
| 미구현 이유 | 복각 주기 / 전무 효율 대비 캐릭터 본체 비교 조건 없음 |
| 구현 난이도 | 보통 |
| 투자 판단 영향도 | 보통 |
| 우선순위 | P2 |

---

### R18. 계정 기반 FOMO 판단

| 항목 | 내용 |
|---|---|
| 현재 상태 | ❌ 미구현 |
| 관련 파일 | server.js / app.js |
| 현재 구현 방식 | fomoRisk는 GPT가 계정 정보 없이 계산. 실제 보유 캐릭터 고려 안 됨 |
| 미구현 이유 | /api/meta-update 요청에 roster 정보 미포함 |
| 구현 난이도 | 낮음 |
| 투자 판단 영향도 | 높음 |
| 우선순위 | P0 |

---

### R19. 최종 판단 문장 (속성 공백 포함)

| 항목 | 내용 |
|---|---|
| 현재 상태 | ❌ 미구현 |
| 관련 파일 | app.js (블록 16) |
| 현재 구현 방식 | 캐릭터명 + 추천행동 + 계정기여/대체성/보유여부/FOMO 자동 조합. 속성 공백 언급 없음 |
| 미구현 이유 | 속성 커버 맵 자체가 없으므로 판단 문장에 반영 불가 |
| 구현 난이도 | 보통 (R03 구현 이후 가능) |
| 투자 판단 영향도 | 보통 |
| 우선순위 | P1 |

---

### R20. 메타 수집 출처 실제 접근 (한국 커뮤니티)

| 항목 | 내용 |
|---|---|
| 현재 상태 | ❌ 미구현 |
| 관련 파일 | server.js |
| 현재 구현 방식 | buildPrompt에 아카라이브/디시 검색 지시 있음. GPT가 실제 접근 불가 (Phase3 검증에서 확인) |
| 미구현 이유 | Phase 3.2 서버 사이드 스크래핑 미구현 |
| 구현 난이도 | 높음 |
| 투자 판단 영향도 | 높음 |
| 우선순위 | P0 |

---

### R21. 메타 수집 항목 완비

| 항목 | 내용 |
|---|---|
| 현재 상태 | ✅ 구현 완료 |
| 관련 파일 | meta.json / evaluationEngine.js |
| 현재 구현 방식 | metaScore/futureScore/replacementScore/pullReasons/skipReasons/recommendations/sources 모두 구현 |
| 미구현 이유 | — |
| 구현 난이도 | — |
| 투자 판단 영향도 | 높음 |
| 우선순위 | 완료 |

---

### R22. 메타 영역 분리 (meta.json vs evaluationEngine)

| 항목 | 내용 |
|---|---|
| 현재 상태 | ✅ 구현 완료 |
| 관련 파일 | meta.json / evaluationEngine.js |
| 현재 구현 방식 | meta.json = 캐릭터 자체 가치. evaluationEngine = 계정 반응 계산. 완전 분리 |
| 미구현 이유 | — |
| 구현 난이도 | — |
| 투자 판단 영향도 | 높음 |
| 우선순위 | 완료 |

---

### R23. 기존 캐릭터 활용 가능성 선 검토

| 항목 | 내용 |
|---|---|
| 현재 상태 | ❌ 미구현 |
| 관련 파일 | evaluationEngine.js / app.js |
| 현재 구현 방식 | 없음. 신규 픽업 캐릭터만 평가. 기존 보유 캐릭터 조합 가능성 분석 없음 |
| 미구현 이유 | 파티 구성 데이터 구조 미설계 (R02와 같은 원인) |
| 구현 난이도 | 높음 |
| 투자 판단 영향도 | 높음 |
| 우선순위 | P1 |

---

## 우선순위 TOP 10 (미반영 규칙 기준)

| 순위 | 규칙 | 이유 |
|---|---|---|
| 1 | 계정 속성 공백 감지 | 투자 판단의 핵심 — 현재 완전 미반영 |
| 2 | FOMO 계정 기반 판단 | fomoRisk가 계정 없이 계산되어 의미 없음 |
| 3 | 커뮤니티 실검색 결과 기반 분석 | GPT 자유 검색으로는 한국 커뮤니티 접근 불가 |
| 4 | 완성 파티 우선 검토 | 동일 역할 캐릭터 보유 여부보다 파티 완성도가 중요 |
| 5 | 기존 캐릭터 활용 가능성 우선 | 신캐 투자 전 기존 보유 캐릭터 재조합 검토 |
| 6 | 메타 수집 출처 가중치 적용 | 아카라이브 > 디시 > Reddit 순 가중치 구현 |
| 7 | 전무 추천 조건 세분화 | 현재 단순 점수 기반 — 역할/전무 시너지 고려 필요 |
| 8 | 커뮤니티 단일 게시물 필터링 | GPT가 단일 출처 의견을 대표 의견으로 쓰는 현상 방지 |
| 9 | 스킵 이유 "계정에 불필요" vs "캐릭터 약함" 분리 | 현재 스킵 이유가 혼재 |
| 10 | 최종 판단 문장에 속성 공백 여부 포함 | 현재 자동 생성 문장에 속성 공백 언급 없음 |

---

## Change Log

### v1.0 — 2026-06-21

**추가**
- 목적 섹션
- Chat History에서 추출한 투자 판단 규칙 (12개 섹션)
  - 판단 순서 규칙 / 5단계 투자 등급
  - 중요하게 사용한 정보 / 무시한 정보
  - 공식 vs 커뮤니티 비교 규칙
  - uncertainty 상승 조건 / 스킵 추천 조건
  - 명함 추천 조건 / 전무(명전) 추천 조건
  - 계정 정보 활용 규칙 / 최종 추천 문장 논리
  - 메타 데이터 수집 규칙 / 투자 판단 핵심 기준

**Origin:** Gpt_Chat_History.md

---

### v1.1 — 2026-06-21

**추가**
- 구현 현황 점검 섹션 (PROJECT_STATUS.md 1:1 비교)
  - R01 ~ R23: 23개 규칙별 현재 상태 / 관련 파일 / 구현 방식 / 우선순위
- 우선순위 TOP 10 섹션
- 현재 프로젝트에 반영 여부 표

**Origin:** PROJECT_STATUS.md + AI_ANALYSIS_QUALITY.md v1.0 교차 분석

---

### v1.2 — 2026-06-21

**추가**
- 메타 데이터 품질 표준 규칙 섹션 (Standard Rules)
  - Rule 01: 미출시 표현 제거 규칙
  - Rule 02: skillSummary 메커니즘 명칭 규칙
  - Rule 03: skipReasons 작성 규칙
  - Rule 04: fomoRisk 계산 규칙
  - Rule 05: 3항목 일관성 규칙
  - Rule 06: concern 작성 규칙
  - Rule 07: synergySummary 출시 상태 반영 규칙
  - Rule 08: confidence 갱신 규칙
  - Rule 09: communitySummary 최소 수량 규칙

**Origin:** Velina Review (2026-06-21 벨리나 출시 후 재검증)

---

### v1.3 — 2026-06-21

**추가**
- meta.json 작성 체크리스트 섹션
  - Phase 1: 사전 확인 (4개 항목)
  - Phase 2: officialSummary 검증 (6개 항목)
  - Phase 3: communitySummary 검증 (5개 항목)
  - Phase 4: uncertainty 검증 (5개 항목)
  - Phase 5: fomoRisk 검증 (4개 항목)
  - Phase 6: 3항목 일관성 검증 (3개 항목 + 검증표)
  - Phase 7: skipReasons 검증 (4개 항목)
  - Phase 8: 최종 점수 검증 (4개 항목)
  - 총 32개 체크 항목

**Origin:** Standard Rules v1.2 일반화 + Velina Standard Character 지정

---

### v1.4 — 2026-06-22

**추가**
- Architecture Rules 섹션 (Layer 1~4 책임 정의)
  - Rule A: meta.json 계정 의존 데이터 금지
  - Rule B: evaluationEngine이 유일한 계산 레이어
  - Rule C: UI는 계산하지 않고 표시만
  - Rule D: characters.json은 게임 사실만
  - Rule E: Layer 단방향 의존 원칙
  - Rule F: fomoRisk 이중 구조 원칙 (기준값 → adjustedScore)
  - Rule G: skipReasons 조건 기술 형태만 허용
  - 총 7개 Architecture Rules

**Origin:** Version 2.0 Architecture PRD (2026-06-22)

---

## 현재 활성 규칙

```
이 프로젝트는 AI_ANALYSIS_QUALITY.md Version 1.4 기준으로 동작한다.
```

**활성 규칙 목록**

| 규칙 집합 | 섹션 | 규칙 수 | 버전 |
|---|---|---|---|
| 투자 판단 기본 규칙 | Chat History에서 추출한 투자 판단 규칙 (§1~§12) | 12개 | v1.0 |
| 구현 현황 기준 | 구현 현황 점검 (R01~R23) | 23개 | v1.1 |
| meta.json 작성 표준 | Standard Rules (Rule 01~09) | 9개 | v1.2 |
| 작성 체크리스트 | meta.json 작성 체크리스트 (Phase 1~8) | 32개 항목 | v1.3 |
| Architecture Rules | Layer 1~4 책임 정의 (Rule A~G) | 7개 | v1.4 |

**기준 캐릭터:** 벨리나 (2026-06-21 재검증 통과, Standard Character 지정)

**다음 버전 예정 작업**

| 예정 버전 | 내용 |
|---|---|
| v1.5 | 기존 6개 캐릭터 (remiel/miyabi/astra_yao/caesar/trigger/yanagi) Standard Rules 적용 수정 후 체크리스트 통과 기록 |
| v1.6 | 레미엘 출시 후 재검증 및 Standard Rules 적용 |
| v2.0 | 계정 기반 FOMO 판단 (R18) 구현 이후 문서 반영 |
