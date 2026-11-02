import { createApp } from 'vue';
import '../../assets/main.css';
import { applyDocumentLocale, t } from '../../lib/i18n.js';
import App from './App.vue';

applyDocumentLocale(document);
document.title = t('settingsTitle');
createApp(App).mount('#app');
