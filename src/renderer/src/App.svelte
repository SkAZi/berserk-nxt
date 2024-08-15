<script>
  import { v4 } from 'uuid';
  import { onMount } from 'svelte';
  import { fade, slide } from 'svelte/transition';
  import { quintOut, cubicInOut } from 'svelte/easing';
  import { Router, Link, router, navigate } from "@jamen/svelte-router";
  import Collection from "./components/Collection.svelte";
  import DeckBuilder from "./components/DeckBuilder.svelte";
  import Draft from "./components/Draft.svelte";
  import Deal from "./components/Deal.svelte";
  import Decks from "./components/Decks.svelte";
  //import Table from "./components/Table.svelte";
  import DropZone from './components/includes/DropZone.svelte'
  import About from './components/includes/About.svelte'
  import PrintDeckList from './components/includes/PrintDeckList.svelte'
  import { groupCards, byId } from './stores/cards.js';
  import { toggleAside, secondLevelMenu, toggleStats, toggleMainMenu, showMainMenu, setDeckId, currentDeck, deckEditMode, loader, toggleAbout, togglePrintDeckList } from './stores/interface.js';
  import { shortcuts } from './utils/shortcuts.js';
  import { takeScreenshot } from './utils/ux.js'
  import { user_decks } from './stores/user_data.js';

  const routes = {
    "/": Collection,
    "/app/decks": Decks,
    "/app/deckbuilder": DeckBuilder,
    "/app/deal": Deal,
    "/app/draft": Draft,
//    "/app/table": Table,
  }

  onMount(() => {
    window.electron.ipcRenderer.on('new-deck', (_event, new_deck) => { newDeck(new_deck) });
    return () => {
      window.electron.ipcRenderer.removeAllListeners('new-deck');
    };
  })

  function newDeck(new_deck){
    user_decks.update(($user_decks) => {
      return {...$user_decks, decks: [new_deck || {"id": v4(), "name": "Новая колода", cards: [], date: Date.now(), tags: ['Констрактед']}, ...$user_decks['decks']]};
    });
    setDeckId(0)
    navigate(`/app/deckbuilder/`)
  }

  function cloneDeck(index){
    user_decks.update(($user_decks) => {
      const cloned = JSON.parse(JSON.stringify($user_decks['decks'][index]))
      cloned["id"] = v4()
      cloned["name"] = cloned["name"].replace(/( *v(\d+))?$/, (_a, _b, x) => ` v${parseInt(x || "0") + 1}`)
      return {...$user_decks, decks: [cloned, ...$user_decks['decks']]};
    });
    setDeckId(0)
    navigate(`/app/deckbuilder/`)
  }

  function removeDeck(deck_id){
    if(!confirm(`Вы уверены, что хотите удалить колоду «${$user_decks['decks'][deck_id].name}»?`)) return;
    user_decks.update(($user_decks) => {
      $user_decks['decks'].splice(deck_id, 1)
      return {...$user_decks, decks: $user_decks['decks']};
    });
    setDeckId(null)
  }
</script>

