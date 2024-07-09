<script>
  import { v4 } from 'uuid'
  import { onMount } from 'svelte'
  import { navigate } from '@jamen/svelte-router'
  import { sortable } from '../utils/sortable.js'
  import { takeScreenshot } from '../utils/ux.js'
  import { cardsStore } from '../stores/cards.js'

  import {
    popupStore,
    togglePopup,
    setSecondLevelMenu,
    setDeckId,
    loader
  } from '../stores/interface.js'
  import { shortcuts } from '../utils/shortcuts.js'
  import { draft_driver } from '../stores/help.js'
  import { option_set, settings, settings_loaded, user_decks } from '../stores/user_data.js'
  import {
    getBooster,
    doPick,
    formatCurrentDate,
    validUserWeights,
    karapet_score,
    motd_order
  } from '../utils/draft.js'
  import { byId, sets, groupCards } from '../stores/cards.js'

  import Card from './includes/Card.svelte'
  import Popup from './includes/Popup.svelte'

  const options_name = 'draft_options'
  let draft = option_set[options_name]

  let deck_name
  $: deck_name = `${$draft.variant === 'draft' ? 'Драфт' : 'Силед'} от ${formatCurrentDate()}`

  let userMethod = '{"10":[],"20":[],"30":[]}'
  let parsedUserMetod = {}
  $: parsedUserMetod = validUserWeights(userMethod) ? JSON.parse(userMethod) : {}

  onMount(() => {
    if ($draft.step > 0) {
      setSecondLevelMenu(
        $draft.step === 5 ? { 'Новый турнир': stopDraft } : { 'Прервать турнир': stopDraft }
      )
    }
    const startTour = (_event) => {
      draft_driver().drive()
    }
    window.electron.ipcRenderer.on('start-tour', startTour)
    loader.set(false)
    return () => {
      loader.set(true)
      setSecondLevelMenu()
      window.electron.ipcRenderer.removeAllListeners('start-tour')
    }
  })

  draft.subscribe(($draft) => {
    if ($settings_loaded['settings'])
      settings.update(($settings) => {
        return { ...$settings, draft_options: $draft }
      })
    userMethod = $draft.user_method || '{"10":[],"20":[],"30":[]}'
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

  function beginDraft() {
    setSecondLevelMenu({ 'Прервать турнир': stopDraft })
    draft.update((draft) => {
      draft.current_booster = -1
      if (draft.variant === 'draft') {
        let [boosters, current_booster] = generateBoosters(draft)
        return {
          ...draft,
          draft_id: v4(),
          step: 4,
          boosters,
          current_booster,
          own_cards: [],
          side: []
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
          side: boosters.flat()
        }
      }
    })
  }

  function continueDraft() {
    if (!canContinueDraft()) return
    setSecondLevelMenu({ 'Прервать турнир': stopDraft })
    if ($draft.current_booster > -1) setup({ step: 4 })
    else setup({ step: 5 })
  }

  function stopDraft() {
    setSecondLevelMenu()
    setup({ step: 0 })
  }

  function generateBoosters(draft) {
    while (
      ++draft.current_booster < draft.boosters_set.length &&
      draft.boosters_set[draft.current_booster] == ''
    ) {}
    let boosters = []
    if (draft.current_booster >= draft.boosters_set.length) {
      setSecondLevelMenu({ 'Новый турнир': stopDraft })
      return [boosters, -1]
    }

    for (let i = 0; i < draft.players; i++)
      boosters.push(getBooster(cardsStore, parseInt(draft.boosters_set[draft.current_booster])))

    return [boosters, draft.current_booster]
  }

  function boosterCardClick(index) {
    draft.update((draft) => {
      let step = draft.step
      let current_booster = draft.current_booster
      let boosters = draft.boosters
      let [picked_card] = boosters[0].splice(index, 1)
      let own_cards = [...draft.own_cards]
      let side = [...draft.side]

      for (let i = 1; i < draft.players; i++)
        boosters[i].splice(
          doPick(byId(boosters[i]), draft.method, draft.user_method || '{"10":[],"20":[],"30":[]}'),
          1
        )

      if (boosters[0].length == 0) {
        ;[boosters, current_booster] = generateBoosters(draft)
        if (draft.variant == 'draft' && current_booster > 3) current_booster = -1
        if (current_booster == -1) {
          step = 5
          side = [...own_cards, picked_card]
          own_cards = []
        } else {
          own_cards.push(picked_card)
        }
      } else {
        boosters = [boosters.pop(), ...boosters]
        own_cards.push(picked_card)
      }
      return { ...draft, own_cards: own_cards, side: side, boosters, current_booster, step }
    })
  }

  function deckCardClick(index) {
    if ($draft.step === 5) {
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
      if ($draft.draft_id && $draft.draft_id !== $user_decks.decks[0].id)
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

  function incSize(type) {
    if ($draft.step === 4 && type == 'deck') type = 'draftdeck'
    draft.update(($draft) => {
      let newSize = Math.min($draft.cardSize[type] + 10, 300)
      return { ...$draft, cardSize: { ...$draft.cardSize, [type]: newSize } }
    })
  }

  function decSize(type) {
    if ($draft.step === 4 && type == 'deck') type = 'draftdeck'
    draft.update(($draft) => {
      let newSize = Math.max($draft.cardSize[type] - 10, 80)
      return { ...$draft, cardSize: { ...$draft.cardSize, [type]: newSize } }
    })
  }

  function sortDraft(sortBy) {
    draft.update(($draft) => {
      return {
        ...$draft,
        own_cards: $draft.own_cards
          .map(byId)
          .sort((a, b) => {
            if (sortBy === 'color')
              return (
                b.number +
                1000 * (b.elite ? 1 : 0) +
                b.cost -
                10000 * b.color -
                (a.number + 1000 * (a.elite ? 1 : 0) + a.cost - 10000 * a.color)
              )
            if (sortBy === 'rarity')
              return (
                (b.elite ? 1 : 0) +
                100 * b.cost +
                1000 * b.rarity -
                ((a.elite ? 1 : 0) + 100 * a.cost + 1000 * a.rarity)
              )
            return (
              1000 * (b.elite ? 1 : 0) +
              100 * b.cost +
              b.color -
              (1000 * (a.elite ? 1 : 0) + 100 * a.cost + a.color)
            )
          })
          .map((card) => card.id),
        side: $draft.side
          .map(byId)
          .sort((a, b) => {
            if (sortBy === 'color')
              return (
                b.number +
                1000 * (b.elite ? 1 : 0) +
                b.cost -
                10000 * b.color -
                (a.number + 1000 * (a.elite ? 1 : 0) + a.cost - 10000 * a.color)
              )
            if (sortBy === 'rarity')
              return (
                (b.elite ? 1 : 0) +
                100 * b.cost +
                1000 * b.rarity -
                ((a.elite ? 1 : 0) + 100 * a.cost + 1000 * a.rarity)
              )
            return (
              1000 * (b.elite ? 1 : 0) +
              100 * b.cost +
              b.color -
              (1000 * (a.elite ? 1 : 0) + 100 * a.cost + a.color)
            )
          })
          .map((card) => card.id)
      }
    })
  }

  function count(deck_cards, key, value) {
    return deck_cards.reduce((acc, card_id) => {
      return acc + (byId(card_id)[key] === value ? 1 : 0)
    }, 0)
  }

  function pickHint(card) {
    if ($draft.show_score !== '1' || !$draft.boosters[0]?.length) return null
    if ($draft.variant == 'siled' || $draft.method == 'karapet')
      return karapet_score[card.set_id][card.number] || '—'
    if ($draft.method == 'motd' || $draft.method == 'motd2') {
      const index = motd_order[card.set_id].indexOf(card.number)
      return index > -1 ? (10 - index / 20).toFixed(1) : '—'
    }
    if ($draft.method == 'user') {
      const index = parsedUserMetod[card.set_id].indexOf(card.number)
      return index > -1 ? (10 - index / 20).toFixed(1) : '—'
    }
    return null
  }
</script>

{#if $draft.step <= 3}
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
    <article style="margin-top: 1em">
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
                  <option value="motd">Статистика MotD.ru</option>
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
                  {#if parseInt(key) % 10 == 0 && parseInt(key) < 40}
                    <option value={key}>{set_name}</option>
                  {/if}
                {/each}
              </select>
            {/each}
          </label>
        </fieldset>
        <div class="button-container" style="display: flex; justify-content: space-between;">
          <span>
            {#if canContinueDraft()}<button class="secondary" on:click={continueDraft}
                >Продолжить прошлый</button
              >{/if}
          </span>
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
{:else}
  {#if $draft.step === 5}
    <aside class="right">
      <section>
        <input type="text" bind:value={deck_name} class="diver-deck-name" />

        <div style="margin: 0 0 1em">
          {#if $draft.own_cards.length == 0}
            <p class="actions">
              <button
                class="secondary"
                on:click={() => {
                  moveCards(true)
                }}>Всё в колоду</button
              >
            </p>
          {:else if $draft.side.length == 0}
            <p class="actions">
              <button
                class="secondary"
                on:click={() => {
                  moveCards(false)
                }}>Всё в сайд</button
              >
            </p>
          {/if}
        </div>

        <details class="dropdown driver-actions" id="own-cards-action">
          <summary>Отсортировать</summary>
          <ul>
            <li>
              <a
                use:shortcuts
                on:action:primary={() => {
                  document.getElementById('own-cards-action').removeAttribute('open')
                  sortDraft('color')
                }}>Стихия</a
              >
            </li>
            <li>
              <a
                use:shortcuts
                on:action:primary={() => {
                  document.getElementById('own-cards-action').removeAttribute('open')
                  sortDraft('cost')
                }}>Стоимость</a
              >
            </li>
            <li>
              <a
                use:shortcuts
                on:action:primary={() => {
                  document.getElementById('own-cards-action').removeAttribute('open')
                  sortDraft('rarity')
                }}>Редкость</a
              >
            </li>
          </ul>
        </details>

        <div class="deck_stats">
          <span class="colors"
            >{#each collectColors($draft.own_cards) as color}<span class={`color color-${color}`}
              ></span>{/each}</span
          >
          <span class="elite">
            <span class="elite-gold">{count($draft.own_cards, 'elite', true)}</span>
            <span class="elite-silver">{count($draft.own_cards, 'elite', false)}</span>
          </span>
          <h4>
            <span style={$draft.own_cards.length != 30 ? 'color: #D93526' : ''}
              >{$draft.own_cards.length}</span
            > / 30
          </h4>
        </div>

        <div class="diver-deck-edit" style="margin-top: 1em">
          <p class="actions">
            <button
              class="outline"
              disabled={$draft.own_cards.length === 0}
              on:click={(_e) => {
                saveDeck(deck_name, $draft.own_cards, true)
              }}>Раздать колоду</button
            >
          </p>
          <div
            style="display: flex; justify-content: space-between; width: 100%; margin-top: 10px;"
          >
            <button
              style="width: 100%;"
              disabled={$draft.own_cards.length === 0}
              on:click={(_e) => {
                saveDeck(deck_name, $draft.own_cards)
              }}>Сохранить</button
            >
            <button
              class="outline"
              style="padding: 5px; height: 45px;  margin-left: 10px;"
              disabled={$draft.own_cards.length === 0}
              on:click={() => {
                window.electron.ipcRenderer.send(
                  'save-deck',
                  byId($draft.own_cards),
                  deck_name,
                  'tts'
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
              disabled={$draft.own_cards.length === 0}
              on:click={() => {
                takeScreenshot('#own-cards', deck_name, groupCards($draft.own_cards, 'asis'))
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
        on:action:zoomin={() => incSize('booster')}
        on:action:zoomout={() => decSize('booster')}
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

    {#key $draft.own_cards}
      <section
        id="own-cards"
        class="card-grid"
        style={`--card-min-size: ${$draft.step === 4 ? $draft.cardSize.draftdeck : $draft.cardSize.deck}px`}
        use:shortcuts
        on:action:zoomin={() => incSize('deck')}
        on:action:zoomout={() => decSize('deck')}
      >
        {#each byId($draft.own_cards) as card, index (index)}
          <div use:sortable={{ store: draft, key: 'own_cards' }}>
            <Card
              card={($draft.step === 4 && $draft.show_score === '2') ? {number: "../back", alt: ""} : card}
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

    {#if $draft.step === 5}
      <hr />
      {#key $draft.side}
        <div style="min-height: 80vw;">
          <section
            id="side"
            class="card-grid"
            style={`--card-min-size: ${$draft.cardSize.side}px;`}
            use:shortcuts
            on:action:zoomin={() => incSize('side')}
            on:action:zoomout={() => decSize('side')}
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
