# Bugfix Report: Encrypted Type Mismatch in Obsidian Plugin

## 일시
2026-04-26

## 버그 내역
- **현상**: 암호화된 메모(`is_encrypted: 1`)가 옵시디언 플러그인에서 수정 방지 로직을 통과하여 서버로 푸시(Push)됨. 이로 인해 새로운 메모로 중복 등록되거나 데이터 오염 위험 발생.
- **원인**: TypeScript 코드에서 `fm?.is_encrypted === true`와 같이 엄격한 불리언 체크를 수행했으나, SQLite 및 YAML 파싱 과정에서 해당 값이 숫자 `1`로 전달되어 조건문을 통과함.

## 영향도
- 암호화된 데이터의 무결성 훼손 가능성.
- 서버 DB에 중복 메모 생성.

## 수정 사항
- **파일명**: `obsidian-brainsryo-plugin/main.ts`
- **수정 내용**: 
    ```typescript
    // 기존
    const isEncrypted = fm?.is_encrypted === true;
    
    // 수정
    const isEncrypted = fm?.is_encrypted == true || fm?.is_encrypted === 1;
    ```
- **결과**: 숫자 `1`과 불리언 `true` 모두를 정상적으로 인식하여 암호화 메모의 수정을 원천 차단함.

## 해결 확인
- 옵시디언에서 `is_encrypted: 1` 속성을 가진 메모에 대해 'Push' 시도 시 경고 알림과 함께 차단되는 것을 확인 완료.
