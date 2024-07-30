<script>
  import { onMount } from 'svelte';
  import { navigate } from "@jamen/svelte-router";
  import { slide } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  import { sortable } from '../utils/sortable.js';

  import { popupStore, togglePopup, currentDeck, setDeckId, setSecondLevelMenu, showStats, loader, deckEditMode } from '../stores/interface.js';
  import { shortcuts } from '../utils/shortcuts.js';
  import { get_karapet_score } from '../utils/draft.js';
  import { takeScreenshot } from '../utils/ux.js';

  import { option_set, user_decks, settings, settings_loaded } from '../stores/user_data.js';
  import { deal_driver } from '../stores/help.js';
  import { byId, groupCards, statistics } from '../stores/cards.js';

  import Card from './includes/Card.svelte'
  import Popup from './includes/Popup.svelte'

  const options_name = 'deal_options';
  let options = option_set[options_name];
  let show_other = false
  let deck_id, deckName

  $: {
    deck_id = $currentDeck.deck_id,
    deckName = $user_decks['decks'][$currentDeck.deck_id]?.name || ""
  }

  const orders = ['asis', 'cost', 'color', 'rarity', 'number'];
  const orderNames = {'asis': 'по порядку', 'cost': 'по стоимости', 'color': 'по стихии', 'rarity': 'по редкости', 'number': 'по номеру'};
  let order
  $: order = orders[$options.order || 0]

  let field_meta = Array.from({ length: 15 }, () => ({}))

  onMount(() => {
    if(deck_id === null) return navigate('/app/decks')
    document.getElementById('app').style.setProperty('--side-stats-height', '12em')
    if($options.deck_id !== deck_id) startDeal(deck_id)

    const startTour = (_event) => { deal_driver().drive() };
    window.electron.ipcRenderer.on('start-tour', startTour);

    deckEditMode.set('deal')
    loader.set(false)
    return () => {
      setSecondLevelMenu()
      window.electron.ipcRenderer.removeAllListeners('start-tour');
    };
  });

  options.subscribe($options => {
    if($settings_loaded['settings'])
      settings.update($settings => {
        return { ...$settings, [options_name]: $options };
      });
  });

  currentDeck.subscribe(({deck_id}) => {
    setSecondLevelMenu(deck_id !== null ? {"Назад к списку": () => { navigate('/app/decks');}} : null)
  })

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function startDeal(index) {
    console.profile()
    setDeckId(index)
    field_meta = Array.from({ length: 15 }, () => ({}))
    options.update(($options) => {
      const deck = shuffleArray([...$user_decks['decks'][index].cards])
      const deal = deck.splice(0, 15)
      return {...$options, deck_id: deck_id, deal: deal, deck: deck, mulligan: 0, field: new Array(15).fill(null)}
    })
    console.profileEnd()
  }

  function mulligan() {
    if($options.mulligan > 23) return;
    field_meta = Array.from({ length: 15 }, () => ({}))
    options.update(($options) => {
      const deck = shuffleArray([...$user_decks['decks'][deck_id].cards])
      const deal = deck.splice(0, 15)
      return {...$options, deal: deal, deck: deck, mulligan: $options.mulligan + 1, field: new Array(15).fill(null)}
    })
  }

  function nextOrder() {
    options.update($options => {
      const nextIndex = (($options.order || 0) + 1) % orders.length;
      return {...$options, order: nextIndex};
    });
  }

  function dealCardClick(card_id) {
    options.update(($options) => {
      const rem = $options.deal.lastIndexOf(card_id);
      const to = $options.field.indexOf(null)
      if(to === -1) return $options;
      $options.deal = $options.deal.filter((_, index) => { return index !== rem } );
      $options.field[to] = card_id;
      return {...$options, deal: $options.deal, field: $options.field}
    })
  }

  function otherCardClick(card_id) {
    options.update(($options) => {
      const rem = $options.deck.lastIndexOf(card_id);
      const to = $options.field.indexOf(null)
      if(to === -1) return $options;
      $options.deck = $options.deck.filter((_, index) => { return index !== rem } );
      $options.field[to] = card_id;
      return {...$options, deck: $options.deck, field: $options.field}
    })
  }

  function fieldCardClick(index) {
    options.update(($options) => {
      $options.deal.push($options.field[index])
      $options.field[index] = null;
      field_meta[index] = {};
      return {...$options, deal: $options.deal, field: $options.field}
    })
  }

  function collectColors(deck_cards) {
    return [...deck_cards.reduce((ret, card_id) => {
      ret.add(byId(card_id)?.color);
      return ret;
    }, new Set())].sort((a, b) => a - b);
  }

