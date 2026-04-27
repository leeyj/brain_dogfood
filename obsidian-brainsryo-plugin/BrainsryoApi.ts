import { requestUrl, RequestUrlParam } from 'obsidian';

export interface ServerMemo {
    id: number;
    uuid: string;
    title: string;
    content: string;
    markdown?: string; // 상세 조회 시 반환되는 전체 마크다운
    updated_at: string;
    status: string;
    is_encrypted: boolean;
}

export class BrainsryoApi {
    private baseUrl: string;
    private token: string;

    constructor(baseUrl: string, token: string) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.token = token;
    }

    private getHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * 서버의 메모 목록 조회
     */
    async listMemos(): Promise<ServerMemo[]> {
        const url = `${this.baseUrl}/api/external/memos`;
        console.log(`📡 Requesting List: ${url}`);
        
        try {
            const response = await requestUrl({
                url: url,
                method: 'GET',
                headers: this.getHeaders()
            });
            return response.json;
        } catch (err: any) {
            console.error(`❌ List Fetch Failed:`, err);
            throw err;
        }
    }

    /**
     * 특정 UUID의 메모 상세 조회
     */
    async getMemo(uuid: string): Promise<ServerMemo> {
        const url = `${this.baseUrl}/api/external/memos/${uuid}`;
        console.log(`📡 Requesting Detail: ${url}`);
        
        try {
            const response = await requestUrl({
                url: url,
                method: 'GET',
                headers: this.getHeaders()
            });
            return response.json;
        } catch (err: any) {
            console.error(`❌ Detail Fetch Failed (${uuid}):`, err);
            throw err;
        }
    }

    /**
     * 서버 메모 업데이트 (또는 생성)
     */
    async updateMemo(uuid: string, data: Partial<ServerMemo>): Promise<any> {
        const url = `${this.baseUrl}/api/external/memos/${uuid}`;
        try {
            const response = await requestUrl({
                url: url,
                method: 'POST', // 서버가 POST를 기대함
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });
            return response.json;
        } catch (err: any) {
            console.error(`❌ Update Failed:`, err);
            throw err;
        }
    }

    /**
     * 서버 메모 삭제 (휴지통 이동)
     */
    async deleteMemo(uuid: string): Promise<any> {
        const response = await requestUrl({
            url: `${this.baseUrl}/api/external/memos/${uuid}`,
            method: 'DELETE',
            headers: this.getHeaders()
        });
        return response.json;
    }

    /**
     * 파일 업로드 (첨부파일 전송용)
     */
    async uploadFile(fileData: ArrayBuffer, fileName: string): Promise<any> {
        const formData = new FormData();
        const blob = new Blob([fileData]);
        formData.append('file', blob, fileName);

        try {
            // Obsidian requestUrl은 FormData를 직접 지원하지 않을 수 있으므로 fetch 사용
            const response = await fetch(`${this.baseUrl}/api/external/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Upload failed: ${response.status} ${errorText}`);
            }

            return await response.json();
        } catch (e) {
            console.error('API Upload Error:', e);
            throw e;
        }
    }
}
