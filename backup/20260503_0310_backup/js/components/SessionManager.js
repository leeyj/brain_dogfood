/**
 * SessionManager.js
 * - 세션 라이프타임 관리 및 로그아웃 버튼 카운트다운 인터페이스
 * - 사용자 활동(클릭, 키 입력) 시 타이머 초기화
 */
import { API } from '../api.js';
import { I18nManager } from '../utils/I18nManager.js';

export const SessionManager = {
    state: {
        timeoutMinutes: 60, // 기본값
        remainingSeconds: 3600,
        timerId: null,
        logoutBtn: null,
        baseText: ''
    },

    /**
     * 초기화: 설정 로드 및 이벤트 바인딩
     */
    async init() {
        try {
            const settings = await API.fetchSettings();
            this.state.timeoutMinutes = settings.session_timeout || 60;
            this.resetTimer();

            this.state.logoutBtn = document.getElementById('logoutBtn');
            if (this.state.logoutBtn) {
                const textSpan = this.state.logoutBtn.querySelector('.text');
                if (textSpan) {
                    // i18n 로딩이 늦을 경우를 위해 초기 텍스트 보관
                    this.state.baseText = textSpan.textContent.trim().split(' ')[0] || I18nManager.t('nav_logout');
                    console.log(`⏱️ SessionManager: Timer target found. Base text: ${this.state.baseText}`);
                    this.startCountdown();
                } else {
                    console.error('❌ SessionManager: .text span not found in logoutBtn');
                }
            } else {
                console.error('❌ SessionManager: logoutBtn not found');
            }

            // 사용자 활동 감지 이벤트 바인딩
            this.bindActivityListeners();
            
            console.log(`⏱️ SessionManager: Initialized with ${this.state.timeoutMinutes} min timeout.`);
        } catch (err) {
            console.error('❌ SessionManager Init Error:', err);
        }
    },

    /**
     * 타이머 시작 (1초마다 업데이트)
     */
    startCountdown() {
        if (this.state.timerId) clearInterval(this.state.timerId);
        
        this.state.timerId = setInterval(() => {
            this.state.remainingSeconds--;
            
            if (this.state.remainingSeconds <= 0) {
                this.handleTimeout();
            } else {
                this.updateUI();
            }
        }, 1000);
    },

    /**
     * 타이머를 원복함 (활동 감지 시 호출)
     */
    resetTimer() {
        this.state.remainingSeconds = this.state.timeoutMinutes * 60;
        this.updateUI();
    },

    /**
     * UI 업데이트 (로그아웃 버튼 텍스트 변경)
     */
    updateUI() {
        if (!this.state.logoutBtn) return;
        
        const minutes = Math.floor(this.state.remainingSeconds / 60);
        const seconds = this.state.remainingSeconds % 60;
        const timeStr = `(${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')})`;
        
        const textSpan = this.state.logoutBtn.querySelector('.text');
        if (textSpan) {
            // i18n이 중간에 바뀔 수 있으므로 매번 새로 가져오는 것이 안전할 수 있음
            const currentBase = I18nManager.t('nav_logout');
            textSpan.textContent = `${currentBase} ${timeStr}`;
        }
    },

    /**
     * 활동 감지 리스너 등록
     */
    bindActivityListeners() {
        const resetAction = () => this.resetTimer();
        
        // 클릭 및 키보드 입력 감지
        window.addEventListener('mousedown', resetAction);
        window.addEventListener('keydown', resetAction);
        window.addEventListener('touchstart', resetAction);
        
        // 추가적으로 API 요청이 발생할 때도 리셋되면 좋음 (api.js에서 처리 권장)
    },

    /**
     * 타임아웃 설정을 갱신함 (설정 변경 시 호출 가능)
     */
    updateTimeout(minutes) {
        if (!minutes || isNaN(minutes)) return;
        this.state.timeoutMinutes = parseInt(minutes);
        this.resetTimer();
        console.log(`⏱️ SessionManager: Timeout updated to ${this.state.timeoutMinutes} min.`);
    },

    /**
     * 타임아웃 발생 시 처리
     */
    handleTimeout() {
        clearInterval(this.state.timerId);
        console.warn('⌛ Session expired. Logging out...');
        alert(I18nManager.t('msg_session_expired') || '세션이 만료되었습니다. 다시 로그인해주세요.');
        window.location.href = '/logout';
    }
};
