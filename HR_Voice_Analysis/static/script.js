/**
 * @file script.js
 * @description This script provides the core client-side functionality for the AI Interview Coach web application.
 * It handles audio recording, manages UI states (loading, recording, errors), sends audio data
 * and interview questions to the Flask backend, and dynamically renders the detailed analysis
 * feedback received from the Gemini API. It also includes accessibility enhancements and
 * a "Start New Analysis" feature for improved user experience.
 */

// Ensure the DOM is fully loaded before executing the script to avoid issues with element selection.
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded: script.js is running.');

    // --- UI Element Selectors ---
    // These constants store references to key HTML elements, identified by their unique IDs.
    // This makes DOM manipulation more efficient and readable.

    const interviewQuestionSelect = document.getElementById('interviewQuestion'); // The dropdown for selecting interview questions.
    const startRecordButton = document.getElementById('startRecord');           // Button to initiate audio recording.
    const stopRecordButton = document.getElementById('stopRecord');             // Button to stop audio recording.
    const statusMessageDisplay = document.getElementById('statusMessage');       // Div for general status messages (e.g., "Recording...", "Processing...").
    const errorMessageDisplay = document.getElementById('errorMessage');         // Div for displaying prominent error messages.
    const resultsContainer = document.getElementById('resultsContainer');       // Main container that holds all analysis results, initially hidden.

    // Elements within the resultsContainer, used to display specific parts of the analysis.
    const overallScoreDisplay = document.getElementById('overallScore');         // Span to display the overall score (e.g., "8.5").
    const audioPlayback = document.getElementById('audioPlayback');             // HTML <audio> element for playing back the recorded audio.
    const displayedQuestion = document.getElementById('displayedQuestion');     // Span to show the interview question that was analyzed.
    const audioDurationDisplay = document.getElementById('audioDuration');       // Span to display the duration of the recorded audio.
    const wordsPerMinuteDisplay = document.getElementById('wordsPerMinute');     // Span to display the calculated Words Per Minute (WPM).
    const scoresListContainer = document.getElementById('scoresList');           // Div where individual performance metric scores will be listed.
    const tutoringPlanContainer = document.getElementById('tutoringPlan');       // Div where the personalized tutoring plan accordions will be rendered.
    const transcribedTextDisplay = document.getElementById('transcribedText');   // Paragraph to display the full transcribed text of the audio.
    const startNewAnalysisButton = document.getElementById('startNewAnalysis'); // Button to reset the UI and start a new analysis.

    // --- Recording Variables ---
    let mediaRecorder; // Stores the MediaRecorder instance for audio capture.
    let audioChunks = []; // An array to accumulate audio data chunks during recording.
    let audioBlob; // Stores the final audio Blob once recording is stopped.
    let currentInterviewQuestion = ''; // Stores the selected question for analysis.

    // --- Utility Functions for UI Feedback and State Management ---

    /**
     * @function showMessage
     * @description Displays a user-friendly message in the status area.
     * This function dynamically updates the `statusMessageDisplay` with text,
     * appropriate styling (color), and an icon based on the message type.
     * It also ensures error messages are handled separately.
     * @param {string} message - The text message to display.
     * @param {string} type - The type of message ('success', 'error', 'info', 'loading', 'recording').
     */
    function showMessage(message, type = 'info') {
        // Clear any previously displayed error messages.
        errorMessageDisplay.classList.add('hidden');
        errorMessageDisplay.textContent = '';

        // Reset status message display classes and content.
        statusMessageDisplay.textContent = '';
        statusMessageDisplay.className = 'mt-8 text-center text-lg font-semibold flex items-center justify-center gap-3 min-h-[40px]';

        let iconHtml = ''; // Variable to hold the Lucide icon SVG or custom loader HTML.

        // Determine styling and icon based on message type.
        switch (type) {
            case 'success':
                statusMessageDisplay.classList.add('text-green-400');
                iconHtml = '<i data-lucide="check-circle" class="w-6 h-6"></i>';
                break;
            case 'error':
                // For errors, display in the dedicated error message area and return.
                errorMessageDisplay.textContent = message;
                errorMessageDisplay.classList.remove('hidden');
                return; // Exit function as error is handled separately.
            case 'info':
                statusMessageDisplay.classList.add('text-blue-400');
                iconHtml = '<i data-lucide="info" class="w-6 h-6"></i>';
                break;
            case 'loading':
                statusMessageDisplay.classList.add('text-sky-400');
                iconHtml = '<div class="loader"></div>'; // Custom CSS spinner.
                break;
            case 'recording':
                statusMessageDisplay.classList.add('text-rose-400');
                statusMessageDisplay.classList.add('recording-active'); // Apply pulsating animation.
                iconHtml = '<i data-lucide="disc" class="w-6 h-6"></i>'; // Recording indicator icon.
                break;
            default:
                statusMessageDisplay.classList.add('text-slate-400');
                break;
        }

        // Update the status message display with icon and text.
        statusMessageDisplay.innerHTML = `${iconHtml} <span>${message}</span>`;

        // Re-create Lucide icons for any dynamically added icons (e.g., within status messages).
        if (typeof lucide !== "undefined") {
            lucide.createIcons();
        }
    }

    /**
     * @function resetMessages
     * @description Clears all messages from both status and error display areas.
     */
    function resetMessages() {
        statusMessageDisplay.textContent = '';
        statusMessageDisplay.className = 'mt-8 text-center text-lg font-semibold flex items-center justify-center gap-3 min-h-[40px]';
        errorMessageDisplay.classList.add('hidden');
        errorMessageDisplay.textContent = '';
    }

    /**
     * @function showLoadingState
     * @description Sets the UI to a loading state, disabling relevant controls and showing a loading message.
     */
    function showLoadingState() {
        startRecordButton.disabled = true;
        stopRecordButton.disabled = true;
        interviewQuestionSelect.disabled = true;
        resultsContainer.classList.add('hidden'); // Hide previous results when a new process starts.
        resetMessages(); // Clear any previous messages.
        showMessage('Processing your response...', 'loading');
    }

    /**
     * @function hideLoadingState
     * @description Resets the UI from a loading state, re-enabling controls as appropriate.
     */
    function hideLoadingState() {
        startRecordButton.disabled = false;
        stopRecordButton.disabled = true; // Still disabled until recording starts again.
        interviewQuestionSelect.disabled = false;
        resetMessages(); // Clear loading message.
    }

    /**
     * @function renderAnalysisResults
     * @description Renders the detailed analysis results received from the backend (app.py).
     * This function populates various HTML elements with data from the Gemini API response.
     * @param {object} data - The JSON data received from the /analyze endpoint.
     */
    function renderAnalysisResults(data) {
        if (!resultsContainer) {
            console.error('Analysis results container not found. Cannot render results.');
            return;
        }

        // Show the main results container.
        resultsContainer.classList.remove('hidden');

        // Populate overall score.
        overallScoreDisplay.textContent = data.overallScore ? data.overallScore.toFixed(1) : 'N/A';

        // Populate the original interview question.
        displayedQuestion.textContent = data.question || 'N/A';

        // Set audio playback source and make it visible.
        if (data.audio_url) {
            audioPlayback.src = data.audio_url;
            audioPlayback.load(); // Load the audio for playback.
            audioPlayback.classList.remove('hidden'); // Ensure the audio player is visible.
        } else {
            audioPlayback.classList.add('hidden'); // Hide if no audio URL.
        }

        // Populate audio duration and words per minute.
        audioDurationDisplay.textContent = data.audioDurationSeconds ? data.audioDurationSeconds.toFixed(2) : 'N/A';
        wordsPerMinuteDisplay.textContent = data.wordsPerMinute ? data.wordsPerMinute.toFixed(2) : 'N/A';

        // Clear any previous dynamic content in the scores and tutoring plan sections.
        scoresListContainer.innerHTML = '';
        tutoringPlanContainer.innerHTML = '';
        transcribedTextDisplay.textContent = data.transcription || 'No transcription available.';

        // Define the mapping of metric keys to user-friendly titles.
        const metrics = {
            clarityConciseness: "Clarity & Conciseness",
            contentRelevanceDepth: "Content Relevance & Depth",
            perceivedConfidence: "Perceived Confidence",
            fluency: "Fluency",
            speakingRateAppropriateness: "Speaking Rate Appropriateness"
        };

        // Loop through each metric to render its score and tutoring plan.
        for (const key in metrics) {
            const metricTitle = metrics[key];
            const scoreData = data.scores[key];
            const planData = data.tutoringPlan[key];

            // Render Performance Score for the current metric.
            if (scoreData) {
                // Determine text color based on score for visual feedback.
                const scoreColorClass = scoreData.score >= 7 ? 'text-green-400' : scoreData.score >= 5 ? 'text-yellow-400' : 'text-red-400';
                scoresListContainer.innerHTML += `
                    <div class="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-b-0">
                        <span class="text-slate-300 text-sm">${metricTitle}:</span>
                        <span class="text-lg font-bold ${scoreColorClass}">${scoreData.score ? scoreData.score.toFixed(1) : 'N/A'}/10</span>
                    </div>
                `;
            }

            // Render Tutoring Plan as an interactive accordion for the current metric.
            if (planData) {
                const accordionId = `accordion-${key}`; // Unique ID for the accordion content.
                const headerId = `${accordionId}-header`; // Unique ID for the accordion header (button).

                tutoringPlanContainer.innerHTML += `
                    <div class="bg-slate-700/30 rounded-lg overflow-hidden border border-slate-600/50">
                        <button class="w-full text-left p-4 flex justify-between items-center text-slate-200 font-semibold hover:bg-slate-700/50 transition-colors"
                                aria-expanded="false" aria-controls="${accordionId}-content" id="${headerId}">
                            <span>${metricTitle}</span>
                            <i data-lucide="chevron-down" class="lucide-icon transition-transform duration-300 w-5 h-5"></i>
                        </button>
                        <div id="${accordionId}-content" role="region" aria-labelledby="${headerId}"
                             class="accordion-content hidden p-4 border-t border-slate-600/50 text-slate-300 text-sm leading-relaxed">
                            <p class="mb-2"><strong>What you did well:</strong> <span class="text-green-300">${planData.whatYouDidWell || 'N/A'}</span></p>
                            <p class="mb-2"><strong>Areas for improvement:</strong> <span class="text-rose-300">${planData.areasForImprovement || 'N/A'}</span></p>
                            <p><strong>How to practice:</strong> <span class="text-sky-300">${planData.howToPractice || 'N/A'}</span></p>
                        </div>
                    </div>
                `;
            }
        }

        // After dynamically adding HTML, re-create Lucide icons so they render correctly.
        if (typeof lucide !== "undefined") {
            lucide.createIcons();
        }

        // Add event listeners for the newly created accordion headers to toggle content visibility.
        document.querySelectorAll('.accordion-content').forEach(content => {
            const header = document.getElementById(content.getAttribute('aria-labelledby'));
            const icon = header.querySelector('.lucide-icon'); // Get the chevron icon within the header.

            header.addEventListener('click', () => {
                const isExpanded = header.getAttribute('aria-expanded') === 'true';
                header.setAttribute('aria-expanded', !isExpanded); // Toggle ARIA expanded state.
                content.classList.toggle('hidden'); // Toggle visibility of the content.
                icon.classList.toggle('rotate-180', !isExpanded); // Rotate the icon for visual feedback.
            });
        });
    }

    // --- Event Listeners ---

    /**
     * Event listener for the "Start Recording" button.
     * Initiates microphone access and starts the MediaRecorder.
     */
    if (startRecordButton) {
        startRecordButton.addEventListener('click', async () => {
            currentInterviewQuestion = interviewQuestionSelect.value.trim(); // Get the selected question.

            // Client-side validation: Ensure a question is selected.
            if (!currentInterviewQuestion) {
                showMessage('Please select an interview question first.', 'error');
                return;
            }

            try {
                // Request access to the user's microphone.
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                // Create a new MediaRecorder instance with the audio stream.
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = []; // Reset audio chunks for a new recording.

                // Event handler for when audio data is available.
                mediaRecorder.ondataavailable = (event) => {
                    audioChunks.push(event.data); // Add the audio chunk to the array.
                };

                // Event handler for when recording stops.
                mediaRecorder.onstop = async () => {
                    // Combine all audio chunks into a single Blob.
                    audioBlob = new Blob(audioChunks, { type: 'audio/webm' }); // Using 'audio/webm' for broad browser compatibility.
                    // Stop all tracks in the media stream to release microphone access.
                    stream.getTracks().forEach(track => track.stop());

                    // Proceed to upload the recorded audio for analysis.
                    await uploadAudioForAnalysis(audioBlob, currentInterviewQuestion);
                };

                // Start the recording.
                mediaRecorder.start();
                // Update button states and display a recording message.
                startRecordButton.disabled = true;
                stopRecordButton.disabled = false;
                interviewQuestionSelect.disabled = true;
                showMessage('Recording started... Speak clearly!', 'recording');
            } catch (error) {
                // Handle errors if microphone access is denied or fails.
                console.error('Error accessing microphone:', error);
                showMessage('Could not access microphone. Please ensure it is connected and permissions are granted.', 'error');
            }
        });
    }

    /**
     * Event listener for the "Stop Recording" button.
     * Stops the MediaRecorder, triggering the `onstop` event.
     */
    if (stopRecordButton) {
        stopRecordButton.addEventListener('click', () => {
            // Check if MediaRecorder exists and is currently recording.
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop(); // Stop the recording.
                // Update button states and display a message indicating analysis is starting.
                startRecordButton.disabled = true; // Keep disabled until analysis is done.
                stopRecordButton.disabled = true;
                showMessage('Recording stopped. Analyzing your response...', 'loading');
            }
        });
    }

    /**
     * Event listener for the "Start New Analysis" button.
     * Resets the UI to its initial state, allowing the user to start a new process.
     */
    if (startNewAnalysisButton) {
        startNewAnalysisButton.addEventListener('click', () => {
            // Hide the results container.
            resultsContainer.classList.add('hidden');
            // Reset the selected interview question.
            interviewQuestionSelect.value = '';
            // Reset all messages.
            resetMessages();
            // Reset button states.
            hideLoadingState(); // This function already sets buttons to appropriate initial states.
            // Clear previous audio playback source.
            audioPlayback.src = '';
            audioPlayback.classList.add('hidden'); // Hide audio player.
            // Clear dynamic content areas.
            scoresListContainer.innerHTML = '';
            tutoringPlanContainer.innerHTML = '';
            transcribedTextDisplay.textContent = '';
            overallScoreDisplay.textContent = '0.0';
            displayedQuestion.textContent = '';
            audioDurationDisplay.textContent = '';
            wordsPerMinuteDisplay.textContent = '';
            console.log('UI reset for new analysis.');
        });
    }

    /**
     * @function uploadAudioForAnalysis
     * @description Sends the recorded audio Blob and interview question to the Flask backend's /analyze endpoint.
     * Uses XMLHttpRequest to allow for upload progress tracking.
     * @param {Blob} audioBlob - The recorded audio data as a Blob.
     * @param {string} interviewQuestion - The selected interview question.
     */
    async function uploadAudioForAnalysis(audioBlob, interviewQuestion) {
        showLoadingState(); // Show global loading state and disable controls.

        const formData = new FormData();
        // Append the audio Blob. It's important to give it a filename for Flask's request.files.
        formData.append('audioFile', audioBlob, `recorded_audio_${Date.now()}.webm`);
        // Append the interview question.
        formData.append('interviewQuestion', interviewQuestion);

        try {
            // Create a new XMLHttpRequest instance.
            const xhr = new XMLHttpRequest();
            // Configure the request: POST method to /analyze endpoint, asynchronous.
            xhr.open('POST', '/analyze', true);

            // Add an event listener for upload progress.
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percent = (e.loaded / e.total) * 100;
                    // Update the status message with upload percentage.
                    showMessage(`Uploading: ${Math.round(percent)}%`, 'loading');
                }
            });

            // Event handler for when the request completes (successfully or with error).
            xhr.onload = () => {
                hideLoadingState(); // Hide loading state regardless of outcome.
                if (xhr.status >= 200 && xhr.status < 300) {
                    // Request was successful.
                    try {
                        const result = JSON.parse(xhr.responseText); // Parse the JSON response from Flask.
                        showMessage('Analysis complete!', 'success');
                        renderAnalysisResults(result); // Render the analysis results on the page.
                    } catch (parseError) {
                        // Handle JSON parsing errors.
                        console.error('Error parsing JSON response from server:', parseError);
                        showMessage('Received invalid response from server. Please try again.', 'error');
                    }
                } else {
                    // Request failed (e.g., 400, 500 status codes).
                    try {
                        const errorData = JSON.parse(xhr.responseText); // Try to parse error details from response.
                        showMessage(`Analysis failed: ${errorData.error || xhr.statusText}`, 'error');
                    } catch (parseError) {
                        // Fallback error message if error response is not valid JSON.
                        console.error('Error parsing error JSON response:', parseError);
                        showMessage(`Analysis failed: Server responded with status ${xhr.status}.`, 'error');
                    }
                }
            };

            // Event handler for network errors (e.g., no internet connection).
            xhr.onerror = () => {
                hideLoadingState();
                console.error('Network error during upload/analysis.');
                showMessage('Network error. Please check your connection and try again.', 'error');
            };

            // Send the FormData object with the audio and question.
            xhr.send(formData);

        } catch (error) {
            // Catch any unexpected errors during the setup of the XMLHttpRequest.
            console.error('Unexpected error during audio upload process:', error);
            showMessage('An unexpected error occurred during upload. Please try again.', 'error');
            hideLoadingState();
        }
    }

    // --- Initial UI Setup ---
    // This block runs once when the page loads to set the initial state of the UI elements.
    hideLoadingState(); // Set initial button states (Start enabled, Stop disabled).
    resultsContainer.classList.add('hidden'); // Ensure analysis results are hidden on page load.
    resetMessages(); // Clear any default messages.
    audioPlayback.classList.add('hidden'); // Ensure audio player is hidden initially.

    // Initialize Lucide icons on page load.
    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    } else {
        console.error("Lucide icons library is not loaded properly. Ensure the CDN link is correct and accessible.");
    }
});
