import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname, './'), // 프로젝트 루트
  base: '/static/dist/', // Flask에서 정적 파일 접근 경로
  build: {
    outDir: resolve(__dirname, 'static/dist'), // 빌드 결과물 저장 경로
    emptyOutDir: true, // 빌드 시 폴더 비우기
    manifest: true, // manifest.json 생성 (Flask 연동 필수)
    cssMinify: 'esbuild', // lightningcss 대신 esbuild 사용 (호환성 목적)
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'static/app.js'), // 엔트리 포인트
      },
      output: {
        entryFileNames: `[name].[hash].js`, // 캐시 버스팅을 위한 해시 추가
        chunkFileNames: `[name].[hash].js`,
        assetFileNames: `[name].[hash].[ext]`,
      },
    },
  },
  server: {
    port: 3000,
    strictPort: true,
  },
});
