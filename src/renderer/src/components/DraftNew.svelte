<script>
  import * as Colyseus from "colyseus.js";
  import { onMount } from "svelte";
  //import { shortcuts } from '../utils/shortcuts.js'
  //import { sortable } from '../utils/sortable.js'

  import { byId, sets } from '../stores/cards.js'
  import {
    togglePopup,
    setSecondLevelMenu,
    loader
  } from '../stores/interface.js'

  import Card from './includes/Card.svelte'
  import Popup from './includes/Popup.svelte'

  // Можно переопределить при встройке
  export let defaultEndpoint = "ws://berserk-nxt.ru:2567";

  // --- Единый словарь настроек (persist в localStorage) ---
  const STORAGE_KEY = "draft.settings.v1";
  let settings = {
    endpoint: defaultEndpoint,
    playerName: "Player",
    mode: "create",
    draftId: "",
    token: "",
    playerCount: 8,
    boosters: ["50", "60", "60", ""],
    pickSec: 30,
    reviewSec: 60
  };

  function saveSettings() {
    // Если хотите сохранять — раскомментируйте
    // try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch {}
  }
  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        settings = {
          ...settings,
          ...parsed,
          boosters: Array.isArray(parsed.boosters)
            ? parsed.boosters.slice(0,4).concat(["","","",""]).slice(0,4)
            : settings.boosters
        };
      }
    } catch {}
  }

  // --- Сетевые сущности / UI фазы ---
  let client = null;
  let room = null;
  let phase = "connect"; // "connect" | "lobby" | "picking" | "review" | "complete"

  // --- Состояние драфта ---
  let mySeat = -1;
  let seatCount = 0;
  let seats = [];          // [{index, displayName, isBot, connected}] | null
  let currentPack = [];    // ids
  let myPicks = [];        // ids
  let boosterIndex = 0;
  let pickIndex = 0;

  // --- Таймеры выбора/ревью ---
  let localDeadlineAt = 0; // абсолютный локальный дедлайн в ms
  let timerLabel = "";
  let timerId = null;

  let pendingPickId = null; // локальная «отправил пик — жду pick-accepted»

  function startTick() {
    stopTick();
    timerId = setInterval(() => {
      const left = Math.max(0, localDeadlineAt - Date.now());
      timerLabel = left ? (left/1000).toFixed(1) + "s" : "";
      if (!left) stopTick();
    }, 100);
  }
  function stopTick() { if (timerId) { clearInterval(timerId); timerId = null; } }

  async function createOrJoin() {
    try {
      if (!client) client = new Colyseus.Client(settings.endpoint);

      if (settings.mode === "create") {
        settings.draftId = crypto.randomUUID();
        saveSettings();

        const boostersSet = settings.boosters.map(s => s.trim()).filter(Boolean);
        const pc = Math.max(2, Math.min(12, settings.playerCount || 8));

        room = await client.joinOrCreate("draft", {
          draftId: settings.draftId,
          playerToken: settings.token || null,
          playerName: settings.playerName || "Player",
          playerCount: pc,
          boostersSet: boostersSet.length ? boostersSet : ["50", "60", "60"],
          timeouts: {
            pickMs: (settings.pickSec||30) * 1000,
            reviewMs: (settings.reviewSec||60) * 1000,
            startMs: 120000,
            reconnectGraceMs: 120000
          }
        });
      } else {
        if (!settings.draftId) { alert("Укажите UUID драфта"); return; }
        room = await client.joinOrCreate("draft", {
          draftId: settings.draftId,
          playerToken: settings.token || null,
          playerName: settings.playerName || "Player"
        });
      }

      wireRoom();
      phase = "lobby";
      setSecondLevelMenu({ 'Выйти': leaveRoom })
    } catch (e) {
      console.error(e);
      alert("Не удалось подключиться: " + (e.message || e));
      room = null;
    }
  }

  // Отдельная кнопка/автологика «Переподключиться» по сохранённым draftId+token
  async function reconnectFromStorage() {
    try {
      if (!settings.draftId || !settings.token) { alert("Нет сохранённых draftId и token"); return; }
      if (!client) client = new Colyseus.Client(settings.endpoint);
      settings.mode = "join";
      room = await client.joinOrCreate("draft", {
        draftId: settings.draftId,
        playerToken: settings.token,
        playerName: settings.playerName || "Player"
      });
      wireRoom();
      phase = "lobby";
    } catch (e) {
      console.error(e);
      alert("Переподключение не удалось: " + (e.message || e));
    }
  }

  function wireRoom() {
    if (!room) return;

    room.onMessage("auth", (p) => {
      // сохраняем в localStorage, чтобы в любой момент можно было переподключиться
      settings.token   = p.playerToken || settings.token;
      settings.draftId = p.draftId || settings.draftId;
      saveSettings();

      mySeat    = p.seatIndex;
      seatCount = p.playerCount || seatCount || 8;
    });

    room.onMessage("phase", (p) => { phase = p.phase || phase; });

    room.onMessage("pack", (payload) => {
      phase           = "picking";
      currentPack     = payload.cards || [];
      boosterIndex    = payload.boosterIndex ?? boosterIndex;
      pickIndex       = payload.pickIndex ?? pickIndex;

      // локальный дедлайн = сейчас + (serverDeadline - serverNow)
      const dl = Number(payload.deadlineAt);
      const sv = Number(payload.serverNowMs);
      if (Number.isFinite(dl) && Number.isFinite(sv)) {
        localDeadlineAt = Date.now() + Math.max(0, dl - sv);
      } else {
        localDeadlineAt = Date.now() + ((settings.pickSec || 30) * 1000);
      }

      pendingPickId   = null;
      startTick();
    });

    room.onMessage("pick-accepted", (payload) => {
      stopTick();
      timerLabel = "ожидание…";
      if (pendingPickId) {
        myPicks = [...myPicks, pendingPickId];
        pendingPickId = null;
      } else if (payload && payload.cardId) {
        // авто-пик сервером
        myPicks = [...myPicks, payload.cardId];
      }
    });

    room.onMessage("pick-rejected", () => { pendingPickId = null; });

    room.onMessage("review-info", (payload) => {
      phase = "review";
      const dl = Number(payload?.deadlineAt);
      const sv = Number(payload?.serverNowMs);
      if (Number.isFinite(dl) && Number.isFinite(sv)) {
        localDeadlineAt = Date.now() + Math.max(0, dl - sv);
        startTick();
      } else {
        stopTick(); timerLabel = "";
      }
      pendingPickId = null;
    });

    room.onMessage("draft-complete", (payload) => {
      phase = "complete";
      myPicks = Array.isArray(payload?.yourCards) ? payload.yourCards.slice() : [];
      stopTick(); timerLabel = "";
      pendingPickId = null;
    });

    // если сервер шлёт DEBUG_ROUND — можем продублировать (на вкус)
    room.onMessage("debug-round", (p) => {
      const mine = p.picks?.find(x => x.token === settings.token);
      if (mine?.cardId) {
        // защитимся от дублей (когда уже пришёл pick-accepted)
        if (!myPicks.length || myPicks[myPicks.length - 1] !== mine.cardId) {
          myPicks = [...myPicks, mine.cardId];
        }
      }
    });

    room.onStateChange((state) => {
      if (state?.seats) {
        const arr = [];
        for (let i = 0; i < state.seats.length; i++) {
          const s = state.seats[i];
          arr.push(s ? {
            index: i,
            displayName: s.displayName,
            isBot: !!s.isBot,
            connected: !!s.connected
          } : null);
        }
        seats = arr;
        seatCount = state.seats.length || seatCount || 8;
      }
      phase        = state?.phase || phase;
      boosterIndex = state?.boosterIndex ?? boosterIndex;
      pickIndex    = state?.pickIndex ?? pickIndex;
    });

    room.onLeave(() => { leaveRoom(); });
  }

  function startDraft() {
    if (room && settings.token) room.send("start", { playerToken: settings.token });
  }
  function pickCard(id) {
    if (room && settings.token && phase === "picking") {
      pendingPickId = id;
      room.send("pick", { playerToken: settings.token, cardId: id });
    }
  }
  function confirmNext() {
    if (room && settings.token && phase === "review") {
      room.send("confirm-next", { playerToken: settings.token });
    }
  }
  function leaveRoom() {
    try { room?.leave(); } catch {}
    room = null;
    phase = "connect";

    // сбрасываем только эфемерное; настройки не трогаем
    currentPack = []; myPicks = [];
    boosterIndex = 0; pickIndex = 0;
    seats = []; mySeat = -1; seatCount = 0;
    stopTick(); timerLabel = ""; localDeadlineAt = 0;
    pendingPickId = null;

    setSecondLevelMenu({})
    saveSettings();
  }

  onMount(async () => {
    loadSettings()
    loader.set(false)
    if (settings.draftId && settings.token) {
      try { await reconnectFromStorage(); } catch {}
    }
  });
