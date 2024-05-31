/*
SELECT GROUP_CONCAT(card SEPARATOR ',') FROM (SELECT CAST(SUBSTRING(card, 1, LOCATE(' ', card) - 1) AS UNSIGNED) AS card, AVG(pick) AS avg_pick FROM `draft_picks` WHERE game = 'restart' AND `set` = 3 GROUP BY card ORDER BY 2 DESC) t1;
*/

export const motd_order = {
  "10": [169,176,34,65,163,118,67,31,30,129,93,195,198,180,56,90,125,32,130,124,59,160,166,102,76,66,136,28,68,98,101,132,78,135,21,79,95,24,200,170,191,97,99,178,106,40,9,62,193,5,91,69,179,199,185,119,175,167,141,86,181,10,41,4,154,103,194,7,174,114,27,190,157,8,149,123,73,26,3,18,60,137,88,39,70,168,36,45,140,54,55,184,171,43,145,94,105,155,131,81,107,63,148,134,104,74,144,77,111,142,113,64,128,20,159,1,112,139,14,2,38,138,165,177,15,58,35,108,161,46,143,183,133,100,53,47,13,122,126,173,17,109,146,22,25,172,6,29,85,80,72,71,50,11,23,12,153,16,37,42,110,115,61,127,92,44,83,164,162,82,189,33,182,19,96,48,116,57,75,151,52,186,49,158,156,188,152,120,87,196,192,89,121,147,150,51,84,187,197,117],
  "20": [98,195,127,101,67,120,20,164,192,200,30,26,169,160,82,97,199,134,32,27,25,99,136,19,90,88,165,185,31,34,132,167,66,151,74,76,170,57,191,14,116,11,162,182,23,61,159,9,193,53,112,92,95,103,10,123,166,49,55,150,79,28,68,197,142,43,72,24,122,71,175,38,113,125,104,89,80,183,21,39,33,54,108,42,45,117,178,65,110,147,70,17,179,59,4,7,149,78,22,196,36,29,143,63,3,6,152,12,8,163,93,35,184,91,1,107,51,50,75,109,5,2,188,100,62,135,48,40,144,171,16,126,176,141,85,174,137,145,118,133,73,44,115,138,190,198,77,83,177,105,181,155,161,168,81,13,56,18,158,172,124,47,154,156,186,102,146,96,41,121,87,111,37,69,106,119,194,173,86,140,84,157,94,187,131,139,129,180,52,58,130,15,60,64,128,148,46,153,189,114],
  "30": [195,66,132,33,157,163,32,131,99,98,117,145,151,54,92,161,126,119,64,14,25,97,63,91,124,86,94,47,189,96,191,45,27,31,24,160,121,141,15,137,162,55,190,125,43,75,142,74,111,143,109,100,164,18,171,12,158,82,95,19,89,71,147,40,104,148,156,87,154,84,61,105,9,60,16,5,150,153,13,23,77,107,4,59,139,48,155,188,44,138,22,110,42,159,116,1,187,169,58,28,135,52,113,140,73,122,152,128,185,193,133,165,186,21,78,10,93,102,112,167,6,118,39,17,180,70,194,146,37,144,72,90,38,69,129,130,41,81,62,175,7,149,56,134,166,192,34,101,179,168,173,177,46,172,3,67,8,181,115,53,26,123,178,57,51,68,114,88,170,2,103,11,182,85,80,176,30,136,174,50,120,36,20,108,76,29,35,49,83,79,183,127,106,184,65]
}

