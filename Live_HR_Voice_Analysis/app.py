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
import json # For potential structured output from AI, though not strictly used for analysis here

# --- Constants ---
MODEL_NAME = "gemini-2.5-flash" # Use a powerful model for better reasoning
MAX_HISTORY_LENGTH = 12 # Store the last 6 user/AI message pairs (12 entries: 6 user, 6 AI)
MAX_RESUME_CHARS = 8000 # Limit resume text to fit within model context window
MAX_ANALYSIS_CONTEXT_CHARS = 10000 # Max characters for chat history sent for analysis

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

# New system prompt specifically for performance analysis
SYSTEM_PROMPT_ANALYSIS = """
You are 'Eva', an expert AI HR Interview Coach, now in analysis mode. Your task is to provide a comprehensive and constructive performance review of the user's mock interview based on the provided metrics and conversation history.

**Your Persona:**
- Professional, insightful, and encouraging.
- You are an experienced HR manager providing post-interview feedback.

**Core Instructions:**
1.  **Structure:** Provide your analysis in clear, well-formatted Markdown. Use headings, bullet points, and bold text for readability.
2.  **Key Areas to Cover:**
    * **Overall Performance:** A brief summary of their interview.
    * **Communication Style:** Comment on clarity, conciseness, and confidence (inferred from word counts, response times).
    * **Content & Relevance:** How well did their answers address the questions? Did they use the resume effectively (if provided)?
    * **Engagement & Flow:** Comment on their response latency (too fast/slow?), turn-taking.
    * **Strengths:** Highlight 2-3 specific positive aspects.
    * **Areas for Improvement:** Suggest 2-3 actionable areas for improvement.
    * **Next Steps:** Encourage further practice.
3.  **Use Metrics:** Refer to the provided numerical metrics (e.g., "Your average response time was X seconds," "You spoke Y words").
4.  **Reference Conversation:** Briefly refer to specific examples from the chat history if relevant to illustrate points.
5.  **Be Encouraging:** Maintain a positive and supportive tone, even when giving constructive criticism.
6.  **Conciseness:** While comprehensive, avoid overly long paragraphs. Get straight to the point.
7.  **No Interview Questions:** Do NOT ask any interview questions in this analysis. This is a review, not a continuation of the interview.
"""


# --- App & Socket.IO Configuration ---
app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*") # For production, replace "*" with specific origins
load_dotenv()

# --- Gemini API Configuration ---
model = None # Global variable to store the GenerativeModel instance for interview
analysis_model = None # Global variable for analysis model

try:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    service_account_key_path = os.path.join(script_dir, "gemini-service-account.json")

    if not os.path.exists(service_account_key_path):
        raise FileNotFoundError(f"'{service_account_key_path}' not found.")

    credentials, _ = google.auth.load_credentials_from_file(service_account_key_path)
    genai.configure(credentials=credentials)
    
    # Initialize the interview model with its system instruction
    model = genai.GenerativeModel(MODEL_NAME, system_instruction=SYSTEM_PROMPT)
    # Initialize a separate model for analysis with its specific system instruction
    analysis_model = genai.GenerativeModel(MODEL_NAME, system_instruction=SYSTEM_PROMPT_ANALYSIS)
    print("Gemini API configured successfully.")

