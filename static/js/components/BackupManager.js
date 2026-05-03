import { API } from '../api.js';

export const BackupManager = {
    init() {
        const openBtn = document.getElementById('openBackupModalBtn');
        const modal = document.getElementById('backupModal');
        const cancelBtn = document.getElementById('cancelBackupBtn');
        const executeBtn = document.getElementById('executeBackupBtn');
        const settingsModal = document.getElementById('settingsModal');

        if (!openBtn || !modal) return;

        openBtn.addEventListener('click', () => {
            // 설정 모달 닫고 백업 모달 열기
            if (settingsModal) settingsModal.classList.remove('active');
            modal.classList.add('active');
            const pwdInput = document.getElementById('backupPassword');
            if (pwdInput) pwdInput.value = '';
        });

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }

        window.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });

        if (executeBtn) {
            executeBtn.addEventListener('click', async () => {
                const radio = document.querySelector('input[name="backup_type"]:checked');
                if (!radio) return;
                const type = radio.value;
                
                const originalHtml = executeBtn.innerHTML;
                executeBtn.disabled = true;
                executeBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> 처리 중...`;

                try {
                    if (type === 'full') {
                        const pwd = document.getElementById('backupPassword').value;
                        if (!pwd) {
                            alert('전체 백업을 위해 비밀번호를 입력해주세요.');
                            executeBtn.disabled = false;
                            executeBtn.innerHTML = originalHtml;
                            return;
                        }
                        await this.downloadBackup('/api/backup/full', 'POST', { password: pwd });
                    } else if (type === 'export') {
                        await this.downloadBackup('/api/backup/export', 'GET');
                    }
                    modal.classList.remove('active');
                } catch (err) {
                    alert('백업/내보내기 실패: ' + err.message);
                } finally {
                    executeBtn.disabled = false;
                    executeBtn.innerHTML = originalHtml;
                }
            });
        }
    },

    async downloadBackup(url, method, body = null) {
        const options = {
            method: method,
            headers: {}
        };
        if (body) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        if (!response.ok) {
            let errorMsg = '다운로드에 실패했습니다.';
            try {
                const err = await response.json();
                errorMsg = err.error || err.message || errorMsg;
            } catch (e) {}
            throw new Error(errorMsg);
        }

        // 대용량 파일을 Blob으로 받아 브라우저에서 다운로드 처리 (메모리 우회)
        const blob = await response.blob();
        
        // 헤더에서 파일명 추출 시도 (Content-Disposition)
        let filename = "backup.zip";
        const disposition = response.headers.get('Content-Disposition');
        if (disposition && disposition.indexOf('attachment') !== -1) {
            const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
            const matches = filenameRegex.exec(disposition);
            if (matches != null && matches[1]) {
                filename = matches[1].replace(/['"]/g, '');
            }
        }

        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // 메모리 릭 방지를 위해 URL 해제
        setTimeout(() => {
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
        }, 100);
    }
};
