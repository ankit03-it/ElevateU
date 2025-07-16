import whisper
import os
import google.generativeai as genai
import time
import ffmpeg
from dotenv import load_dotenv
import google.auth
import google.auth.transport.requests

# Load environment variables (still good practice)
load_dotenv()

# --- Configure Google Gemini API using Service Account Key ---
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
    print("Please ensure 'gemini-service-account.json' is in the same directory as 'analyze_interview.py'.")
    exit()
except Exception as e:
    print(f"Error configuring Gemini API with service account: {e}")
    print("Please ensure your 'gemini-service-account.json' is valid and has the necessary permissions.")
    exit()
# --- End of Gemini API Configuration ---


def transcribe_audio_file(audio_path, model_name="base"):
    """
    Transcribes an audio file using OpenAI Whisper and gets its duration.
    """
    if not os.path.exists(audio_path):
        print(f"Error: Audio file not found at {audio_path}")
        return None, None

    print(f"Loading Whisper model '{model_name}'...")
    try:
        model = whisper.load_model(model_name)
        print("Model loaded successfully.")
    except Exception as e:
        print(f"Error loading Whisper model: {e}")
        print("Ensure you have a good internet connection for the first-time model download.")
        print("You might need to try a smaller model like 'tiny' if you have limited resources.")
        return None, None

    print(f"Transcribing audio from: {audio_path}")
    try:
        audio_duration = None
        try:
            probe = ffmpeg.probe(audio_path)
            audio_duration = float(probe['format']['duration'])
            print(f"Audio duration detected: {audio_duration:.2f} seconds.")
        except ffmpeg.Error as e:
            print(f"Warning: Could not probe audio duration with ffmpeg. Ensure ffmpeg is correctly installed and in PATH. Error: {e.stderr.decode().strip()}")
            print("Speaking rate analysis will be skipped.")
        except Exception as e:
            print(f"Warning: An unexpected error occurred while probing audio duration: {e}")
            print("Speaking rate analysis will be skipped.")

        result = model.transcribe(audio_path)
        transcription = result["text"]
        print("Transcription complete.")
        return transcription, audio_duration
    except Exception as e:
        print(f"Error during transcription: {e}")
        return None, None