function crystals(deck_cards, isFirstPlayer) {
  let goldCrystals = isFirstPlayer ? 24 : 25;
  let silverCrystals = isFirstPlayer ? 22 : 23;
  goldCrystals -= $options.mulligan;
  const uniqueColors = collectColors(deck_cards).filter(color => color !== 32).length;
  if (uniqueColors > 1) goldCrystals -= (uniqueColors - 1);

  byId(deck_cards).forEach(card => {
    if (card.elite) {
      goldCrystals -= card.cost;
    } else {
      if (silverCrystals >= card.cost) {
        silverCrystals -= card.cost;
      } else {
        let remainingCost = card.cost - silverCrystals;
        silverCrystals = 0;
        goldCrystals -= remainingCost;
      }
    }
  });

  return [goldCrystals, silverCrystals];
}

function checkLegality(field) {
  const cardCounts = {};
  const results = [];
  let flyCost = 0
  let land = 0
  byId(field).forEach(card => {
    if (card === null) return results.push([null, true]);
    if (!cardCounts[card.id]) cardCounts[card.id] = { count: 0, uniq: card.uniq, horde: card.horde };
    cardCounts[card.id].count += 1;
    if(card.type === 1) flyCost += card.cost;
    if(card.type === 5) land += 1;
    let legal = true;
    if (cardCounts[card.id].uniq && cardCounts[card.id].count > 1) legal = false;
    else if (!cardCounts[card.id].horde && cardCounts[card.id].count > 3) legal = false;
    else if (cardCounts[card.id].horde && cardCounts[card.id].count > 6) legal = false;
    else if (flyCost > 15 && card.type === 1) legal = false;
    else if (land > 1 && card.type === 5) legal = false;
    if (card.ban) legal = false;
    return results.push([card.id, legal]);
  });

  return results;
}

function swapItems(drag_index, index) {
  options.update(($options) => {
    let new_own_cards = $options['field']
    if(index >= new_own_cards.length) return $options;
    const dragged = new_own_cards[drag_index];
    new_own_cards[drag_index] = new_own_cards[index];
    new_own_cards[index] = dragged;
    const dmeta = field_meta[drag_index];
    field_meta[drag_index] = field_meta[index];
    field_meta[index] = dmeta;
    return {...$options, field: new_own_cards}
  })
}
</script>


