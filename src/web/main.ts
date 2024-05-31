import '../renderer/src/main.scss'
import './mobile.scss'
import App from '../renderer/src/App.svelte'

const app = new App({
  target: document.getElementById('app')
})

export default app
