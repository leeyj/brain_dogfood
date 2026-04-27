import { API } from '../api.js';
import { AppService } from '../AppService.js';
import { UI } from '../ui.js';
import { ComposerManager } from '../components/ComposerManager.js';
import { I18nManager } from '../utils/I18nManager.js';
import { RelationManager } from '../components/RelationManager.js';

export const MemoActionHandler = {
    init(updateSidebarCallback) {
        AppService.state.eventHandlers = {
            onToggleRelationFocus: (id) => {
                RelationManager.toggleFocus(id, AppService.state.allMemos);
            },
            onEdit: async (id) => {
                const memo = await API.fetchMemo(id);
                if (memo && memo.status === 'deleted') {
                    alert(I18nManager.t('msg_cannot_edit_deleted') || '삭제된 메모는 수정할 수 없습니다. 먼저 복원해 주세요.');
                    return;
                }
                if (memo && memo.is_encrypted) {
                    const unlocked = AppService.state.unlockedMemos.get(String(id));
                    if (unlocked) {
                        memo.content = unlocked.content;
                        memo.tempPassword = unlocked.tempPassword;
                    }
                }
                if (memo) ComposerManager.openForEdit(memo);
            },
            onDelete: async (id) => {
                const memo = await API.fetchMemo(id);
                const isDeleted = memo && memo.status === 'deleted';
                
                const confirmMsg = isDeleted 
                    ? (I18nManager.t('msg_permanent_delete_confirm') || '이 메모를 영구적으로 삭제하시겠습니까? 다시 복구할 수 없습니다.')
                    : I18nManager.t('msg_delete_confirm');

                if (confirm(confirmMsg)) {
                    try {
                        await API.deleteMemo(id, isDeleted); // isDeleted가 true이면 영구 삭제(permanent=true)
                        AppService.refreshData(updateSidebarCallback);
                    } catch (err) {
                        alert(err.message);
                    }
                }
            },
            onRestore: async (id) => {
                try {
                    await API.restoreMemo(id);
                    AppService.refreshData(updateSidebarCallback);
                } catch (err) { alert(err.message); }
            },
            onAI: async (id) => {
                const memo = await API.fetchMemo(id);
                if (memo && memo.status === 'deleted') return; // 삭제된 메모는 AI 분석 차단
                
                UI.showLoading(true);
                try {
                    await API.triggerAI(id);
                    await AppService.refreshData(updateSidebarCallback);
                } catch (err) { alert(err.message); }
                finally { UI.showLoading(false); }
            },
            onTogglePin: async (id) => {
                const memo = await API.fetchMemo(id);
                if (memo && memo.status === 'deleted') return;
                if(memo) await API.saveMemo({ is_pinned: !memo.is_pinned }, id);
                AppService.refreshData(updateSidebarCallback);
            },
            onToggleStatus: async (id) => {
                const memo = await API.fetchMemo(id);
                if (memo && memo.status === 'deleted') return;
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
