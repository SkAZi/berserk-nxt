<script>
  import { fade } from 'svelte/transition';
  import { popupStore, togglePopup } from '../../stores/interface.js';
  import { shortcuts } from '../../utils/shortcuts.js';
  import { user_cards, user_decks, featured, toggleFeatured } from '../../stores/user_data.js';
  import { art_suffix, alternatives, user_alternatives } from '../../stores/cards.js';
  import { byId } from '../../stores/cards.js';

  // @ts-ignore
  import banURL from '../../img/banned.png?asset';
  // @ts-ignore
  const resoucesPath = window.api.resoucesPath;

  export let type = 'collection'
  export let proMode = false
  export let toggleProMode = () => {}
  let open = false
  let card = null
  let deck = null
  let card_list = []

  let count
  $: count = $user_cards[card?.id]?.count || {"": 0}

  let costs
  $: costs = $user_cards[card?.id]?.costs || {"": 0}

  popupStore.subscribe(($store) => {
    open = $store.isOpen;
    card = $store.card;
    deck = $store.deck;
    card_list = $store.card_list || [];
  })

  function changeCount(e, alt = ""){
    const { value } = e.target;
    user_cards.update(currentCards => {
      if(!currentCards[card.id]) currentCards[card.id] = {"count":{"":0}};
      currentCards[card.id]["count"][alt] = parseInt(value) || 0;
      if(alt !== "") currentCards[card.id]["count"][""] = Object.entries(currentCards[card.id]["count"]).reduce((sum, [key, value]) =>  key !== "" ? sum + value : sum, 0);
      return currentCards;
    });
  }

  function changeCost(e, alt = ""){
    const { value } = e.target;
    user_cards.update(currentCards => {
      if(!currentCards[card.id]) currentCards[card.id] = {"count":{"":0},"costs":{"":0}};
      if(!currentCards[card.id]["costs"]) currentCards[card.id]["costs"] = {"":0};
      currentCards[card.id]["costs"][alt] = parseInt(value) || 0;
      if(alt !== "") currentCards[card.id]["costs"][""] = Object.entries(currentCards[card.id]["costs"]).reduce((sum, [key, value]) => key !== '' ? (value < sum ? value : sum) : Infinity, Infinity);
      return currentCards;
    });
  }

  function handleAltChange(event) {
    const { value, checked } = event.target;
    user_cards.update(currentCards => {
      if(!currentCards[card.id]) currentCards[card.id] = {"count":{"":0}};
      if(checked) {
        currentCards[card.id]["count"][""] += 1;
        currentCards[card.id]["count"][value] = 1;
      } else {
        currentCards[card.id]["count"][""] -= currentCards[card.id]["count"][value] || 0;
        if(currentCards[card.id]["count"][""] < 0) currentCards[card.id]["count"][""] = 0
        delete currentCards[card.id]["count"][value];
      }
      return currentCards;
    });
  }

  function handleTagChange(event) {
    const { value, checked } = event.target;
    user_decks.update($user_decks => {
      const new_deck = deck
      if(!new_deck.tags) new_deck.tags = [];
      if(checked) new_deck.tags.push(value)
      else new_deck.tags = new_deck.tags.filter(tag => tag !== value)
      let decks = $user_decks['decks'].map((adeck) => {
        if(adeck.id === new_deck.id) return new_deck;
        return adeck;
      })
      return {...$user_decks, decks: decks};
    });
  }

  function prevCard(){
    if(card_list.length === 0) return;
    let index = card_list.indexOf(card.id)
    if(index === -1) return
    if(index === 0) index = card_list.length;
    popupStore.update(($store) => {
      return {...$store, card: byId(card_list[index-1])}
    })
  }

  function nextCard(){
    if(card_list.length === 0) return;
    let index = card_list.lastIndexOf(card.id)
    if(index === -1) return
    if(index === card_list.length-1) index = -1;
    popupStore.update(($store) => {
      return {...$store, card: byId(card_list[index+1])}
    })
  }

  let click = false
</script>

