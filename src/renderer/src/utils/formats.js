export function readCollection(input, collection = {}, minus = false) {
  let result = collection;
  input.trim().split("\n").forEach(line => {
    if(line[0] == '#') return;
    const [id, count, ...extras] = line.split(" ");
    let cost = "0", cost_index = extras.findIndex((x)=> x == "="), cost_extras = []
    if(cost_index > -1) {
      [cost, ...cost_extras] = extras.slice(cost_index+1)
      extras.splice(cost_index);
    }
    const newCount = (minus ? -1 : 1) * parseInt(count, 10);
    const newCost = parseInt(cost, 10)
    const extrasObj = extras.reduce((acc, curr) => {
      const [key, value] = curr.split(":");
      acc[key] = (minus ? -1 : 1) * parseInt(value, 10);
      return acc;
      }, {});
    const costExtrasObj = cost_extras.reduce((acc, curr) => {
      const [key, value] = curr.split(":");
      acc[key] = parseInt(value, 10);
      return acc;
      }, {});

    if (!result[id]) {
      result[id] = { count: { "": newCount, ...extrasObj }, costs: {"": newCost, ...costExtrasObj} };
      if (result[id].count[""] < 0) result[id].count[""] = 0;
    } else {
      const updatedCount = (result[id].count[""] || 0) + newCount;
      result[id].count[""] = updatedCount < 0 ? 0 : updatedCount;
      result[id].costs = {"": newCost, ...costExtrasObj};
      Object.entries(extrasObj).forEach(([key, value]) => {
        const updatedValue = (result[id].count[key] || 0) + value;
        if (updatedValue > 0) {
          result[id].count[key] = updatedValue;
        } else {
          delete result[id].count[key];
        }
      });
    }
  })
  return result
}

export function writeCollection(collection, selectedOnly = false, selected = []) {
  let settingsList = [];
  Object.entries(collection).forEach(([id, data]) => {
    const counts = data.count[""] ? data.count[""] : 0;
    const cost = data.costs && data.costs[""] || 0;
    const extras = Object.entries(data.count)
      .filter(([key, _]) => key !== "")
      .map(([key, value]) => `${key}:${value}`)
      .join(" ");
    const extra_costs = Object.entries(data.costs || {})
      .filter(([key, _]) => key !== "" && (data.count[key] || 0) > 0)
      .map(([key, value]) => `${key}:${value}`)
      .join(" ");
    if(!selectedOnly || selected.includes(id))
      settingsList.push(`${id} ${counts}${extras ? ' ' + extras : ''}${cost > 0 ? ' = ' + cost : ''}${extra_costs ? ' ' + extra_costs : ''}`);
  });
  return settingsList.join("\n");
}

export function readDeck(card_data, input) {
  let deckName = "";
  const names = {};
  card_data.forEach(card => {
    if(card.alt == '')
      names[card.name.toLowerCase().replace('ё','е')] = card.id;
  });
  return [deckName, input.split('\n').reduce((acc, line) => {
    if(line[0] === "#") {
      deckName = line.slice(1).trim();
      return acc;
    }
    line = line.trim().replace('<br>', '').toLowerCase().replace('ё','е');
    const parts = line.split(' ');
    const firstPart = parts.shift();
    if (firstPart !== undefined) {
      const total = parseInt(firstPart, 10);
      const name = parts.join(' ');
      const id = !isNaN(parseInt(name)) ? name : names[name];
      if (!id) return acc;
      for(let i = 0; i < total; i++) acc.push(id);
    }
    return acc;
  }, [])];
}

export function writeDeck(deck, format = 'self') {
  let ret = [];
  if (format === 'proberserk') {
    deck.forEach(([card, count]) => {
      ret.push(`${count} ${card.name.replace('ё', 'е').replace('Ё', 'Е')}`);
    });
    return ret.join("\n");
  } else {
    deck.forEach(([card, count]) => {
      ret.push(`${count} ${card.id}`);
    });
    return ret.join("\n");
  }
}

export function readTTS(card_data, input) {
  const data = JSON.parse(input)
  const names = {}
  card_data.forEach(card => {
    if(card.alt == '')
      names[card.name.toLowerCase().replace('ё','е')] = card.id;
  })

  const deck = data["ObjectStates"][0]["ContainedObjects"].map(({ Nickname })=> {
    return names[Nickname.toLowerCase().replace('ё','е')];
  }).filter((x) => x !== null && x !== undefined)

  return ["", deck]
}

