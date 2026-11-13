"""
옵시디언 플러그인 전용 동기화 API (/api/external/sync/*)

개념: 서버 = 원본 작성·보관소, 옵시디언 → 서버 단방향 푸시.
      서버 → 옵시디언은 사용자의 명시적 '가져오기'로만 (플러그인이 덮어쓰기 경고).

- sync_hash: 플러그인이 관리하는 필드(title, content, 사용자 태그, group, due_date)만의 해시.
  웹에서 고정·완료 같은 메타만 바꾼 경우는 충돌로 보지 않음.
- PUT 은 base_hash(플러그인이 마지막으로 본 서버 해시)가 현재와 다르면 409 (force 시 덮어씀).
- 암호화 메모: 본문·첨부를 절대 내려보내지 않고(제목·잠김 표시만), 수정도 거부.

기존 /api/external/* (MCP 서버 등 사용)는 변경하지 않음.
"""
import datetime
import hashlib
import json
import os
import uuid as uuidlib

from flask import current_app, jsonify, request
from werkzeug.utils import secure_filename

from . import external_bp
from .utils import extract_attachment_filenames
from ...auth import api_key_required
from ...database import get_db
from ...models.memo_repo import MemoRepository
from ...models.queries import FileQueries
from ...security import encrypt_file
from ...services.memo_service import MemoService

SYNC_PREFIX = '/api/external/sync'


def _user_tags(memo):
    return sorted({t['name'] for t in memo.get('tags', []) if (t.get('source') or 'user') == 'user'})


def compute_sync_hash(memo):
    """서버에 저장된 메모 기준 해시 (저장 후 다시 계산해 돌려줌)"""
    payload = {
        'title': (memo.get('title') or '').strip(),
        'content': (memo.get('content') or '').strip(),
        'tags': _user_tags(memo),
        'group': (memo.get('group_name') or '').strip(),
        'due_date': (memo.get('due_date') or '') or '',
    }
    raw = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()


def _summary(memo):
    return {
        'uuid': memo['uuid'],
        'title': memo['title'] or '',
        'updated_at': memo['updated_at'],
        'status': memo['status'],
        'is_encrypted': bool(memo['is_encrypted']),
        'sync_hash': compute_sync_hash(memo) if not memo['is_encrypted'] else None,
    }


def _payload(data):
    """요청 JSON → MemoService 입력 (빈 due_date 는 '기한 없음'으로 지움)"""
    tags = data.get('tags') if isinstance(data.get('tags'), list) else []
    content = data.get('content') or ''
    out = {
        'title': (data.get('title') or '').strip(),
        'content': content,
        'tags': [str(t).strip().lstrip('#') for t in tags if str(t).strip()],
        'due_date': (data.get('due_date') or '').strip(),
        'attachment_filenames': extract_attachment_filenames(content),
    }
    if data.get('group'):
        out['group_name'] = str(data['group']).strip()
    return out


# ───────────────────────── 조회 ─────────────────────────

@external_bp.route(f'{SYNC_PREFIX}/memos', methods=['GET'])
@api_key_required
def sync_list_memos():
    conn = get_db()
    try:
        rows = conn.execute("SELECT * FROM memos WHERE status != 'deleted' ORDER BY updated_at DESC").fetchall()
        tags = {}
        for r in conn.execute("SELECT memo_id, name, source FROM tags").fetchall():
            tags.setdefault(r['memo_id'], []).append({'name': r['name'], 'source': r['source']})
    finally:
        conn.close()
    out = []
    for row in rows:
        m = dict(row)
        m['tags'] = tags.get(m['id'], [])
        out.append(_summary(m))
    return jsonify(out)


@external_bp.route(f'{SYNC_PREFIX}/memos/<string:memo_uuid>', methods=['GET'])
@api_key_required
def sync_get_memo(memo_uuid):
    memo = MemoRepository.get_by_uuid(memo_uuid)
    if not memo or memo['status'] == 'deleted':
        return jsonify({'error': 'Memo not found'}), 404
    body = _summary(memo)
    if memo['is_encrypted']:
        # 암호문·첨부는 내려보내지 않음 (옵시디언에서 해독 금지 정책)
        body.update({'content': None, 'tags': [], 'group': None, 'due_date': None, 'attachments': []})
    else:
        body.update({
            'content': memo['content'] or '',
            'tags': _user_tags(memo),
            'group': memo['group_name'],
            'due_date': memo['due_date'] or None,
            'attachments': [{'filename': a['filename'], 'original_name': a['original_name']}
                            for a in memo.get('attachments', [])],
        })
    return jsonify(body)


