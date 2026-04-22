# 이번주 메모 / 오늘의 메모 필터 버그 수정

## 날짜
2026-04-22

## 버그 내용
사이드바에서 "이번주 메모" 또는 "오늘의 메모" 클릭 시 메모가 제대로 출력되지 않음.

## 원인 분석
- 사이드바 클릭 시 `group: 'weekly'` 또는 `group: 'daily'`로 백엔드에 요청
- 백엔드(`memo_repo.py`)는 이를 `group_name = 'weekly'`로 DB에서 검색
- 실제 DB에는 `group_name`이 'weekly'인 메모가 없으므로 빈 결과 반환
- **의도**: 날짜 기반 필터링이어야 함 (이번 주 범위 또는 오늘 날짜)

## 조치 사항

### 수정 파일: `static/app.js`

| 메뉴 | 변경 전 | 변경 후 |
|------|---------|---------|
| 이번주 메모 | `group: 'weekly'` | `start_date`/`end_date`로 이번 주 일~토 범위 필터 |
| 오늘의 메모 | `group: 'daily'` | `date: '2026-04-22'`로 오늘 날짜 필터 |

### 코드 변경
```javascript
// BEFORE: 단순 group 필터
AppService.setFilter({ group: newFilter }, updateSidebarCallback);

// AFTER: 날짜 기반 필터
} else if (newFilter === 'weekly') {
    const week = WeeklyManager.getCurrentWeek(new Date());
    const start_date = WeeklyManager.formatDate(week[0]);
    const end_date = WeeklyManager.formatDate(week[6]);
    AppService.setFilter({ group: 'all', start_date, end_date }, updateSidebarCallback);
} else if (newFilter === 'daily') {
    const today = WeeklyManager.formatDate(new Date());
    AppService.setFilter({ group: 'all', date: today }, updateSidebarCallback);
}
```

## 향후 주의사항
- `archive`(보관함)와 `deleted`(휴지통) 메뉴도 `status` 기반 필터링이 필요할 수 있음
- 현재 백엔드에서 `status` 값은 `'active'`, `'done'`, `'archived'` 3종류 지원
- 향후 `deleted` 상태 추가 또는 `archived` 필터링 로직 보강 필요
