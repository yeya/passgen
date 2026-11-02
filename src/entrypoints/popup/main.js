import { createApp } from 'vue';
import '../../assets/main.css';
import { applyDocumentLocale } from '../../lib/i18n.js';
import App from './App.vue';

applyDocumentLocale(document);
createApp(App).mount('#app');
