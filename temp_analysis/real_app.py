# app.py
import os
import random
import google.generativeai as genai
from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
from dotenv import load_dotenv
import google.auth
import collections
import re
import threading
import base64
import io
import docx # For .docx files
from pdfminer.high_level import extract_text as extract_pdf_text # For .pdf files

# --- Constants ---
MODEL_NAME = "gemini-2.5-flash" # Use a powerful model for better reasoning
MAX_HISTORY_LENGTH = 12 # Store the last 6 user/AI message pairs (12 entries: 6 user, 6 AI)
MAX_RESUME_CHARS = 8000 # Limit resume text to fit within model context window

# A detailed system prompt to define the AI's persona, goals, and response structure.
SYSTEM_PROMPT = """
You are 'Eva', an expert AI HR Interview Coach. Your primary goal is to conduct a realistic, challenging, yet encouraging mock interview to help the user practice and improve.

**Your Persona:**
- Professional, insightful, and encouraging.
- You are an experienced HR manager.
- You keep the conversation flowing naturally.

**Core Instructions:**
1.  **Two-Part Response Structure:** For EVERY user answer, you MUST follow this structure:
    - **Part 1: Feedback (1-2 sentences):** Provide concise, constructive feedback on their previous answer. Start by mentioning one positive aspect, then suggest one specific area for improvement.
    - **Part 2: Next Question (1 sentence):** Seamlessly ask the next logical interview question.
2.  **Maintain the Flow:** Ask a variety of common questions (behavioral, situational, etc.). Do not ask for code.
3.  **Stay in Character:** NEVER break character. DO NOT mention you are an AI, a language model, or a bot.
4.  **Be Concise:** Keep your feedback and questions brief and to the point. Avoid long paragraphs.
"""

# --- App & Socket.IO Configuration ---
app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*") # For production, replace "*" with specific origins
load_dotenv()

# --- Gemini API Configuration ---
model = None # Global variable to store the GenerativeModel instance

try:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    service_account_key_path = os.path.join(script_dir, "gemini-service-account.json")

    if not os.path.exists(service_account_key_path):
        raise FileNotFoundError(f"'{service_account_key_path}' not found.")

    credentials, _ = google.auth.load_credentials_from_file(service_account_key_path)
    genai.configure(credentials=credentials)
    
    # Initialize the model ONCE with the system instruction
    model = genai.GenerativeModel(MODEL_NAME, system_instruction=SYSTEM_PROMPT)
    print("Gemini API configured successfully.")

except Exception as e:
    print(f"FATAL ERROR: Could not configure Gemini API. {e}")
    model = None

# --- Session & Predefined Logic ---
# Stores chat history and resume text for each connected client (session ID)
session_data = collections.defaultdict(lambda: {
    'chat_history': collections.deque(maxlen=MAX_HISTORY_LENGTH),
    'is_processing_ai': False, # Flag to prevent multiple concurrent AI calls
    'resume_text': None # Stores extracted resume text for this session
})

def get_predefined_response(user_message_lower):
    """Filters common, non-interview inputs to provide canned responses without using the API."""
    user_message_lower = user_message_lower.strip()
    meta_phrases = ["who are you", "what are you", "are you an ai", "are you a bot"]
    for phrase in meta_phrases:
        if phrase in user_message_lower:
            return "My role is to act as your interview coach to help you practice. Let's focus on that! Tell me, what's your greatest strength?"

    if len(user_message_lower) < 15 and "thank" in user_message_lower:
        return "You're welcome! Let's move on to the next question."
        
    if len(user_message_lower) < 10 and user_message_lower in ["okay", "ok", "yes", "got it", "right"]:
        return "Great. Let's proceed. Can you describe a time you had to handle a difficult colleague?"

    return None

def generate_gemini_response_async(session_id, user_message, current_chat_history):
    """
    Asynchronously generates a response from the Gemini API and emits it back to the client.
    This function runs in a separate thread to avoid blocking the main SocketIO thread.
    """
    session = session_data[session_id]
    session['is_processing_ai'] = True

    try:
        predefined_response = get_predefined_response(user_message.lower())
        if predefined_response:
            ai_response_text = predefined_response
        else:
            if not model:
                ai_response_text = "I'm sorry, the AI model is not configured correctly on the server."
            else:
                api_history = []
                
                # --- Resume Integration into AI Context ---
                # If resume text exists for this session, prepend it to the history
                # This makes the AI aware of the resume without it being a "chat turn"
                if session['resume_text']:
                    resume_prompt = f"The user has provided the following resume content. Please use this information to tailor your questions and feedback, making the interview more personalized:\n\n---\n{session['resume_text']}\n---\n"
                    # Add as a 'user' message with a special instruction for the model
                    api_history.append({"role": "user", "parts": [resume_prompt]})
                    # Add a model response to balance the turn if needed, or let the model infer
                    # For a system_instruction model, this might not be strictly necessary as it's already primed.
                    # However, explicitly adding it here ensures the model 'sees' it in the conversation flow.
                    api_history.append({"role": "model", "parts": ["Understood. I will integrate the provided resume content into the interview questions and feedback."]})


                # Append actual conversation turns
                for role, text in current_chat_history:
                    api_history.append({"role": "user" if role == "User" else "model", "parts": [text]})
                
                chat_session = model.start_chat(history=api_history)
                response = chat_session.send_message(user_message)
                ai_response_text = response.text.strip()
    except Exception as e:
        print(f"ERROR: Gemini API call failed for session {session_id}: {e}")
        ai_response_text = "I seem to be having a technical issue. Could you please repeat your last answer?"
    finally:
        session['is_processing_ai'] = False 

    with app.app_context():
        socketio.emit('ai_response', {'text': ai_response_text}, room=session_id)
        session['chat_history'].append(('AI', ai_response_text))
    print(f"AI ({session_id}): {ai_response_text}")

