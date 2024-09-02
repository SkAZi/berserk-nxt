<script>
    import { fade } from 'svelte/transition';
    import { aboutStore, toggleAbout } from '../../stores/interface.js';
    import { shortcuts } from '../../utils/shortcuts.js';

    let click = false
</script>

{#if $aboutStore.isOpen}
<dialog open class="main-popup" transition:fade={{ duration: 100 }}
    use:shortcuts={{keyboard: true}}
    on:action:primary={() => { if(click){ click=false } else { toggleAbout() } }}
    on:action:preview={toggleAbout}
    on:action:close|stopImmediatePropagation={toggleAbout}
  >
  <article id="about">
      <div>
        <h3>ККИ Берсерк Nxt</h3>

        <p>ККИ Берсерк Nxt — это универсальный инструмент для работы с&nbsp;коллекцией, сбора колод, обучения и&nbsp;симуляции драфта или силеда. Приложение значительно упрощает подготовку к&nbsp;турнирам, тренировки и&nbsp;тестирование колод.</p>
        <p>Страница приложения: <a href="https://berserk-nxt.ru?ref=about" target="_black" on:click={() => { click = true }}>berserk-nxt.ru</a></p>
        <p>Разработчик: <a href="mailto:scsiboy@gmail.com" on:click={() => { click = true }}>Игорь «SkAZi» Потапов</a></p>

        <h4>Мои благодарности:</h4>
        <p>Всем, кто поддерживает разработку на <a href="https://boosty.to/berserk-nxt" target="_black" on:click={() => { click = true }}>Boosty</a>:<br />
            <b>Виктор Соколов</b>, <b>Ксения Ященко</b>, <b>Stan_I.</b>, <b>Павел Карпов</b>, <b>Геннадий Лебедев</b>, <b>Людмила Дубровская</b>, <b>Shchigel</b>, <b>Евгений Морозов</b>, <b>Ivan Kochelorov</b>, <b>SeaSaw</b>, <b>Михаил Руденко</b></p>

        <p>Всем, кто помогает с тестированием и советами:<br /> Виктор Соколов, Андрей Васильев, Сергей Ленин, Геннадий Лебедев, Дмитрий Когтев, Дмитрий Чернышов, Владислав Якубовский, Главный Лесничий, Mikhail Che-Sla, BETEP, sasha, felhas</p>
        <p>А так же всем, кто рекомендует и использует!</p>

        <p style="margin-top: 2em"><i>Все права на игру и изображения в ней принадлежат ООО «Мир Хобби».</i></p>
      </div>
  </article>
</dialog>
{/if}