export const karapet_score = {
  "10": [0,6.32,5.69,3.33,2.41,2.22,2.86,7.47,6.15,2.22,2.99,5.05,5.05,5.39,4.69,4.08,4.59,2.07,5.87,1.3,0,5.8,4.64,7.28,2.62,0,4.61,4.37,0,4.4,7.55,0,3.43,3.11,6.15,4.96,6.52,5.67,1.41,5.69,2.38,3.25,1.63,5.37,3.45,1.42,4.31,3.17,0,4.55,4.99,1.19,0,5,1.62,5.8,9.16,1.48,5.85,6.5,2.9,4.66,5.41,3.59,4.54,0,2.55,3.77,3.6,4,7.51,4.96,0,0,5.87,4.15,4.43,0,4.4,4.81,4.59,4.9,5.32,4.07,3.83,2.3,1.91,3.12,3.26,4.48,0,7.24,4.83,4.93,0,2.05,2.31,6.46,4.43,2.12,3.59,4.75,3.9,4.79,2.14,3.54,6.52,0,3.59,3.99,2.56,0,6.01,4.1,2.64,4.07,3.4,2.23,2.63,2.2,2.26,4.64,3.26,0,4.29,3.86,3.98,3.41,6.38,0,0,6.81,3.29,2,3.04,3.43,4.4,4.25,2.28,6.22,5.87,7.68,2.86,5.12,3.66,6.07,1.83,0,0,6.2,0,5.46,2.05,3.26,3.35,1.99,7.76,2.59,4.97,3.42,1.8,3.45,2.87,2.48,4.26,3.23,6.29,3.06,3.81,5.45,3.67,6.18,3.63,1.79,3.81,2.37,7.57,2.54,3.25,8.11,3.35,0,4.52,1.95,0,7.03,5.1,3.16,3.18,3.47,3.48,7.12,3.48,5.71,0.35,8.25,4.94,4.19,2.31,8.28,5.5],
  "20": [0,5.9,7.2,4.3,0.0,3.4,4.8,2.3,6.8,5.5,6.4,7.6,5.5,5.1,4.9,5.3,4.6,5.8,5.8,6.2,7.9,7.3,4.0,5.2,8.8,6.3,6.9,9.5,7.1,7.0,6.4,4.8,4.6,4.5,3.7,8.2,6.4,4.3,3.6,6.2,7.7,3.6,5.4,7.1,6.9,6.1,6.9,6.5,6.2,6.9,4.6,6.9,4.2,3.7,6.2,0.0,7.5,6.5,6.5,7.4,3.5,8.5,5.1,5.6,6.8,4.9,4.1,7.1,4.7,5.9,7.8,10.2,7.5,6.4,7.0,0.0,9.0,7.3,2.9,8.7,6.1,7.0,5.4,5.3,8.4,4.1,7.0,5.0,7.1,7.7,9.9,4.5,6.3,3.8,5.2,7.8,6.9,7.2,9.5,6.3,5.1,6.9,7.3,6.8,7.7,3.5,4.6,6.0,6.2,0.0,0,5.9,2.6,7.2,3.5,3.8,8.8,4.9,0.0,3.9,7.5,4.1,2.8,13.9,3.1,5.9,1.9,8.5,4.6,6.7,3.9,3.9,0.0,8.9,5.1,6.1,6.1,5.1,3.9,3.6,7.2,5.1,7.6,6.3,4.9,3.6,0.0,5.4,0.0,4.6,7.7,8.2,4.2,3.2,6.5,4.6,2.5,3.6,5.2,7.8,3.0,4.8,5.6,4.3,3.7,7.1,5.5,5.0,4.9,4.0,4.8,5.1,4.9,4.0,0.0,6.2,6.5,4.3,4.2,7.2,2.0,5.4,3.9,6.1,5.6,5.6,5.6,3.7,4.8,0.0,4.7,7.4,7.9,7.7,5.1,9.7,5.4,3.9,1.5,7.7,7.4],
  "21": [0,7.3,4.5,7.3,7.9,4.5,7.5,7.8,3.7,8.5,3.7,6.4,3.8,7.1,7.4,8.9,5.1,6.2,5.4,8.4],
  "22": [0,7.7,8.2,8.6,8.6,12.6,9.3,6.5,9.3,6.2,7.6,8.0,9.1,11.6,8.0,6.0,8.0,5.2,8.2,5.7,7.7,10.1,4.6,7.0,8.4,9.5,6.7,5.0,7.8,7.7,7.9,8.5,8.6,9.0,7.2,6.8,8.7],
  "30": [0,6.6,3.4,5.4,0.0,4.7,5.4,6.1,4.2,5.4,6.3,5.3,6.8,5.2,2.7,9.1,6.4,5.9,7.8,7.2,4.8,5.0,6.5,5.8,5.5,8.8,6.4,8.4,5.6,5.9,4.7,5.6,8.4,6.1,5.7,5.3,3.0,5.7,7.2,4.8,6.9,5.4,0.0,7.0,5.8,7.4,5.2,9.5,7.5,3.8,6.5,6.6,9.0,6.5,8.0,6.2,4.2,0.0,11.1,7.3,6.2,10.8,6.4,5.9,7.7,5.3,7.5,3.0,6.6,6.2,0.0,0,8.0,6.4,7.3,8.0,4.0,6.0,4.9,5.4,5.2,6.8,2.8,5.6,6.0,5.3,5.2,8.7,7.5,7.7,6.1,7.9,7.7,6.4,8.2,7.9,6.0,7.6,4.5,8.4,0.0,3.0,4.8,6.4,5.4,8.3,3.6,7.3,5.4,9.6,5.8,4.8,7.6,5.4,4.4,4.6,7.3,5.8,4.5,6.3,5.3,5.6,5.3,4.9,9.5,5.4,11.9,4.6,8.0,9.2,4.2,6.4,6.0,5.8,4.0,4.9,5.8,0.0,5.4,6.1,6.4,5.3,5.6,8.8,5.9,9.4,7.0,4.8,6.7,6.6,6.1,9.1,6.4,8.0,8.7,7.3,7.3,8.0,6.6,8.0,5.3,4.8,2.9,6.4,5.3,5.0,6.5,0.0,4.3,5.0,5.2,4.5,5.4,5.9,4.5,4.4,4.8,4.5,5.1,5.3,8.7,4.8,3.9,5.4,4.9,6.1,5.8,0.0,8.5,6.1,6.4,9.1,5.4,5.0,4.7,10.0,0,0,0,0],
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
    return array;
}


