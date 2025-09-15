from flask import Flask
from .config import Config
from .extensions import db, migrate, socketio
from .routes.auth_routes import auth_bp
from .routes.hr_routes import hr_bp
from .routes.live_hr_routes import live_hr_bp, init_live_hr
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize CORS with the app
    CORS(app)

    # Initialize SocketIO with the app
    socketio.init_app(app, cors_allowed_origins="*")

    db.init_app(app)
    migrate.init_app(app, db)
    
    # Initialize Live HR module
    init_live_hr(app)
    
    # Register blueprints with the application instance
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(hr_bp, url_prefix='/api/hr')
    app.register_blueprint(live_hr_bp, url_prefix='/live_hr_voice_analysis')

    return app