export function writeTTS(deck, options, deck_type='Констрактед') {
  const {path, suffix, sets, rarity, color, root_base, custom_view, deck_base, card_base, creature_types} = options;

  function GUID() {
    return Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
  }

  function fastCopy(obj){
    return JSON.parse(JSON.stringify(obj));
  }

  function getId(card){
    const list = Math.floor((card.number-1) / 69);
    return (card.set_id * 10 + list) * 100 + (card.number-1) % 69
  }

  function getURL(card, path){
    const release_suffix = suffix[`${card.set_id}`] || ''
    return `${path}${card.set_id}-${1+Math.floor((card.number-1) / 69)}${release_suffix}.jpg`
  }

  const ret = fastCopy(root_base);
  const deck_view = fastCopy(deck_base);
  deck_view["GUID"] = GUID()
  deck_view["Description"] = deck_type
  if (deck_type === 'Драфт') {
    const valid = writeCompact(deck.map((card) => [1, card.set_id, card.number]), options).slice(1).match(/.{1,32}/g).join('\n--')
    deck_view["LuaScript"] = rot13('--' + valid)
  }
  deck_view["DeckIDs"] = deck.map((card) => { return getId(card) })

  deck_view["CustomDeck"] = deck.reduce((acc, card) => {
    const faceURL = getURL(card, path);
    if (!acc[faceURL]) {
      const view = fastCopy(custom_view);
      view["FaceURL"] = faceURL;
      view["BackURL"] = path + 'back.jpg';
      const id = getId(card);
      acc[`${Math.floor(id / 100)}`] = view;
    }
    return acc;
    }, {});

  deck_view["ContainedObjects"] = deck.map((card) => {
    const card_view = fastCopy(card_base);
    const id = getId(card)
    card_view["GUID"] = GUID()
    card_view["CardID"] = getId(card)
    card_view["Nickname"] = card.name
    card_view["Tags"] = ['Card', rarity[`${card.rarity}`], color[`${card.color}`], sets[`${card.set_id}`], creature_types[`${card.type}`], `Cost_${card.cost}`, `Elite_${card.elite}`, `Uniq_${card.uniq}`]
    const view = fastCopy(custom_view)
    view["FaceURL"] = getURL(card, path)
    view["BackURL"] = path + 'back.jpg'
    card_view["CustomDeck"] = {[`${Math.floor(id / 100)}`]: view}
    return card_view
  })
  ret["ObjectStates"] = [deck_view]
  return JSON.stringify(ret)
}

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
function encodeBase64Triplet([a, b, c]) {
  let combined = (a << 15) | (b << 8) | c;
  let result = '';
  for (let i = 0; i < 3; i++) {
    const charIndex = combined & 63;
    result = BASE64_CHARS[charIndex] + result;
    combined >>= 6;
  }
  return result;
}
function decodeBase64Triplet(encodedTriplet) {
  let combined = 0;
  for (let i = 0; i < 3; i++) {
    const charIndex = BASE64_CHARS.indexOf(encodedTriplet[i]);
    combined = (combined << 6) | charIndex;
  }
  const a = ((combined >> 15) & 7);
  const b = ((combined >> 8) & 127);
  const c = (combined & 255);
  return [a, b, c];
}

export function writeCompact(data, opts = null) {
  const options = opts || window.electron.ipcRenderer.sendSync('get-consts')
  const sets = Object.keys(options['sets'])
  return '#' + data.map(([c,s,n]) => encodeBase64Triplet([c,sets.indexOf(s.toString()),n])).join('');
}

export function readCompact(str, opts = null) {
  const options = opts || window.electron.ipcRenderer.sendSync('get-consts')
  const sets = Object.keys(options['sets'])
  if(str.startsWith('#')) {
    return (str.slice(1).match(/.{1,3}/g) || []).map(chunk => decodeBase64Triplet(chunk)).reduce((acc, [count, s, number]) => {
      for(let i = 0; i < count; i++) acc.push((parseInt(sets[s]) * 1000 + number).toString());
      return acc;
      }, []);
  }
  return []
}

export function rot13(str) {
  return str.replace(/[a-zA-Z]/g, function(c){
    return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
  })
}
