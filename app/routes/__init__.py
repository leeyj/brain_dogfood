from flask import Blueprint # type: ignore

def register_blueprints(app):
    from .main import main_bp
    from .auth import auth_bp
    from .memo import memo_bp
    from .file import file_bp
    from .ai import ai_bp
    from .settings import settings_bp
    from .stats import stats_bp # [Added]
    from .external import external_bp
    
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(memo_bp)
    app.register_blueprint(file_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(stats_bp) # [Added]
    app.register_blueprint(external_bp)