except Exception as e:
    print(f"FATAL ERROR: Could not configure Gemini API. {e}")
    model = None
    analysis_model = None

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
    Asynchronously generates a response from the Gemini API for the interview conversation.
    This function runs in a separate thread to avoid blocking the main SocketIO thread.
    """
    session = session_data[session_id]
    session['is_processing_ai'] = True

    try:
        predefined_response = get_predefined_response(user_message.lower())
        if predefined_response:
            ai_response_text = predefined_response
        else:
            if not model: # Use the 'model' for interview
                ai_response_text = "I'm sorry, the AI model is not configured correctly on the server."
            else:
                api_history = []
                
                # --- Resume Integration into AI Context ---
                if session['resume_text']:
                    resume_prompt = f"The user has provided the following resume content. Please use this information to tailor your questions and feedback, making the interview more personalized:\n\n---\n{session['resume_text']}\n---\n"
                    api_history.append({"role": "user", "parts": [resume_prompt]})
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

# --- Performance Metrics Analysis Function ---
def analyze_conversation_metrics_async(session_id, metrics, chat_history, resume_text):
    """
    Asynchronously analyzes conversation metrics and chat history using Gemini API.
    Emits the analysis back to the client.
    """
    if not analysis_model: # Use the 'analysis_model'
        with app.app_context():
            socketio.emit('conversation_metrics_analysis', {'analysis': 'Server error: AI analysis model not configured.'}, room=session_id)
        return

    try:
        # Prepare the prompt for the analysis model
        analysis_prompt = f"""
        Please analyze the following mock interview performance metrics and conversation history.
        Provide a constructive and comprehensive review, highlighting strengths and areas for improvement.
        Format your response in Markdown, using headings, bullet points, and bold text.

        ---
        **Interview Metrics:**
        - Total Duration: {metrics.get('totalDurationMs', 0) / 1000:.2f} seconds
        - User Turns: {metrics.get('userTurns', 0)}
        - AI Turns: {metrics.get('aiTurns', 0)}
        - User Total Words: {metrics.get('userWordCount', 0)}
        - AI Total Words: {metrics.get('aiWordCount', 0)}
        - Average User Response Latency (from AI speech end to user input start): {sum(metrics.get('userResponseLatenciesMs', [])) / len(metrics.get('userResponseLatenciesMs', [])) if metrics.get('userResponseLatenciesMs') else 'N/A'} ms
        - Average AI Response Latency (from user input end to AI response start): {sum(metrics.get('aiResponseLatenciesMs', [])) / len(metrics.get('aiResponseLatenciesMs', [])) if metrics.get('aiResponseLatenciesMs') else 'N/A'} ms
        ---
        """

        if resume_text:
            analysis_prompt += f"""
        **Provided Resume Content:**
        ```
        {resume_text[:MAX_ANALYSIS_CONTEXT_CHARS]}
        {"... (truncated)" if len(resume_text) > MAX_ANALYSIS_CONTEXT_CHARS else ""}
        ```
        ---
        """

        analysis_prompt += """
        **Conversation History (User vs. AI Coach):**
        ```
        """
        # Truncate chat history if it's too long for the analysis context
        current_chat_history_str = ""
        for role, text in chat_history:
            current_chat_history_str += f"{role}: {text}\n"
        
        if len(current_chat_history_str) > MAX_ANALYSIS_CONTEXT_CHARS:
            analysis_prompt += current_chat_history_str[-MAX_ANALYSIS_CONTEXT_CHARS:] + "\n... (truncated for analysis)"
        else:
            analysis_prompt += current_chat_history_str
        
        analysis_prompt += """
        ```
        ---

        Please provide your detailed analysis below:
        """

        # Start a new chat session for analysis
        # The SYSTEM_PROMPT_ANALYSIS is already set during analysis_model initialization.
        analysis_chat_session = analysis_model.start_chat(history=[]) # Start with empty history, prompt is self-contained
        analysis_response = analysis_chat_session.send_message(analysis_prompt)
        analysis_text = analysis_response.text.strip()

        print(f"AI Analysis for session {session_id} generated.")
        with app.app_context():
            socketio.emit('conversation_metrics_analysis', {'analysis': analysis_text}, room=session_id)

    except Exception as e:
        print(f"ERROR: AI analysis failed for session {session_id}: {e}")
        with app.app_context():
            socketio.emit('conversation_metrics_analysis', {'analysis': f'Sorry, an error occurred during analysis: {e}. Please try again.'}, room=session_id)

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
        header, encoded = file_content_base64.split(',', 1)
        file_bytes = base64.b64decode(encoded)
        
        extracted_text = None
        file_stream = io.BytesIO(file_bytes)

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
            if len(extracted_text) > MAX_RESUME_CHARS:
                print(f"Resume text truncated from {len(extracted_text)} to {MAX_RESUME_CHARS} characters.")
                extracted_text = extracted_text[:MAX_RESUME_CHARS] + "..."
            session['resume_text'] = extracted_text
            print(f"Successfully extracted and stored resume text for session {session_id}.")
            emit('resume_upload_status', {'message': 'Resume uploaded and processed successfully!', 'type': 'success'}, room=session_id)
        else:
            emit('resume_upload_status', {'message': 'Could not extract text from resume. File might be empty or corrupted.', 'type': 'error'}, room=session_id)

    except Exception as e:
        print(f"Error processing resume for session {session_id}: {e}")
        emit('resume_upload_status', {'message': f'Server error processing resume: {e}', 'type': 'error'}, room=session_id)

@socketio.on('conversation_metrics')
def handle_conversation_metrics(metrics_data):
    """
    Receives conversation metrics from the client and triggers AI analysis.
    """
    session_id = request.sid
    session = session_data[session_id]
    
    print(f"Received conversation metrics for session {session_id}: {metrics_data}")

    # Pass a copy of chat history and resume text for analysis
    threading.Thread(target=analyze_conversation_metrics_async, 
                     args=(session_id, metrics_data, list(session['chat_history']), session['resume_text'])).start()


@socketio.on('disconnect')
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")
    if request.sid in session_data:
        del session_data[request.sid]

if __name__ == '__main__':
    print("Starting Flask-SocketIO server...")
    socketio.run(app, debug=True, use_reloader=True, port=5000)

