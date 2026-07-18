function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function calculateAccountGrowth_mvp(character, meta, userRoster, allCharacters) {
  // 1. 역할 공백 (0~3)
  var sameRoleCount = 0;
  for (var i = 0; i < userRoster.characters.length; i++) {
    var entry = userRoster.characters[i];
    for (var j = 0; j < allCharacters.length; j++) {
      if (allCharacters[j].id === entry.characterId && allCharacters[j].role === character.role) {
        sameRoleCount++;
        break;
      }
    }
  }
  var roleGap = sameRoleCount === 0 ? 3 :
                sameRoleCount === 1 ? 2 :
                sameRoleCount === 2 ? 1 : 0;

  // 2. 메타 등급 보정 (0~3)
  var metaBonus = ((meta.metaScore || 0) / 10) * 3;

  // 3. 시너지 점수 (0~2)
  var futureLinks = meta.futureLinks || [];
  var futureLinksIds = futureLinks.map(function(fl) { return fl.characterId; });
  var ownedLinkCount = userRoster.characters.filter(function(entry) {
    return futureLinksIds.indexOf(entry.characterId) !== -1;
  }).length;
  var currentSynergy = Math.min(1.5, ownedLinkCount * 0.75);
  var futureSynergy = 0;
  if (futureLinks.length > 0) {
    var confidenceSum = 0;
    for (var k = 0; k < futureLinks.length; k++) {
      confidenceSum += futureLinks[k].confidence;
    }
    futureSynergy = Math.min(0.5, (confidenceSum / futureLinks.length) * 0.5);
  }
  var synergyScore = Math.min(2, currentSynergy + futureSynergy);

  // 4. 파티 기여도 (0~1)
  var UNIVERSAL_ROLES = ['support', 'defense', 'stun', 'rupture'];
  var partyBonus = UNIVERSAL_ROLES.indexOf(character.role) !== -1 ? 1 : 0;

  // 5. 대체 불가능성 (0~1)
  var replacementBonus = ((10 - (meta.replacementScore || 0)) / 10);

  return clamp(roleGap + metaBonus + synergyScore + partyBonus + replacementBonus, 0, 10);
}

var ACCOUNT_GROWTH_METHODS = {
  mvp: calculateAccountGrowth_mvp
};

function calculateItemAverageScore(meta, itemSubWeights) {
  return (meta.characterRecommendation.score    * itemSubWeights.characterValue)
       + (meta.breakthroughRecommendation.score * itemSubWeights.breakthroughValue)
       + (meta.weaponRecommendation.score        * itemSubWeights.weaponValue);
}

function calculateFinalScore(character, meta, accountGrowth, itemAverageScore, config) {
  var w = config.evaluationWeights;
  var score = (meta.metaScore                    * w.ownPerformance)
            + (accountGrowth                      * w.accountGrowth)
            + (meta.futureScore                   * w.futureMetaValue)
            + ((10 - meta.replacementScore)       * w.replaceability)
            + (itemAverageScore                   * w.itemValue);
  return Math.round(clamp(score, 0, 10) * 10) / 10;
}

function getRecommendationLabel(pull) {
  var labels = {
    must_pull:   "필수 뽑기",
    recommended: "추천",
    optional:    "선택",
    skip:        "스킵"
  };
  return labels[pull] !== undefined ? labels[pull] : pull;
}

function getInvestmentTypeLabel(type) {
  var labels = {
    meta:       "현재 메타",
    future:     "미래 가치",
    synergy:    "시너지",
    collection: "컬렉션"
  };
  return labels[type] !== undefined ? labels[type] : type;
}

function isCurrentPickup(characterId, banner) {
  return (banner.currentBanners || []).some(function(b) { return b.characterId === characterId; });
}

// ── 계정 파츠 보유 판단 (프로젝트 심장의 첫 조각) ──────────────────────────
// gachaGuide에 적힌 파츠 캐릭터를 사용자의 실제 로스터와 대조한다.
// 이번 단계는 "명시된 characterId 보유 여부"만 본다. 다른 파티에서 사용 중인지,
// 역할만 같은 캐릭터로 대체 가능한지는 아직 판단하지 않는다(다음 단계).
function ownedIdSet(userRoster) {
  var set = {};
  var chars = (userRoster && userRoster.characters) || [];
  for (var i = 0; i < chars.length; i++) set[chars[i].characterId] = true;
  return set;
}

