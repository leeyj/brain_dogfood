import { App, Plugin, PluginSettingTab, Setting, TFile, Notice } from 'obsidian';
import { BrainsryoApi } from './BrainsryoApi';
import { BridgeManager } from './BridgeManager';

interface BrainsryoSettings {
    serverUrl: string;
    apiToken: string;
    syncFolder: string;
}

const DEFAULT_SETTINGS: BrainsryoSettings = {
    serverUrl: 'http://127.0.0.1:5050',
    apiToken: '',
    syncFolder: 'Brainsryo'
};

export default class BrainsryoPlugin extends Plugin {
    settings: BrainsryoSettings;
    api: BrainsryoApi;
    bridge: BridgeManager;

    async onload() {
        await this.loadSettings();

        // 1. API 및 브릿지 매니저 초기화
        this.api = new BrainsryoApi(this.settings.serverUrl, this.settings.apiToken);
        this.bridge = new BridgeManager(this.app, this.api, this.settings);

        // 2. 명령어 등록
        this.addCommand({
            id: 'push-current-note',
            name: 'Push Current Note to Brainsryo',
            checkCallback: (checking: boolean) => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile) {
                    if (!checking) {
                        this.bridge.pushNote(activeFile);
                    }
                    return true;
                }
                return false;
            }
        });

        this.addCommand({
            id: 'pull-server-memos',
            name: 'Fetch Memo List from Server',
            callback: async () => {
                try {
                    const memos = await this.api.listMemos();
                    // 간단한 목록 선택 UI를 나중에 추가할 수 있습니다. 
                    // 지금은 우선 로그로만 확인
                    new Notice(`📡 서버에 ${memos.length}개의 메모가 있습니다.`);
                } catch (e) {
                    new Notice("❌ 서버 목록을 가져오지 못했습니다.");
                }
            }
        });

        // 3. 프로토콜 핸들러 등록 (obsidian://brainsryo-pull?uuid=...)
        this.registerObsidianProtocolHandler('brainsryo-pull', async (params) => {
            await this.bridge.handleProtocol(params);
        });

        // 4. 리본 아이콘 (서버 목록 새로고침 대용)
        this.addRibbonIcon('upload-cloud', 'Push Current Note', () => {
            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile) {
                this.bridge.pushNote(activeFile);
            } else {
                new Notice("❌ 열려있는 노트가 없습니다.");
            }
        });

        // 5. 설정 탭
        this.addSettingTab(new BrainsryoSettingTab(this.app, this));

        console.log('🚀 Brainsryo Bridge v3.0.0 Loaded (Manual Mode)');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        // 설정 변경 시 API 클라이언트 갱신
        this.api = new BrainsryoApi(this.settings.serverUrl, this.settings.apiToken);
    }
}

class BrainsryoSettingTab extends PluginSettingTab {
    plugin: BrainsryoPlugin;

    constructor(app: App, plugin: BrainsryoPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Brainsryo Bridge Settings' });

        new Setting(containerEl)
            .setName('Server URL')
            .setDesc('홈 서버 주소를 입력하세요 (예: http://192.168.0.20:5050)')
            .addText(text => text
                .setPlaceholder('http://localhost:5050')
                .setValue(this.plugin.settings.serverUrl)
                .onChange(async (value) => {
                    this.plugin.settings.serverUrl = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('API Token')
            .setDesc('서버에서 발급받은 API Key를 입력하세요.')
            .addText(text => text
                .setPlaceholder('Enter token')
                .setValue(this.plugin.settings.apiToken)
                .onChange(async (value) => {
                    this.plugin.settings.apiToken = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Sync Folder')
            .setDesc('메모를 가져올 폴더명을 입력하세요.')
            .addText(text => text
                .setPlaceholder('Brainsryo')
                .setValue(this.plugin.settings.syncFolder)
                .onChange(async (value) => {
                    this.plugin.settings.syncFolder = value;
                    await this.plugin.saveSettings();
                }));
    }
}
