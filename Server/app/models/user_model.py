# app/models/user_model.py
from app.extensions import db

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    
    # Add this line: a relationship to the PracticeSession table
    practice_sessions = db.relationship('PracticeSession', backref='user', lazy=True)

    def __repr__(self):
        return f'<User {self.username}>'