function splitOwned(characterIds, ownedSet) {
  var owned = [], missing = [];
  var ids = characterIds || [];
  for (var i = 0; i < ids.length; i++) {
    if (ownedSet[ids[i]]) owned.push(ids[i]); else missing.push(ids[i]);
  }
  return { owned: owned, missing: missing };
}

// 보유 캐릭터 중 지정 역할(role)을 가진 캐릭터가 있는지 (role 타입 조건 판정용)
function ownedHasRole(roles, ownedSet, allCharacters) {
  var roleList = roles || [];
  if (roleList.length === 0) return false;
  for (var i = 0; i < allCharacters.length; i++) {
    if (ownedSet[allCharacters[i].id] && roleList.indexOf(allCharacters[i].role) !== -1) return true;
  }
  return false;
}

function computeGuideAccount(gachaGuide, userRoster, allCharacters) {
  if (!gachaGuide) return null;
  var ownedSet = ownedIdSet(userRoster);

  var partyRequirements = (gachaGuide.partyRequirements || []).map(function(r) {
    var split = splitOwned(r.characterIds, ownedSet);
    var idCount = (r.characterIds || []).length;
    var roleCount = (r.roles || []).length;
    var hasRoleMatch = ownedHasRole(r.roles, ownedSet, allCharacters);
    var status;
    if (r.type === 'one_of') {
      if (idCount === 0 && roleCount === 0) status = 'unknown';
      else status = (split.owned.length > 0 || hasRoleMatch) ? 'met' : 'unmet';
    } else if (r.type === 'all') {
      if (idCount === 0) status = 'unknown';
      else if (split.missing.length === 0) status = 'met';
      else if (split.owned.length > 0) status = 'partial';
      else status = 'unmet';
    } else if (r.type === 'role') {
      status = roleCount === 0 ? 'unknown' : (hasRoleMatch ? 'met' : 'unmet');
    } else {
      status = 'unknown';
    }
    return {
      type: r.type, characterIds: r.characterIds || [], roles: r.roles || [],
      ownedCharacterIds: split.owned, missingCharacterIds: split.missing,
      status: status
    };
  });

  function partnerBlock(list) {
    return (list || []).map(function(p) {
      var split = splitOwned(p.characterIds, ownedSet);
      return {
        characterIds: p.characterIds || [], roles: p.roles || [],
        ownedCharacterIds: split.owned, missingCharacterIds: split.missing,
        hasAnyOwned: split.owned.length > 0
      };
    });
  }

  return {
    partyRequirements: partyRequirements,
    corePartners: partnerBlock(gachaGuide.corePartners),
    alternativePartners: partnerBlock(gachaGuide.alternativePartners)
  };
}

// ── 속성/역할 공백 판단 ────────────────────────────────────────────────────
// 내 로스터에 이 캐릭터의 역할/속성이 몇 명이나 있는지 세어, 빈자리를 채우는지 본다.
function computeGaps(character, userRoster, allCharacters) {
  var chars = (userRoster && userRoster.characters) || [];
  var idToChar = {};
  for (var i = 0; i < allCharacters.length; i++) idToChar[allCharacters[i].id] = allCharacters[i];
  var sameRole = 0, sameElement = 0;
  for (var j = 0; j < chars.length; j++) {
    var c = idToChar[chars[j].characterId];
    if (!c) continue;
    if (c.role === character.role) sameRole++;
    if (c.element === character.element) sameElement++;
  }
  return {
    sameRoleCount: sameRole,
    sameElementCount: sameElement,
    fillsRoleGap: sameRole === 0,       // 이 역할 보유가 0명 → 역할 공백을 채움
    fillsElementGap: sameElement === 0  // 이 속성 보유가 0명 → 속성 공백을 채움
  };
}

