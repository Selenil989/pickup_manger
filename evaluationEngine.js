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
    guideAccount: computeGuideAccount(meta.gachaGuide, userRoster, allCharacters)
  };
}
