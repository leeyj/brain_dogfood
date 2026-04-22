import { API } from '../api.js';
import { AppService } from '../AppService.js';
import { UI } from '../ui.js';
import { ComposerManager } from '../components/ComposerManager.js';
import { I18nManager } from '../utils/I18nManager.js';

export const MemoActionHandler = {
    init(updateSidebarCallback) {
        window.memoEventHandlers = {
            onEdit: async (id) => {
                const memo = await API.fetchMemo(id);
                if (memo) ComposerManager.openForEdit(memo);
            },
            onDelete: async (id) => {
                if (confirm(I18nManager.t('msg_delete_confirm'))) {
                    try {
                        await API.deleteMemo(id);
                        AppService.refreshData(updateSidebarCallback);
                    } catch (err) {
                        alert(err.message);
                    }
                }
            },
            onAI: async (id) => {
                UI.showLoading(true);
                try {
                    await API.triggerAI(id);
                    await AppService.refreshData(updateSidebarCallback);
                } catch (err) { alert(err.message); }
                finally { UI.showLoading(false); }
            },
            onTogglePin: async (id) => {
                const memo = await API.fetchMemo(id);
                if(memo) await API.saveMemo({ is_pinned: !memo.is_pinned }, id);
                AppService.refreshData(updateSidebarCallback);
            },
            onToggleStatus: async (id) => {
                const memo = await API.fetchMemo(id);
                if(memo) {
                    const newStatus = memo.status === 'done' ? 'active' : 'done';
                    await API.saveMemo({ status: newStatus }, id);
                    AppService.refreshData(updateSidebarCallback);
                }
            },
            onOpenModal: (id) => UI.openMemoModal(id),
            onUnlock: async (id) => {
                const password = await UI.promptPassword(I18nManager.t('prompt_password'));
                if (!password) return;
                try {
                    const data = await API.decryptMemo(id, password);
                    // 해독된 내용을 앱 서비스 전역 상태(임시)에 저장
                    AppService.state.unlockedMemos.set(String(id), {
                        content: data.content,
                        tempPassword: password
                    });
                    
                    AppService.refreshData(updateSidebarCallback);
                } catch (err) { alert(err.message); }
            }
        };
    }
};
