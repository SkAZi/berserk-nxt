export const {sets, rarities, colors, eliteness, alternatives, user_alternatives, creature_types, collection_counts, orders, art_suffix, icons, tag_colors, tts_options } = window.electron.ipcRenderer.sendSync('get-consts');
export const cardsStore = window.electron.ipcRenderer.sendSync('get-cards')

export const cards = cardsStore.reduce((ret, card)=> {
  ret[card.id] = card;
  return ret;
}, {})

export const classes = Array.from(new Set(["Герой", ...cardsStore.flatMap(card => card.class || [])]))
  .filter(cls => cls !== "")
  .sort()
  .reduce((acc, cls) => {
    acc[cls] = cls;
    return acc;
    }, {"": "Без класса"});

export const costs = Array.from(new Set(cardsStore.map(card => card.cost)))
  .sort((a,b) => a - b)
  .reduce((acc, cost) => {
    acc[cost.toString()] = cost;
    return acc;
    }, {});

export const moves = Array.from(new Set(cardsStore.map(card => card.move || 0)))
  .sort((a,b) => a - b)
  .reduce((acc, move) => {
    acc[move.toString()] = move;
    return acc;
    }, {});

export const lifes = Array.from(new Set(cardsStore.map(card => card.life || 0)))
  .sort((a,b) => a - b)
  .reduce((acc, life) => {
    acc[life.toString()] = life;
    return acc;
    }, {});

export const min_hits = Array.from(new Set(cardsStore.map(card => card.hit ? card.hit[0] || 0 : 0)))
  .sort((a,b) => a - b)
  .reduce((acc, min_hit) => {
    acc[min_hit.toString()] = min_hit;
    return acc;
    }, {});

export const mid_hits = Array.from(new Set(cardsStore.map(card => card.hit ? card.hit[1] || 0 : 0)))
  .sort((a,b) => a - b)
  .reduce((acc, mid_hit) => {
    acc[mid_hit.toString()] = mid_hit;
    return acc;
    }, {});

export const max_hits = Array.from(new Set(cardsStore.map(card => card.hit ? card.hit[2] || 0 : 0)))
  .sort((a,b) => a - b)
  .reduce((acc, max_hit) => {
    acc[max_hit.toString()] = max_hit;
    return acc;
    }, {});

export const offitial_alternatives = Array.from(new Set(cardsStore.map(card => card.alt)))
  .reduce((acc, alt) => {
    if (alt.startsWith("alt_")) return acc;
    acc[alt] = alt == "" ? "Обычная" : alternatives[alt];
    return acc;
    }, {});

export function byId(card_ids) {
    if (typeof card_ids === 'string')
      return cards[card_ids]
    if (Array.isArray(card_ids))
      return card_ids.map((card_id) => {
        return (typeof card_id === 'string') ? cards[card_id] : card_id
      })
    return card_ids
}


function sortDiff(a, b, sortBy, orderMap = null){
  if (!a) return 1;
  if (!b) return -1;
  if (sortBy === 'asis')
    return orderMap ? orderMap[a.id] - orderMap[b.id] : 0;
  if (sortBy === 'color')
    return (100 * (b.elite ? 1 : 0) + b.cost - 1000 * b.color) - (100 * (a.elite ? 1 : 0) + a.cost - 1000 * a.color);
  if (sortBy === 'rarity')
    return ((b.elite ? 1 : 0) + 100 * b.cost + 1000 * b.rarity) - ((a.elite ? 1 : 0) + 100 * a.cost + 1000 * a.rarity);
  if (sortBy === 'number')
    return (a.set_id * 1000 + a.number) - (b.set_id * 1000 + b.number);
  if (sortBy === 'cost')
    return (1000 * (b.elite ? 1 : 0) + 100 * b.cost + b.color - (1000 * (a.elite ? 1 : 0) + 100 * a.cost + a.color))
  return (1000 * (b.elite ? 1 : 0) + 100 * b.cost + b.color) - (1000 * (a.elite ? 1 : 0) + 100 * a.cost + a.color);
}

export function sortCards(deck, sortBy){
  return deck.map(byId)
    .sort((a, b) => sortDiff(a, b, sortBy))
    .map((card) => card.id)
}

export function groupCards(deck_cards, sortBy = 'cost') {
  const cardCountMap = {};
  const orderMap = {};
  let order = 0;

  deck_cards.forEach(card_id => {
    if (!(card_id in cardCountMap)) {
      cardCountMap[card_id] = 1;
      orderMap[card_id] = order++;
    } else {
      cardCountMap[card_id] += 1;
    }
  });

  return Object.entries(cardCountMap)
      .map(([card_id, count]) => byId(card_id) ? [byId(card_id), count] : [null, card_id])
      .sort((a, b) => sortDiff(a[0], b[0], sortBy, orderMap));
}

export function ungroupCards(card_groups) {
  const flatList = card_groups.reduce((acc, [card, count]) => {
    const cardIds = Array(count).fill(card?.id);
    return acc.concat(cardIds);
    }, []);
  return flatList;
}

export function collectColors(deck_cards) {
  return [
    ...deck_cards.reduce((ret, card_id) => {
      if(byId(card_id)) ret.add(byId(card_id).color)
      return ret
    }, new Set())
  ].sort((a, b) => a - b)
}

export function statistics(cards) {
let defs = {'tcount': 0, 'elite': 0, 'uniq': 0, 'lc': 0, 'life': 0, 'ac': 0, 'atk': [0,0,0,0], 'mc': 0, 'move': 0,
  'icons': {'':0,'ova':0,'ovz':0,'ovs':0,'regen':0,'armor':0,'direct':0,'stamina':0,
    'zoo':0,'zot':0,'zom':0,'zoz':0,'zor':0,'zov':0,'zoal':0}}

  return cards.reduce((acc, card) => {
    if(!card) return acc
    acc["tcount"] += 1
    Object.keys(card.icons).forEach(i => acc['icons'][i] += 1)
    if(card.hit && card.hit.length === 3) {
      acc["ac"] += 1
      acc["atk"][0] += card.hit[0]
      acc["atk"][1] += card.hit[1]
      acc["atk"][2] += card.hit[2]
      let matklist = [card.hit[0],card.hit[0],card.hit[0],card.hit[1],card.hit[1],card.hit[2],card.hit[2],card.hit[2],card.hit[2],card.hit[2],card.hit[2]],
      ova = Math.min(card["icons"]["ova"] || 0, 5);
      acc["atk"][3] += matklist.slice(ova, ova+6).reduce((acc, x) => acc + x, 0) / 6;
    }
    if(card.life) {
      acc["lc"] += 1
      acc["life"] += card.life
    }
    if(card.move) {
      acc["mc"] += 1
      acc["move"] += card.move
    }
    acc["elite"] += card.elite == "1" ? 1 : 0;
    acc["uniq"] += card.uniq ? 1 : 0;
    return acc
  }, defs)
}

export function countOfType(deck_cards, key, value) {
  return deck_cards.reduce((acc, card_id) => {
    return acc + (byId(card_id) && byId(card_id)[key] === value ? 1 : 0)
  }, 0)
}
