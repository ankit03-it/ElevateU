from flask import Flask
from .config import Config
from .models import db
from .routes import register_routes
from app.models.user_model import User
from flask_cors import CORS  # ADD THIS at the top

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    app.debug = True

    db.init_app(app)
    CORS(app)
    register_routes(app)

    with app.app_context():
        db.create_all() 

    return app

