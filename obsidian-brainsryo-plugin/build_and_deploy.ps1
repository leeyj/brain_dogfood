# 옵시디언 플러그인 자동 빌드 및 배포 스크립트 (최종 수정본)

$TARGET_DIR = "C:\Users\az001\Documents\Obsidian Vault\.obsidian\plugins\obsidian-brainsryo-sync"

Write-Host "🚀 빌드 시작 (npm run build)..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 빌드 성공! 옵시디언 폴더로 배포 중..." -ForegroundColor Green
    
    # 플러그인 폴더가 없으면 생성
    if (!(Test-Path $TARGET_DIR)) {
        New-Item -ItemType Directory -Path $TARGET_DIR -Force
        Write-Host "📁 플러그인 폴더 생성됨: $TARGET_DIR" -ForegroundColor Gray
    }

    # 핵심 파일 복사
    Write-Host "📦 파일 복사 중..." -ForegroundColor Gray
    Copy-Item "main.js" -Destination $TARGET_DIR -Force
    Copy-Item "manifest.json" -Destination $TARGET_DIR -Force
    
    # Wasm 엔진 복사 (오프라인 모드 필수)
    if (Test-Path "sql-wasm.wasm") {
        Copy-Item "sql-wasm.wasm" -Destination $TARGET_DIR -Force
    }
    if (Test-Path "sql-wasm-browser.wasm") {
        Copy-Item "sql-wasm-browser.wasm" -Destination $TARGET_DIR -Force
    }

    # 스타일 파일 복사 (있을 경우만)
    if (Test-Path "styles.css") {
        Copy-Item "styles.css" -Destination $TARGET_DIR -Force
    }
    
    Write-Host "--------------------------------------------------" -ForegroundColor Cyan
    Write-Host "✨ 배포 완료!" -ForegroundColor Green
    Write-Host "📂 경로: $TARGET_DIR" -ForegroundColor Gray
    Write-Host "👉 옵시디언에서 'Community Plugins' > 'Brainsryo Sync'를 다시 껐다 켜세요." -ForegroundColor Yellow
    Write-Host "--------------------------------------------------" -ForegroundColor Cyan
} else {
    Write-Host "❌ 빌드 실패! 코드를 확인하세요." -ForegroundColor Red
}
