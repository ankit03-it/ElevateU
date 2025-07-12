from flask import Blueprint, request, jsonify

auth_bp = Blueprint('auth_bp', __name__, url_prefix='/api')

@auth_bp.route('/hello', methods=['GET'])
def hello():
    return jsonify({"message": "Hello from Flask!"})
