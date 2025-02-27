<script>
  import { v4 } from 'uuid'
  import { onMount } from 'svelte'
  import { navigate } from '@jamen/svelte-router'
  import { toast } from '@zerodevx/svelte-toast'
  import { sortable } from '../utils/sortable.js'
  import { takeScreenshot } from '../utils/ux.js'
  import { cardsStore } from '../stores/cards.js'

  import {
    popupStore,
    togglePopup,
    setSecondLevelMenu,
    setDeckId,
    loader,
    awaiter,
    changeCardSize
  } from '../stores/interface.js'
  import { shortcuts } from '../utils/shortcuts.js'
  import { draft_driver } from '../stores/help.js'
  import { option_set, settings, settings_loaded, user_decks } from '../stores/user_data.js'
  import {
    getBooster,
    doPick,
    doAIPick,
    formatCurrentDate,
    validUserWeights,
    get_karapet_score,
    get_motd_order
  } from '../utils/draft.js'
  import { byId, sets, groupCards, countOfType, sortCards } from '../stores/cards.js'

  import Card from './includes/Card.svelte'
  import Popup from './includes/Popup.svelte'

  const options_name = 'draft_options'
  let draft = option_set[options_name]

  let deck_name = ""
  let lock_click = false

  let userMethod = null
  let parsedUserMetod = {}
  $: parsedUserMetod = validUserWeights(userMethod) ? JSON.parse(userMethod) : {}

  let visible_deck = []
  $: visible_deck = ($draft.look_at === null || $draft.look_at === undefined) ? $draft.own_cards.filter((x) => x) : $draft.their_cards[$draft.look_at].filter((x) => x)

  onMount(() => {
    if ($draft.step > 0) {
      if(byId([...$draft.own_cards, ...$draft.side]).filter((x) => !x).length) {
        stopDraft()
      } else {
        setSecondLevelMenu(
          $draft.step === 5 ?
            ($draft.variant === 'draft' && $draft.last_boosters ?
              { 'Переиграть' : replayDraft, 'Новый турнир': stopDraft } : {'Новый турнир': stopDraft })
            : { 'Прервать турнир': stopDraft }
        )
      }
    } else {
      document.getElementById('app').classList.add('ellion');
    }
    const startTour = (_event) => {
      draft_driver().drive()
    }
    window.electron.ipcRenderer.on('start-tour', startTour)
    window.electron.ipcRenderer.on('start-draft', (_, draft_data) => {
      replayDraft(null, draft_data)
    })
    loader.set(false)
    awaiter.set({ awaiting: {} })
    return () => {
      loader.set(true)
      setSecondLevelMenu()
      document.getElementById('app').classList.remove('ellion')
      window.electron.ipcRenderer.removeAllListeners('start-tour')
      window.electron.ipcRenderer.removeAllListeners('start-draft')
    }
  })

  draft.subscribe(($draft) => {
    if($draft.step === 0) document.getElementById('app').classList.add('ellion');
    else document.getElementById('app').classList.remove('ellion');
    if ($settings_loaded['settings'])
      settings.update(($settings) => {
        return { ...$settings, draft_options: $draft }
      })
    userMethod = $draft.user_method
  })

  function updateUserMethod() {
    draft.update(($draft) => {
      $draft.user_method = userMethod
      return $draft
    })
  }

  function setup(new_data) {
    draft.update((draft) => {
      return { ...draft, ...new_data }
    })
  }

  function canContinueDraft() {
    return $draft.own_cards.length > 0 && $draft.step === 0
  }

  function loadDraft() {
    let last = window.electron.ipcRenderer.sendSync('load-draft')
    replayDraft(null, last)
  }

  function replayDraft(_event, last_boosters = null) {
    draft.update((draft) => {
      if (last_boosters) draft.last_boosters = JSON.parse(JSON.stringify(last_boosters))
      if (draft.last_boosters && draft.last_boosters[0]) {
        draft.current_booster = -1
        let boosters = JSON.parse(JSON.stringify(draft.last_boosters[0]))
        setSecondLevelMenu({ 'Прервать турнир': stopDraft })
        return {
          ...draft,
          draft_id: v4(),
          step: 4,
          players: boosters.length,
          boosters,
          current_booster: 0,
          own_cards: [],
          side: [],
          look_at: null,
          their_cards: Array.from({ length: boosters.length-1 }, () => []),
          last_boosters: draft.last_boosters,
          replay: true
        }
      }
      return draft
    })
    doIAMagic()
  }

  function beginDraft() {
    setSecondLevelMenu({ 'Прервать турнир': stopDraft })
    awaiter.set({ awaiting: {} })
    deck_name = `${$draft.variant === 'draft' ? 'Драфт' : 'Силед'} от ${formatCurrentDate()}`
    draft.update((draft) => {
      draft.current_booster = -1
      if (draft.variant === 'draft') {
        let [boosters, current_booster, last_boosters] = generateBoosters({...draft, replay: false}, [null,null,null,null])
        return {
          ...draft,
          draft_id: v4(),
          step: 4,
          boosters,
          current_booster,
          own_cards: [],
          side: [],
          their_cards: Array.from({ length: boosters.length-1 }, () => []),
          look_at: null,
          last_boosters,
          replay: false
        }
      } else {
        const boosters = draft.boosters_set.flatMap((set_id) =>
          set_id !== '' ? getBooster(cardsStore, parseInt(set_id)) : []
        )
        return {
          ...draft,
          draft_id: v4(),
          step: 5,
          boosters,
          current_booster: -1,
          own_cards: [],
          side: boosters.flat(),
          their_cards: [],
          look_at: null,
          last_boosters: null,
          replay: false
        }
      }
    })
    doIAMagic()
  }

  function continueDraft() {
    if (!canContinueDraft()) return
    setSecondLevelMenu({ 'Прервать турнир': stopDraft })
    if ($draft.current_booster > -1) setup({ step: 4 })
    else setup({ step: 5 })
  }

  function stopDraft() {
    toast.pop(0)
    setSecondLevelMenu()
    setup({ step: 0 })
    awaiter.set({ awaiting: {} })
  }

  function generateBoosters(draft, last_boosters) {
    while (
      ++draft.current_booster < draft.boosters_set.length &&
      draft.boosters_set[draft.current_booster] == ''
    ) {}
    let boosters = []
    if (draft.current_booster >= draft.boosters_set.length || (draft.variant == 'draft' && draft.current_booster > 3)) {
      setSecondLevelMenu(
          draft.last_boosters ? { 'Переиграть' : replayDraft, 'Новый турнир': stopDraft } : {'Новый турнир': stopDraft }
        )
      return [boosters, -1, last_boosters]
    }

    if(draft.replay) {
      if(draft.last_boosters && draft.last_boosters[draft.current_booster]){
        boosters = JSON.parse(JSON.stringify(draft.last_boosters[draft.current_booster]))
        last_boosters = draft.last_boosters
      } else
        return [boosters, -1, last_boosters]
    } else {
      for (let i = 0; i < draft.players; i++)
        boosters.push(getBooster(cardsStore, parseInt(draft.boosters_set[draft.current_booster])))
      last_boosters[draft.current_booster] = JSON.parse(JSON.stringify(boosters))
    }

    return [boosters, draft.current_booster, last_boosters]
  }

  async function sendPickToServer(pickData) {
    if($draft.variant !== 'draft' && $draft.show_score !== '1') return
    try {
      const response = await fetch(`https://berserk-nxt.ru/api/draft${$draft.show_score === '2' ? '_good' : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pickData)
      })
      if (!response.ok) console.error('Ошибка при отправке пика:', response.statusText)
    } catch (err) {
      console.error('Ошибка сети или fetch:', err)
    }
  }

  async function doIAMagic(){
    if($draft.variant !== 'draft' || $draft.show_score !== '1') return
    if(!$draft.boosters[0] || $draft.boosters[0].length < 1) return
    try {
      const booster = [...$draft.boosters[0]]
      toast.pop(0)
      let message = []
      if($settings['other_options']?.ai){
        const tugodum = await doAIPick($draft.own_cards, byId(booster))
        message.push(`Тугодум AI: <b>${byId(booster[tugodum])['name']}</b>`)
      }
      message.push(`Статистика MotD: <b>${byId(booster[doPick(byId(booster), 'motd2')])['name']}</b>`)
      message.push(`Модель Карапета: <b>${byId(booster[doPick(byId(booster), 'karapet')])['name']}</b>`)
      toast.push(message.join('<br />'), {initial: 0})
    } catch (err) {
      console.error('Ошибка сети или fetch:', err)
    }
  }

  function createBotMap(size) {
    const map = {};
    for (let i = 0; i < size; i++) {
      map[i] = `Бот ${i + 1}`;
    }
    return map;
  }

  async function boosterCardClick(index) {
    if(lock_click) return
    lock_click = true

    let step = $draft.step
    let current_booster = $draft.current_booster
    let boosters = $draft.boosters
    const booster = [...boosters[0]]
    let [picked_card] = boosters[0].splice(index, 1)
    let own_cards = [...$draft.own_cards]
    let side = [...$draft.side]
    let last_boosters = $draft.last_boosters
    let their_cards = JSON.parse(JSON.stringify($draft.their_cards))

    awaiter.set({...awaiter, awaiting: createBotMap($draft.players-1)})
    sendPickToServer({
      draft_id: $draft.draft_id,
      context: own_cards,
      options: booster,
      choice: picked_card
    })

    await Promise.all(
      Array.from({ length: $draft.players - 1 }).map((_, idx) => {
        const i = idx + 1;
        return (async () => {
          let pick_index = ($draft.method === 'ai')
              ? await doAIPick(their_cards[i - 1], byId(boosters[i]), 500)
              : doPick(byId(boosters[i]), $draft.method, $draft.user_method)
          const [pick_card] = boosters[i].splice(pick_index, 1)
          their_cards[i - 1].push(pick_card)
          awaiter.update((awaiter) => {
            delete awaiter.awaiting[i - 1]
            if (Object.keys(awaiter.awaiting).length === 0) lock_click = false
            return { ...awaiter, awaiting: { ...awaiter.awaiting } }
          })
        })()
      })
    )

    if (boosters[0].length == 0) {
      [boosters, current_booster, last_boosters] = generateBoosters($draft, $draft.last_boosters)
      if (current_booster == -1) {
        toast.pop(0)
        step = 5
        side = [...own_cards, picked_card]
        own_cards = []
        awaiter.set({ awaiting: {} })
      } else {
        own_cards.push(picked_card)
      }
    } else {
      boosters = [boosters.pop(), ...boosters]
      own_cards.push(picked_card)
    }

    draft.update((draft) => {
      return { ...draft, own_cards, side, their_cards, boosters, current_booster, last_boosters, step }
    })

    doIAMagic()
  }

  function deckCardClick(index) {
    if ($draft.step === 5 && $draft.look_at === null) {
      draft.update((draft) => {
        let [picked_card] = draft.own_cards.splice(index, 1)
        return { ...draft, own_cards: draft.own_cards, side: [...draft.side, picked_card] }
      })
    }
  }

  function sideCardClick(index) {
    if ($draft.step === 5) {
      if (window.scrollY === 0) window.scrollBy(0, 1)
      draft.update((draft) => {
        let [picked_card] = draft.side.splice(index, 1)
        return { ...draft, side: draft.side, own_cards: [...draft.own_cards, picked_card] }
      })
    }
  }

  function moveCards(toDeck) {
    draft.update((draft) => {
      let own_cards = toDeck ? [...draft.side] : []
      let side = toDeck ? [] : [...draft.own_cards]
      return { ...draft, own_cards: own_cards, side: side }
    })
  }

  function saveDeck(name, cards, deal) {
    user_decks.update(($user_decks) => {
      setDeckId(0)
      if ($draft.draft_id && (!$user_decks.decks.length || $draft.draft_id !== $user_decks.decks[0].id))
        return {
          ...$user_decks,
          decks: [
            {
              id: $draft.draft_id || v4(),
              name,
              cards: cards,
              date: Date.now(),
              tags: [$draft.variant === 'draft' ? 'Драфт' : 'Силед']
            },
            ...$user_decks['decks']
          ]
        }
      else return $user_decks
    })

    if(deal) {
      option_set['deal_options'].update(($options) => {
        return {...$options, deck_id: null}
      })
    }

    navigate(deal ? '/app/deal/' : '/app/deckbuilder/')
  }

  function collectColors(deck_cards) {
    return [
      ...deck_cards.reduce((ret, card_id) => {
        ret.add(byId(card_id)?.color)
        return ret
      }, new Set())
    ].sort((a, b) => a - b)
  }

  function sortDraft(sortBy) {
    draft.update(($draft) => {
      return {
        ...$draft,
        own_cards: sortCards($draft.own_cards, sortBy),
        side: sortCards($draft.side, sortBy),
        their_cards: $draft.their_cards.map((deck) => sortCards(deck, sortBy))
      }
    })
  }

  function pickHint(card) {
    if(!card) return null
    if ($draft.show_score !== '1' || !$draft.boosters[0]?.length) return null
    if ($draft.variant == 'siled' || $draft.method == 'karapet')
      return get_karapet_score(card.set_id, card.number) || '—'
    if ($draft.method == 'motd' || $draft.method == 'motd2' || $draft.method == 'ai') {
      const index = get_motd_order(card.set_id, card.number)
      return index > -1 ? (10 - index / 25).toFixed(1) : '—'
    }
    if ($draft.method == 'user') {
      const index = parsedUserMetod[card.set_id].indexOf(card.number)
      return index > -1 ? (10 - index / 25).toFixed(1) : '—'
    }
    return null
  }

  function deckCardDragUpdate(drag_index, index) {
    const new_own_cards = [...visible_deck]
    const element = new_own_cards.splice(drag_index, 1)[0]
    new_own_cards.splice(index, 0, element)

    if($draft.look_at === null)
      draft.update((draft) => {
        return { ...draft, own_cards: new_own_cards }
      })
    else
      draft.update((draft) => {
        let their_cards = draft.their_cards
        their_cards[draft.look_at] = new_own_cards
        return { ...draft, their_cards:  their_cards}
      })
  }

function getDeckName(){
  return $draft.look_at === null ?
    deck_name :
    `${$draft.variant === 'draft' ? 'Драфт' : 'Силед'} от ${formatCurrentDate()} (бот ${$draft.look_at + 1})`
}
</script>

{#if $draft.step <= 3}
  <a href="https://t.me/+w0mT8aSk6xVlMTQ6" target="_blank" id="ellion">&nbsp;</a>
  <section
    class="content draft_form"
    use:shortcuts={{ keyboard: true }}
    on:action:close={() => {
      if (!$popupStore.isOpen) continueDraft()
    }}
  >
    <!-- nav>
    <ul>
      <li class:current={$draft.step === 0}><span>Начало</span></li>
      <li class:current={$draft.step === 1}><span>Параметры</span></li>
      <li class:current={$draft.step === 2}><span>Подключение</span></li>
    </ul>
  </nav -->
    <article style="margin: 1em 0 -1.5em 0">
      {#if $draft.step === 0}
        <fieldset>
          <label>
            <div style="display: flex; grid-gap: 1vw; margin-top: .5em">
              <select bind:value={$draft.variant} class="driver-tournir-type" style="width: 12em">
                <option value="draft">Драфт</option>
                <option value="siled">Силед</option>
              </select>
              <select bind:value={$draft.show_score} class="driver-train-mode">
                <option value="1">Обучение с ботами</option>
                <option value="">Тренировка с ботами</option>
                <option value="2">Турнир с ботами</option>
                <!-- option value="2">Он-лайн турнир</!option -->
              </select>
            </div>
          </label>
          {#if $draft.variant == 'draft'}
            <label>
              Укажи число игроков, {$draft.players - 1} мест{#if $draft.players == 2}о{:else if $draft.players <= 5}а{/if}
              {#if $draft.players == 2}займёт бездушный робот{:else}займут бездушные роботы{/if}:
              <div style="display: flex; grid-gap: 1vw; margin-top: .5em">
                <input
                  type="number"
                  min="2"
                  max="16"
                  bind:value={$draft.players}
                  style="width: 13em"
                />
                <select bind:value={$draft.method} class="driver-tournir-model">
                  {#if $settings['other_options']?.ai}<option value="ai">Тугодум AI (бета)</option>{/if}
                  <option value="motd">Статистика MotD.ru (хаотичный)</option>
                  <option value="motd2">Статистика MotD.ru (фиксированный)</option>
                  <option value="karapet">Модель Карапета</option>
                  <option value="user">Модель пользователя</option>
                </select>
              </div>
              {#if $draft.method == 'user'}
                <textarea
                  bind:value={userMethod}
                  on:input={updateUserMethod}
                  aria-invalid={!validUserWeights(userMethod)}
                ></textarea>
              {/if}
            </label>
          {/if}
        </fieldset>
        <fieldset>
          <label>
            Выбери количество и тип бустеров:
            {#each $draft.variant == 'draft' ? $draft.boosters_set.slice(0, 4) : $draft.boosters_set as _value, index (index)}
              <select
                name={`booster-{index}`}
                aria-label=""
                bind:value={$draft.boosters_set[index]}
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
        <div class="button-container" style="display: flex; justify-content: space-between; text-align: right">
          <span>
            <button class="secondary" on:click={continueDraft} style:visibility={canContinueDraft() ? "visible" : "hidden"}
                >Продолжить прошлый</button>
          </span>
          <span><button class="secondary" on:click={loadDraft}>Загрузить драфт</button></span>
          <span><button on:click={beginDraft}>Начать турнир</button></span>
        </div>
      {:else if $draft.step === 1}
        <label>
          Ключ подключения ({#if $draft.type === 'host'}передай его всем участникам турнира{:else}возьми
            его у организатора{/if}):
          <input
            type="text"
            name="text"
            placeholder="Ключ подключения..."
            aria-label="Text"
            bind:value={$draft.key}
          />
        </label>
        <div class="button-container">
          <button class="secondary" on:click={stopDraft}>Назад</button>
          <button
            class="right"
            on:click={() => {
              setup({ step: 2 })
            }}>Дальше</button
          >
        </div>
      {:else if $draft.step === 2}
        {#if $draft.type == 'host'}
          <div>
            <p>Дождитесь подключения всех участников</p>
            <ul style="margin-bottom: 2em">
              <li>{$draft.name} (это ты)</li>
              {#each $draft.boosters.slice(1) as user}
                <li>
                  {#if user == null}ИИ Бот <em>(или ждем участника)</em>{:else}{user.name}{/if}
                </li>
              {/each}
            </ul>
          </div>
          <div class="button-container">
            <button
              class="secondary"
              on:click={() => {
                setup({ step: 1 })
              }}>Назад</button
            >
            <button
              class="right"
              on:click={() => {
                setup({ step: 4 })
              }}>Старт</button
            >
          </div>
        {:else}
          <div>
            <p>Дождитесь начала от организатора</p>
          </div>
          <div class="button-container">
            <button
              class="secondary"
              on:click={() => {
                setup({ step: 1 })
              }}>Назад</button
            >
          </div>
        {/if}
      {/if}
    </article>
  </section>
  <a href="https://t.me/+w0mT8aSk6xVlMTQ6" target="_blank" id="ellion-text"></a>
{:else}
{#if $draft.step === 5}
  <aside class="right">
    <section>
      <details class="dropdown driver-actions" id="select-cards-action">
        <summary>{#if $draft.look_at === null}Моя колода{:else}Колода бота #{$draft.look_at + 1}{/if}</summary>
        <ul>
          <li><button class="a" on:click|preventDefault={() => { draft.set({...$draft, look_at: null}); document.getElementById('select-cards-action').removeAttribute('open') }}>Моя колода</button></li>
          {#each Array($draft.players-1) as _, i}
            <li><button class="a" on:click|preventDefault={() => { draft.set({...$draft, look_at: i}); document.getElementById('select-cards-action').removeAttribute('open') }}>Колода бота #{i + 1}</button></li>
          {/each}
        </ul>
      </details>

      <input type="text" style={`display: ${$draft.look_at === null ? '': 'none'}`} bind:value={deck_name} class="diver-deck-name" />

      {#if $draft.look_at === null}
      <div style="margin: 0 0 1em">
        {#if $draft.own_cards.length == 0}
          <p class="actions">
            <button
              class="outline"
              on:click={() => {
                moveCards(true)
              }}>Всё в колоду</button
            >
          </p>
        {:else if $draft.side.length == 0}
          <p class="actions">
            <button
              class="outline"
              on:click={() => {
                moveCards(false)
              }}>Всё в сайд</button
            >
          </p>
        {/if}
      </div>
      {/if}

      <details class="dropdown driver-actions" id="own-cards-action">
        <summary>Отсортировать</summary>
        <ul>
          <li>
            <button class="a"
              use:shortcuts
              on:action:primary={() => {
                document.getElementById('own-cards-action').removeAttribute('open')
                sortDraft('color')
              }}>Стихия</button
            >
          </li>
          <li>
            <button class="a"
              use:shortcuts
              on:action:primary={() => {
                document.getElementById('own-cards-action').removeAttribute('open')
                sortDraft('cost')
              }}>Стоимость</button
            >
          </li>
          <li>
            <button class="a"
              use:shortcuts
              on:action:primary={() => {
                document.getElementById('own-cards-action').removeAttribute('open')
                sortDraft('rarity')
              }}>Редкость</button
            >
          </li>
        </ul>
      </details>

      <div class="deck_stats">
        <span class="colors"
          >{#each collectColors(visible_deck) as color}<span class={`color color-${color}`}
            ></span>{/each}</span
        >
        <span class="elite">
          <span class="elite-gold">{countOfType(visible_deck, 'elite', true)}</span>
          <span class="elite-silver">{countOfType(visible_deck, 'elite', false)}</span>
        </span>
        <h4>
          <span style={visible_deck.length != 30 ? 'color: #D93526' : ''}
            >{visible_deck.length}</span
          > / 30
        </h4>
      </div>

      <div class="diver-deck-edit" style="margin-top: 1em">
        <p class="actions">
          <button
            class="outline"
            disabled={visible_deck.length === 0}
            on:click={(_e) => {
              saveDeck(getDeckName(), visible_deck, true)
            }}>Раздать колоду</button
          >
        </p>
        <div
          style="display: flex; justify-content: space-between; width: 100%; margin-top: 10px;"
        >
          <button
            style="width: 100%;"
            disabled={visible_deck.length === 0}
            on:click={(_e) => {
              saveDeck(getDeckName(), visible_deck, false)
            }}>Сохранить</button
          >
          <button
            class="outline"
            style="padding: 5px; height: 45px;  margin-left: 10px;"
            disabled={visible_deck.length === 0}
            on:click={() => {
              window.electron.ipcRenderer.send(
                'save-deck',
                byId(visible_deck),
                getDeckName(),
                'tts',
                'Драфт'
              )
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 50.8 50.8"
              style="fill: none;"
              xml:space="preserve"
              ><path
                d="M5.821 24.871h39.158v20.108H5.821z"
                style="fill:none;stroke:#ffffff;stroke-width:3.175;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:1"
              /><path
                d="M14.949 5.82h20.902M8.864 18.52h33.072m-30.03-6.35h26.988"
                style="fill:#000000;stroke:#ffffff;stroke-width:3.175;stroke-linecap:round;stroke-dasharray:none;stroke-opacity:1"
              /></svg
            >
          </button>
          <button
            class="outline"
            style="padding: 5px; height: 45px;  margin-left: 10px;"
            disabled={visible_deck.length === 0}
            on:click={(e) => {
              takeScreenshot('#own-cards', getDeckName(), groupCards(visible_deck, 'asis'), "", e.shiftKey)
            }}
          >
            <svg width="32" height="32" viewBox="0 0 192 192" fill="none"
              ><path
                fill="#ffffff"
                d="M60 50v6a6 6 0 0 0 4.8-2.4L60 50Zm12-16v-6a6 6 0 0 0-4.8 2.4L72 34Zm60 16-4.8 3.6A6 6 0 0 0 132 56v-6Zm-12-16 4.8-3.6A6 6 0 0 0 120 28v6Zm44 32v76h12V66h-12Zm-10 86H38v12h116v-12ZM28 142V66H16v76h12Zm10-86h22V44H38v12Zm26.8-2.4 12-16-9.6-7.2-12 16 9.6 7.2ZM132 56h22V44h-22v12Zm4.8-9.6-12-16-9.6 7.2 12 16 9.6-7.2ZM120 28H72v12h48V28ZM38 152c-5.523 0-10-4.477-10-10H16c0 12.15 9.85 22 22 22v-12Zm126-10c0 5.523-4.477 10-10 10v12c12.15 0 22-9.85 22-22h-12Zm12-76c0-12.15-9.85-22-22-22v12c5.523 0 10 4.477 10 10h12ZM28 66c0-5.523 4.477-10 10-10V44c-12.15 0-22 9.85-22 22h12Z"
              /><circle cx="96" cy="102" r="28" stroke="#ffffff" stroke-width="12" /></svg
            >
          </button>
        </div>
      </div>

      {#if $draft.variant == 'draft' && $draft.last_boosters}
      <p class="actions" style="margin-top: 15px;">
          <button
              class="secondary"
              style="width: 100%;"
              on:click={(_e) => {
                  window.electron.ipcRenderer.send(
                      'save-draft',
                      null,
                      $draft.last_boosters,
                      deck_name
                  )
              }}>Сохранить турнир</button
          >
      </p>
      {/if}
    </section>
  </aside>
{/if}

<section
  class="content"
  use:shortcuts={{ keyboard: true }}
  on:action:close={() => {
    if (!$popupStore.isOpen) {
      stopDraft()
    }
  }}
>
  {#if $draft.step === 4}
    <section
      class="card-grid"
      style={`--card-min-size: ${$draft.cardSize.booster}px;`}
      use:shortcuts
      on:action:zoomin={() => changeCardSize(draft, 'booster')}
      on:action:zoomout={() => changeCardSize(draft, 'booster', -10)}
    >
      {#each byId($draft.boosters[0]) as card, index (index)}
        <Card
          {card}
          showTopText={pickHint(card)}
          onpreview={togglePopup}
          onprimary={() => boosterCardClick(index)}
          showCount={false}
          showAlts={false}
          dimAbsent={false}
          showBan={false}
          card_list={$draft.boosters[0]}
        />
      {/each}
    </section>
    <hr />
  {/if}

  {#key visible_deck}
    <section
      id="own-cards"
      class="card-grid"
      style={`--card-min-size: ${$draft.step === 4 ? $draft.cardSize.draftdeck : $draft.cardSize.deck}px`}
      use:shortcuts
      on:action:zoomin={() => changeCardSize(draft, $draft.step === 4 ? 'draftdeck' : 'deck')}
      on:action:zoomout={() => changeCardSize(draft, $draft.step === 4 ? 'draftdeck' : 'deck', -10)}
    >
      {#each byId(visible_deck) as card, index (index)}
        <div use:sortable={{ update: deckCardDragUpdate }}>
          <Card
            showTopText={pickHint(card)}
            card={($draft.step === 4 && $draft.show_score === '2' && $draft.boosters[0].length !== 1) ? {number: "../back", alt: ""} : card}
            onpreview={togglePopup}
            onprimary={() => deckCardClick(index)}
            showCount={false}
            showAlts={false}
            dimAbsent={false}
            showBan={false}
            noTap={true}
            card_list={$draft.own_cards}
          />
        </div>
      {/each}
    </section>
  {/key}

  {#if $draft.step === 5 && $draft.look_at === null}
    <hr />
    {#key $draft.side}
      <div style="min-height: 80vw;">
        <section
          id="side"
          class="card-grid"
          style={`--card-min-size: ${$draft.cardSize.side}px;`}
          use:shortcuts
          on:action:zoomin={() => changeCardSize(draft, 'side')}
          on:action:zoomout={() => changeCardSize(draft, 'side', -10)}
        >
          {#each byId($draft.side) as card, index (index)}
            <div use:sortable={{ store: draft, key: 'side' }}>
              <Card
                {card}
                showTopText={pickHint(card)}
                onpreview={togglePopup}
                onprimary={() => sideCardClick(index)}
                showCount={false}
                showAlts={false}
                dimAbsent={false}
                showBan={false}
                noTap={true}
                card_list={$draft.side}
              />
            </div>
          {/each}
        </section>
      </div>
    {/key}
  {/if}
</section>
{/if}

<Popup type="deck" />
