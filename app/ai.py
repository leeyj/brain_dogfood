import os
import json
import logging
from google import genai
from .utils.i18n import _t

# 로거 설정
logger = logging.getLogger('ai')

def analyze_memo(title, content, lang='en'):
    """
    최신 google-genai SDK를 사용하여 메모 본문을 요약하고 태그를 추출합니다.
    """
    api_key = os.getenv('GEMINI_API_KEY')
    primary_model = os.getenv('GEMINI_MODEL', 'gemini-2.0-flash')
    
    # 예비용 모델 리스트
    fallbacks = [primary_model, 'gemini-1.5-flash-latest', 'gemini-1.5-flash']
    models_to_try = list(dict.fromkeys(fallbacks))

    if not api_key:
        error_msg = "Gemini API key is required." if lang == 'en' else "AI 분석을 위해 Gemini API 키가 필요합니다."
        return error_msg, []
    
    client = genai.Client(api_key=api_key)
    
    if lang == 'ko':
        prompt = f"""
        당신은 메모 분석 전문가입니다. 아래 메모의 제목과 내용을 읽고 다음 작업을 수행하세요:
        1. 내용을 1~2문장으로 아주 간결하게 요약할 것.
        2. 내용과 관련된 핵심 키워드를 태그 형태로 3~5개 추출할 것.
        
        [제목] {title}
        [내용] {content}
        
        출력 형식(JSON):
        {{
            "summary": "요약 내용",
            "tags": ["태그1", "태그2", "태그3"]
        }}
        """
    else:
        prompt = f"""
        You are a memo analysis expert. Read the title and content below and perform the following:
        1. Summarize the content very concisely in 1-2 sentences.
        2. Extract 3-5 key keywords as tags.
        
        [Title] {title}
        [Content] {content}
        
        Output Format (JSON):
        {{
            "summary": "Summary text",
            "tags": ["Tag1", "Tag2", "Tag3"]
        }}
        """

    last_error = None
    for model_name in models_to_try:
        try:
            logger.info(f"[AI] Attempting analysis with model: {model_name} (lang={lang})")
            response = client.models.generate_content(
                model=model_name,
                contents=prompt
            )
            
            res_text = response.text.strip()
            if '```json' in res_text:
                res_text = res_text.split('```json')[1].split('```')[0].strip()
            elif '```' in res_text:
                res_text = res_text.split('```')[1].strip()
                
            data = json.loads(res_text)
            logger.info(f"[AI] Analysis successful using {model_name}")
            return data.get('summary', ''), data.get('tags', [])
            
        except Exception as e:
            last_error = e
            logger.warning(f"[AI] Model {model_name} failed: {str(e)}")
            if "404" in str(e):
                continue
            else:
                break
                
    # 모든 시도가 실패한 경우
    error_header = "AI Analysis Error: " if lang == 'en' else "AI 분석 중 오류 발생: "
    error_msg = f"{error_header}{str(last_error)}"
    
    if "404" in str(last_error):
        if lang == 'en':
            error_msg += "\n(Note: The selected model might be expired. Check GEMINI_MODEL in .env)"
        else:
            error_msg += "\n(알림: 선택한 AI 모델이 만료되었을 수 있습니다. .env의 GEMINI_MODEL 설정을 확인해주세요.)"
        
    return error_msg, []
