import re
from ..constants import GROUP_DEFAULT

def parse_metadata(text, default_group=GROUP_DEFAULT):
    """
    텍스트에서 $그룹명 과 #태그 추출 유틸리티.
    그룹은 첫 번째 매칭된 것만 반환합니다.
    """
    group_name = default_group
    tags = []
    
    if not text:
        return group_name, tags
        
    # $그룹명 추출 (단어 경계 고려, 첫 번째 매칭만)
    group_match = re.search(r'\$(\w+)', text)
    if group_match:
        group_name = group_match.group(1)
        
    # 태그 추출 (공백이나 줄 시작 뒤의 #만 인정하며, HTML 속성(: 또는 =) 뒤의 #은 무시)
    tag_regex = r'(?<![:=])(?<![:=]\s)(?:(?<=\s)|(?<=^))#([^\s\#\d\W][\w가-힣-]*)'
    tag_matches = re.finditer(tag_regex, text)
    for match in tag_matches:
        tags.append(match.group(1))
        
    return group_name, list(set(tags))

def parse_and_clean_metadata(content, ui_group=GROUP_DEFAULT, ui_tags=None):
    """
    [비파괴적 버전] 본문에서 메타데이터를 추출하되, 본문의 내용은 훼손하지 않습니다.
    단, 이전에 자동 생성되었던 푸터 블록만 식별하여 제거합니다.
    """
    if ui_tags is None: ui_tags = []
    if not content:
        return content, ui_group, ui_tags

    # 1. 기존에 자동 생성되었던 푸터 블록만 제거 (원본 본문 보호를 위함)
    content = content.strip()
    footer_regex = r'\n+[\*\-\_]{3,}\s*\n(?:^[\$\#][^\s\#].*$(?:\n|$))*$'
    content = re.sub(footer_regex, '', content, flags=re.MULTILINE).strip()

    # 2. 본문에서 기호 정보 추출 (추출만 수행하고 본문에서 삭제는 하지 않음)
    content_group, content_tags = parse_metadata(content)
    
    # 3. 데이터 통합
    # 본문에 적힌 태그와 UI에서 선택된 태그를 합칩니다.
    final_group = content_group if content_group != GROUP_DEFAULT else ui_group
    final_tags = list(set(ui_tags + content_tags))

    # 이제 본문에서 태그를 삭제(re.sub)하거나 최하단에 수평선 + 태그를 붙이지 않습니다.
    return content, final_group, final_tags

def generate_auto_title(content):
    """
    본문에서 제목을 추출합니다. (첫 줄 기준, 영문 20자/한글 10자 내외)
    """
    if not content:
        return ""
        
    # 푸터 제거 (마지막 수평선 블록 제거 로직과 동일)
    footer_regex = r'\n+[\*\-\_]{3,}\s*\n(?:^[\$\#][^\s\#].*$(?:\n|$))*$'
    main_content = re.sub(footer_regex, '', content, flags=re.MULTILINE).strip()
    if not main_content: return ""

    lines = main_content.split('\n')
    # 실제 내용이 있는 첫 번째 줄 찾기 (헤더 기호 제외)
    title = ""
    for line in lines:
        stripped = line.strip()
        if not stripped: continue
        # 마크다운 헤더 기호(#) 제거
        title = re.sub(r'^#+\s+', '', stripped).strip()
        if title: break
    
    return title[:20]

def extract_links(text):
    """
    텍스트에서 [[#ID]] 형태의 내부 링크를 찾아 ID 목록(정수)을 반환합니다.
    """
    if not text:
        return []
    
    # [[#123]] 패턴 매칭
    links = re.findall(r'\[\[#(\d+)\]\]', text)
    return list(set([int(link_id) for link_id in links]))
