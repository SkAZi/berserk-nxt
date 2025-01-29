<script>
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { slide } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { shortcuts } from '../../utils/shortcuts.js';

  import { cardsStore, orders, sets, rarities, colors, eliteness, creature_types, collection_counts, classes, costs, moves, lifes, offitial_alternatives, min_hits, mid_hits, max_hits, icons } from '../../stores/cards.js';
  import { filterAside, showStats, popupStore } from '../../stores/interface.js';
  import { default_settings } from '../../stores/defaults.js';
  import { user_cards, user_decks, settings, featured, option_set, settings_loaded, filteredSortedCards } from '../../stores/user_data.js';
  import { tokenizer } from '../../utils/stemmer.js'

  export let options_name = '';
  export let noSide = false

  let options = option_set[options_name];
  let searchQuery = '';

  onMount(() => {
    const refreshListener = (_event, new_data, new_featured, new_decks) => {
      if(new_data !== null) user_cards.set(new_data)
      if(new_featured) featured.set(new_featured)
      if(new_decks) user_decks.set(new_decks)
    };
    window.electron.ipcRenderer.on('refresh', refreshListener);

    return () => {
      window.electron.ipcRenderer.removeAllListeners('refresh');
    };
  });

  options.subscribe($options => {
    if($settings_loaded['settings'])
      settings.update($settings => {
        return { ...$settings, [options_name]: $options };
      });
    searchQuery = $options.searchQuery;
  });

  $: if (options && searchQuery !== get(options).searchQuery) {
    options.set({ ...get(options), searchQuery })
  }

  function handleOrderChange(event) {
    const { value } = event.target;
    options.update($options => {
      if ($options.sortOrder === value)
        return {...$options, sortAsc: -$options.sortAsc};
      else
        return {...$options, sortOrder: value, sortAsc: -1};
    });
  }

 function handleFilterChange(event, type) {
   const { value, checked } = event.target;

   options.update($options => {
     const updatedOptions = { ...$options };

     if (checked) {
       const newSet = new Set(updatedOptions[type]);
       newSet.add(value);
       updatedOptions[type] = [...newSet];
     } else {
       const rem = new Set(updatedOptions[type]);
       rem.delete(value);
       updatedOptions[type] = [...rem];
     }
     return updatedOptions;
   });
 }

  function resetFilters(_event){
    let setsOptions = Object.keys(sets)
    if(options_name === 'deckbuilding_options')
      setsOptions = setsOptions.filter(x => x !== '22' && x !== '50')
    options.set({...default_settings[options_name],
      cardSize: $options.cardSize,
      dimAbsent: $options.dimAbsent,
      showCount: $options.showCount,
      sets: setsOptions
    })
  }


  $: {
    let tokens = tokenizer($options.searchQuery)
    filteredSortedCards.set(cardsStore
      .map(card => {
        card.user_count = $user_cards[card.id] ? ($user_cards[card.id].count[""] || 0) : 0
        card.user_total_count = (card.alts || []).reduce((acc, alt) => acc + ($user_cards[card.id + alt] ? ($user_cards[card.id + alt].count[""] || 0) : 0), card.user_count)
        card.user_price = ($user_cards[card.id] && $user_cards[card.id].costs) ? ($user_cards[card.id].costs[""] || 0) : 0
        return card
      })
      .filter(card => {
        const filter_base_result = ($options.searchQuery === ''
              || card.number.toString() === $options.searchQuery?.toLowerCase()
              || card.tokens.includes(tokens.join(' '))
            )
            && (!$options.featuredOnly || $featured[''].includes(card.id))
            && (!$options.onlyWithCost || card.user_price > 0)
            && ((!$options.showSelected || card.user_count > 0) || ($options.onlyBase && card.user_total_count > 0))
            && (!$options.onlyBase || card.alt == '' || card.altto === null)
            && (
              ($options.onlyBase && ($options.collection_counts.length == 0 || $options.collection_counts.includes(Math.min(5, card.user_total_count).toString()))) ||
              (!$options.onlyBase && ($options.collection_counts.length == 0 || $options.collection_counts.includes(Math.min(5, card.user_count).toString())))
            )
            && ($options.sets.length == 0 || $options.sets.includes(card.set_id.toString()))

        const filter_result = ($options.eliteness.length == 0 || $options.eliteness.includes(card.elite ? '1' : '0'))
            && ($options.rarities.length == 0 || $options.rarities.includes(card.rarity.toString()))
            && ($options.colors.length == 0 || $options.colors.includes(card.color.toString()))
            && ($options.creature_types.length == 0 || $options.creature_types.includes(card.type.toString()))
            && ($options.collection_alts.length == 0 || $options.collection_alts.includes(card.alt) || ($options.collection_alts.includes("alt") && card.alt.startsWith("alt_")) || ($options.collection_alts.includes("promo") && (card.promo === true || ["alt","altf","pf","altpf","fpf","altfpf"].includes(card.alt) )))
            && ($options.moves.length == 0 || $options.moves.includes((card.move || 0).toString()))
            && ($options.min_hits.length == 0 || $options.min_hits.includes((card.hit ? card.hit[0] || 0 : 0).toString()))
            && ($options.mid_hits.length == 0 || $options.mid_hits.includes((card.hit ? card.hit[1] || 0 : 0).toString()))
            && ($options.max_hits.length == 0 || $options.max_hits.includes((card.hit ? card.hit[2] || 0 : 0).toString()))
            && ($options.lifes.length == 0 || $options.lifes.includes((card.life || 0).toString()))
            && ($options.costs.length == 0 || $options.costs.includes(card.cost.toString()))
            && ($options.classes.length == 0 || $options.classes.some((x) => card.class.includes(x) ) || ($options.classes.includes('Герой') && ((card.class[0] || '').startsWith('Герой') || (card.class[1] || '').startsWith('Герой'))))
            && ($options.icons.length == 0 || $options.icons.some((slug) => {
              if (slug === 'uniq') return card.uniq;
              if (slug === 'nuniq') return !card.uniq;
              let [x, n] = slug.split("=")
              return x in card.icons && (n === undefined || card.icons[x].toString() === n)
            }))

        return filter_base_result && ($options.filterNot ? !filter_result : filter_result)
      })
      .sort((a, b) => {
        switch ($options.sortOrder) {
          case 'num': return $options.sortAsc * (a.set_id * 1000 + a.number - (b.set_id * 1000 + b.number));
          case 'color': return $options.sortAsc * (a.color * 1000 + a.set_id - (b.color * 1000 + b.set_id));
          case 'rarity': return $options.sortAsc * (b.rarity * 1000 - b.color - (a.rarity * 1000 - a.color));
          case 'cost': return $options.sortAsc * (a.cost - b.cost);
          case 'name': return $options.sortAsc * (a.name.localeCompare(b.name));
          case 'life': return $options.sortAsc * (a.life - b.life);
          case 'price':
            const aMaxCost = ($user_cards[a.id]?.costs || {"":0})[""] || 0
            const bMaxCost = ($user_cards[b.id]?.costs || {"":0})[""] || 0
            if (aMaxCost === 0 && bMaxCost === 0) return 0;
            if (aMaxCost === 0) return 1;
            if (bMaxCost === 0) return -1;
            return $options.sortAsc * (aMaxCost - bMaxCost)
          default: return 0;
        }
      })
    )
  }
