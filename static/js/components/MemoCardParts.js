/**
 * MemoCardParts: 메모 카드를 구성하는 개별 UI 요소 렌더러 모음 (Facade)
 * 하위 모듈들로부터 기능을 가져와 통합된 인터페이스를 제공합니다.
 */
import { CardBase } from './card/CardBase.js';
import { CardHeader } from './card/CardHeader.js';
import { CardMeta } from './card/CardMeta.js';
import { CardBody } from './card/CardBody.js';
import { CardActions } from './card/CardActions.js';

export const MemoCardParts = {
    // 1. Base Container
    createCardBase: CardBase.createCardBase,

    // 2. Header Elements
    createIdBadge: CardHeader.createIdBadge,
    createTitle: CardHeader.createTitle,
    createDate: CardHeader.createDate,

    // 3. Meta Elements
    createDeadlineBadge: CardMeta.createDeadlineBadge,
    createMeta: CardMeta.createMeta,

    // 4. Body Elements
    createSummary: CardBody.createSummary,
    createBacklinks: CardBody.createBacklinks,
    createContent: CardBody.createContent,

    // 5. Action Elements
    createActions: CardActions.createActions
};
