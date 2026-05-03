/**
 * 패스워드 입력 모달 컴포넌트
 */
import { I18nManager } from '../../utils/I18nManager.js';

export const PasswordPromptModal = {
    render(dom, label) {
        if (!dom.passwordPromptModal) return Promise.resolve(null);

        return new Promise((resolve) => {
            dom.passwordPromptLabel.textContent = label || I18nManager.t('prompt_password');
            dom.passwordPromptInput.value = '';
            dom.passwordPromptModal.classList.add('active');
            dom.passwordPromptInput.focus();

            const cleanup = () => {
                dom.passwordPromptModal.classList.remove('active');
                dom.confirmPasswordBtn.onclick = null;
                dom.cancelPasswordBtn.onclick = null;
                dom.closePasswordBtn.onclick = null;
                dom.passwordPromptInput.onkeydown = null;
            };

            const handleConfirm = () => {
                const val = dom.passwordPromptInput.value;
                cleanup();
                resolve(val || null);
            };

            const handleCancel = () => {
                cleanup();
                resolve(null);
            };

            dom.confirmPasswordBtn.onclick = handleConfirm;
            dom.cancelPasswordBtn.onclick = handleCancel;
            dom.closePasswordBtn.onclick = handleCancel;
            
            dom.passwordPromptInput.onkeydown = (e) => {
                if (e.key === 'Enter') handleConfirm();
                if (e.key === 'Escape') handleCancel();
            };
        });
    }
};
