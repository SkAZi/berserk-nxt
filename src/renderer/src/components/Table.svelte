<script>
  import { onMount } from 'svelte'
  import CompressingStack from './includes/CompressingStack.svelte';
  import { loader } from '../stores/interface.js'
  import { byId } from '../stores/cards.js'
  import Card from './includes/Card.svelte'

  // Пример данных для зон верхнего игрока
  const topDeck = ['T Card 1', 'T Card 2'];
  const topDiscard = ['T Discard 1'];
  const topExile = ['T Exile 1'];

  // Пример данных для зон нижнего игрока
  const bottomDeck = ['B Card 1', 'B Card 2'];
  const bottomDiscard = ['B Discard 1'];
  const bottomExile = ['B Exile 1'];

  // Пример данных для доп.зон (используем больше 3-х карт для демонстрации сжатия)
  const topExtra = ['T Extra 1', 'T Extra 2'];
  const bottomExtra = ['B Extra 1', 'B Extra 2', 'B Extra 3', 'B Extra 4', 'B Extra 5'];

  // Игровое поле (сетка 5x6) можно дополнить данными или оставить пустым для отрисовки ячеек
  let playingField = Array(6).fill(null).map(() => Array(5).fill(null));

  onMount(() => {
    loader.set(false)
  })
</script>




<div class="game-board">
  <!-- Левая верхняя зона: колода, сброс, изгнание для верхнего игрока -->
  <div class="zone left-top">
    <div class="zone-stack">
      <div class="card-zone" id="top-deck">
        {#each topDeck as card}
          <Card card={byId('10001')} />
        {/each}
      </div>
      <div class="card-zone" id="top-discard">
        {#each topDiscard as card}
          <Card card={byId('10001')} />
        {/each}
      </div>
      <div class="card-zone" id="top-exile">
        {#each topExile as card}
          <Card card={byId('10001')} />
        {/each}
      </div>
    </div>
  </div>

  <!-- Центральная зона: игровое поле (сетка 5 колонок x 6 строк) -->
  <div class="zone center">
    <div class="playing-field">
      {#each Array(6) as _, row}
        {#each Array(5) as _, col}
          <Card card={byId('10001')} />
        {/each}
      {/each}
    </div>
  </div>

  <!-- Правая верхняя зона: дополнительная зона для верхнего игрока (сжимающийся стек) -->
  <div class="zone right-top">
    <CompressingStack cards={topExtra} />
  </div>

  <!-- Левая нижняя зона: дополнительная зона для нижнего игрока (сжимающийся стек) -->
  <div class="zone left-bottom">
    <CompressingStack cards={bottomExtra} />
  </div>

  <!-- Правая нижняя зона: колода, сброс, изгнание для нижнего игрока -->
  <div class="zone right-bottom">
    <div class="zone-stack">
      <div class="card-zone" id="bottom-deck">
        <div class="zone-title">Deck</div>
        {#each bottomDeck as card}
          <div class="card">{card}</div>
        {/each}
      </div>
      <div class="card-zone" id="bottom-discard">
        <div class="zone-title">Discard</div>
        {#each bottomDiscard as card}
          <div class="card">{card}</div>
        {/each}
      </div>
      <div class="card-zone" id="bottom-exile">
        <div class="zone-title">Exile</div>
        {#each bottomExile as card}
          <div class="card">{card}</div>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  /* Основной контейнер – сетка 3х2 (лево, центр, право) */
  .game-board {
    display: grid;
    grid-template-columns: 1fr 5fr 1fr; /* соответствует 7 колонкам (1:5:1) */
    grid-template-rows: 50% 50%;
    height: calc(100vh - 90px);
    width: 100vw;
    grid-template-areas:
      "left-top center right-top"
      "left-bottom center right-bottom";
  }

  /* Распределяем зоны по именам областей */
  .left-top   { grid-area: left-top; }
  .center     { grid-area: center; }
  .right-top  { grid-area: right-top; }
  .left-bottom{ grid-area: left-bottom; }
  .right-bottom { grid-area: right-bottom; }

  .zone {
    padding: 5px;
    box-sizing: border-box;
  }

  /* Контейнер для зон, где несколько блоков располагаются вертикально */
  .zone-stack {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  /* Стили для отдельных зон (карточных секций) */
  .card-zone {
    flex: 1;
    border: 1px solid #ccc;
    margin: 2px;
    padding: 5px;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    background: #f9f9f9;
    overflow: hidden;
  }

  .zone-title {
    font-weight: bold;
    margin-bottom: 5px;
  }

  .card {
    margin: 2px;
    padding: 2px 5px;
    background: #fff;
    border: 1px solid #aaa;
    font-size: 0.8em;
  }

  /* Стили для игрового поля (центральная зона) */
  .playing-field {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    grid-template-rows: repeat(6, 1fr);
    gap: 2px;
    width: 100%;
    height: 100%;
    max-height: 100%;
    background: #333;
  }

  .field-cell {
    background: #777;
    border: 1px solid #555;
  }
</style>
