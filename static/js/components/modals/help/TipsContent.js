import { I18nManager } from '../../../utils/I18nManager.js';

export const TipsContent = {
    async render() {
        const lang = I18nManager.currentLang || 'ko';
        const response = await fetch(`/static/html/help/tips_${lang}.html?v=2.2`);
        return await response.text();
    }
};
