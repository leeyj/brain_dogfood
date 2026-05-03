import { AssetLibraryModal } from './modals/AssetLibraryModal.js';
import { MemoDetailModal } from './modals/MemoDetailModal.js';
import { PasswordPromptModal } from './modals/PasswordPromptModal.js';

export const ModalManager = {
    // 타이밍 이슈 방지를 위해 lazy getter 패턴 적용
    getDOM() {
        return {
            modal: document.getElementById('memoModal'),
            modalContent: document.getElementById('modalContent'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            passwordPromptModal: document.getElementById('passwordPromptModal'),
            passwordPromptInput: document.getElementById('passwordPromptInput'),
            passwordPromptTitle: document.getElementById('passwordPromptTitle'),
            passwordPromptLabel: document.getElementById('passwordPromptLabel'),
            confirmPasswordBtn: document.getElementById('confirmPasswordPromptBtn'),
            cancelPasswordBtn: document.getElementById('cancelPasswordPromptBtn'),
            closePasswordBtn: document.getElementById('closePasswordPromptBtn')
        };
    },

    /**
     * 전체 첨부파일 라이브러리 모달 열기
     */
    async openAssetLibrary(openMemoDetailsCallback) {
        const dom = this.getDOM();
        await AssetLibraryModal.render(
            dom.modalContent, 
            dom.modal, 
            dom.loadingOverlay, 
            openMemoDetailsCallback
        );
    },

    /**
     * 개별 메모 상세 모달 열기
     */
    async openMemoModal(id) {
        const dom = this.getDOM();
        await MemoDetailModal.render(
            dom.modalContent, 
            dom.modal, 
            id, 
            (newId) => this.openMemoModal(newId)
        );
    },

    /**
     * 패스워드 입력 모달
     */
    async promptPassword(label) {
        const dom = this.getDOM();
        return await PasswordPromptModal.render(dom, label);
    }
};