</script>


{#if $showStats.isOpen}
  <aside class="stats" transition:slide={{ duration: 150, easing: quintOut }} class:has_left={$filterAside.isOpen && !noSide} class:has_right={options_name === 'deckbuilding_options'}>
    <slot></slot>
  </aside>
{/if}

{#if $filterAside.isOpen && !noSide}
<aside class="left">
  <section>
    <input type="search" id="search" use:shortcuts={{keyboard: true}} on:action:find={(e)=> { e.target.focus() }} on:action:close={()=> { if(!$popupStore.isOpen) options.set({...$options, searchQuery: ""}) }} class="driver-search" name="search" placeholder="Поиск..." bind:value={searchQuery} tabindex="0" />
    <fieldset on:change="{handleOrderChange}" class="driver-sort">
    {#each Object.keys(orders) as val}
      <label>
        <input type="radio" name="order" on:click="{handleOrderChange}" value="{val}" checked={$options.sortOrder === val} />
        {orders[val]}{#if $options.sortOrder === val}&nbsp;&nbsp;{#if $options.sortAsc === 1}&darr;{:else}&uarr;{/if}{/if}
      </label>
    {/each}
    </fieldset>
    <fieldset class="driver-filter">
        <label><input type="checkbox" bind:checked={$options.featuredOnly} tabindex="0" /> Избранное</label>
        <label><input type="checkbox" bind:checked={$options.showSelected} tabindex="0" /> В наличии</label>
        <label><input type="checkbox" bind:checked={$options.onlyBase} tabindex="0" /> Суммарно</label>
        <label><input type="checkbox" bind:checked={$options.onlyWithCost} tabindex="0" /> Только с ценой</label>
    </fieldset>
    <div class="driver-other-filter">
    <p><a class="force-shortcuts" use:shortcuts on:action:primary={resetFilters} tabindex="0">Сбросить фильтры</a></p>
    {#if options_name == 'collection_options'}
    <details bind:open={$options.details_collection}>
      <summary>В коллекции</summary>
      <fieldset on:change="{(e) => { handleFilterChange(e, 'collection_counts') }}">
        {#each Object.keys(collection_counts).reverse() as val}
          <label><input type="checkbox" name="collection_count_id" value="{val}" checked={$options.collection_counts?.indexOf(val) >= 0} tabindex="0" />{collection_counts[val]}</label>
        {/each}
       </fieldset>
    </details>
    <details bind:open={$options.details_alts}>
      <summary>Вариант</summary>
      <fieldset on:change="{(e) => { handleFilterChange(e, 'collection_alts') }}">
        {#each Object.keys(offitial_alternatives) as val}
          <label><input type="checkbox" name="collection_alts" value="{val}" checked={$options.collection_alts?.indexOf(val) >= 0} tabindex="0" />{offitial_alternatives[val]}</label>
        {/each}
        <label><input type="checkbox" name="collection_alts" value="promo" checked={$options.collection_alts?.indexOf("promo") >= 0} tabindex="0" />Промо</label>
       </fieldset>
    </details>
    {/if}
    <details bind:open={$options.details_sets}>
      <summary>Сет</summary>
      <fieldset on:change="{(e) => { handleFilterChange(e, 'sets') }}">
        {#each Object.keys(sets).reverse() as val}
          <label><input type="checkbox" name="set_id" value="{val}" checked={$options.sets?.indexOf(val) >= 0} tabindex="0" />{sets[val]}</label>
        {/each}
       </fieldset>
    </details>
    <details bind:open={$options.details_rarities}>
      <summary>Редкость</summary>
      <fieldset on:change="{(e) => { handleFilterChange(e, 'rarities') }}">
        {#each Object.keys(rarities) as val}
          <label><input type="checkbox" name="rarity_id" value="{val}" checked={$options.rarities?.indexOf(val) >= 0} tabindex="0" />{rarities[val]}</label>
        {/each}
       </fieldset>
    </details>
    <details bind:open={$options.details_colors}>
      <summary>Стихия</summary>
      <fieldset on:change="{(e) => { handleFilterChange(e, 'colors') }}">
        {#each Object.keys(colors) as val}
          <label><input type="checkbox" name="color" value="{val}" checked={$options.colors?.indexOf(val) >= 0} tabindex="0" />{colors[val]}</label>
        {/each}
       </fieldset>
    </details>
    {#if options_name == 'deckbuilding_options'}
    <details bind:open={$options.details_eliteness}>
      <summary>Элитность</summary>
      <fieldset on:change="{(e) => { handleFilterChange(e, 'eliteness') }}">
        {#each Object.keys(eliteness).reverse() as val}
          <label><input type="checkbox" name="elite" value="{val}" checked={$options.eliteness?.indexOf(val) >= 0} tabindex="0" />{eliteness[val]}</label>
        {/each}
       </fieldset>
    </details>
    <details bind:open={$options.details_costs}>
      <summary>Стоимость</summary>
      <fieldset on:change="{(e) => { handleFilterChange(e, 'costs') }}">
        {#each Object.keys(costs).reverse() as val}
          <label><input type="checkbox" name="costs" value="{val}" checked={$options.costs?.indexOf(val) >= 0} tabindex="0" />{costs[val]}</label>
        {/each}
       </fieldset>
    </details>
    <details bind:open={$options.details_lifes}>
      <summary>Здоровье</summary>
      <fieldset on:change="{(e) => { handleFilterChange(e, 'lifes') }}">
        {#each Object.keys(lifes).reverse() as val}
          <label><input type="checkbox" name="lifes" value="{val}" checked={$options.lifes?.indexOf(val) >= 0} tabindex="0" />{lifes[val]}</label>
        {/each}
       </fieldset>
    </details>
    <details bind:open={$options.details_moves}>
      <summary>Ходы</summary>
      <fieldset on:change="{(e) => { handleFilterChange(e, 'moves') }}">
        {#each Object.keys(moves).reverse() as val}
          <label><input type="checkbox" name="moves" value="{val}" checked={$options.moves?.indexOf(val) >= 0} tabindex="0" />{moves[val]}</label>
        {/each}
       </fieldset>
    </details>
    <details bind:open={$options.details_min_hits}>
      <summary>Слабый удар</summary>
      <fieldset on:change="{(e) => { handleFilterChange(e, 'min_hits') }}">
        {#each Object.keys(min_hits).reverse() as val}
          <label><input type="checkbox" name="min_hits" value="{val}" checked={$options.min_hits?.indexOf(val) >= 0} tabindex="0" />{min_hits[val]}</label>
        {/each}
       </fieldset>
    </details>
    <details bind:open={$options.details_mid_hits}>
      <summary>Средний удар</summary>
      <fieldset on:change="{(e) => { handleFilterChange(e, 'mid_hits') }}">
        {#each Object.keys(mid_hits).reverse() as val}
          <label><input type="checkbox" name="mid_hits" value="{val}" checked={$options.mid_hits?.indexOf(val) >= 0} tabindex="0" />{mid_hits[val]}</label>
        {/each}
       </fieldset>
    </details>
    <details bind:open={$options.details_max_hits}>
      <summary>Сильный удар</summary>
      <fieldset on:change="{(e) => { handleFilterChange(e, 'max_hits') }}">
        {#each Object.keys(max_hits).reverse() as val}
          <label><input type="checkbox" name="max_hits" value="{val}" checked={$options.max_hits?.indexOf(val) >= 0} tabindex="0" />{max_hits[val]}</label>
        {/each}
       </fieldset>
    </details>
    {/if}
    <details bind:open={$options.details_creature_types}>
      <summary>Тип</summary>
      <fieldset on:change="{(e) => { handleFilterChange(e, 'creature_types') }}">
        {#each Object.keys(creature_types) as val}
          <label><input type="checkbox" name="creature_type" value="{val}" checked={$options.creature_types?.indexOf(val) >= 0} tabindex="0" />{creature_types[val]}</label>
        {/each}
       </fieldset>
    </details>
    </div>
    {#if options_name == 'deckbuilding_options'}
    <details bind:open={$options.details_icons}>
      <summary>Свойства</summary>
      <fieldset on:change="{(e) => { handleFilterChange(e, 'icons') }}">
        {#each Object.keys(icons) as val}
          <label><input type="checkbox" name="class" value="{val}" checked={$options.icons?.indexOf(val) >= 0} tabindex="0" />{icons[val]}</label>
        {/each}
       </fieldset>
    </details>
    <details bind:open={$options.details_classes}>
      <summary>Класс</summary>
      <fieldset on:change="{(e) => { handleFilterChange(e, 'classes') }}">
        {#each Object.keys(classes) as val}
          <label><input type="checkbox" name="class" value="{val}" checked={$options.classes?.indexOf(val) >= 0} tabindex="0" />{classes[val]}</label>
        {/each}
       </fieldset>
    </details>
    {/if}
    <details class="driver-display">
      <summary>Отображение</summary>
      <fieldset>
         <label><input type="checkbox" bind:checked={$options.dimAbsent} tabindex="0" /> Гасить лишнее</label>
         <label><input type="checkbox" bind:checked={$options.showCount} tabindex="0" /> Количество</label>
         <label><input type="checkbox" bind:checked={$options.showPrice} tabindex="0" /> Цена</label>
         <label><input type="checkbox" bind:checked={$options.filterNot} tabindex="0" /> Обратный фильтр</label>
         <label style="padding-top: 10px;">
            Размер:
            <input type="range" min="80" max="300" step="10" bind:value={$options.cardSize} tabindex="0" />
          </label>
       </fieldset>
    </details>
  </section>
</aside>
{/if}