def analyze_text_with_gemini(text, interview_question, audio_duration=None):
    """
    Sends the transcribed text and the interview question to Google Gemini for detailed HR interview communication analysis,
    including scores and personalized improvement guidance.
    """
    print("\n--- Sending text to Gemini for detailed analysis and tutoring ---")
    model = genai.GenerativeModel('gemini-2.5-flash') # Using gemini-2.5-flash as requested

    # Calculate WPM here to include it directly in the prompt for Gemini's analysis
    wpm_info = ""
    if audio_duration is not None and audio_duration > 0:
        words = text.split()
        num_words = len(words)
        minutes = audio_duration / 60
        if minutes > 0:
            wpm = num_words / minutes
            wpm_info = f"\n\n- The audio duration was {audio_duration:.2f} seconds ({minutes:.2f} minutes), and the text contains {num_words} words, resulting in a speaking rate of {wpm:.2f} Words Per Minute (WPM)."
        else:
            wpm_info = "\n\n- Could not calculate WPM as audio duration was too short or zero."

    prompt = f"""
    You are an AI HR Interview Coach and Tutor. Your goal is to provide comprehensive, actionable feedback and a scoring system for a candidate's interview response based on the provided transcription.

    Analyze the following transcribed response in the context of the **given interview question**. Provide feedback in the exact structured format below.
    Provide scores out of 10 for each metric.

    ---
    **Candidate Response Analysis**

    **Interview Question:**
    "{interview_question}"

    **Candidate's Transcribed Response:**
    "{text}"
    {wpm_info}

    ---

    **Performance Scores (Out of 10):**

    * **Clarity & Conciseness:** [Score]/10
        * *Explanation:* [Brief explanation of why this score was given, e.g., "The answer was very clear and direct, avoiding unnecessary jargon."]
    * **Content Relevance & Depth:** [Score]/10
        * *Explanation:* [Brief explanation, specifically evaluating how well the response answered the *Interview Question* and the depth of information provided.]
    * **Perceived Confidence (from Text):** [Score]/10
        * *Explanation:* [Brief explanation, e.g., "The language used was assertive and structured, conveying strong confidence."]
    * **Fluency (Absence of Filler Words):** [Score]/10
        * *Explanation:* [Brief explanation, e.g., "Minimal to no filler words were detected, contributing to a very smooth delivery."]
    * **Speaking Rate Appropriateness:** [Score]/10 (Only if WPM information is available)
        * *Explanation:* [Brief explanation, e.g., "The speaking rate of X WPM was within the ideal range, allowing for clear comprehension."]

    ---

    **Detailed Tutoring & Improvement Plan:**

    Based on your performance, here's a personalized plan to help you excel in future interviews:

    **1. Clarity & Conciseness:**
    * **What you did well:** [Specific positive observations]
    * **Areas for improvement:** [Specific suggestions, e.g., "Practice summarizing your points into a single, impactful sentence."]
    * **How to practice:** [Actionable steps, e.g., "Record yourself answering common interview questions, then try to cut 20% of the words without losing meaning."]

    **2. Content Relevance & Depth:**
    * **What you did well:** [Specific positive observations regarding how well the question was answered.]
    * **Areas for improvement:** [Specific suggestions, e.g., "Ensure every part of your answer directly addresses the prompt. If asked about a challenge, clearly state the challenge, your action, and the result (STAR method)."]
    * **How to practice:** [Actionable steps, e.g., "For each mock question, outline 3 main points you want to cover before speaking."]

    **3. Perceived Confidence (from Text):**
    * **What you did well:** [Specific positive observations]
    * **Areas for improvement:** [Specific suggestions, e.g., "Use strong, active verbs. Avoid hedging language like 'I think,' 'maybe,' 'just.'"]
    * **How to practice:** [Actionable steps, e.g., "Rephrase sentences to eliminate weak phrases. Practice power posing before interviews to feel more confident."]

    **4. Fluency (Absence of Filler Words):**
    * **What you did well:** [Specific positive observations, or "You did well in minimizing filler words."]
    * **Areas for improvement:** [Specific suggestions, e.g., "Be mindful of 'um,' 'uh,' 'like,' and 'you know.' These can detract from your professionalism."]
    * **How to practice:** [Actionable steps, e.g., "When you feel a filler word coming, pause instead. Practice speaking slowly and deliberately."]

    **5. Speaking Rate Appropriateness:** (Only if WPM information was provided)
    * **What you did well:** [Specific positive observations, e.g., "Your pace was generally easy to follow."]
    * **Areas for improvement:** [Specific suggestions, e.g., "Consider slightly increasing/decreasing your pace to match the ideal range for clarity and engagement."]
    * **How to practice:** [Actionable steps, e.g., "Use a timer when practicing. Aim for X words in Y seconds. Read aloud to develop a natural rhythm."]

    ---
    """

    try:
        response = model.generate_content(prompt)
        feedback = response.text
        print("Gemini analysis complete.")
        return feedback
    except Exception as e:
        print(f"Error generating content from Gemini: {e}")
        print("Possible reasons: API key issues, rate limits, or network problems.")
        return None

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    sample_audio_filename = "sample_interview2.mp3" # Ensure this file exists in your folder
    audio_file_path = os.path.join(script_dir, sample_audio_filename)

    # --- Define the interview question ---
    # IMPORTANT: Change this question to match the content of your sample_interview1.mp3!
    interview_question = "How did you handle disagreements with your manager?"

    # --- PART 1: Transcription ---
    transcribed_text, audio_duration = transcribe_audio_file(audio_file_path, model_name="base")

    if transcribed_text:
        print("\n--- Transcribed Text ---")
        print(transcribed_text)

        # --- PART 2: Gemini Analysis ---
        # Pass the interview_question to the analysis function
        gemini_feedback = analyze_text_with_gemini(transcribed_text, interview_question, audio_duration)

        if gemini_feedback:
            print("\n--- HR Assistant's Communication Feedback (Powered by Gemini) ---")
            print(gemini_feedback)
        else:
            print("\nFailed to get feedback from Gemini.")
    else:
        print("\nTranscription failed or no text returned, skipping Gemini analysis.")
