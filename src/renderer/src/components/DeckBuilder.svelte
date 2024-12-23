<script>
  import { onMount } from 'svelte';
  import { navigate } from "@jamen/svelte-router";

  import { sortable, arrange } from '../utils/sortable.js';

  import { popupStore, togglePopup, toggleAside, currentDeck, toggleFullDeck, setSecondLevelMenu, deckEditMode, loader } from '../stores/interface.js';
  import { shortcuts } from '../utils/shortcuts.js';
  import { view_observer } from '../utils/view_observer.js';
  import { get_karapet_score } from '../utils/draft.js'
  import { takeScreenshot } from '../utils/ux.js';

  import { option_set, user_decks, filteredSortedCards } from '../stores/user_data.js';
  import { deckbuilder_driver } from '../stores/help.js';
  import { byId, groupCards, ungroupCards, statistics } from '../stores/cards.js';

  import Card from './includes/Card.svelte'
  import Filter from './includes/Filter.svelte'
  import Popup from './includes/Popup.svelte'

  export let deck_id, show_full, deckName
  $: {
    deck_id = $currentDeck.deck_id
    deckName = $user_decks['decks'][$currentDeck.deck_id]?.name || ""
  }
  $: show_full = $currentDeck.show_full

  const options_name = 'deckbuilding_options';
  let options = option_set[options_name];

  const orders = ['asis', 'cost', 'color', 'rarity', 'number'];
  const orderNames = {'asis': 'по порядку', 'cost': 'по стоимости', 'color': 'по стихии', 'rarity': 'по редкости', 'number': 'по номеру'};
  let order
  $: order = orders[$options.order || 0]

  let undo = []

  onMount(() => {
    if(deck_id === null) return navigate('/app/decks')
    document.getElementById('app').style.setProperty('--side-stats-height', '12em')
    toggleAside((!show_full || !deck_id) && window.innerWidth > 820 && window.innerWidth > window.innerHeight);
    const startTour = (_event) => { deckbuilder_driver().drive() };
    window.electron.ipcRenderer.on('start-tour', startTour);

    deckEditMode.set('deckbuilder')
    loader.set(false)
    return () => {
      setSecondLevelMenu()
      window.electron.ipcRenderer.removeAllListeners('start-tour');
    };
  });

  currentDeck.subscribe(({deck_id}) => {
    setSecondLevelMenu(deck_id !== null ? {"Назад к списку": () => { navigate('/app/decks')}} : null)
  })

  function doUndo(_e) {
    if(undo.length === 0) return
    user_decks.update(($user_decks) => {
      const [action, deck_id, position, item] = undo.pop()
      if(action === 'add') $user_decks['decks'][deck_id].cards.pop()
      if(action === 'rem') $user_decks['decks'][deck_id].cards.splice(position, 0, item)
      if(action === 'mov') $user_decks['decks'][deck_id].cards = item;
      return {...$user_decks, decks: $user_decks['decks']};
    });
  }

  function collectColors(deck_cards) {
    return [...deck_cards.reduce((ret, card_id) => {
      ret.add(byId(card_id)?.color);
        return ret;
      }, new Set())].sort((a, b) => a - b);
  }

  function nextOrder() {
    options.update($options => {
      const nextIndex = (($options.order || 0) + 1) % orders.length;
      return {...$options, order: nextIndex};
    });
  }


  function count(deck_cards, key, value) {
    return deck_cards.reduce((acc, card_id) => {
      return acc + ((byId(card_id) && byId(card_id)[key] === value) ? 1 : 0);
    }, 0)
  }

  function removeOne(deck_id, card_id) {
    if(deck_id === null) return;
    user_decks.update(($user_decks) => {
      const rem = $user_decks['decks'][deck_id].cards.lastIndexOf(card_id);
      if (rem !== -1) {
        $user_decks['decks'][deck_id].cards.splice(rem, 1)
        undo.push(["rem", deck_id, rem, card_id])
      }
      return $user_decks;
    });
  }

  function addOne(deck_id, card_id) {
    if(deck_id === null) return;
    user_decks.update(($user_decks) => {
      $user_decks['decks'][deck_id].cards.push(card_id);
      undo.push(["add", deck_id, -1, card_id])
      return {...$user_decks, decks: $user_decks['decks']};
    });
  }

  function incSize(key) {
    options.update(($options) => {
      let newSize = Math.min($options[key] + 10, 300)
      return {...$options, [key]: newSize}
    })
    user_decks.update(($user_decks) => {
      return {...$user_decks}
    })
  }

  function decSize(key) {
    options.update(($options) => {
      let newSize = Math.max($options[key] - 10, 80)
      return {...$options, [key]: newSize}
    })
    user_decks.update(($user_decks) => {
      return {...$user_decks}
    })
  }

  function onDeckUpdate(drag_index, index) {
    user_decks.update(($user_decks) => {
      let new_decks = $user_decks['decks']
      undo.push(["mov", deck_id, null, new_decks[deck_id].cards])
      let new_own_cards = groupCards(new_decks[deck_id].cards, 'asis')
      const element = new_own_cards.splice(drag_index, 1)[0];
      new_own_cards.splice(index, 0, element);
      new_decks[deck_id].cards = ungroupCards(new_own_cards)
      return {...$user_decks, 'decks': new_decks}
    })
  }

  function updateDeckName(event) {
    const newName = event.target.value;
    if(newName == deckName) return;
    user_decks.update($decks => {
      $decks.decks[deck_id].name = newName;
      return $decks;
    });
  }

  function factorial(n) {
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
  }

  function comb(n, k) {
    return factorial(n) / (factorial(k) * factorial(n - k));
  }

  function probability(X, Y, minCopies) {
    let totalProbability = 0;
    for (let n = minCopies; n <= Math.min(Y, 15); n++)
      totalProbability += comb(Y, n) * comb(X - Y, 15 - n) / comb(X, 15);
    return Math.round(totalProbability * 100).toFixed(0) + "%";
  }

  function setCount(event) {
    let selectedCard = event.target.querySelector('.card:hover');
    if(!selectedCard) selectedCard = event.target.querySelector('.card_line:hover');
    if(!selectedCard) return
    const card_id = selectedCard.dataset.cardid
    const count = event.detail['number']
    const current_count = $user_decks['decks'][deck_id].cards.filter((x)=> x === card_id).length
    if(current_count === count) return
    user_decks.update(($user_decks) => {
      if(current_count < count) {
        for(let i=current_count; i<count; i++) {
          $user_decks['decks'][deck_id].cards.push(card_id);
          undo.push(["add", deck_id, -1, card_id])
        }
      } else {
        for (let i = current_count; i > count; i--) {
          const rem = $user_decks['decks'][deck_id].cards.lastIndexOf(card_id);
          if (rem === -1) continue;
          $user_decks['decks'][deck_id].cards.splice(rem, 1)
          undo.push(["rem", deck_id, rem, card_id])
        }
      }
      return {...$user_decks, decks: $user_decks['decks']};
    });
  }

  let grouppedCards
  $: grouppedCards = groupCards($user_decks['decks'][deck_id]?.cards || [], order)