# ───────────────────────── 쓰기 ─────────────────────────

@external_bp.route(f'{SYNC_PREFIX}/memos', methods=['POST'])
@api_key_required
def sync_create_memo():
    data = request.get_json(silent=True) or {}
    if not isinstance(data, dict):
        return jsonify({'error': 'JSON object required'}), 400
    payload = _payload(data)
    if not payload['content'].strip() and not payload['title']:
        return jsonify({'error': 'Empty memo'}), 400
    try:
        memo_id = MemoService.create_memo({**payload, 'due_date': payload['due_date'] or None})
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    memo = MemoRepository.get_by_id(memo_id)
    return jsonify({'uuid': memo['uuid'], 'sync_hash': compute_sync_hash(memo),
                    'updated_at': memo['updated_at']}), 201


@external_bp.route(f'{SYNC_PREFIX}/memos/<string:memo_uuid>', methods=['PUT'])
@api_key_required
def sync_update_memo(memo_uuid):
    data = request.get_json(silent=True) or {}
    if not isinstance(data, dict):
        return jsonify({'error': 'JSON object required'}), 400
    memo = MemoRepository.get_by_uuid(memo_uuid)
    if not memo or memo['status'] == 'deleted':
        return jsonify({'error': 'Memo not found'}), 404
    if memo['is_encrypted']:
        return jsonify({'error': 'Encrypted memos cannot be modified from external apps'}), 403

    current = compute_sync_hash(memo)
    if not data.get('force') and data.get('base_hash') != current:
        return jsonify({'error': 'conflict', 'server_hash': current,
                        'server_updated_at': memo['updated_at'], 'server_title': memo['title']}), 409

    payload = _payload(data)
    ok, message = MemoService.update_memo(memo['id'], payload)
    if not ok:
        return jsonify({'error': message}), 500
    saved = MemoRepository.get_by_uuid(memo_uuid)
    return jsonify({'uuid': memo_uuid, 'sync_hash': compute_sync_hash(saved), 'updated_at': saved['updated_at']})


@external_bp.route(f'{SYNC_PREFIX}/upload', methods=['POST'])
@api_key_required
def sync_upload():
    """첨부 업로드. 같은 내용(sha256)이 '미연결' 또는 '같은 메모'에 이미 있으면 재사용 → 중복 저장 방지"""
    file = request.files.get('file')
    if not file or not file.filename:
        return jsonify({'error': 'No file provided'}), 400
    ext = os.path.splitext(file.filename)[1].lower().lstrip('.')
    sec = current_app.config.get('UPLOAD_SECURITY', {})
    if ext in sec.get('blocked_extensions', []):
        return jsonify({'error': f'Extension .{ext} is blocked'}), 403
    if sec.get('allowed_extensions') and ext not in sec['allowed_extensions']:
        return jsonify({'error': f'Extension .{ext} is not allowed'}), 403

    data = file.read()
    digest = hashlib.sha256(data).hexdigest()
    memo_uuid = request.form.get('memo_uuid')

    conn = get_db()
    try:
        row = conn.execute(
            """SELECT a.filename FROM attachments a LEFT JOIN memos m ON a.memo_id = m.id
               WHERE a.sha256 = ? AND (a.memo_id IS NULL OR m.uuid = ?) LIMIT 1""",
            (digest, memo_uuid)).fetchone()
        if row and os.path.exists(os.path.join(current_app.config['UPLOAD_FOLDER'], row['filename'])):
            return jsonify({'filename': row['filename'], 'url': f"/api/download/{row['filename']}", 'reused': True})

        filename = secure_filename(f"{uuidlib.uuid4()}.{ext}")
        folder = current_app.config['UPLOAD_FOLDER']
        os.makedirs(folder, exist_ok=True)
        path = os.path.join(folder, filename)
        with open(path, 'wb') as f:
            f.write(encrypt_file(data))
        conn.execute(FileQueries.INSERT_ATTACHMENT,
                     (filename, file.filename, ext, os.path.getsize(path), datetime.datetime.now().isoformat()))
        conn.execute("UPDATE attachments SET sha256 = ? WHERE filename = ?", (digest, filename))
        conn.commit()
    finally:
        conn.close()
    return jsonify({'filename': filename, 'url': f"/api/download/{filename}", 'reused': False}), 201
