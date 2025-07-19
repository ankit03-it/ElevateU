from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

from .user_model import User  # Import models here after db is defined
