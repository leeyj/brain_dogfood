import re
from ..constants import GROUP_DEFAULT

def parse_metadata(text):
    """
    텍스트에서 ##그룹명 과 #태그 추출 유틸리티.
    """
    group_name = GROUP_DEFAULT
    tags = []
    
    if not text:
        return group_name, tags
        
    group_match = re.search(r'##(\S+)', text)
    if group_match:
        group_name = group_match.group(1)
        
    tag_matches = re.finditer(r'(?<!#)#(\S+)', text)
    for match in tag_matches:
        tags.append(match.group(1))
        
    return group_name, list(set(tags))

def extract_links(text):
    """
    텍스트에서 [[#ID]] 형태의 내부 링크를 찾아 ID 목록(정수)을 반환합니다.
    """
    if not text:
        return []
    
    # [[#123]] 패턴 매칭
    links = re.findall(r'\[\[#(\d+)\]\]', text)
    return list(set([int(link_id) for link_id in links]))