</script>

{#if phase === "connect" || phase === "lobby"}
<section class="content draft_form">
  <article style="margin: 1em 0 -1.5em 0">
    {#if phase === "connect"}
    <fieldset>
      <label>
        <select bind:value={settings.mode} class="driver-tournir-model">
          <option value="create">Создать игру</option>
          <option value="join">Присоединиться к игре</option>
        </select>
      </label>
      <label>
        Имя:
        <input name="name" bind:value={settings.playerName} />
      </label>
    </fieldset>

    {#if settings.mode === "create"}
      <fieldset>
        <div style="display: flex; grid-gap: 1vw">
          <label style="flex: 1">
            Число игроков:
            <input type="number" min="2" max="12" bind:value={settings.playerCount} />
          </label>
          <label style="flex: 1">
            Время выбора:
            <input type="number" min="5" bind:value={settings.pickSec} />
          </label>
          <label style="flex: 1">
            Время просмотра:
            <input type="number" min="15" bind:value={settings.reviewSec} />
          </label>
        </div>
        <label>
          {#each settings.boosters as _value, index (index)}
          <select
            name={`booster-{index}`}
            aria-label=""
            bind:value={settings.boosters[index]}
            style="margin-bottom: .3em"
          >
            {#if index}<option value=""></option>{/if}
            {#each Object.entries(sets) as [key, set_name]}
              {#if parseInt(key) % 10 == 0}
                <option value={key}>{set_name}</option>
              {/if}
            {/each}
          </select>
          {/each}
        </label>
      </fieldset>
      <div class="button-container" style="text-align: right">
        <button class="right" on:click={createOrJoin}>Создать</button>
      </div>
    {:else}
      <fieldset>
        <label>
          Ключ турнира:
          <input bind:value={settings.draftId} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
        </label>
      </fieldset>
      <div class="button-container" style="text-align: right">
        <button class="right" on:click={createOrJoin}>Подключиться</button>
      </div>
    {/if}
  {/if}

  {#if phase === "lobby"}
    <fieldset>
      <label>
        Ключ турнира{#if settings.mode === "create"}&nbsp;(передай его остальным){/if}:
        <input bind:value={settings.draftId} readonly />
      </label>
      <label>
        <p>Игроки:</p>
        {#each Array(seatCount) as _, i}
          <p style={`font-style: ${i === mySeat ? "italic" : ""}; margin: 0`}>
          {#if seats[i] && seats[i].connected}
            {seats[i].displayName} {seats[i].connected ? "[online]" : "[offline]"}
          {:else}
            —
          {/if}
          </p>
        {/each}
      </label>
    </fieldset>
    <div class="button-container" style="display: flex; justify-content: space-between; text-align: right">
      {#if settings.mode === "create"}<button class="right" on:click={startDraft}>Начать драфт</button>{/if}
    </div>
  {/if}
</section>
{/if}

{#if phase === "picking"}
<aside class="right">
  <section>
    <p>{timerLabel}</p>

    <p>Игроки:</p>
    {#each Array(seatCount) as _, i}
      <p style={`font-style: ${i === mySeat ? "italic" : ""}; margin: 0`}>
      {#if seats[i] && seats[i].connected}
        {seats[i].displayName} {seats[i].connected ? "[online]" : "[offline]"}
      {:else}
        Бездушный бот
      {/if}
      </p>
    {/each}
  </section>
</aside>
<section class="content">
  <section class={`card-grid`} style={`--card-min-size: 180px; opacity: ${pendingPickId ? 0.5: 1}`}>
    {#key currentPack}
    {#each byId(currentPack) as card, index (index)}
    <div>
      <Card
        {card}
        onpreview={togglePopup}
        onprimary={() => pendingPickId ? null : pickCard(card.id)}
        showCount={false}
        showAlts={false}
        dimAbsent={false}
        showBan={false}
        card_list={currentPack}
      />
    </div>
    {/each}
    {/key}
  </section>
  <hr />
  <section
    id="own-cards"
    class={`card-grid`}
    style={`--card-min-size: 120px`}>
    {#each byId(myPicks) as _card, index (index)}
      <div>
        <Card
          card={{number: "../back", alt: ""}}
          onpreview={togglePopup}
          onprimary={() => null}
          showCount={false}
          showAlts={false}
          dimAbsent={false}
          showBan={false}
          noTap={true}
          card_list={myPicks}
        />
      </div>
    {/each}
  </section>
</section>
{/if}

{#if phase === "review"}
  <aside class="right">
    <section>
      <button on:click={confirmNext}>Готов</button>

      <p>{timerLabel}</p>

      <p>Игроки:</p>
      {#each Array(seatCount) as _, i}
        <p style={`font-style: ${i === mySeat ? "italic" : ""}; margin: 0`}>
        {#if seats[i] && seats[i].connected}
          {seats[i].displayName} {seats[i].connected ? "[online]" : "[offline]"}
        {:else}
          Бездушный бот
        {/if}
        </p>
      {/each}
    </section>
  </aside>
  <section class="content">
    <section class={`card-grid`} style={`--card-min-size: 180px; opacity: ${pendingPickId ? 0.5: 1}`}>
      {#key myPicks}
      {#each byId(myPicks) as card, index (index)}
      <div>
        <Card
          {card}
          onpreview={togglePopup}
          onprimary={() => pendingPickId ? null : pickCard(card.id)}
          showCount={false}
          showAlts={false}
          dimAbsent={false}
          showBan={false}
          card_list={myPicks}
        />
      </div>
      {/each}
      {/key}
    </section>
  </section>
{/if}

{#if phase === "complete"}
  <aside class="right">
    <section>
      <button
        style="width: 100%;"
        disabled={myPicks.length === 0}
        on:click={(_e) => {
          window.electron.ipcRenderer.send(
            'save-deck',
            byId(myPicks),
            'Драфт',
            'tts',
            'Драфт'
          )
        }}>Сохранить</button
      >
    </section>
  </aside>
  <section class="content">
    <section class={`card-grid`} style={`--card-min-size: 180px;`}>
      {#key myPicks}
      {#each byId(myPicks) as card, index (index)}
      <div>
        <Card
          {card}
          onpreview={togglePopup}
          onprimary={() => pendingPickId ? null : pickCard(card.id)}
          showCount={false}
          showAlts={false}
          dimAbsent={false}
          showBan={false}
          card_list={myPicks}
        />
      </div>
      {/each}
      {/key}
    </section>
  </section>
{/if}


<Popup type="deck" />
