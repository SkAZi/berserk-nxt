<script>
  import { onMount } from 'svelte';
  import { togglePopup, setSecondLevelMenu, toggleAside, loader } from '../stores/interface.js';
  import { shortcuts } from '../utils/shortcuts.js';
  import { view_observer } from '../utils/view_observer.js';
  import { user_cards, option_set, filteredSortedCards } from '../stores/user_data.js';
  import { collections_driver } from '../stores/help.js';

  import Card from './includes/Card.svelte'
  import Filter from './includes/Filter.svelte'
  import Popup from './includes/Popup.svelte'

  const options_name = 'collection_options';
  let options = option_set[options_name];

  let cardsize;
  $: cardsize && cardsize.style.setProperty('--card-min-size', `${$options.cardSize}px`);

  onMount(() => {
    document.getElementById('app').style.setProperty('--side-stats-height', '2.5em');
    toggleAside(window.innerWidth > 620 && window.innerWidth > window.innerHeight);
    setSecondLevelMenu({
      //"Сохранить": () => window.electron.ipcRenderer.send('save-collection'),
    })
    const startTour = (_event) => { collections_driver().drive() };
    window.electron.ipcRenderer.on('start-tour', startTour);
    loader.set(false)
    return () => {
      loader.set(true)
      setSecondLevelMenu()
      window.electron.ipcRenderer.removeAllListeners('start-tour');
    };
  });

  function cardAdd(card) {
    if($options.proMode) return togglePopup(card)
    let count = $user_cards[card.id]?.count || {"": 0};
    if(!count[""]) count[""] = 1
    else count[""] += 1;
    user_cards.update(currentCards => {
      if(!currentCards[card.id]) currentCards[card.id] = {};
      currentCards[card.id]["count"] = count;
      return currentCards;
    });
  }

  function cardRemove(card) {
    if($options.proMode) return togglePopup(card)
    let count = $user_cards[card.id]?.count || {"": 0};
    if(!count[""]) return;
    count[""] = Math.max(count[""] - 1, 0)
    user_cards.update(currentCards => {
      if(!currentCards[card.id]) currentCards[card.id] = {};
      currentCards[card.id]["count"] = count;
      return currentCards;
    });
  }

  function setCount(event) {
    if($options.proMode) return
    const selectedCard = event.target.querySelector('.card:hover');
    if(!selectedCard) return
    const card_id = selectedCard.dataset.cardid
    let count = $user_cards[card_id]?.count || {"": 0};
    count[""] = event.detail['number']
    user_cards.update(currentCards => {
      if(!currentCards[card_id]) currentCards[card_id] = {};
      currentCards[card_id]["count"] = count;
      return currentCards;
    });
  }

  function incSize() {
    options.update(($options) => {
      let newSize = Math.min($options.cardSize + 10, 300)
      return {...$options, cardSize: newSize}
    })
  }

  function decSize() {
    options.update(($options) => {
      let newSize = Math.max($options.cardSize - 10, 80)
      return {...$options, cardSize: newSize}
    })
  }

  function toggleProMode(){
    options.update(($options) => {
      return {...$options, proMode: !$options.proMode}
    })
  }
</script>

<Filter options_name={options_name}>
  <dl>
    <dt>Выбрано карт:</dt>
    <dd>{$filteredSortedCards.length}</dd>
  </dl>
  <dl>
    <dt>Всего карточек:</dt>
    <dd>{$filteredSortedCards.reduce((acc, card) => acc + card.user_count, 0)}</dd>
  </dl>
  <dl>
    <dt>Нет в коллекции:</dt>
    <dd>{$filteredSortedCards.filter(card => card.user_count === 0).length}</dd>
  </dl>
</Filter>

<section class="content">
  <section class="card-grid" style={`--card-min-size: ${$options.cardSize}px`} use:shortcuts={{keyboard: true}}
        on:action:zoomin={incSize} on:action:zoomout={decSize} on:action:number={setCount}
        on:action:save={(e)=> { e.prventDefault(); window.electron.ipcRenderer.send('save-collection') }}
        use:view_observer
      >
    {#each $filteredSortedCards as card}
      <Card card={card}
        onpreview={togglePopup}
        onprimary={cardAdd}
        onplus={cardAdd}
        onminus={cardRemove}
        showCount={$options.showCount}
        showAlts={!$options.onlyBase}
        dimAbsent={$options.dimAbsent}
        showPrice={$options.showPrice}
        proMode={$options.proMode}
        showBan={false}
        card_list={$filteredSortedCards.map(card => card.id)}
      />
    {/each}
  </section>
</section>

<Popup type="collection" proMode={$options.proMode} toggleProMode={toggleProMode} />
