<script>
    import { fade } from 'svelte/transition';
    import { printDeckListStore, togglePrintDeckList } from '../../stores/interface.js';
    import { user_decks } from '../../stores/user_data.js';
    import { shortcuts } from '../../utils/shortcuts.js';
    import { groupCards } from '../../stores/cards.js';

    let click = false
    let data = {
      title: "",
      date: "",
      surname: "",
      name: "",
      city: "",
      deck_ids: [null,null,null]
    }

    function generatePrintContent() {
      const deckLists = data.deck_ids.map(deck_id => {
        const deck = $user_decks['decks'][deck_id];
        if (!deck) return '';
        return groupCards(deck.cards).map(([card, count]) => `<tr><td>${count}</td><td>${card.name}</td></tr>`).join('');
      });

      const sizes = data.deck_ids.map(deck_id => {
        const deck = $user_decks['decks'][deck_id];
        if (!deck) return 0;
        return deck.cards.length;
      });

      return `
      <html>
          <head>
              <title>Распечатать список колод</title>
              <style>
              html, h1 { margin: 0; padding: 0;}
              body { margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 80%; print-color-adjust:exact !important;
                -webkit-print-color-adjust:exact !important; }
              table { font-size: 90%; width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              td, th { border: 1px solid #000; padding: 4px; text-align: left; white-space: no-wrap; }
              th { background: #000; color: #fff; font-weight: normal; font-size: 90%; margin: 2px; }
              h1 {margin-bottom: 0.4em;}
              h5 { font-size: 130%; margin: 0; }
              .header { text-align: center; margin-bottom: 20px; }
              .deck-title { font-weight: bold; margin-top: 20px; }
              .deck-section { width: 100% }
               </style>
          </head>
          <body>
              <div class="header">
                  <h1>${data.title}</h1>
                  <table>
                      <tr>
                          <td style="width: 10%">Фамилия:</td>
                          <td style="width: 20%">${data.surname}</td>
                          <td style="width: 10%">Город:</td>
                          <td style="width: 20%">${data.city}</td>
                          <td style="width: 20%; vertical-align: top;" rowspan="2">Подпись&nbsp;игрока:</td>
                      </tr>
                      <tr>
                          <td>Имя:</td>
                          <td>${data.name}</td>
                          <td>Дата:</td>
                          <td>${data.date}</td>
                      </tr>
                  </table>
              </div>

              <div style="display: flex; grid-gap: 1vw;">
                  <table style="width: 100%">
                      <thead>
                          <tr><th style="width: 10%">&nbsp;</th><th>Колода № 1</th></tr>
                          <tr><th>Кол-во</th><th>Название карты</th></tr>
                      </thead>
                      <tbody>${deckLists[0]}</tbody>
                      <tfoot>
                          <tr>
                              <td colspan="2">Всего карт в колоде: ${sizes[0]}</td>
                          </tr>
                      </tfoot>
                  </table>

                  <table style="width: 100%">
                      <thead>
                          <tr><th style="width: 10%">&nbsp;</th><th>Колода № 2</th></tr>
                          <tr><th>Кол-во</th><th>Название карты</th></tr>
                      </thead>
                      <tbody>${deckLists[1]}</tbody>
                      <tfoot>
                          <tr>
                              <td colspan="2">Всего карт в колоде: ${sizes[1]}</td>
                          </tr>
                      </tfoot>
                  </table>

                  <table style="width: 100%">
                      <thead>
                          <tr><th style="width: 10%">&nbsp;</th><th>Колода № 3</th></tr>
                          <tr><th>Кол-во</th><th>Название карты</th></tr>
                      </thead>
                      <tbody>${deckLists[2]}</tbody>
                      <tfoot>
                          <tr>
                              <td colspan="2">Всего карт в колоде: ${sizes[2]}</td>
                          </tr>
                      </tfoot>
                  </table>
              </div>
          </body>
      </html>
      `;
    }

    function print() {
      window.electron.ipcRenderer.send('print-decklists', generatePrintContent())
    }
</script>

{#if $printDeckListStore.isOpen}
<dialog open class="main-popup" transition:fade={{ duration: 100 }}
    use:shortcuts={{keyboard: true}}
    on:action:primary={() => { if(click){ click=false } else { togglePrintDeckList() } }}
    on:action:preview={togglePrintDeckList}
    on:action:close|stopImmediatePropagation={togglePrintDeckList}
  >
  <article class="noside">
    <aside>
      <section role="none" on:click|stopPropagation={() => {}}>
          <fieldset>
              <div style="display: flex; grid-gap: 1vw;">
                <label style="width: 38em">
                    Наименование
                    <input type="text" bind:value={data.title} />
                </label>
                <label>
                    Дата
                    <input type="date" bind:value={data.date} />
                </label>
              </div>
              <div style="display: flex; grid-gap: 1vw;">
                <label>
                    Фамилия
                    <input type="text" bind:value={data.surname} />
                </label>
                <label>
                    Имя
                    <input type="text" bind:value={data.name} />
                </label>
                <label>
                    Город
                    <input type="text" bind:value={data.city} />
                </label>
              </div>

              <label>
              Выбери колоды:
              {#each data.deck_ids as _value, index (index)}
                  <select
                  name={`deck-{index}`}
                  aria-label=""
                  bind:value={data.deck_ids[index]}
                  style="margin-bottom: .3em"
                  >
                  <option value="-1"></option>
                  {#each ($user_decks['decks'] || []) as deck, deck_id (deck_id)}
                      <option value={deck_id}>{deck.name}</option>
                  {/each}
                  </select>
              {/each}
              </label>
              <p>
                <button on:click={print}>Распечатать</button>
              </p>
          </fieldset>
      </section>
    </aside>
  </article>
</dialog>
{/if}
