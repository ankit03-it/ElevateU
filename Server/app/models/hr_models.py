# app/models/hr_models.py
from app.extensions import db
from datetime import datetime

class PracticeSession(db.Model):
    """
    Model to store a user's single practice session.
    """
    __tablename__ = 'practice_sessions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    question = db.Column(db.Text, nullable=False)
    transcription = db.Column(db.Text)
    audio_url = db.Column(db.String(512))
    overall_score = db.Column(db.Float)
    scores_json = db.Column(db.JSON)
    tutoring_plan_json = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<PracticeSession {self.id}>'

class QuestionBank(db.Model):
    """
    Model to store a library of HR questions and expert answers.
    """
    __tablename__ = 'question_bank'

    id = db.Column(db.Integer, primary_key=True)
    question_text = db.Column(db.String(255), unique=True, nullable=False)
    model_answer = db.Column(db.Text, nullable=False)

    def __repr__(self):
        return f'<QuestionBank {self.question_text}>'