{#if open}
<dialog open class="main-popup" transition:fade={{ duration: 100 }}
    use:shortcuts={{keyboard: true}}
    on:action:primary={() => { if(click){ click=false } else { togglePopup() } }}
    on:action:preview={togglePopup}
    on:action:select={()=> { toggleFeatured(card) }}
    on:action:close|stopImmediatePropagation={togglePopup}
    on:action:prev={prevCard}
    on:action:next={nextCard}
  >
  {#if card_list.length}
  <a class="left" on:click|stopPropagation={prevCard} style="color: #3d475c; position: absolute; left: .5em; text-decoration: none; font-size: 400%">&laquo;</a>
  <a class="right" on:click|stopPropagation={nextCard} style="color: #3d475c; position: absolute; right: .5em; text-decoration: none; font-size: 400%">&raquo;</a>
  {/if}
  <article class:noside={type !== 'collection'}>
    {#if card}
    <div class="card-wrapper">
      <div class="card alt-{card.alt}" class:featured={$featured[""].includes(card?.id)}>
        <a class="feature" class:collection={type === 'collection'} style={`color: ${$featured[""].includes(card?.id) ?  '#7540bf' : '#fff'}`}
          use:shortcuts on:action:primary={() => { click=true; toggleFeatured(card); }}>✓</a>
        {#if card.ban}<img class="ban" class:small={type !== 'count'} src={banURL} alt="" />{/if}
        <span class="card__rotator">
          <img
              src="{`${resoucesPath}/cards/${card.set_id}/${card.number}${art_suffix[card.alt] !== undefined ? art_suffix[card.alt] : card.alt}.jpg`}"
              alt="&nbsp;"
              loading="lazy"
              width="992"
              height="1400"
            />
          </span>
      </div>
    </div>
    {#if type === 'collection' }
    <aside>
      <section role="none" on:click|stopPropagation={() => {}}>
        <h3>{card.name}</h3>
        <p style="margin-top: -20px"><em>{card.alt && alternatives[card.alt]}&nbsp;</em></p>
        {#if proMode}
          <table>
            <thead>
              <tr>
                <th>Тип</th>
                <th>Кол-во</th>
                <th>Цена</th>
              </tr>
            </thead>
            <tbody>
              {#each [...(Object.keys(Object.keys(card.prints).length ? card.prints : {"t0": ""}).sort()), ...user_alternatives, ""] as alt}
                {#if alt == ""}
                  <tr><td style="height: 3px"></td></tr>
                  <tr style="border-top: 3px solid rgb(42, 49, 64)"><td style="height: 3px"></td></tr>
                {/if}
                <tr>
                  <td><span data-tooltip="{card.prints[alt]}">{alternatives[alt]}&nbsp;</span></td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={count[alt] || null}
                      on:input={(e) => changeCount(e, alt)}
                      readonly={proMode && alt == ""}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={costs[alt] || null}
                      on:input={(e) => changeCost(e, alt)}
                      readonly={proMode && alt == ""}
                    />
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
          <a use:shortcuts on:action:primary={toggleProMode}><em>Простой режим</em></a>
        {:else}
        <label>
          Количество:
          <input type="number" name="number" id="number" min="0" value={count[""]} on:input={changeCount} />
        </label>
        <fieldset on:change="{handleAltChange}">
        {#if Object.keys(card.prints || {}).length > 0}
          <p style="margin: 0 0 .5em">Тиражные:</p>
          {#each Object.entries(card.prints || {}).sort((a, b) => a[0].localeCompare(b[0])) as [alt, title]}
            <label>
              <input type="checkbox" name="color" value="{alt}" checked={count[alt] > 0} /> <span data-tooltip="{title}">{alt.slice(1)} тираж</span>
            </label>
          {/each}
        {/if}
        <p style="margin: 1.3em 0 .5em">Пользовательские:</p>
        {#each user_alternatives as alt}
          <label>
            <input type="checkbox" name="color" value="{alt}" checked={count[alt] > 0} /> {alternatives[alt]}
          </label>
        {/each}
        </fieldset>
        <label>
          Цена:
          <input type="number" name="cost" id="cost" min="0" value={costs[""] || null} on:input={changeCost} />
        </label>
        <a use:shortcuts on:action:primary={toggleProMode}><em>Подробный режим</em></a>
        {/if}
        <br />
      </section>
    </aside>
    {/if}
    {:else if deck}
    <div class="card-wrapper">
      <div class="card">
        <span class="card__rotator">
          <img
              src="{`${resoucesPath}/cards/back.jpg`}"
              alt="&nbsp;"
              loading="lazy"
              width="992"
              height="1400"
            />
          </span>
      </div>
    </div>
    <aside>
      <section role="none" on:click|stopPropagation={() => {}}>
        <h3>{deck.name}</h3>
        <p style="margin: 1.3em 0 .5em">Теги:</p>
        <fieldset on:change="{handleTagChange}">
        {#each $user_decks['tags'] as tag}
          <label>
            <input type="checkbox" name="color" value="{tag}" checked={(deck.tags || []).includes(tag)} /> {tag}
          </label>
        {/each}
        </fieldset>
      </section>
    </aside>
    {/if}
  </article>
</dialog>
{/if}
