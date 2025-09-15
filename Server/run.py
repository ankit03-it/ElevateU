# run.py
from app import create_app, socketio

# Create the Flask application
app = create_app()

if __name__ == '__main__':
    # Run the app using socketio.run() to properly handle WebSocket connections
    # The second app.run() call has been removed to prevent conflicts.
    socketio.run(app, debug=True, port=5000, allow_unsafe_werkzeug=True)