// ── 최종 투자선 판정 (규칙 기반, 6단계) ────────────────────────────────────
// 재료: 종합점수 + 불확실성 + 전무/돌파 가치 + 핵심 파츠 보유(guideAccount) + 공백(gaps)
// tier: skip / wait_2w / card_only / card_weapon / efficient_breakthrough / high_investment
function computeInvestmentTier(meta, finalScore, guideAccount, gaps) {
  var unc = (meta.uncertainty && meta.uncertainty.score) || 0;
  var weaponScore = meta.weaponRecommendation ? meta.weaponRecommendation.score : 0;
  var breakScore = meta.breakthroughRecommendation ? meta.breakthroughRecommendation.score : 0;
  var reasons = [];

  // guideAccount가 있으면 "필수 파티 조건 미충족" / "핵심 파츠 전무" 여부 확인
  var partyUnmet = false;
  if (guideAccount) {
    var reqs = guideAccount.partyRequirements || [];
    if (reqs.length > 0) partyUnmet = reqs.some(function(r) { return r.status === 'unmet'; });
  }

  var tier;
  if (unc >= 7) { tier = 'wait_2w'; reasons.push('정보가 불확실해 지금은 판단 보류'); }
  else if (partyUnmet) { tier = 'skip'; reasons.push('작동에 필요한 파티 조건을 못 채움'); }
  else if (finalScore < 5.5) { tier = 'skip'; reasons.push('종합 점수가 낮음'); }
  else if (finalScore >= 8.0 && weaponScore >= 7 && breakScore >= 6) { tier = 'high_investment'; reasons.push('종합·전무·돌파 모두 가치가 큼'); }
  else if (breakScore >= 7 && finalScore >= 6.5) { tier = 'efficient_breakthrough'; reasons.push('돌파 효율이 핵심'); }
  else if (weaponScore >= 7 && finalScore >= 6.5) { tier = 'card_weapon'; reasons.push('전무 가치가 큼'); }
  else { tier = 'card_only'; reasons.push('명함으로도 충분'); }

  // 공백 보너스는 근거로만 표시 (tier를 강제로 올리지 않음 — 규칙을 단순·투명하게 유지)
  if (gaps.fillsRoleGap) reasons.push('내 계정에 없는 역할을 채워줌');
  if (gaps.fillsElementGap) reasons.push('내 계정에 없는 속성을 채워줌');

  return { tier: tier, reasons: reasons };
}

var INVESTMENT_TIER_LABEL = {
  skip: '스킵',
  wait_2w: '2주 대기',
  card_only: '명함',
  card_weapon: '명함 + 전무',
  efficient_breakthrough: '효율 돌파',
  high_investment: '고투자'
};

function evaluate(character, meta, userRoster, allCharacters, banner, config) {
  if (meta === null) {
    return {
      character: character,
      meta: null,
      noMetaData: true,
      isCurrentPickup: isCurrentPickup(character.id, banner)
    };
  }

  var method = ACCOUNT_GROWTH_METHODS[config.accountGrowthMethod] || calculateAccountGrowth_mvp;
  var accountGrowth = method(character, meta, userRoster, allCharacters);
  var itemAverageScore = calculateItemAverageScore(meta, config.itemSubWeights);
  var finalScore = calculateFinalScore(character, meta, accountGrowth, itemAverageScore, config);

  var guideAccount = computeGuideAccount(meta.gachaGuide, userRoster, allCharacters);
  var gaps = computeGaps(character, userRoster, allCharacters);
  var investmentTier = computeInvestmentTier(meta, finalScore, guideAccount, gaps);

  return {
    character: character,
    meta: meta,
    noMetaData: false,
    accountGrowth: accountGrowth,
    itemAverageScore: itemAverageScore,
    finalScore: finalScore,
    isCurrentPickup: isCurrentPickup(character.id, banner),
    recommendationLabel: getRecommendationLabel(meta.recommendation.pull),
    investmentTypeLabels: (meta.investmentType || []).map(getInvestmentTypeLabel),
    guideAccount: guideAccount,
    gaps: gaps,
    investmentTier: investmentTier.tier,
    investmentTierLabel: INVESTMENT_TIER_LABEL[investmentTier.tier] || investmentTier.tier,
    investmentReasons: investmentTier.reasons
  };
}