<header>
  <nav class="pico-background-slate-600">
    <ul>
      <li style="margin-left: -1px;">
        <button class="outline driver-menu" on:click={toggleMainMenu}>
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" style="fill: #e8dff2;"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"></path></svg>
        </button>
      </li>
      <li style="margin-left: -15px;">
        <button class="outline" on:click={toggleAside} disabled={$router.path !== '/' && $router.path !== '/app/decks' && ($router.path !== '/app/deckbuilder' || ($currentDeck.deck_id !== null && $currentDeck.show_full)) && ($router.path !== '/app/deal' || $currentDeck.deck_id !== null) }>
          <svg width="30" height="30" viewBox="0 0 24 24"  style="fill: #e8dff2;"><path fill-rule="evenodd" clip-rule="evenodd" d="M21 20H7V4H21V20ZM19 18H9V6H19V18Z" /><path d="M3 20H5V4H3V20Z" /></svg>
        </button>
      </li>
      <li style="margin-left: -15px; margin-right: 20px;">
        <button class="outline driver-stats" on:click={toggleStats} disabled={$router.path === '/app/draft' || $router.path === '/app/table' || ($router.path === '/app/deal' && $currentDeck.deck_id === null )}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="fill: #e8dff2;"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.5 18.5V4H4V20H20V18.5H5.5Z"/><path d="M10.5 17V8.00131H12V17H10.5Z"/><path d="M7 17V12H8.5V17H7Z"/><path d="M17.5 17V10H19V17H17.5Z"/><path d="M14 17V5H15.5V17H14Z"/></svg>
        </button>
      </li>

      <li><Link href="/" aria-current={$router.path == '/' ? 'page' : ''}>Коллекция</Link></li>
      <li class="driver-deck-build"><Link href={$currentDeck.deck_id === null ? '/app/decks' : `/app/${$deckEditMode}`} aria-current={['/app/decks','/app/deal','/app/deckbuilder'].includes($router.path) ? 'page' : ''}>Колоды</Link></li>
      <li class="driver-deck-limited"><Link href="/app/draft" aria-current={$router.path == '/app/draft' ? 'page' : ''}>Лимитед</Link></li>
      <!-- li class="driver-deck-table"><Link href="/app/table" aria-current={$router.path == '/app/table' ? 'page' : ''}>Стол</Link></li -->
    </ul>
    <ul class="driver-second-menu">
      {#each Object.entries($secondLevelMenu?.menu) as [name, action]}
      <li><a use:shortcuts on:action:primary={(e) => { action(e); toggleMainMenu(false) }}>{name}</a></li>
      {/each}
    </ul>
  </nav>
</header>

{#if $showMainMenu.isOpen}
<section class="main-menu" transition:slide={{ duration: 150, easing: quintOut }} use:shortcuts={{ keyboard: true }} on:action:primary={toggleMainMenu} on:action:close={toggleMainMenu}>
  <ul>
    <li>
      <strong>Коллекция</strong>
      <ul>
        <li><a use:shortcuts on:action:primary={()=> { window.electron.ipcRenderer.send('new-collection') }}>Новая коллекция</a></li>
        <li><a use:shortcuts on:action:primary={()=> { window.electron.ipcRenderer.send('load-collection', null, true, false) }}>Загрузить коллекцию</a></li>
        <li><a use:shortcuts on:action:primary={()=> { window.electron.ipcRenderer.send('save-collection') }}>Сохранить коллекцию</a></li>
        <li><hr /></li>
        <li><a use:shortcuts on:action:primary={()=> { window.electron.ipcRenderer.send('load-collection', null, false, false) }}>Добавить в коллекцию</a></li>
        <li><a use:shortcuts on:action:primary={()=> { window.electron.ipcRenderer.send('load-collection', null, false, true) }}>Убрать из коллекции</a></li>
        <li><hr /></li>
        <li><a use:shortcuts on:action:primary={()=> { window.electron.ipcRenderer.send('reset-selected') }}>Очистить избранное</a></li>
        <li><a use:shortcuts on:action:primary={()=> { window.electron.ipcRenderer.send('export-selected') }}>Экспорт избранного</a></li>
        <!-- li><hr /></!li>
        <li><a use:shortcuts on:action:primary={()=> { window.electron.ipcRenderer.send('export-filtered', $filteredSortedCards) }}>Экспорт отфильтрованного</a></li -->
      </ul>
    </li>
    <li>
      <strong>Колоды</strong>
      <ul>
        <li><a use:shortcuts on:action:primary={() => newDeck()}>Новая колода</a></li>
        <li><a use:shortcuts on:action:primary={() => { window.electron.ipcRenderer.send('load-deck')}}>Загрузить колоду</a></li>
        <li><a use:shortcuts on:action:primary={() => { togglePrintDeckList() }}>Распечатать деклист</a></li>
        {#if $currentDeck.deck_id !== null && ($router.path == '/app/deckbuilder' || $router.path == '/app/deal')}
        {@const deck_id = $currentDeck.deck_id}
        <li><a use:shortcuts on:action:primary={() => { cloneDeck(deck_id) }}>Дублировать колоду</a></li>
        <li><hr /></li>
        <li><a use:shortcuts on:action:primary={() => { window.electron.ipcRenderer.send('save-deck', groupCards($user_decks['decks'][deck_id].cards), $user_decks['decks'][deck_id].name, 'brs'); }}>Сохранить колоду</a></li>
        <li><a use:shortcuts on:action:primary={() => { window.electron.ipcRenderer.send('save-deck', groupCards($user_decks['decks'][deck_id].cards), $user_decks['decks'][deck_id].name, 'proberserk'); }}>Экспорт в TXT (ProBerserk)</a></li>
        <li><a use:shortcuts on:action:primary={() => { window.electron.ipcRenderer.send('save-deck', byId($user_decks['decks'][deck_id].cards), $user_decks['decks'][deck_id].name, 'tts'); }}>Экспорт в TTS</a></li>
        <li><a use:shortcuts on:action:primary={() => { takeScreenshot('#deck-view', $user_decks['decks'][deck_id].name, groupCards($user_decks['decks'][deck_id].cards, 'asis')); }}>Декшот JPEG</a></li>
        <li><hr /></li>
        <li><a use:shortcuts on:action:primary={() => { removeDeck(deck_id) }}>Удалить колоду</a></li>
        {/if}
      </ul>
    </li>
    <li>
      <strong>Приложение</strong>
      <ul>
        <!-- li><a use:shortcuts on:action:primary={() => {  }}>Настройки</a></li -->
        <li><a use:shortcuts on:action:primary={() => { window.electron.ipcRenderer.send('start-tour') }}>Короткая справка</a></li>
        <li><a use:shortcuts on:action:primary={toggleAbout}>О программе</a></li>
      </ul>
    </li>
  </ul>
</section>
{/if}

<main class="container-fluid">
  {#if $loader}<div id="loader" out:fade={{ duration: 1000, easing: cubicInOut }}></div>{/if}
  <Router {routes} />
</main>

<About />

<PrintDeckList />

<DropZone>
  <h3>Перетащи файлы сюда,<br /><em>попробуем их импортировать...</em></h3>
</DropZone>
