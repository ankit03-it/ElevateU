from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from ..models.user_model import User
from ..models import db
from werkzeug.exceptions import BadRequest


auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    if not username or not email or not password:
        return jsonify({"error": "All fields are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already exists"}), 409

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists"}), 409

    hashed_password = generate_password_hash(password)
    new_user = User(username=username, email=email, password_hash=hashed_password)


    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User registered successfully!"}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        if data is None:
            raise BadRequest("Invalid or missing JSON payload.")
    except BadRequest as e:
        return jsonify({"error": str(e)}), 400

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Both email and password are required."}), 400

    user = User.query.filter_by(email=email).first()

    if user is None:
        return jsonify({"error": "No account found with this email."}), 404

    if not user.check_password(password):
        return jsonify({"error": "Incorrect password."}), 401

    # Optional: Return a token later
    # token = generate_token(user.id)  
    # return jsonify({"message": f"Welcome back, {user.username}!", "token": token}), 200

    return jsonify({"message": f"Welcome back, {user.username}!"}), 200

