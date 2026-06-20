function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function calculateAccountGrowth_mvp(character, meta, userRoster, allCharacters) {
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
  var roleGapScore = Math.max(0, 4 - sameRoleCount * 2);

  var futureLinks = meta.futureLinks || [];
  var futureLinksIds = futureLinks.map(function(fl) { return fl.characterId; });
  var ownedLinkCount = userRoster.characters.filter(function(entry) {
    return futureLinksIds.indexOf(entry.characterId) !== -1;
  }).length;
  var currentSynergyScore = Math.min(3, ownedLinkCount * 1.5);
  var futureSynergyScore = 0;
  if (futureLinks.length > 0) {
    var confidenceSum = 0;
    for (var k = 0; k < futureLinks.length; k++) {
      confidenceSum += futureLinks[k].confidence;
    }
    futureSynergyScore = (confidenceSum / futureLinks.length) * 3;
  }

  return clamp(roleGapScore + currentSynergyScore + futureSynergyScore, 0, 10);
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
  var score = (character.basePerformance         * w.ownPerformance)
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
    investmentTypeLabels: (meta.investmentType || []).map(getInvestmentTypeLabel)
  };
}