{#if deck_id !== null}
  {@const grouppedCards = groupCards($options.deal, order)}
  {@const grouppedDeck = groupCards($options.deck, order)}
  {@const on_field_cards = $options.field.filter((x) => x)}
  {@const [gold1, silver1] = crystals(on_field_cards, true)}
  {@const [gold2, silver2] = crystals(on_field_cards, false)}

  {#if $showStats.isOpen}
  {@const { tcount, elite, uniq, lc, life, mc, move, ac, atk, icons } = statistics(byId(on_field_cards))}
  <aside class="stats has_right" transition:slide={{ duration: 150, easing: quintOut }}>
    <dl>
      <dt>В отряде карт:</dt>
      <dd>{tcount}</dd>
      <dt>Элитность:</dt>
      <dd>{elite} / {tcount - elite}</dd>
      <dt>Уникальных:</dt>
      <dd>{uniq}</dd>
      <dt>Средняя жизнь:</dt>
      <dd>{lc ? (life/lc).toFixed(1) : 0}</dd>
      <dt>Средний ход:</dt>
      <dd>{mc ? (move/mc).toFixed(1) : 0}</dd>
      <dt>Средний удар:</dt>
      <dd>{ac ? (atk[0]/ac).toFixed(1) : 0}-{ac ? (atk[1]/ac).toFixed(1) : 0}-{ac ? (atk[2]/ac).toFixed(1) : 0}</dd>
      <dt>Cредний:</dt>
      <dd>{ac ? (atk[3]/ac).toFixed(1) : 0}</dd>
    </dl>
    <dl>
      <dt>Опыт в атаке:</dt>
      <dd>{icons['ova']}</dd>
      <dt>Опыт в защите:</dt>
      <dd>{icons['ovz']}</dd>
      <dt>Опыт в стрельбе:</dt>
      <dd>{icons['ovs']}</dd>
      <dt>Регенерация:</dt>
      <dd>{icons['regen']}</dd>
      <dt>Броня:</dt>
      <dd>{icons['armor']}</dd>
      <dt>Направленный удар:</dt>
      <dd>{icons['direct']}</dd>
      <dt>Стойкость:</dt>
      <dd>{icons['stamina']}</dd>
    </dl>
    <dl>
      <dt>Защита от выстрелов:</dt>
      <dd>{icons['zov']}</dd>
      <dt>Защита от метания:</dt>
      <dd>{icons['zot']}</dd>
      <dt>Защита от отравления:</dt>
      <dd>{icons['zoo']}</dd>
      <dt>Защита от летающих:</dt>
      <dd>{icons['zoal']}</dd>
      <dt>Защита от магии:</dt>
      <dd>{icons['zom']}</dd>
      <dt>Защита от заклинаний:</dt>
      <dd>{icons['zoz']}</dd>
      <dt>Защита от разрядов:</dt>
      <dd>{icons['zor']}</dd>
    </dl>
  </aside>
  {/if}

  <aside class="right">
    <section>
      <h6 style="margin-bottom: .5em; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;" class="low-profile-hidden">{deckName}</h6>
      <div style="display: flex; justify-content: space-between;">
        <button class="outline" style="width: 100%; margin-bottom: 1em;" use:shortcuts on:action:primary={() => { mulligan(); }}>Муллиган</button>
        <a use:shortcuts on:action:primary={nextOrder} style="margin: 7px 2px 20px 7px;" data-tooltip="{orderNames[order]}" data-placement="left">
         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" style="fill: #e8dff2;"><path d="M6.227 11h11.547c.862 0 1.32-1.02.747-1.665L12.748 2.84a.998.998 0 0 0-1.494 0L5.479 9.335C4.906 9.98 5.364 11 6.227 11zm5.026 10.159a.998.998 0 0 0 1.494 0l5.773-6.495c.574-.644.116-1.664-.747-1.664H6.227c-.862 0-1.32 1.02-.747 1.665l5.773 6.494z"></path></svg>
        </a>
      </div>

      <div class="decklist" class:tighter={grouppedCards.length > 21} class:tightest={grouppedCards.length > 25} use:shortcuts={{keyboard: true}} on:action:close={() => { if(!$popupStore.isOpen) { navigate('/app/decks') } } }>
         {#each grouppedCards as [card, count]}
           <div class={`card_line bg-${card.color} rarity-${card.rarity}`} use:shortcuts
                on:action:preview={() => togglePopup(card, grouppedCards.map(group => group[0].id))} on:action:primary={()=> { dealCardClick(card.id) }}>
              <span class="count">
                {#if count > 1}x<b style={(!card.horde && count > 3) || (card.horde && count > 6) ? "color: #D93526" : "color: #E0E3E7"}>{count}</b>{/if}
              </span>
              <span class="card_name" style={card.ban ? "text-decoration: line-through" : ""}>{card.name}</span>
              <span class="cost" class:elite={card.elite} class:uniq={card.uniq}>
                {card.cost}
              </span>
           </div>
         {/each}
        <p style="margin: 10px 0 10px 35px; font-size: 85%"><a use:shortcuts on:action:primary={()=> { show_other = !show_other }}>Остальные карты</a></p>
        {#if show_other}
          {#each grouppedDeck as [card, count]}
             <div class={`card_line bg-${card.color} rarity-${card.rarity}`} use:shortcuts
                  on:action:preview={() => togglePopup(card, grouppedDeck.map(group => group[0].id))} on:action:primary={()=> { otherCardClick(card.id) }}>
                <span class="count">
                  {#if count > 1}x<b style={(!card.horde && count > 3) || (card.horde && count > 6) ? "color: #D93526" : "color: #E0E3E7"}>{count}</b>{/if}
                </span>
                <span class="card_name" style={card.ban ? "text-decoration: line-through" : ""}>{card.name}</span>
                <span class="cost" class:elite={card.elite} class:uniq={card.uniq}>
                  {card.cost}
                </span>
             </div>
          {/each}
         {/if}
      </div>

      <button style="width: 100%;" class="outline low-profile-hidden" use:shortcuts on:action:primary={() => { navigate('/app/deckbuilder'); }}>Редактор колоды</button>

      <div style="display: flex; justify-content: space-between; width: 100%; margin-top: 10px;">
        <button style="width: 100%;" use:shortcuts on:action:primary={() => { startDeal(deck_id); }}>Раздача</button>
        <button class="outline" style="padding: 5px; height: 45px;  margin-left: 10px;" on:click={() => { togglePopup($user_decks['decks'][deck_id], null, 'deck') }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.2383 2.79888C10.6243 2.88003 9.86602 3.0542 8.7874 3.30311L7.55922 3.58654C6.6482 3.79677 6.02082 3.94252 5.54162 4.10698C5.07899 4.26576 4.81727 4.42228 4.61978 4.61978C4.42228 4.81727 4.26576 5.07899 4.10698 5.54162C3.94252 6.02082 3.79677 6.6482 3.58654 7.55922L3.30311 8.7874C3.0542 9.86602 2.88003 10.6243 2.79888 11.2383C2.71982 11.8365 2.73805 12.2413 2.84358 12.6092C2.94911 12.9772 3.14817 13.3301 3.53226 13.7954C3.92651 14.2731 4.47607 14.8238 5.25882 15.6066L7.08845 17.4362C8.44794 18.7957 9.41533 19.7608 10.247 20.3954C11.0614 21.0167 11.6569 21.25 12.2623 21.25C12.8678 21.25 13.4633 21.0167 14.2776 20.3954C15.1093 19.7608 16.0767 18.7957 17.4362 17.4362C18.7957 16.0767 19.7608 15.1093 20.3954 14.2776C21.0167 13.4633 21.25 12.8678 21.25 12.2623C21.25 11.6569 21.0167 11.0614 20.3954 10.247C19.7608 9.41533 18.7957 8.44794 17.4362 7.08845L15.6066 5.25882C14.8238 4.47607 14.2731 3.92651 13.7954 3.53226C13.3301 3.14817 12.9772 2.94911 12.6092 2.84358C12.2413 2.73805 11.8365 2.71982 11.2383 2.79888ZM11.0418 1.31181C11.7591 1.21701 12.3881 1.21969 13.0227 1.4017C13.6574 1.58372 14.1922 1.91482 14.7502 2.37538C15.2897 2.82061 15.8905 3.4214 16.641 4.17197L18.5368 6.06774C19.8474 7.37835 20.8851 8.41598 21.5879 9.33714C22.311 10.2849 22.75 11.197 22.75 12.2623C22.75 13.3276 22.311 14.2397 21.5879 15.1875C20.8851 16.1087 19.8474 17.1463 18.5368 18.4569L18.4569 18.5368C17.1463 19.8474 16.1087 20.8851 15.1875 21.5879C14.2397 22.311 13.3276 22.75 12.2623 22.75C11.197 22.75 10.2849 22.311 9.33714 21.5879C8.41598 20.8851 7.37833 19.8474 6.06771 18.5368L4.17196 16.641C3.4214 15.8905 2.82061 15.2897 2.37538 14.7502C1.91482 14.1922 1.58372 13.6574 1.4017 13.0227C1.21969 12.3881 1.21701 11.7591 1.31181 11.0418C1.40345 10.3484 1.59451 9.52048 1.83319 8.48622L2.13385 7.18334C2.33302 6.32023 2.49543 5.61639 2.68821 5.05469C2.88955 4.46806 3.14313 3.9751 3.55912 3.55912C3.9751 3.14313 4.46806 2.88955 5.05469 2.68821C5.61639 2.49543 6.32023 2.33302 7.18335 2.13385L8.48622 1.83319C9.52047 1.59451 10.3484 1.40345 11.0418 1.31181ZM9.49094 7.99514C9.00278 7.50699 8.21133 7.50699 7.72317 7.99514C7.23502 8.4833 7.23502 9.27476 7.72317 9.76291C8.21133 10.2511 9.00278 10.2511 9.49094 9.76291C9.97909 9.27476 9.97909 8.4833 9.49094 7.99514ZM6.66251 6.93448C7.73645 5.86054 9.47766 5.86054 10.5516 6.93448C11.6255 8.00843 11.6255 9.74963 10.5516 10.8236C9.47766 11.8975 7.73645 11.8975 6.66251 10.8236C5.58857 9.74963 5.58857 8.00843 6.66251 6.93448ZM19.0511 10.9902C19.344 11.2831 19.344 11.7579 19.0511 12.0508L12.0721 19.0301C11.7792 19.323 11.3043 19.323 11.0114 19.0301C10.7185 18.7372 10.7185 18.2623 11.0114 17.9694L17.9904 10.9902C18.2833 10.6973 18.7582 10.6973 19.0511 10.9902Z" fill="#ffffff"/></svg>
        </button>
        <button class="outline" style="padding: 5px; height: 45px;  margin-left: 10px;" on:click={() => { window.electron.ipcRenderer.send('save-deck', byId($user_decks['decks'][deck_id].cards), $user_decks['decks'][deck_id].name, 'tts'); }}>
          <svg width="32" height="32" viewBox="0 0 50.8 50.8" style="fill: none;" xml:space="preserve"><path d="M5.821 24.871h39.158v20.108H5.821z" style="fill:none;stroke:#ffffff;stroke-width:3.175;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:1"/><path d="M14.949 5.82h20.902M8.864 18.52h33.072m-30.03-6.35h26.988" style="fill:#000000;stroke:#ffffff;stroke-width:3.175;stroke-linecap:round;stroke-dasharray:none;stroke-opacity:1"/></svg>
        </button>
        <button class="outline" style="padding: 5px; height: 45px;  margin-left: 10px;" on:click={() => { takeScreenshot('.content .field', deckName, null, " (отряд)") }}>
          <svg width="32" height="32" viewBox="0 0 192 192" fill="none"><path fill="#ffffff" d="M60 50v6a6 6 0 0 0 4.8-2.4L60 50Zm12-16v-6a6 6 0 0 0-4.8 2.4L72 34Zm60 16-4.8 3.6A6 6 0 0 0 132 56v-6Zm-12-16 4.8-3.6A6 6 0 0 0 120 28v6Zm44 32v76h12V66h-12Zm-10 86H38v12h116v-12ZM28 142V66H16v76h12Zm10-86h22V44H38v12Zm26.8-2.4 12-16-9.6-7.2-12 16 9.6 7.2ZM132 56h22V44h-22v12Zm4.8-9.6-12-16-9.6 7.2 12 16 9.6-7.2ZM120 28H72v12h48V28ZM38 152c-5.523 0-10-4.477-10-10H16c0 12.15 9.85 22 22 22v-12Zm126-10c0 5.523-4.477 10-10 10v12c12.15 0 22-9.85 22-22h-12Zm12-76c0-12.15-9.85-22-22-22v12c5.523 0 10 4.477 10 10h12ZM28 66c0-5.523 4.477-10 10-10V44c-12.15 0-22 9.85-22 22h12Z"/><circle cx="96" cy="102" r="28" stroke="#ffffff" stroke-width="12"/></svg>
        </button>
      </div>


  </aside>
  <section class="content">
    {#key $options.field}
    <section class="card-grid field driver-field">
      {#each checkLegality($options.field) as [card_id, legal], index (index)}
          <div use:sortable={{update: swapItems, swap: true }} data-index={index}>
            {#if card_id}
            <Card card={byId(card_id)}
              onpreview={togglePopup}
              onprimary={() => fieldCardClick(index)}
              showCount={false}
              showAlts={false}
              dimAbsent={false}
              showBan={false}
              noTap={true}
              legal={legal}
              card_list={$options.field.filter(x => x)}
              tapped={field_meta[index]['tapped']}
              flipped={field_meta[index]['flipped']}
              ontap={() => { field_meta[index]['tapped'] = !field_meta[index]['tapped']  }}
              onflip={() => { field_meta[index]['flipped'] = !field_meta[index]['flipped'] }}
            />
           {:else}
            <div class="card-drop"></div>
           {/if}
         </div>
      {/each}
    </section>
    {/key}
    <hr />
    {#key on_field_cards}
      <div class="deck_stats">
        <span class="colors">{#each collectColors(on_field_cards) as color}<span class={`color color-${color}`}></span>{/each}</span>
        <span class="elite">
          <h5>&nbsp;I:&nbsp;</h5>
          <span class="elite-gold" class:over={gold1<0}>{gold1}</span>
          <span class="elite-silver" class:over={silver1<0}>{silver1}</span>
        </span>
        <span class="filler"></span>
        <span class="elite">
          <h5>II:&nbsp;</h5>
          <span class="elite-gold" class:over={gold2<0}>{gold2}</span>
          <span class="elite-silver" class:over={silver2<0}>{silver2}</span>
        </span>
        <h4><span>{byId(on_field_cards).reduce((acc, card) => { return acc + get_karapet_score(card.set_id, card.number) / 10 * card.cost}, 0).toFixed(1)}</span></h4>
      </div>
    {/key}

  </section>
{/if}

<Popup type="deck" />
