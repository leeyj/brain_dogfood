import { App, TFile, Notice, requestUrl } from 'obsidian';
import { BrainsryoApi, ServerMemo } from './BrainsryoApi';

export class BridgeManager {
    private app: App;
    private api: BrainsryoApi;
    private settings: any;

    constructor(app: App, api: BrainsryoApi, settings: any) {
        this.app = app;
        this.api = api;
        this.settings = settings;
    }

    /**
     * 현재 파일을 서버로 전송 (Push)
     */
    async pushNote(file: TFile) {
        const cache = this.app.metadataCache.getFileCache(file);
        const uuid = cache?.frontmatter?.uuid;

        if (!uuid) {
            new Notice("❌ 이 파일은 UUID가 없어 서버로 전송할 수 없습니다.");
            return;
        }

        // 암호화 메모 보호 체크
        const fmEnc = cache?.frontmatter?.is_encrypted;
        const isEncrypted = fmEnc === 1 || fmEnc === true || fmEnc === "1";
        if (isEncrypted) {
            const confirm = window.confirm("🔒 이 메모는 암호화되어 있습니다. 수정된 암호문을 서버로 보내시겠습니까? (잘못된 수정은 데이터 파괴로 이어질 수 있습니다)");
            if (!confirm) return;
        }

        try {
            let content = await this.app.vault.read(file);
            
            // 1. 첨부파일 처리 (이미지 및 파일 업로드)
            content = await this.processAttachments(content, file.path);

            // 2. 서버로 전송
            await this.api.updateMemo(uuid, { 
                content, 
                title: file.basename 
            });
            new Notice(`🚀 서버로 전송 완료: ${file.basename}`);
        } catch (e: any) {
            console.error("Push Error:", e);
            new Notice(`❌ 전송 실패: ${e.message}`);
        }
    }

    /**
     * 본문 내 위키링크 첨부파일을 찾아 서버로 업로드하고 링크를 치환합니다.
     */
    private async processAttachments(content: string, sourcePath: string): Promise<string> {
        // ![[파일명]] 또는 [[파일명]] 패턴 매칭 (이미지 위주)
        const wikiLinkRegex = /!\[\[(.*?)\]\]|\[\[(.*?)\]\]/g;
        let match;
        let newContent = content;

        const matches = Array.from(content.matchAll(wikiLinkRegex));
        
        for (const match of matches) {
            const fullMatch = match[0];
            const linkPath = match[1] || match[2];
            
            // 마크다운 파일(.md)은 무시
            if (linkPath.endsWith('.md')) continue;

            const file = this.app.metadataCache.getFirstLinkpathDest(linkPath, sourcePath);
            if (file instanceof TFile) {
                try {
                    new Notice(`📤 업로드 중: ${file.name}`);
                    const fileData = await this.app.vault.readBinary(file);
                    const uploadResult = await this.api.uploadFile(fileData, file.name);
                    
                    if (uploadResult && uploadResult.url) {
                        // 위키링크를 마크다운 표준 링크로 치환
                        const isImage = fullMatch.startsWith('!');
                        const newLink = isImage ? `![${file.name}](${uploadResult.url})` : `[${file.name}](${uploadResult.url})`;
                        newContent = newContent.replace(fullMatch, newLink);
                    }
                } catch (err) {
                    console.error(`Failed to upload ${file.name}:`, err);
                }
            }
        }
        return newContent;
    }

    /**
     * 서버에서 특정 메모 가져오기 (Pull)
     */
    async pullMemo(uuid: string) {
        new Notice("📡 서버에서 데이터를 가져오는 중...");
        try {
            const serverMemo = await this.api.getMemo(uuid);
            await this.saveMemoToVault(serverMemo);
            new Notice(`✅ 가져오기 완료: ${serverMemo.title}`);
        } catch (e: any) {
            console.error("Pull Error:", e);
            new Notice(`❌ 가져오기 실패: ${e.message}`);
        }
    }

    /**
     * 서버 데이터를 볼트 파일로 저장 (생성 또는 업데이트)
     */
    private async saveMemoToVault(memo: ServerMemo) {
        const folderPath = this.settings.syncFolder;
        const adapter = this.app.vault.adapter;

        // 폴더 생성
        if (folderPath && !(await adapter.exists(folderPath))) {
            await this.app.vault.createFolder(folderPath);
        }

        let content = memo.markdown || memo.content || "";
        
        // 📥 서버의 첨부파일 링크(/api/download/...)를 찾아 로컬로 다운로드 및 치환
        content = await this.downloadAttachments(content);

        const safeTitle = (memo.title || memo.uuid || "Untitled").replace(/[\\/:*?"<>|]/g, '_');
        const fileName = `${safeTitle}.md`;
        const path = folderPath ? `${folderPath}/${fileName}` : fileName;

        const existingFile = this.app.vault.getAbstractFileByPath(path);

        if (existingFile instanceof TFile) {
            await this.app.vault.modify(existingFile, content);
        } else {
            await this.app.vault.create(path, content);
        }
    }

    /**
     * 서버의 /api/download/ 파일을 다운로드하여 로컬에 저장하고 링크를 위키링크로 바꿉니다.
     */
    private async downloadAttachments(content: string): Promise<string> {
        const serverLinkRegex = /!?\[.*?\]\(\/api\/download\/(.*?)\)/g;
        let newContent = content;
        const matches = Array.from(content.matchAll(serverLinkRegex));

        for (const match of matches) {
            const fullMatch = match[0];
            const fileName = match[1];
            
            try {
                const url = `${this.settings.serverUrl}/api/download/${fileName}`;
                new Notice(`📥 다운로드 중: ${fileName}`);
                
                const response = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${this.settings.apiToken}` }
                });

                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    
                    // 기본 첨부파일 폴더 또는 메모 폴더에 저장
                    const attachmentPath = this.settings.syncFolder ? `${this.settings.syncFolder}/${fileName}` : fileName;
                    
                    if (!(await this.app.vault.adapter.exists(attachmentPath))) {
                        await this.app.vault.createBinary(attachmentPath, arrayBuffer);
                    }

                    // 링크를 위키링크로 치환
                    const isImage = fullMatch.startsWith('!');
                    const newLink = isImage ? `![[${fileName}]]` : `[[${fileName}]]`;
                    newContent = newContent.replace(fullMatch, newLink);
                }
            } catch (err) {
                console.error(`Failed to download ${fileName}:`, err);
            }
        }
        return newContent;
    }

    /**
     * obsidian://brainsryo-pull?uuid=... 프로토콜 핸들러
     */
    async handleProtocol(params: any) {
        const uuid = params.uuid;
        if (uuid) {
            await this.pullMemo(uuid);
        } else {
            new Notice("❌ 유효하지 않은 브레인사료 링크입니다.");
        }
    }
}
