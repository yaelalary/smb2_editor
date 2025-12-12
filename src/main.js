import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './style.css'
import VueGridLayout from 'vue-grid-layout-v3'

const app = createApp(App)

app.use(router)
app.use(VueGridLayout)

app.mount('#app')
