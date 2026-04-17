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
        
    # #태그 추출 (마크다운 헤더 # , ## 및 내부 링크[[#ID]] 방지)
    # 태그는 반드시 # 바로 뒤에 영문/숫자/한글이 붙어 있어야 하며, 앞에 다른 문자가 없어야 함
    tag_matches = re.finditer(r'(?<!#)(?<!\[\[)(?<!\w)#([^\s\#\d\W][^\s\#]*)', text)
    for match in tag_matches:
        tags.append(match.group(1))
        
    return group_name, list(set(tags))

def parse_and_clean_metadata(content, ui_group=GROUP_DEFAULT, ui_tags=None):
    """
    본문에서 메타데이터($ , #)를 추출하고 삭제한 뒤, UI 입력값과 합쳐 최하단에 재배치합니다.
    """
    if ui_tags is None: ui_tags = []
    if not content:
        return content, ui_group, ui_tags

    # 1. 기존에 생성된 푸터 블록(수평선 + 메타데이터)을 제거
    # 파일의 가장 마지막에 위치한 수평선(---, ***, ___)과 그 뒤에 따라오는 메타데이터($ , #) 줄들만 식별하여 제거합니다.
    content = content.strip()
    # 패턴 설명: 줄바꿈 + 수평선 + 줄바꿈 + (줄 시작이 $ 또는 #이며 뒤에 공백이 없는 줄들의 반복) + 끝
    footer_regex = r'\n+[\*\-\_]{3,}\s*\n(?:^[\$\#][^\s\#].*$(?:\n|$))*$'
    content = re.sub(footer_regex, '', content, flags=re.MULTILINE).strip()

    # 2. 본문에서 기호 정보 추출
    content_group, content_tags = parse_metadata(content)
    
    # 3. 본문에서 기호 패턴 삭제
    # $그룹 삭제
    content = re.sub(r'\$\w+', '', content)
    # #태그 삭제 (헤더 및 내부 링크 제외, 태그는 # 뒤에 바로 문자가 와야 함)
    content = re.sub(r'(?<!#)(?<!\[\[)(?<!\w)#([^\s\#\d\W][^\s\#]*)', '', content)
    content = content.strip()

    # 4. 데이터 통합
    # 본문에 적힌 그룹이 있다면 UI 선택값보다 우선함
    final_group = content_group if content_group != GROUP_DEFAULT else ui_group
    # 태그는 모두 합침
    final_tags = list(set(ui_tags + content_tags))

    # 5. 푸터 재생성
    footer_parts = []
    if final_group and final_group != GROUP_DEFAULT:
        footer_parts.append(f"${final_group}")
    if final_tags:
        footer_tags = " ".join([f"#{t}" for t in sorted(final_tags)])
        footer_parts.append(footer_tags)

    final_content = content
    if footer_parts:
        final_content += "\n\n---\n" + "\n".join(footer_parts)

    return final_content, final_group, final_tags

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
