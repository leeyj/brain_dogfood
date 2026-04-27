import re

def extract_attachment_filenames(content):
    """본문에서 /api/download/파일명 패턴을 찾아 파일명 리스트 반환"""
    if not content:
        return []
    # /api/download/ 뒤에 오는 UUID.ext 패턴 추출
    pattern = r'/api/download/([a-zA-Z0-9\-\.]+)'
    return re.findall(pattern, content)
