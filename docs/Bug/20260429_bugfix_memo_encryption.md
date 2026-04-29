# 버그 수정 보고서: 메모 암호화 저장 누락 버그

- **날짜**: 2026-04-29
- **작성자**: Antigravity AI
- **이슈 요약**: 암호가 설정된 메모를 새로 작성할 때, 서버에서 암호화 처리가 되지 않고 평문으로 저장되는 버그.

## 버그 내역 (Bug Details)
- 사용자가 프론트엔드의 메모 작성기(Composer)에서 자물쇠 아이콘을 클릭하여 암호화를 활성화(🔒)하고 비밀번호를 입력한 뒤 메모를 저장해도, 실제로 데이터베이스에는 암호화되지 않은 본문이 저장됨.
- 보안이 중요한 지식이 암호화 없이 저장될 위험 존재.

## 원인 (Cause)
- 프론트엔드의 `static/js/components/ComposerManager.js`에서 백엔드 `API.saveMemo` 함수로 데이터를 넘겨주는 페이로드(`data` 객체)를 구성할 때, 암호화 활성화 상태를 담는 `is_encrypted` 필드를 명시적으로 전송하지 않음.
- 백엔드(`/api/memos` 엔드포인트)는 전송받은 데이터에 `is_encrypted`가 존재하지 않으므로, 암호화 옵션을 `false` (0)로 간주하고 평문 저장을 수행함.

## 영향도 (Impact)
- **보안 이슈 발생 위험**: 사용자가 암호화 처리가 되었다고 믿은 민감 정보가, 실제 데이터베이스 상에는 평문으로 저장되어 데이터 유출 시 보안 취약점 발생 가능.
- 기존에 작성된 암호화 메모를 수정할 때는 `memo['is_encrypted']` 상태를 백엔드에서 자체 조회하여 판단하므로 이 이슈와 무관하지만, **신규 메모 생성** 또는 기존 평문 메모를 암호화 메모로 변경하려 할 때는 치명적임.

## 수정 사항 (Modifications)

- **수정 파일**: `c:\project\my_util\memo_server\static\js\components\ComposerManager.js`
- **수정 내역**: 
  `handleSave` 함수 내의 전송 데이터 객체(`data`) 구성 부분에 다음과 같이 `is_encrypted` 항목을 추가함.
  ```javascript
  const data = {
      title: this.DOM.title.value.trim(),
      content: EditorManager.getMarkdown(),
      // ... 생략 ...
      password: this.DOM.password.value.trim(),
      is_encrypted: this.DOM.encryptionToggle.dataset.locked === 'true', // 추가됨
      attachment_filenames: EditorManager.getAttachedFilenames(),
      // ... 생략 ...
  };
  ```

## 해결 사항 (Resolution)
- 변경된 코드가 반영되면, 암호화를 활성화하고 저장할 때 `is_encrypted: true` 값이 서버로 전달됩니다. 
- 서버의 `MemoService.create_memo` 및 `update_memo`에서 이 값을 정상적으로 인지하고, 입력된 `password`로 본문 내용을 AES 암호화 한 뒤 DB에 저장하게 됩니다.
