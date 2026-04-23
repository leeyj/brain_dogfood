import { I18nManager } from '../../../utils/I18nManager.js';

export const GuideContent = {
    async render() {
        const lang = I18nManager.currentLang || 'ko';
        const response = await fetch(`/static/html/help/guide_${lang}.html?v=3.0`);
        return await response.text();
    }
};
