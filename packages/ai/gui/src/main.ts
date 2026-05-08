import { createApp } from 'vue'
import App from './App.vue'

const config = (window as any).__AI_GUARD_CONFIG__ ?? { aiConfigured: false, adaptersDir: 'src/adapters', fileType: 'ts' }

createApp(App).provide('guiConfig', config).mount('#app')