function prepareCardsByRarityAndColor(cards, set_id) {
  const cardsByRarityAndColor = {1: {}, 2: {}, 3: {}, 4: {}};

  cards.forEach(card => {
    if (card.set_id === set_id && card.altto === null) {
      if (!cardsByRarityAndColor[card.rarity][card.color])
        cardsByRarityAndColor[card.rarity][card.color] = [];
      cardsByRarityAndColor[card.rarity][card.color].push(card.id);
    }
  });

  return cardsByRarityAndColor;
}

function getBoosterV2(cardsByRarityAndColor) {
  function selectRandomCardsFromDifferentColors(cardsByColor, count, excludeCards = []) {
    const colors = Object.keys(cardsByColor);
    const selectedColors = shuffleArray(colors).slice(0, count);
    return selectedColors.flatMap(color =>
      selectRandomCards(cardsByColor[color].filter(card => !excludeCards.includes(card)), 1));
  }

  function selectRandomCards(cardsArray, count) {
    const shuffled = shuffleArray(cardsArray);
    return shuffled.slice(0, count);
  }

  const booster = [];
  booster.push(...(Math.random() < 4 / 24 ? selectRandomCardsFromDifferentColors(cardsByRarityAndColor[4], 1) : selectRandomCardsFromDifferentColors(cardsByRarityAndColor[3], 1)));
  booster.push(...selectRandomCardsFromDifferentColors(cardsByRarityAndColor[2], 3));
  const commonSelectedColors = selectRandomCardsFromDifferentColors(cardsByRarityAndColor[1], 6);
  booster.push(...commonSelectedColors);
  booster.push(...selectRandomCardsFromDifferentColors(cardsByRarityAndColor[1], 2, (Math.random() < 1 / 100) ? [] : commonSelectedColors));

  return booster;
}

export function getBooster(cards, set_id) {
  const cardsByRarityAndColor = prepareCardsByRarityAndColor(cards, set_id);
  return getBoosterV2(cardsByRarityAndColor);
  //return Math.random() < 1 / 9 ? getBoosterV1(cardsByRarityAndColor) : getBoosterV2(cardsByRarityAndColor);
}

function doKarapetPick(booster) {
  if (booster.length <= 1) return 0;

  const set = booster[0].set_id;
  const weights = karapet_score[set];

  let boosterWeights = booster.map((card, index) => {
    return {
      weight: weights[card.number],
      index: index
    }
  });

  boosterWeights.sort((a, b) => b.weight - a.weight);
  if (boosterWeights.length < 3)
    return boosterWeights[0].index;

  const topThreeWeights = boosterWeights.slice(0, 3);

  if (topThreeWeights[0].weight / topThreeWeights[2].weight < 1.1) {
    const randomIndex = Math.floor(Math.random() * topThreeWeights.length);
    return topThreeWeights[randomIndex].index;
  } else {
    return topThreeWeights[0].index;
  }
}

function doMotdOrderedPick(booster) {
  if (booster.length <= 1) return 0;
  const set = booster[0].set_id;
  const weights = motd_order[set] || [];
  let boosterWeights = booster.map((card, index) => {
    const pos = weights.indexOf(card.number)
    return {weight: pos > -1 ? pos : 1000, index: index}
  })
  boosterWeights.sort((a, b) => a.weight - b.weight);
  const topCards = boosterWeights.slice(0, 3);
  const rand = Math.random() * 100;
  if (rand < 80) {
    return topCards[0]?.index ?? 0;
  } else if (rand < 95) {
    return topCards[1]?.index ?? topCards[0]?.index ?? 0;
  } else {
    return topCards[2]?.index ?? topCards[1]?.index ?? topCards[0]?.index ?? 0;
  }
}

function doOrderedPick(booster, orderd_weight) {
  if (booster.length <= 1) return 0;
  const set = booster[0].set_id;
  const weights = orderd_weight[set] || [];
  let boosterWeights = booster.map((card, index) => {
    const pos = weights.indexOf(card.number)
    return {weight: pos > -1 ? pos : 1000, index: index}
  })
  boosterWeights.sort((a, b) => a.weight - b.weight);
  return boosterWeights[0].index;
}

export function validUserWeights(str){
  let obj;
  try {
    obj = JSON.parse(str);
  } catch (e) {
    return false;
  }
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return false;
  for (const key in obj) {
    if (!Array.isArray(obj[key])) return false;
  }
  return true;
}

export function doPick(booster, type, orderd_weight){
  if(type === 'user' && validUserWeights(orderd_weight))
    return doOrderedPick(booster, JSON.parse(orderd_weight))
  if((type || 'motd') === 'motd' || type === 'motd2')
    return doMotdOrderedPick(booster)
  return doKarapetPick(booster)
}

export function formatCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${day}-${month}-${year}`;
}