"""
app/assets.py
빌드 도구(Vite/npm) 없이 바닐라 ES 모듈을 빠르게 서빙하기 위한 정적 자산 계층.

1. 콘텐츠 해시 버전 URL  : /static/js/api.js?v=<hash>  → 장기 캐시(immutable) 가능
2. Import Map            : 모듈 안의 상대 import('./x.js')도 버전 URL로 자동 치환
                            (소스 코드 수정 불필요, 동적 import 포함)
3. modulepreload 목록    : 엔트리에서 정적으로 도달 가능한 모든 모듈을 HTML에 미리 선언
                            → 브라우저가 import 연쇄(최대 13단계)를 기다리지 않고 한 번에 병렬 다운로드
4. 캐시 헤더 + gzip      : after_request 훅에서 처리

파일이 바뀌면 mtime 기준으로 해시를 다시 계산하므로 서버 재시작 없이도 반영됩니다(개발 모드 포함).
"""
import gzip
import hashlib
import os
import re
import threading

_IMPORT_RE = re.compile(
    r"""^\s*(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"](\.{1,2}/[^'"]+|/static/[^'"]+)['"]""",
    re.M,
)
# 동적 import('./x.js') — 앱 초기화 중 곧바로 실행되는 것들이 대부분이라 함께 preload
_DYNAMIC_IMPORT_RE = re.compile(r"""\bimport\(\s*['"](\.{1,2}/[^'"]+|/static/[^'"]+)['"]\s*\)""")

COMPRESSIBLE_TYPES = (
    "text/", "application/javascript", "application/json", "image/svg+xml",
    "application/xml", "application/manifest+json",
)
GZIP_MIN_SIZE = 1024
LONG_CACHE = "public, max-age=31536000, immutable"
LIB_CACHE = "public, max-age=604800"  # /static/lib (벤더 라이브러리·폰트): 7일


class AssetManager:
    def __init__(self, static_folder):
        self.static_folder = static_folder
        self._hash_cache = {}   # rel -> (mtime_ns, size, hash)
        self._gzip_cache = {}   # (rel, hash) -> bytes
        self._deps_cache = {}   # rel -> (hash, [deps])
        self._lock = threading.Lock()

    # ---------- 해시 / URL ----------
    def _abs(self, rel):
        return os.path.join(self.static_folder, *rel.split("/"))

    def file_hash(self, rel):
        path = self._abs(rel)
        try:
            st = os.stat(path)
        except OSError:
            return None
        cached = self._hash_cache.get(rel)
        if cached and cached[0] == st.st_mtime_ns and cached[1] == st.st_size:
            return cached[2]
        with open(path, "rb") as f:
            h = hashlib.md5(f.read()).hexdigest()[:10]
        self._hash_cache[rel] = (st.st_mtime_ns, st.st_size, h)
        return h

    def url(self, rel):
        """템플릿용: asset('css/layout.css') → /static/css/layout.css?v=<hash>"""
        rel = rel.lstrip("/")
        h = self.file_hash(rel)
        return f"/static/{rel}?v={h}" if h else f"/static/{rel}"

    # ---------- 모듈 그래프 ----------
    def _js_files(self):
        out = []
        for base in ("js",):
            root = self._abs(base)
            for dirpath, dirs, files in os.walk(root):
                dirs[:] = [d for d in dirs if d not in ("plugins",)]  # 플러그인은 런타임 로딩
                for name in files:
                    if name.endswith(".js"):
                        rel = os.path.relpath(os.path.join(dirpath, name), self.static_folder)
                        out.append(rel.replace(os.sep, "/"))
        if os.path.exists(self._abs("app.js")):
            out.append("app.js")
        return sorted(out)

    def _static_imports(self, rel):
        h = self.file_hash(rel)
        cached = self._deps_cache.get(rel)
        if cached and cached[0] == h:
            return cached[1]
        deps = self._parse_imports(rel)
        self._deps_cache[rel] = (h, deps)
        return deps

    def _parse_imports(self, rel):
        try:
            with open(self._abs(rel), "r", encoding="utf-8") as f:
                src = f.read()
        except OSError:
            return []
        deps = []
        base_dir = rel.rsplit("/", 1)[0] if "/" in rel else ""
        for spec in _IMPORT_RE.findall(src) + _DYNAMIC_IMPORT_RE.findall(src):
            if spec.endswith(".css"):
                continue
            if spec.startswith("/static/"):
                dep = spec[len("/static/"):]
            else:
                dep = os.path.normpath(os.path.join(base_dir, spec)).replace(os.sep, "/")
            deps.append(dep)
        return deps

    def import_map(self):
        """모든 JS 모듈의 '버전 없는 URL → 버전 URL' 매핑"""
        return {"imports": {f"/static/{rel}": self.url(rel) for rel in self._js_files()}}

    def preload_urls(self, entry="app.js"):
        """엔트리에서 정적·동적 import로 도달 가능한 모든 모듈 (엔트리 제외)"""
        seen, stack, order = set(), [entry], []
        while stack:
            rel = stack.pop()
            if rel in seen:
                continue
            seen.add(rel)
            if rel != entry:
                order.append(rel)
            stack.extend(self._static_imports(rel))
        return [self.url(r) for r in sorted(order) if os.path.exists(self._abs(r))]

    # ---------- gzip ----------
    def gzip_bytes(self, key, data):
        if key is not None:
            hit = self._gzip_cache.get(key)
            if hit is not None:
                return hit
        out = gzip.compress(data, compresslevel=6)
        if key is not None:
            with self._lock:
                if len(self._gzip_cache) > 512:
                    self._gzip_cache.clear()
                self._gzip_cache[key] = out
        return out


def init_assets(app):
    assets = AssetManager(app.static_folder)
    app.extensions["assets"] = assets

    @app.context_processor
    def _inject_assets():
        return {
            "asset": assets.url,
            "asset_import_map": assets.import_map,
            "asset_preloads": assets.preload_urls,
        }

    @app.after_request
    def _static_cache_and_gzip(response):
        from flask import request

        path = request.path

        # 1) 캐시 헤더
        if path.startswith("/static/") and response.status_code in (200, 304):
            if request.args.get("v"):
                response.headers["Cache-Control"] = LONG_CACHE
            elif path.startswith("/static/lib/"):
                response.headers["Cache-Control"] = LIB_CACHE
            # 그 외(/static/img 등)는 Flask 기본값(no-cache + ETag 재검증) 유지

        # 2) gzip 압축
        if (
            response.status_code != 200
            or "gzip" not in request.headers.get("Accept-Encoding", "").lower()
            or "Content-Encoding" in response.headers
            or not (response.mimetype or "").startswith(COMPRESSIBLE_TYPES)
            or request.method == "HEAD"
            or response.headers.get("Content-Range")
        ):
            return response

        response.direct_passthrough = False
        data = response.get_data()
        if len(data) < GZIP_MIN_SIZE:
            return response

        cache_key = None
        if path.startswith("/static/"):
            cache_key = (path, response.headers.get("ETag") or len(data))
        gz = assets.gzip_bytes(cache_key, data)
        if len(gz) >= len(data):
            return response

        response.set_data(gz)
        response.headers["Content-Encoding"] = "gzip"
        response.headers["Content-Length"] = str(len(gz))
        vary = response.headers.get("Vary")
        if not vary:
            response.headers["Vary"] = "Accept-Encoding"
        elif "accept-encoding" not in vary.lower():
            response.headers["Vary"] = f"{vary}, Accept-Encoding"
        return response

    return assets