# --- Resume Processing Functions ---

def extract_text_from_pdf(file_stream):
    """Extracts text from a PDF file stream."""
    try:
        text = extract_pdf_text(file_stream)
        return text
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return None

def extract_text_from_docx(file_stream):
    """Extracts text from a DOCX file stream."""
    try:
        document = docx.Document(file_stream)
        text = "\n".join([paragraph.text for paragraph in document.paragraphs])
        return text
    except Exception as e:
        print(f"Error extracting text from DOCX: {e}")
        return None

# --- Socket.IO Event Handlers ---
@app.route('/')
def index():
    """Serves the main HTML page."""
    return render_template('index.html')

@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")
    session_data[request.sid]['chat_history'].clear()
    session_data[request.sid]['is_processing_ai'] = False
    session_data[request.sid]['resume_text'] = None # Clear resume text on new connection

@socketio.on('start_conversation')
def handle_start_conversation():
    """Handles the start of a new interview session."""
    session_id = request.sid
    print(f"Starting conversation for client: {session_id}")
    
    session = session_data[session_id]
    session['chat_history'].clear()
    session['is_processing_ai'] = False

    opening_questions = [
        "To start us off, could you please tell me a little bit about yourself?",
        "Thank you for joining me. Why don't we begin with you walking me through your resume?",
        "Let's get started. What interests you about this field and the type of role you're seeking?",
        "To begin, can you tell me what you know about our company and what prompted you to apply?"
    ]
    first_question = random.choice(opening_questions)
    
    session['chat_history'].append(('AI', first_question))
    emit('ai_response', {'text': first_question})

@socketio.on('user_text_input')
def handle_user_text_input(data):
    """
    Handles user text input, triggers AI response generation in a separate thread.
    Emits 'ai_thinking' to the client while processing.
    """
    session_id = request.sid
    session = session_data[session_id]
    user_message = data.get('text', '').strip()

    if not user_message:
        return

    if session['is_processing_ai']:
        print(f"AI already processing for session {session_id}. Ignoring new input.")
        return

    print(f"User ({session_id}): {user_message}")
    session['chat_history'].append(('User', user_message))
    
    emit('ai_thinking', room=session_id)

    threading.Thread(target=generate_gemini_response_async, 
                     args=(session_id, user_message, list(session['chat_history']))).start()

@socketio.on('upload_resume')
def handle_upload_resume(data):
    """Handles resume upload, extracts text, and stores it in session data."""
    session_id = request.sid
    session = session_data[session_id]
    
    file_name = data.get('fileName')
    file_type = data.get('fileType')
    file_content_base64 = data.get('fileContent')

    print(f"Received resume upload for session {session_id}: {file_name} ({file_type})")

    if not file_content_base64:
        emit('resume_upload_status', {'message': 'No file content received.', 'type': 'error'}, room=session_id)
        return

    try:
        # Decode the Base64 string. It comes with a prefix like "data:application/pdf;base64,"
        # We need to remove that prefix.
        header, encoded = file_content_base64.split(',', 1)
        file_bytes = base64.b64decode(encoded)
        
        extracted_text = None
        file_stream = io.BytesIO(file_bytes) # Create a file-like object from bytes

        if file_type == 'application/pdf':
            emit('resume_upload_status', {'message': 'Processing PDF...', 'type': 'loading'}, room=session_id)
            extracted_text = extract_text_from_pdf(file_stream)
        elif file_type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': # .docx
            emit('resume_upload_status', {'message': 'Processing DOCX...', 'type': 'loading'}, room=session_id)
            extracted_text = extract_text_from_docx(file_stream)
        elif file_type == 'application/msword': # .doc - Note: More complex to parse in Python
            emit('resume_upload_status', {'message': 'DOC files are not directly supported for text extraction. Please upload PDF or DOCX.', 'type': 'error'}, room=session_id)
            return
        else:
            emit('resume_upload_status', {'message': f'Unsupported file type: {file_type}. Please upload PDF or DOCX.', 'type': 'error'}, room=session_id)
            return

        if extracted_text:
            # Truncate resume text if it's too long for the model's context window
            if len(extracted_text) > MAX_RESUME_CHARS:
                print(f"Resume text truncated from {len(extracted_text)} to {MAX_RESUME_CHARS} characters.")
                extracted_text = extracted_text[:MAX_RESUME_CHARS] + "..." # Add ellipsis to indicate truncation

            session['resume_text'] = extracted_text
            print(f"Successfully extracted and stored resume text for session {session_id}.")
            emit('resume_upload_status', {'message': 'Resume uploaded and processed successfully!', 'type': 'success'}, room=session_id)
        else:
            emit('resume_upload_status', {'message': 'Could not extract text from resume. File might be empty or corrupted.', 'type': 'error'}, room=session_id)

    except Exception as e:
        print(f"Error processing resume for session {session_id}: {e}")
        emit('resume_upload_status', {'message': f'Server error processing resume: {e}', 'type': 'error'}, room=session_id)

@socketio.on('disconnect')
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")
    if request.sid in session_data:
        del session_data[request.sid]

if __name__ == '__main__':
    print("Starting Flask-SocketIO server...")
    socketio.run(app, debug=True, use_reloader=True, port=5000)


