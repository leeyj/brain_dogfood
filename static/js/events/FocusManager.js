/**
 * FocusManager: UI 컴포넌트 간의 입력 우선순위를 관리하는 스택 시스템
 */
export const FocusManager = {
    stack: [],

    /**
     * 새로운 컴포넌트를 포커스 스택에 추가
     * @param {Object} component { name, handleKeyDown: (e) => boolean }
     */
    push(component) {
        if (!component || typeof component.handleKeyDown !== 'function') {
            console.error('[FocusManager] Invalid component pushed:', component);
            return;
        }
        // 중복 추가 방지 (동일 이름이 있으면 기존 것 제거 후 최상단으로)
        this.stack = this.stack.filter(c => c.name !== component.name);
        this.stack.push(component);
        console.log(`[FocusManager] Pushed: ${component.name}. Stack size: ${this.stack.length}`);
    },

    /**
     * 최상단 컴포넌트를 스택에서 제거
     */
    pop(name = null) {
        if (name) {
            this.stack = this.stack.filter(c => c.name !== name);
        } else {
            this.stack.pop();
        }
        console.log(`[FocusManager] Popped. Stack size: ${this.stack.length}`);
    },

    /**
     * 현재 이벤트를 최상단 컴포넌트부터 전파하여 처리 시도
     * @param {KeyboardEvent} e 
     * @returns {boolean} 이벤트가 소비되었는지 여부
     */
    dispatch(e) {
        for (let i = this.stack.length - 1; i >= 0; i--) {
            const component = this.stack[i];
            const consumed = component.handleKeyDown(e);
            if (consumed) {
                console.log(`[FocusManager] Event consumed by: ${component.name}`);
                return true;
            }
        }
        return false;
    },

    /**
     * 특정 컴포넌트가 현재 포커스 스택에 있는지 확인
     */
    isActive(name) {
        return this.stack.some(c => c.name === name);
    }
};
