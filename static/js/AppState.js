export const AppState = {
    currentFilterGroup: 'all',
    currentFilterCategory: null,
    currentFilterDate: null,
    currentStartDate: null,
    currentEndDate: null,
    currentSearchQuery: '',
    unlockedMemos: new Map(),
    offset: 0,
    limit: 20,
    hasMore: true,
    isLoading: false,
    autoLoadCount: 0,
    allMemos: [],
    eventHandlers: null,
    hoveredMemoId: null,
    settings: {}
};
