import json
import os
from flask import current_app # type: ignore

class I18n:
    _locales = {}
    _default_lang = 'en'

    @classmethod
    def load_locales(cls):
        locales_dir = os.path.join(current_app.static_folder, 'locales')
        for filename in os.listdir(locales_dir):
            if filename.endswith('.json'):
                lang = filename.split('.')[0]
                with open(os.path.join(locales_dir, filename), 'r', encoding='utf-8') as f:
                    cls._locales[lang] = json.load(f)

    @classmethod
    def t(cls, key, lang=None):
        if not lang:
            # 기본적으로 config에서 언어를 가져오거나 'en' 사용
            lang = current_app.config.get('lang', cls._default_lang)
        
        if not cls._locales:
            cls.load_locales()
            
        data = cls._locales.get(lang, cls._locales.get(cls._default_lang, {}))
        
        # 중첩 키 지원 (예: "groups.done")
        parts = key.split('.')
        for p in parts:
            if isinstance(data, dict):
                data = data.get(p)
            else:
                return key
        
        return data or key

# 숏컷 함수
def _t(key, lang=None):
    return I18n.t(key, lang)
