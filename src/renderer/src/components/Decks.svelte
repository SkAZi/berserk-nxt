<script>
  import { v4 } from 'uuid';

  import { onMount } from 'svelte';
  import { navigate } from '@jamen/svelte-router';

  import { sortable, arrange } from '../utils/sortable.js';

  import { popupStore, togglePopup, toggleAside, setDeckId, setSecondLevelMenu, loader, deckEditMode, filterAside, changeCardSize } from '../stores/interface.js';
  import { shortcuts } from '../utils/shortcuts.js';

  import { collectColors } from '../stores/cards.js';
  import { option_set, user_decks, settings, settings_loaded } from '../stores/user_data.js';
  import { decks_driver } from '../stores/help.js';

  import Card from './includes/Card.svelte'
  import Popup from './includes/Popup.svelte'

  const options_name = 'deal_options';
  let options = option_set[options_name];
  let filter_tags
  let searchQuery = $options['searchQuery'] || ""
  let edit_tags = false

  $: {
    filter_tags = $options['filter_tags'] || []
  }

  setDeckId(null);

  onMount(() => {
    document.getElementById('app').style.setProperty('--side-stats-height', '12em')
    toggleAside(window.innerWidth > 820 && window.innerWidth > window.innerHeight);

    const startTour = (_event) => { decks_driver().drive() };
    window.electron.ipcRenderer.on('start-tour', startTour);

    loader.set(false)
    return () => {
      loader.set(true)
      setSecondLevelMenu()
      window.electron.ipcRenderer.removeAllListeners('start-tour');
    };
  });

  options.subscribe($options => {
    if($settings_loaded['settings'])
      settings.update($settings => {
        return { ...$settings, [options_name]: $options };
      });
    searchQuery = $options.searchQuery;
  });

  function newDeck(new_deck){
    user_decks.update(($user_decks) => {
      return {...$user_decks, decks: [new_deck || {"id": v4(), "name": "Новая колода", cards: [], date: Date.now(), tags: ["Констрактед"]}, ...$user_decks['decks']]};
    });

    setDeckId(0)
    deckEditMode.set('deckbuilder')
    navigate('/app/deckbuilder')
  }

  function removeDeck(deck_id){
    if(!confirm(`Вы уверены, что хотите удалить колоду «${$user_decks['decks'][deck_id].name}»?`)) return;
    user_decks.update(($user_decks) => {
      $user_decks['decks'].splice(deck_id, 1)
      return {...$user_decks, decks: $user_decks['decks']};
    });
    setDeckId(null)
  }

  function handleFilterChange(value, checked, type) {
    options.update($options => {
      const updatedOptions = { ...$options };

      if (checked) {
        const newSet = new Set(updatedOptions[type] || []);
        newSet.add(value);
        updatedOptions[type] = [...newSet];
      } else {
        const rem = new Set(updatedOptions[type] || []);
        rem.delete(value);
        updatedOptions[type] = [...rem];
      }
      return updatedOptions;
    });
  }

  function sortDecks(_i1, _i2, target, nextTo) {
    let drag_index = target.dataset.index;
    user_decks.update(($user_decks) => {
      const element = $user_decks['decks'].splice(drag_index, 1)[0];
      if(nextTo && nextTo.dataset.index !== undefined) $user_decks['decks'].splice(nextTo.dataset.index, 0, element);
      else $user_decks['decks'].push(element)
      return {...$user_decks, decks: $user_decks['decks']}
    });
  }

  function setTag(event) {
    if($options.proMode) return
    const selectedCard = event.target.querySelector('.card:hover');
    if(!selectedCard) return
    const index = selectedCard.dataset.index
    const tag = $user_decks['tags'][event.detail['number'] - 1];
    if(!tag) return
    user_decks.update($user_decks => {
      if($user_decks['decks'][index].tags.includes(tag)) $user_decks['decks'][index].tags = $user_decks['decks'][index].tags.filter((x) => x !== tag)
      else $user_decks['decks'][index].tags.push(tag)
      return $user_decks;
    });
  }

  function removeTag(index){
    const tag = $user_decks['tags'][index]
    handleFilterChange(tag, false, 'filter_tags')
    user_decks.update(($user_decks) => {
      $user_decks['tags'].splice(index, 1)
      const tags = $user_decks['tags']
      const decks = $user_decks['decks'].map((deck)=> {
        deck.tags = deck.tags.filter((dtag)=> dtag !== tag)
        return deck
      })
      return {...$user_decks, tags: tags, decks: decks}
    })
  }

  function handleTagsChanged(e){
    const {value, checked} = e.target;
    handleFilterChange(value, checked, 'filter_tags')
  }
