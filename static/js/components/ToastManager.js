/**
 * 전역 알림(Toast) 시스템
 * - 에러, 경고, 성공 메시지를 비침투적으로 사용자에게 전달합니다.
 */
export const ToastManager = {
    container: null,

    init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            document.body.appendChild(this.container);
        }
    },

    /**
     * 알림 메시지 띄우기
     * @param {string} message - 표시할 메시지
     * @param {string} type - 'info', 'success', 'error', 'warning'
     * @param {number} duration - 표시 유지 시간(ms)
     */
    show(message, type = 'info', duration = 3000) {
        this.init();

        const toast = document.createElement('div');
        toast.className = `toast-item toast-${type}`;

        // 타입별 아이콘 설정
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        else if (type === 'error') icon = '❌';
        else if (type === 'warning') icon = '⚠️';

        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-message">${message}</div>
        `;

        this.container.appendChild(toast);

        // 일정 시간 후 사라짐 애니메이션 적용 및 DOM 제거
        setTimeout(() => {
            toast.classList.add('toast-fade-out');
            toast.addEventListener('animationend', () => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            });
        }, duration);
    },

    // 단축 메서드들
    info(message, duration) { this.show(message, 'info', duration); },
    success(message, duration) { this.show(message, 'success', duration); },
    error(message, duration) { this.show(message, 'error', duration); },
    warning(message, duration) { this.show(message, 'warning', duration); }
};

// 브라우저 전역 객체로 등록 (다른 모듈에서 쉽게 사용하기 위함)
window.ToastManager = ToastManager;
