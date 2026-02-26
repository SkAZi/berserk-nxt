<script>
  import { onMount } from 'svelte'

  import { settings } from '../../stores/user_data.js'

  let hidePromo = $settings['other_options']['nopromo'],
      muted = false

  $: muted = $settings['other_options']['muted_promo']

  function closePromo(e) {
    if (gameInstance) {
      gameInstance.destroy();
    }
    hidePromo = true
    document.body.style.overflow = ''
    if(e.shiftKey)
      settings.update((settings) => {
        gameInstance.mute(!muted)
        return {...settings, other_options: {...(settings.other_options || {}), nopromo: true}}
      })
  }

  let canvas;
  let gameInstance;

  onMount(() => {
    //gameInstance = mountSnakeGame(canvas, muted);

    return () => {
      if (gameInstance) {
        gameInstance.destroy();
      }
    };
  });
</script>
{#if !hidePromo}
<div class="promo-zone">
  <button class="a deck-delete mute-promo" on:click={switchMuted}><svg width="32px" height="32px" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="none">
    <path stroke={muted ? '#900' : '#ffffff'} stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.5 21H8a1 1 0 01-1-1v-8a1 1 0 011-1h7l5-5 1.586-1.586C22.846 3.154 25 4.047 25 5.828V6m-8 17l4.586 4.586c1.26 1.26 3.414.367 3.414-1.414V14.5M7 28L29 6"/>
  </svg></button>
  <button class="a deck-delete close-promo" on:click={closePromo}>&cross;</button>
  <canvas
    bind:this={canvas}
    width={900}
    height={600}
  ></canvas>
</div>
{/if}

<style>
  .promo-zone {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.7);
    opacity: 1;
    transition: opacity 0.3s ease;
    backdrop-filter: var(--pico-modal-overlay-backdrop-filter);
    z-index: 6000;
  }

  .promo-zone > * {
    pointer-events: all;
  }

  .promo-zone > div {
    position: absolute;
    height: 100%;
    width: 100%;
    padding: 40px;
  }

  .close-promo {
    position: absolute;
    top: 10px;
    right: 20px;
    background-color: transparent;
    border: none;
    cursor: pointer;
    font-size: 36px;
    color: white;
    transition: color 0.3s ease;
    z-index: 10000;
  }

  .mute-promo {
    position: absolute;
    top: 6px;
    right: 60px;
    background-color: transparent;
    border: none;
    cursor: pointer;
    font-size: 36px;
    color: white;
    transition: color 0.3s ease;
    z-index: 10000;
  }

  .game-container {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100%;
      background: #000; /* Цвет фона за канвасом */
    }

    canvas {
      border: 20px solid #222;
      box-sizing: content-box;
    }
</style>