</script>

{#if $filterAside.isOpen}
  <aside class="left">
    <section class="driver-filter">
      {#if edit_tags}
        <fieldset class="tags">
        {#each $user_decks['tags'] as _val, index}
            <div class="row">
                <input type="text" bind:value="{$user_decks['tags'][index]}" tabindex="0" />
                <button class="outline" on:click={()=> { removeTag(index) }}>&minus;</button>
            </div>
        {/each}
        <div><button class="outline plus" on:click={()=> { user_decks.update(($user_decks) => { $user_decks['tags'].push(`Тег ${$user_decks['tags'].length+1}`); return {...$user_decks} }) }}>+</button></div>
        </fieldset>
        <fieldset>
            <button class="outline" style="width: 100%; margin-top: 1em" on:click={() => edit_tags = !edit_tags}>Назад</button>
        </fieldset>
      {:else}
      <input type="search" id="search" use:shortcuts={{keyboard: true}} on:action:find={(e)=> { e.target.focus() }} on:action:close={()=> { if(!$popupStore.isOpen) options.set({...$options, searchQuery: ""}) }} class="driver-search" name="search" placeholder="Поиск..." bind:value={searchQuery} tabindex="0" />
      <fieldset on:change="{handleTagsChanged}">
        {#each $user_decks['tags'] as val, ival}
            <label><input type="checkbox" name="deck_tag_id" value="{val}" checked={filter_tags.includes(val)} tabindex="0" />{val} {#if ival < 9}<sup style="color: #666;">{ival+1}</sup>{/if}</label>
        {/each}
      </fieldset>
      <details class="driver-display">
        <summary>Отображение</summary>
        <fieldset>
          <label style="padding-top: 10px;">
            Размер:
            <input type="range" min="120" max="240" step="10" bind:value={$options.cardSize} tabindex="0" />
          </label>
        </fieldset>
      </details>
      <fieldset>
          <button class="outline" style="width: 100%; margin-top: 1em" on:click={() => edit_tags = !edit_tags}>Редактировать теги</button>
      </fieldset>
      {/if}
    </section>
  </aside>
  {/if}

  <section class="content">
    {#key $user_decks['decks']}
    <section class="card-grid decks driver-decks" style={`--card-min-size: ${$options.cardSize}px`} use:arrange={options}
        use:shortcuts={{ keyboard: true }} on:action:number={setTag} on:action:zoomin={()=> changeCardSize(options, 'cardSize')} on:action:zoomout={()=> changeCardSize(options, 'cardSize', -10)}>
        <div class="diver-deck-edit">
          <button on:click={(_e) => { newDeck() }} class="card-drop secondary" style="width: 100%; border: none; border-radius: var(--card-radius); font-size: 300%; color: #DFE3EB; margin-top: 5px;">
            +
            <span style="display: block; font-size: 25%">Новая<br />колода</span>
          </button>
        </div>
      {#each ($user_decks['decks'] || []) as deck, index (index)}
        {#if deck.name.toLocaleLowerCase().includes((searchQuery || "").toLocaleLowerCase()) && (filter_tags.length === 0 || filter_tags.every((tag) => deck['tags'].includes(tag))) && !(deck['tags'].includes('Архив') && !filter_tags.includes('Архив'))}
        <div style="position: relative" data-index={index} use:sortable={{update: sortDecks, top_offset: false, left_offset: false, min_index: 1}}
            use:shortcuts={{ noTap: true }} on:action:primary={() => { setDeckId(index); navigate(`/app/${$deckEditMode}`) }}>
          <Card card={{number: "../back", alt: ""}}
              isDeck={true}
              showText={deck.name}
              dimAbsent={false}
              copies={1}
              showAlts={true}
              tags={deck.tags}
              list_index={index}
              onpreview={() => { togglePopup(deck, null, 'deck') }}
              ondelete={() => { removeDeck(index) }}
              showCornerText={deck.cards.length.toString()}
              showCornerColor={deck.cards.length !== 30 ? (deck.cards.length > 30 && deck.cards.length <= 50 ? '#FFBF00' : '#D93526') : null}
              showColors={collectColors(deck.cards)} />
        </div>
        {/if}
      {/each}
    </section>
    {/key}
</section>

<Popup type="deck" />
