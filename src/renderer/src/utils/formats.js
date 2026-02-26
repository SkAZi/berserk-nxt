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

export function writeCollectionCSV(collection, options, byId) {
  const {sets, rarities, alternatives} = options;
  let settingsList = [`set_name;card_num;card_name;rarity;alt;count`];
  Object.entries(collection).forEach(([idd, data]) => {
    const counts = data.count[""] ? data.count[""] : 0;
    if (counts === 0) return
    let [_, ids, alt] = idd.match(/(^\d+)([^\d]\w*)?$/)
    let id = parseInt(ids)
    let set_name = sets[((id / 1000) |0).toString()]
    let card = byId(id)
    if(!card) return
    let rarity = rarities[card.rarity.toString()]
    let name = card.name
    alt = alt ? (alternatives[alt] || "") : ""
    settingsList.push(`"${set_name}";${id % 1000};"${name}";"${rarity}";"${alt}";${counts}`)
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
  let deck = [], side = [], isSide = false
  input.split('\n').forEach((line) => {
    if(line == "---side---"){
      isSide = true
      return
    }
    if(line[0] === "#") {
      deckName = line.slice(1).trim();
      return
    }
    line = line.trim().replace('<br>', '').toLowerCase().replace('ё','е');
    const parts = line.split(' ');
    const firstPart = parts.shift();
    if (firstPart !== undefined) {
      const total = parseInt(firstPart, 10);
      const name = parts.join(' ');
      const id = !isNaN(parseInt(name)) ? name : names[name]
      if (!id) return
      for(let i = 0; i < total; i++) (isSide ? side : deck).push(id)
    }
  }, [])
  return [deckName, deck, side];
}

export function writeDeck(deck, format = 'self', side=[]) {
  let ret = [];
  if (format === 'proberserk') {
    deck.forEach(([card, count]) => {
      ret.push(`${count} ${card.name.replace('ё', 'е').replace('Ё', 'Е')}`);
    })
    if(side.length > 0) ret.push("---side---")
    side.forEach(([card, count]) => {
      ret.push(`${count} ${card.name.replace('ё', 'е').replace('Ё', 'Е')}`)
    })
  } else {
    deck.forEach(([card, count]) => {
      ret.push(`${count} ${card.id}`);
    })
    if(side.length > 0) ret.push("---side---")
    side.forEach(([card, count]) => {
      ret.push(`${count} ${card.id}`);
    })
  }
  return ret.join("\n");
}

const ttsSideScript = `
  function onLoad()
      self.addContextMenuItem("Убрать сайд", separateSideboard)
  end

  function separateSideboard(player_color)
      local deckPos = self.getPosition()
      local bounds = self.getBounds()
      for i, o in ipairs(self.getObjects()) do
          local isSide = false
          if o.tags then
              for _, tag in ipairs(o.tags) do
                  if tag == "Side" then
                      isSide = true
                      break
                  end
              end
          end
          if isSide then
              self.takeObject({
                  guid = o.guid,
                  position = {x = deckPos.x + bounds.size.x * 1.2, y = deckPos.y + bounds.size.y + 0.1 * i, z = deckPos.z},
                  smooth = false
              })
          end
      end
  end`;

export function readTTS(card_data, input) {
  const data = JSON.parse(input)
  const names = {}
  card_data.forEach(card => {
    if(card.alt == '')
      names[card.name.toLowerCase().replace('ё','е')] = card.id;
  })

  let deck = [], side = []
  data["ObjectStates"][0]["ContainedObjects"].forEach(({ Nickname, Tags })=> {
    let card_id = names[Nickname.toLowerCase().replace('ё','е')]
    if(!card_id) return
    if(Tags.includes("Side")) side.push(card_id)
    else deck.push(card_id)
  })

  return ["", deck, side]
}

export async function writeTTS(deck, options, deck_type='Констрактед', full_deck=null, sign=null, side=[]) {
  const {path, set_path, suffix, sets, rarity, color, root_base, custom_view, deck_base, card_base, creature_types} = options;

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

  function hexToUint8Array(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
  }

  const ret = fastCopy(root_base);
  const deck_view = fastCopy(deck_base);
  deck_view["GUID"] = GUID()
  deck_view["Description"] = deck_type
  deck_view["LuaScript"] = ""
  if (full_deck) {
    const valid = rot13(writeCompact(full_deck.map((card) => [1, card.set_id, card.number]), options).slice(1))
    deck_view["LuaScript"] += '--' + valid.match(/.{1,32}/g).join('\n--')
    if (sign) {
      const privKey = await crypto.subtle.importKey('pkcs8', hexToUint8Array('302e020100300506032b657004220420' + sign).buffer, { name: 'Ed25519' }, true, ['sign'])
      const signature = await crypto.subtle.sign({ name: 'Ed25519' }, privKey, new TextEncoder().encode(valid))
      const signature_hex = [...new Uint8Array(signature)].map(b => b.toString(16).padStart(2, "0")).join("")
      deck_view["LuaScript"] += '\n--#sign\n--' + signature_hex.match(/.{1,32}/g).join('\n--')
    }
  }
  if (side.length > 0) {
    deck_view["LuaScript"] += ttsSideScript
  }

  const deck_side = side.concat(deck)
  deck_view["DeckIDs"] = deck_side.map((card) => { return getId(card) })

  deck_view["CustomDeck"] = deck_side.reduce((acc, card) => {
    const faceURL = getURL(card, set_path[card.set_id.toString()] || path);
    if (!acc[faceURL]) {
      const view = fastCopy(custom_view);
      view["FaceURL"] = faceURL;
      view["BackURL"] = path + 'back.jpg';
      const id = getId(card);
      acc[`${Math.floor(id / 100)}`] = view;
    }
    return acc;
    }, {});

  let i = 0
  deck_view["ContainedObjects"] = deck_side.map((card) => {
    const card_view = fastCopy(card_base);
    const id = getId(card)
    card_view["GUID"] = GUID()
    card_view["CardID"] = getId(card)
    card_view["Nickname"] = card.name
    card_view["Tags"] = ['Card', rarity[`${card.rarity}`], color[`${card.color}`], sets[`${card.set_id}`], creature_types[`${card.type}`], `Cost_${card.cost}`, `Elite_${card.elite}`, `Uniq_${card.uniq}`]
    if(i < side.length) card_view["Tags"].push("Side")
    const view = fastCopy(custom_view)
    view["FaceURL"] = getURL(card, set_path[card.set_id.toString()] || path)
    view["BackURL"] = path + 'back.jpg'
    card_view["CustomDeck"] = {[`${Math.floor(id / 100)}`]: view}
    i++
    return card_view
  })

  ret["ObjectStates"] = [deck_view]
  return JSON.stringify(ret)
}

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
function encodeBase64Triplet([a, b, c]) {
  if(a<=0 && b<=0 && c<=0) return "###"
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
  if(encodedTriplet == "###") return [0,0,0]
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
    let deck = [], side = [], isSide = false
    let triplets = (str.slice(1).match(/.{1,3}/g) || []).map(chunk => decodeBase64Triplet(chunk))
    triplets.forEach(([count, s, number]) => {
      if(count == 0) isSide = true
      else for(let i = 0; i < count; i++) (isSide ? side : deck).push((parseInt(sets[s]) * 1000 + number).toString());
    })
    return [deck, side]
  }
  return [[], []]
}

export function rot13(str) {
  return str.replace(/[a-zA-Z]/g, function(c){
    return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
  })
}
