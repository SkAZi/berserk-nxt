<script>
  import { shortcuts } from '../../utils/shortcuts.js'
  import { featured, user_decks, toggleFeatured } from '../../stores/user_data.js'
  import { art_suffix, tag_colors } from '../../stores/cards.js'
  // @ts-ignore
  import banURL from '../../img/banned.png'
  // @ts-ignore
  const resoucesPath = window.api.resoucesPath

  export let card = {}
  export let onpreview = (_e, _card, _alt) => {}
  export let onprimary = (_e, _card, _alt) => {}
  export let onplus = (_e, _card, _alt) => {}
  export let onminus = (_e, _card, _alt) => {}

  export let ondelete = null
  export let ontap = (_card) => {}
  export let onflip = (_card) => {}

  export let copies = 1
  export let showCount = false
  export let dimAbsent = true
  export let showAlts = false
  export let showBan = true
  export let showPrice = false
  export let legal = true
  export let showText = null
  export let showTopText = null
  export let showCornerText = null
  export let showCornerColor = null
  export let proMode = false
  export let draggable = false
  export let noTap = false
  export let countCopies = false
  export let list_index = null

  export let showColors = []

  export let tapped = false
  export let flipped = false

  export let card_list = []
  export let tags = []

  export let isDeck = false
</script>

<div
  class="card alt-{card.alt}"
  class:bw={dimAbsent && ((showAlts && !card.user_count) || (!showAlts && !card.user_total_count))}
  class:copies={copies > 1}
  class:nonlegal={!legal}
  class:featured={isDeck ? false : $featured[''].includes(card.id)}
  data-cardid={card.id}
  data-index={list_index}
>
  {#if showPrice}
    <p class="top-text">{card.user_price ? card.user_price + ' руб' : ' '}</p>
  {/if}
  {#if showTopText}
    <p class="top-text">{showTopText}</p>
  {/if}
  {#if card.ban && showBan}<img alt="ban" class="ban" src={banURL} />{/if}
  <div class="card__translater" class:with_count={showCount} {draggable}>
    {#if ondelete}
      <a class="deck-delete nodrag" on:click|stopPropagation={ondelete}>&cross;</a>
    {/if}
    {#if tags && tags.length > 0}<div class="tags">
        {#each $user_decks['tags'] as tag}{#if tags.includes(tag)}<div>
              <span style:background-color={tag_colors[tag] || '#000'}>{tag}</span>
            </div>{/if}{/each}
      </div>{/if}
    <div
      use:shortcuts={{ keyboard: true, hovered: true, passive: true, noTap: noTap }}
      on:action:preview={() => {
        onpreview(card, card_list)
      }}
      on:action:primary={() => {
        onprimary(card)
      }}
      on:action:plus={() => {
        onplus(card)
      }}
      on:action:minus={() => {
        onminus(card)
      }}
      on:action:select={isDeck
        ? () => {}
        : () => {
            toggleFeatured(card)
          }}
      on:action:delete={ondelete || (() => {})}
      on:action:tap={ontap}
      on:action:flip={onflip}
      class="card__rotator"
      class:tap={tapped}
      class:flip={flipped}
      aria-label="Expand the card"
    >
      {#each new Array(copies) as _copy, index}
      <div class:count_copies={countCopies ? (copies - index) > card.user_total_count : false}>
        <img
          src={`${resoucesPath}/cards/${card.set_id}/${card.number}${art_suffix[card.alt] !== undefined ? art_suffix[card.alt] : card.alt}.jpg`}
          alt="&nbsp;"
          loading="lazy"
          width="992"
          height="1400"
          class:bw={(countCopies && dimAbsent) ? (copies - index) > card.user_total_count : false}
        />
      </div>
      {/each}
      {#if showColors.length > 0}
        <div class="deck-colors">
          <span
            >{#each showColors as color}<span class={`color color-${color}`}></span>{/each}</span
          >
        </div>
      {/if}
      {#if showCornerText}
        <p class="corner-text" style={showCornerColor ? `color: ${showCornerColor}` : ''}>
          {showCornerText}
        </p>
      {/if}
    </div>
  </div>
  {#if showCount}
    <div class="count">
      {#if (showAlts && card.user_count > 0) || (!showAlts && card.user_total_count > 0)}
        {#if !proMode}<span
            use:shortcuts
            on:action:primary={() => {
              onminus(card)
            }}
            style="font-size: 85%; cursor: pointer;">&minus;&nbsp;</span
          >{/if}
        <span style="display: inline-block; min-width: 2vw; text-align: center;"
          >{#if showAlts}{card.user_count}{:else}{card.user_total_count}{/if}</span
        >
        {#if !proMode}<span
            use:shortcuts
            on:action:primary={() => {
              onplus(card)
            }}
            style="font-size: 85%; cursor: pointer;">&nbsp;&plus;</span
          >{/if}
      {:else}
        <span style="display: inline-block; min-width: 2vw; text-align: center;">&nbsp;</span>
      {/if}
    </div>
  {/if}
  {#if showText}
    <p class="text">{showText}</p>
  {/if}
</div>