</script>

{#if true}
{@const { tcount, elite, uniq, lc, life, mc, move, ac, atk, icons } = statistics((!show_full || deck_id === null) ? $filteredSortedCards : byId($user_decks['decks'][deck_id].cards))}
<Filter noSide={show_full && deck_id !== null} options_name={options_name}>
  <dl>
    <dt>Выбрано карт:</dt>
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
</Filter>
{/if}

{#if $user_decks['decks'][deck_id]}
<aside class="right">
  <section>
    {#key grouppedCards}
    <div style="display: flex; justify-content: space-between;">
     <input type="text" value={deckName} on:blur={updateDeckName} class="diver-deck-name" />
     <a class="driver-deck-order" use:shortcuts on:action:primary={nextOrder} style="margin: 7px 2px 20px 7px;" data-tooltip="{orderNames[order]}" data-placement="left">
       <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" style="fill: #e8dff2;"><path d="M6.227 11h11.547c.862 0 1.32-1.02.747-1.665L12.748 2.84a.998.998 0 0 0-1.494 0L5.479 9.335C4.906 9.98 5.364 11 6.227 11zm5.026 10.159a.998.998 0 0 0 1.494 0l5.773-6.495c.574-.644.116-1.664-.747-1.664H6.227c-.862 0-1.32 1.02-.747 1.665l5.773 6.494z"></path></svg>
     </a>
    </div>
    <div class="decklist" class:tighter={grouppedCards.length > 21} class:tightest={grouppedCards.length > 25}
        use:shortcuts={{keyboard: true}} on:action:number={setCount} on:action:close={() => { if(!$popupStore.isOpen && document.activeElement !== document.getElementById('search')){ navigate('/app/decks') } } } on:action:undo={doUndo}>
      {#each grouppedCards as [card, count]}
        {#if card}
         <div data-cardid={card.id} class={`card_line bg-${card.color} rarity-${card.rarity}`} use:shortcuts={{keyboard: true}}
              on:action:minus={() => addOne(deck_id, card.altto || card.id)} on:action:primary={() => removeOne(deck_id, card.altto || card.id)}
              on:action:preview={() => togglePopup(card, grouppedCards.map(group => group[0].id))}>
            <span class="count">
              {#if count > 1}x<b style={(!card.horde && count > 3) || (card.horde && count > 6) ? "color: #D93526" : "color: #E0E3E7"}>{count}</b>{/if}
            </span>
            <span class="card_name" style={card?.ban ? "text-decoration: line-through" : ""}>{card?.name}</span>
            <span class="cost" class:elite={card?.elite} class:uniq={card?.uniq}>
              {card?.cost}
            </span>
         </div>
         {:else}
         <div data-cardid={count} class={`card_line bg-0 rarity-0`} use:shortcuts={{keyboard: true}}
              on:action:primary={() => removeOne(deck_id, count)}>
            <span class="count">
              x<b style="color: #D93526">?</b>
            </span>
            <span class="card_name">[ОТСУТСТВУЕТ]</span>
            <span class="cost">—</span>
         </div>
         {/if}
      {/each}
    </div>
    <div class="deck_stats">
      <span class="colors">{#each collectColors($user_decks['decks'][deck_id].cards) as color}<span class={`color color-${color}`}></span>{/each}</span>
      <span class="elite">
        <span class="elite-gold">{count($user_decks['decks'][deck_id].cards, 'elite', true)}</span>
        <span class="elite-silver">{count($user_decks['decks'][deck_id].cards, 'elite', false)}</span>
      </span>
      <h4><span style={$user_decks['decks'][deck_id].cards.length != 30 ? "color: #D93526" : ""}>{$user_decks['decks'][deck_id].cards.length}</span> / 30</h4>
    </div>
    <button class="outline low-profile-hidden driver-deckbuilder-deal" style="width: 100%; margin-top: 10px;" use:shortcuts on:action:primary={() => { navigate('/app/deal/'); }}>Раздать колоду</button>
    <div style="display: flex; justify-content: space-between; width: 100%; margin-top: 10px;">
      <button class="driver-deckbuilder-detail" style="width: 100%;" use:shortcuts on:action:primary={toggleFullDeck}>{#if show_full}Карты{:else}Подробно{/if}</button>
      <button class="outline" style="padding: 5px; height: 45px;  margin-left: 10px;" on:click={() => { togglePopup($user_decks['decks'][deck_id], null, 'deck') }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.2383 2.79888C10.6243 2.88003 9.86602 3.0542 8.7874 3.30311L7.55922 3.58654C6.6482 3.79677 6.02082 3.94252 5.54162 4.10698C5.07899 4.26576 4.81727 4.42228 4.61978 4.61978C4.42228 4.81727 4.26576 5.07899 4.10698 5.54162C3.94252 6.02082 3.79677 6.6482 3.58654 7.55922L3.30311 8.7874C3.0542 9.86602 2.88003 10.6243 2.79888 11.2383C2.71982 11.8365 2.73805 12.2413 2.84358 12.6092C2.94911 12.9772 3.14817 13.3301 3.53226 13.7954C3.92651 14.2731 4.47607 14.8238 5.25882 15.6066L7.08845 17.4362C8.44794 18.7957 9.41533 19.7608 10.247 20.3954C11.0614 21.0167 11.6569 21.25 12.2623 21.25C12.8678 21.25 13.4633 21.0167 14.2776 20.3954C15.1093 19.7608 16.0767 18.7957 17.4362 17.4362C18.7957 16.0767 19.7608 15.1093 20.3954 14.2776C21.0167 13.4633 21.25 12.8678 21.25 12.2623C21.25 11.6569 21.0167 11.0614 20.3954 10.247C19.7608 9.41533 18.7957 8.44794 17.4362 7.08845L15.6066 5.25882C14.8238 4.47607 14.2731 3.92651 13.7954 3.53226C13.3301 3.14817 12.9772 2.94911 12.6092 2.84358C12.2413 2.73805 11.8365 2.71982 11.2383 2.79888ZM11.0418 1.31181C11.7591 1.21701 12.3881 1.21969 13.0227 1.4017C13.6574 1.58372 14.1922 1.91482 14.7502 2.37538C15.2897 2.82061 15.8905 3.4214 16.641 4.17197L18.5368 6.06774C19.8474 7.37835 20.8851 8.41598 21.5879 9.33714C22.311 10.2849 22.75 11.197 22.75 12.2623C22.75 13.3276 22.311 14.2397 21.5879 15.1875C20.8851 16.1087 19.8474 17.1463 18.5368 18.4569L18.4569 18.5368C17.1463 19.8474 16.1087 20.8851 15.1875 21.5879C14.2397 22.311 13.3276 22.75 12.2623 22.75C11.197 22.75 10.2849 22.311 9.33714 21.5879C8.41598 20.8851 7.37833 19.8474 6.06771 18.5368L4.17196 16.641C3.4214 15.8905 2.82061 15.2897 2.37538 14.7502C1.91482 14.1922 1.58372 13.6574 1.4017 13.0227C1.21969 12.3881 1.21701 11.7591 1.31181 11.0418C1.40345 10.3484 1.59451 9.52048 1.83319 8.48622L2.13385 7.18334C2.33302 6.32023 2.49543 5.61639 2.68821 5.05469C2.88955 4.46806 3.14313 3.9751 3.55912 3.55912C3.9751 3.14313 4.46806 2.88955 5.05469 2.68821C5.61639 2.49543 6.32023 2.33302 7.18335 2.13385L8.48622 1.83319C9.52047 1.59451 10.3484 1.40345 11.0418 1.31181ZM9.49094 7.99514C9.00278 7.50699 8.21133 7.50699 7.72317 7.99514C7.23502 8.4833 7.23502 9.27476 7.72317 9.76291C8.21133 10.2511 9.00278 10.2511 9.49094 9.76291C9.97909 9.27476 9.97909 8.4833 9.49094 7.99514ZM6.66251 6.93448C7.73645 5.86054 9.47766 5.86054 10.5516 6.93448C11.6255 8.00843 11.6255 9.74963 10.5516 10.8236C9.47766 11.8975 7.73645 11.8975 6.66251 10.8236C5.58857 9.74963 5.58857 8.00843 6.66251 6.93448ZM19.0511 10.9902C19.344 11.2831 19.344 11.7579 19.0511 12.0508L12.0721 19.0301C11.7792 19.323 11.3043 19.323 11.0114 19.0301C10.7185 18.7372 10.7185 18.2623 11.0114 17.9694L17.9904 10.9902C18.2833 10.6973 18.7582 10.6973 19.0511 10.9902Z" fill="#ffffff"/></svg>
      </button>
      <button class="outline" style="padding: 5px; height: 45px;  margin-left: 10px;" on:click={() => { window.electron.ipcRenderer.send('save-deck', byId($user_decks['decks'][deck_id].cards), $user_decks['decks'][deck_id].name, 'tts'); }}>
        <svg width="32" height="32" viewBox="0 0 50.8 50.8" style="fill: none;" xml:space="preserve"><path d="M5.821 24.871h39.158v20.108H5.821z" style="fill:none;stroke:#ffffff;stroke-width:3.175;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:1"/><path d="M14.949 5.82h20.902M8.864 18.52h33.072m-30.03-6.35h26.988" style="fill:#000000;stroke:#ffffff;stroke-width:3.175;stroke-linecap:round;stroke-dasharray:none;stroke-opacity:1"/></svg>
      </button>
      <button class="outline" style="padding: 5px; height: 45px;  margin-left: 10px;" on:click={() => { takeScreenshot('#deck-view', deckName, groupCards($user_decks['decks'][deck_id].cards, show_full ? 'asis' : order)) }}>
        <svg width="32" height="32" viewBox="0 0 192 192" fill="none"><path fill="#ffffff" d="M60 50v6a6 6 0 0 0 4.8-2.4L60 50Zm12-16v-6a6 6 0 0 0-4.8 2.4L72 34Zm60 16-4.8 3.6A6 6 0 0 0 132 56v-6Zm-12-16 4.8-3.6A6 6 0 0 0 120 28v6Zm44 32v76h12V66h-12Zm-10 86H38v12h116v-12ZM28 142V66H16v76h12Zm10-86h22V44H38v12Zm26.8-2.4 12-16-9.6-7.2-12 16 9.6 7.2ZM132 56h22V44h-22v12Zm4.8-9.6-12-16-9.6 7.2 12 16 9.6-7.2ZM120 28H72v12h48V28ZM38 152c-5.523 0-10-4.477-10-10H16c0 12.15 9.85 22 22 22v-12Zm126-10c0 5.523-4.477 10-10 10v12c12.15 0 22-9.85 22-22h-12Zm12-76c0-12.15-9.85-22-22-22v12c5.523 0 10 4.477 10 10h12ZM28 66c0-5.523 4.477-10 10-10V44c-12.15 0-22 9.85-22 22h12Z"/><circle cx="96" cy="102" r="28" stroke="#ffffff" stroke-width="12"/></svg>
      </button>
    </div>
    {/key}
  </section>
</aside>

<section class="content">
 {#if !show_full}
  <section class="card-grid" style={`--card-min-size: ${$options.cardSize}px`} use:view_observer
      use:shortcuts on:action:zoomin={() => incSize('cardSize') } on:action:zoomout={() => decSize('cardSize')}>
    {#each $filteredSortedCards as card}
      {#if card}
      <Card card={card}
        onpreview={togglePopup}
        onprimary={(card) => addOne(deck_id, card.altto || card.id)}
        onplus={(card) => addOne(deck_id, card.altto || card.id)}
        onminus={(card) => removeOne(deck_id, card.altto || card.id)}
        showCount={$options.showCount}
        showAlts={!$options.onlyBase}
        dimAbsent={$options.dimAbsent}
        showPrice={$options.showPrice}
        proMode={deck_id === null}
        draggable={false}
        card_list={$filteredSortedCards.map(card => card.id)}
     />
      {/if}
    {/each}
  </section>
  {/if}

  {#if $user_decks['decks'][deck_id]}
    {@const deckGroupped = groupCards($user_decks['decks'][deck_id].cards, show_full ? 'asis' : order)}
    {#key deckGroupped}
    <div style:display={ show_full ? '' : 'none' }>
      <section id="deck-view" class="card-grid top-text-visible" style={`--card-min-size: ${$options.deckSize}px`}
           use:arrange use:shortcuts={{keyboard: true}} on:action:number={setCount} on:action:zoomin={() => incSize('deckSize') } on:action:zoomout={() => decSize('deckSize')}>
        {#each deckGroupped as [card, count]}
          {#if card}
          <div use:sortable={{update: onDeckUpdate}}>
            <Card card={card}
              onpreview={togglePopup}
              copies={count}
              countCopies={true}
              showCount={false}
              showAlts={false}
              dimAbsent={$options.dimAbsent}
              showBan={false}
              showPrice={false}
              showTopText={Array.from({length: Math.min(count, 4)}, (_, i) => probability($user_decks['decks'][deck_id].cards.length, count, i+1)).join(" / ")}
              card_list={deckGroupped.map(group => group[0]?.id)}
            />
           </div>
          {/if}
        {/each}
      </section>
      <hr />
      <div class="deck_stats">
        <span class="colors">{#each collectColors($user_decks['decks'][deck_id].cards) as color}<span class={`color color-${color}`}></span>{/each}</span>
        <h4 style="text-align: center">
          <span style="font-size: 70%">LIF:</span> {byId($user_decks['decks'][deck_id].cards).filter((x) => x).reduce((acc, card) => { return acc + card.life || 0}, 0)}
          &nbsp; &nbsp;
          <span style="font-size: 70%">ATK:</span> {byId($user_decks['decks'][deck_id].cards).filter((x) => x).reduce((acc, card) => { return (card.hit || [0,0,0]).map((num, index) => num + acc[index])}, [0,0,0]).join('-')}
        </h4>
        <h4 style="text-align: right;"><span>{byId($user_decks['decks'][deck_id].cards).filter((x) => x).reduce((acc, card) => { return acc + get_karapet_score(card.set_id, card.number) / 10 * card.cost}, 0).toFixed(1)}</span></h4>
      </div>
     </div>
    {/key}
   {/if}
</section>
{/if}

<Popup type="deck" />
