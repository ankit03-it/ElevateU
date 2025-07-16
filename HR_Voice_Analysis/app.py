import os
import whisper
from flask import Flask, request, render_template, jsonify, send_from_directory
from werkzeug.utils import secure_filename
import google.generativeai as genai
import time
import ffmpeg
from dotenv import load_dotenv
import google.auth
import google.auth.transport.requests
import tempfile
import json
import re

app = Flask(__name__)

UPLOAD_DIR = os.path.join(tempfile.gettempdir(), 'hr_voice_analyzer_uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_DIR
app.config['MAX_CONTENT_LENGTH'] = 25 * 1024 * 1024

if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

load_dotenv()

try:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    service_account_key_path = os.path.join(script_dir, "gemini-service-account.json")

    if not os.path.exists(service_account_key_path):
        raise FileNotFoundError(f"Service account key file not found at: {service_account_key_path}")

    credentials, project_id = google.auth.load_credentials_from_file(service_account_key_path)
    genai.configure(credentials=credentials)
    print("Gemini API configured successfully using service account key.")
except FileNotFoundError as e:
    print(f"Error: {e}")
    print("Please ensure 'gemini-service-account.json' is in the same directory as 'app.py'.")
    exit()
except Exception as e:
    print(f"Error configuring Gemini API with service account: {e}")
    print("Please ensure your 'gemini-service-account.json' is valid and has the necessary permissions.")
    exit()

def transcribe_audio_file(audio_path, model_name="base"):
    if not os.path.exists(audio_path):
        print(f"Error: Audio file not found at {audio_path}")
        return None

    print(f"Loading Whisper model '{model_name}'...")
    try:
        model = whisper.load_model(model_name)
        print("Model loaded successfully.")
    except Exception as e:
        print(f"Error loading Whisper model: {e}")
        return None

    print(f"Transcribing audio from: {audio_path}")
    transcription = None
    
    try:
        result = model.transcribe(audio_path)
        transcription = result["text"]
        print("Transcription complete.")
        return transcription
    except Exception as e:
        print(f"Error during transcription: {e}")
        return None

def get_audio_duration(file_path):
    duration = 0.0
    try:
        probe = ffmpeg.probe(file_path)
        
        if 'format' in probe and 'duration' in probe['format']:
            duration = float(probe['format']['duration'])
        
        if duration == 0.0 and 'streams' in probe:
            for stream in probe['streams']:
                if 'codec_type' in stream and stream['codec_type'] == 'audio':
                    if 'duration' in stream:
                        duration = float(stream['duration'])
                        break
                    elif 'start_time' in stream and 'end_time' in stream:
                        calculated_duration = float(stream['end_time']) - float(stream['start_time'])
                        if calculated_duration > 0:
                            duration = calculated_duration
                            break
        
        if duration > 0:
            print(f"Audio duration detected for {file_path}: {duration:.2f} seconds.")
        else:
            print(f"Warning: FFmpeg probe returned zero or no duration for {file_path} after all attempts. Probe output: {json.dumps(probe, indent=2)}")

    except ffmpeg.Error as e:
        print(f"Error probing duration for {file_path} with ffmpeg: {e.stderr.decode().strip()}")
        duration = 0.0
    except Exception as e:
        print(f"An unexpected error occurred while probing duration for {file_path}: {e}")
        duration = 0.0
    
    return duration


def analyze_text_with_gemini(text, interview_question, audio_duration=None):
    print("\n--- Sending text to Gemini for detailed analysis and tutoring ---")
    model = genai.GenerativeModel('gemini-2.5-flash')

    wpm_info = ""
    num_words = len(text.split())
    words_per_minute = 0

    if audio_duration is not None and audio_duration > 0:
        minutes = audio_duration / 60
        if minutes > 0:
            words_per_minute = num_words / minutes
            wpm_info = f"\n\n- The audio duration was {audio_duration:.2f} seconds ({minutes:.2f} minutes), and the text contains {num_words} words, resulting in a speaking rate of {words_per_minute:.2f} Words Per Minute (WPM)."
    else:
        wpm_info = ""
        words_per_minute = 0


    prompt = f"""
    You are an expert AI HR Interview Coach and Tutor. Your goal is to provide comprehensive, actionable feedback for a candidate's interview response.

    Analyze the following transcribed response in the context of the **given interview question**.
    Evaluate the response based on clarity, relevance, confidence, fluency, and speaking rate.
    Provide a detailed tutoring plan with what the candidate did well, areas for improvement, and how to practice for each metric.

    ---
    **Candidate Response Analysis**

    **Interview Question:**
    "{interview_question}"

    **Candidate's Transcribed Response:**
    "{text}"
    {wpm_info}
    ---

    Your response must be a JSON object that strictly adheres to the provided schema.
    Calculate an overall score out of 10 based on all metrics.
    If WPM information is not available (i.e., audio duration is 0 or not provided), set the `speakingRateAppropriateness` score to 0 and its explanations to "N/A".
    """

    response_schema = {
        "type": "OBJECT",
        "properties": {
            "overallScore": {"type": "NUMBER"},
            "scores": {
                "type": "OBJECT",
                "properties": {
                    "clarityConciseness": {
                        "type": "OBJECT",
                        "properties": {
                            "score": {"type": "NUMBER"},
                            "explanation": {"type": "STRING"}
                        }
                    },
                    "contentRelevanceDepth": {
                        "type": "OBJECT",
                        "properties": {
                            "score": {"type": "NUMBER"},
                            "explanation": {"type": "STRING"}
                        }
                    },
                    "perceivedConfidence": {
                        "type": "OBJECT",
                        "properties": {
                            "score": {"type": "NUMBER"},
                            "explanation": {"type": "STRING"}
                        }
                    },
                    "fluency": {
                        "type": "OBJECT",
                        "properties": {
                            "score": {"type": "NUMBER"},
                            "explanation": {"type": "STRING"}
                        }
                    },
                    "speakingRateAppropriateness": {
                        "type": "OBJECT",
                        "properties": {
                            "score": {"type": "NUMBER"},
                            "explanation": {"type": "STRING"}
                        }
                    }
                }
            },
            "tutoringPlan": {
                "type": "OBJECT",
                "properties": {
                    "clarityConciseness": {
                        "type": "OBJECT",
                        "properties": {
                            "whatYouDidWell": {"type": "STRING"},
                            "areasForImprovement": {"type": "STRING"},
                            "howToPractice": {"type": "STRING"}
                        }
                    },
                    "contentRelevanceDepth": {
                        "type": "OBJECT",
                        "properties": {
                            "whatYouDidWell": {"type": "STRING"},
                            "areasForImprovement": {"type": "STRING"},
                            "howToPractice": {"type": "STRING"}
                        }
                    },
                    "perceivedConfidence": {
                        "type": "OBJECT",
                        "properties": {
                            "whatYouDidWell": {"type": "STRING"},
                            "areasForImprovement": {"type": "STRING"},
                            "howToPractice": {"type": "STRING"}
                        }
                    },
                    "fluency": {
                        "type": "OBJECT",
                        "properties": {
                            "whatYouDidWell": {"type": "STRING"},
                            "areasForImprovement": {"type": "STRING"},
                            "howToPractice": {"type": "STRING"}
                        }
                    },
                    "speakingRateAppropriateness": {
                        "type": "OBJECT",
                        "properties": {
                            "whatYouDidWell": {"type": "STRING"},
                            "areasForImprovement": {"type": "STRING"},
                            "howToPractice": {"type": "STRING"}
                        }
                    }
                }
            },
            "transcription": {"type": "STRING"},
            "audioDurationSeconds": {"type": "NUMBER"},
            "wordsPerMinute": {"type": "NUMBER"}
        },
        "required": [
            "overallScore", "scores", "tutoringPlan", "transcription",
            "audioDurationSeconds", "wordsPerMinute"
        ]
    }

    generation_config = {
        "response_mime_type": "application/json",
        "response_schema": response_schema,
        "temperature": 0.3
    }

    try:
        response = model.generate_content(prompt, generation_config=generation_config)
        feedback_json = json.loads(response.text)
        print("Gemini analysis complete and JSON parsed successfully.")
        return feedback_json
    except json.JSONDecodeError as e:
        print(f"FATAL: JSON parsing error from Gemini response even with schema enforcement: {e}")
        print(f"Raw Gemini response text that failed to parse: {response.text}")
        return None
    except Exception as e:
        print(f"Error generating content from Gemini: {e}")
        print("Possible reasons: API key issues, rate limits, or network problems. Check the prompt and schema.")
        return None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    if 'audioFile' not in request.files:
        return jsonify({'error': 'No audio file part in the request'}), 400

    audio_file = request.files['audioFile']
    interview_question = request.form.get('interviewQuestion', '')

    if audio_file.filename == '':
        return jsonify({'error': 'No selected audio file'}), 400

    if not interview_question:
        return jsonify({'error': 'No interview question provided.'}), 400

    webm_path = None
    mp3_path = None
    mp3_audio_url = None
    audio_duration = 0.0

    try:
        webm_filename = secure_filename(f"{int(time.time())}_{audio_file.filename}")
        webm_path = os.path.join(app.config['UPLOAD_FOLDER'], webm_filename)
        audio_file.save(webm_path)
        print(f"WebM audio file saved to: {webm_path}")

        mp3_filename = webm_filename.replace('.webm', '.mp3')
        mp3_path = os.path.join(app.config['UPLOAD_FOLDER'], mp3_filename)

        try:
            print(f"Converting {webm_path} to {mp3_path}...")
            ffmpeg.input(webm_path).output(mp3_path, acodec='libmp3lame', audio_bitrate='128k').run(overwrite_output=True, quiet=True)
            print("Conversion to MP3 complete.")
            mp3_audio_url = f'/uploads/{mp3_filename}'
            
            # Get duration from the newly created MP3 file, which should have reliable metadata
            audio_duration = get_audio_duration(mp3_path)

        except ffmpeg.Error as e:
            print(f"Error converting WebM to MP3: {e.stderr.decode().strip()}")
            mp3_audio_url = f'/uploads/{webm_filename}'
            print("Falling back to WebM audio URL due to MP3 conversion failure.")
            # If MP3 conversion failed, try to get duration from original WebM as a last resort
            audio_duration = get_audio_duration(webm_path)
        except Exception as e:
            print(f"An unexpected error occurred during MP3 conversion: {e}")
            mp3_audio_url = f'/uploads/{webm_filename}'
            print("Falling back to WebM audio URL due to unexpected MP3 conversion error.")
            audio_duration = get_audio_duration(webm_path)


        # Transcribe the original WebM audio file (Whisper might prefer WebM or original quality)
        transcribed_text = transcribe_audio_file(webm_path, model_name="base")

        if transcribed_text is not None:
            if len(transcribed_text.strip()) < 3:
                return jsonify({'error': 'Transcription is too short to analyze. Please provide a more detailed response.'}), 400

            gemini_feedback = analyze_text_with_gemini(transcribed_text, interview_question, audio_duration)
            if gemini_feedback:
                gemini_feedback['audio_url'] = mp3_audio_url
                gemini_feedback['question'] = interview_question
                gemini_feedback['audioDurationSeconds'] = audio_duration
                gemini_feedback['wordsPerMinute'] = gemini_feedback.get('wordsPerMinute', 0)

                return jsonify(gemini_feedback)
            else:
                return jsonify({'error': 'Failed to get structured feedback from Gemini. The model returned an invalid response that could not be parsed.'}), 500
        else:
            return jsonify({'error': 'Transcription failed. The audio might be silent or in an unsupported format.'}), 500
    except Exception as e:
        print(f"An unexpected error occurred during analysis: {e}")
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500
    finally:
        # ONLY delete the original WebM file.
        # The MP3 file needs to remain in the UPLOAD_FOLDER for playback by the frontend.
        if 'webm_path' in locals() and os.path.exists(webm_path):
            try:
                os.remove(webm_path)
                print(f"Cleaned up original WebM file: {webm_path}")
            except Exception as e:
                print(f"Error cleaning up WebM file {webm_path}: {e}")
        
        # Removed the os.remove(mp3_path) call from here.
        
        print("Analysis complete. Audio file is available for playback.")

if __name__ == '__main__':
    app.run(debug=True)

