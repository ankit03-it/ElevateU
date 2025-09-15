document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded: script.js is running.');

    // --- UI Element Selectors ---
    const startConversationButton = document.getElementById('start-conversation');
    const endConversationButton = document.getElementById('end-conversation');
    const chatMessagesContainer = document.getElementById('chat-messages');
    const statusIndicator = document.getElementById('status-indicator');
    const statusTextSpan = document.getElementById('status-text'); // Specific span for text content
    const errorMessageDisplay = document.getElementById('error-message');
    const textInputArea = document.getElementById('text-input-area');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');

    // Resume Upload Elements
    const resumeUploadInput = document.getElementById('resume-upload');
    const resumeUploadLabel = document.getElementById('resume-upload-label');
    const fileNameDisplay = document.getElementById('file-name-display');
    const uploadResumeButton = document.getElementById('upload-resume-button');
    const uploadStatusDiv = document.getElementById('upload-status');

    // Performance Metrics Display Elements
    const performanceMetricsModal = document.getElementById('performance-metrics-modal');
    const performanceMetricsContent = document.getElementById('performance-metrics-content');
    const closeMetricsModalButton = document.getElementById('close-metrics-modal');


    // --- Socket.IO Connection ---
    // Connects to the Flask-SocketIO server. By default, it connects to the host that served the page.
    const socket = io();

    // --- Web Speech API Variables ---
    // Get browser's SpeechRecognition API, cross-browser compatible
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null; // Holds the SpeechRecognition object instance
    let isRecognizing = false; // Flag: true if SpeechRecognition is actively listening
    let isConversationActive = false; // Flag: true if an interview conversation is ongoing
    let restartRecognitionTimeout = null; // Stores a timeout ID for delayed recognition restarts

    // --- Speech Synthesis (Text-to-Speech) Variables ---
    const synth = window.speechSynthesis; // Browser's SpeechSynthesis API
    let aiSpeaking = false; // Flag: true if the AI is currently speaking
    let availableVoices = []; // Stores available voices for TTS

    // Event listener for when TTS voices are loaded by the browser
    synth.onvoiceschanged = () => {
        availableVoices = synth.getVoices();
        console.log('SpeechSynthesis voices loaded:', availableVoices.map(v => v.name));
    };

    // --- Performance Metrics Object ---
    // Stores data collected during the interview for post-conversation analysis
    let conversationMetrics = {
        startTime: null, // Timestamp when conversation starts
        endTime: null,   // Timestamp when conversation ends
        totalDurationMs: 0, // Total duration of the interview
        userTurns: 0,    // Number of times the user spoke/typed
        aiTurns: 0,      // Number of times the AI spoke
        userWordCount: 0, // Total words spoken/typed by user
        aiWordCount: 0,   // Total words spoken by AI
        userResponseLatenciesMs: [], // Array of latencies: AI speech end -> user input start
        aiResponseLatenciesMs: [],   // Array of latencies: user input end -> AI response start
        lastAiSpeechEndTime: null,   // Timestamp of the last AI speech end
        lastUserInputTime: null,     // Timestamp of the last user input (speech or text)
    };

    // --- Utility Functions for UI Feedback ---

    /**
     * Updates the main status indicator at the bottom of the chat.
     * @param {string} message - The text message to display.
     * @param {'info'|'listening'|'speaking'|'thinking'|'error'} type - The type of status, affects icon and color.
     */
    function showStatus(message, type = 'info') {
        // Hide any previous error messages
        errorMessageDisplay.classList.add('hidden');
        errorMessageDisplay.textContent = '';

        // Reset status indicator classes and text
        statusIndicator.className = 'flex-grow text-center text-lg font-semibold flex items-center justify-center gap-3 min-h-[40px]';
        statusIndicator.classList.remove('recording-active'); // Remove pulsing animation
        statusTextSpan.textContent = message; // Update only the text span

        let iconHtml = '';
        switch (type) {
            case 'info':
                statusIndicator.classList.add('text-sky-400');
                iconHtml = '<i data-lucide="info" class="w-6 h-6"></i>';
                break;
            case 'listening':
                statusIndicator.classList.add('text-green-400', 'recording-active'); // Add pulsing animation
                iconHtml = '<i data-lucide="mic" class="w-6 h-6"></i>';
                break;
            case 'speaking': // AI is speaking
                statusIndicator.classList.add('text-purple-400');
                iconHtml = '<i data-lucide="volume-2" class="w-6 h-6"></i>';
                break;
            case 'thinking': // AI is processing
                statusIndicator.classList.add('text-yellow-400');
                iconHtml = '<div class="loader"></div>'; // Custom loader animation
                break;
            case 'error': // Display error in a dedicated error message area
                errorMessageDisplay.textContent = message;
                errorMessageDisplay.classList.remove('hidden');
                statusTextSpan.textContent = ''; // Clear main status text if error is shown
                return; // Do not update statusIndicator.innerHTML if it's an error, as error-message takes precedence
            default:
                statusIndicator.classList.add('text-slate-400');
                break;
        }
        // Update the icon and text span within the status indicator
        statusIndicator.innerHTML = `${iconHtml} <span id="status-text">${message}</span>`;
        // Re-create Lucide icons if new HTML (like the loader div) is injected
        if (typeof lucide !== "undefined") {
            lucide.createIcons();
        }
    }

    /**
     * Resets the main status indicator to its default state.
     */
    function resetStatus() {
        statusTextSpan.textContent = 'Ready to start...';
        statusIndicator.className = 'flex-grow text-center text-lg font-semibold flex items-center justify-center gap-3 min-h-[40px] text-slate-400';
        statusIndicator.innerHTML = '<i data-lucide="info" class="w-6 h-6"></i> <span id="status-text">Ready to start...</span>';
        errorMessageDisplay.classList.add('hidden');
        errorMessageDisplay.textContent = '';
        if (typeof lucide !== "undefined") {
            lucide.createIcons();
        }
    }

    /**
     * Updates the status for the resume upload section.
     * @param {string} message - The message to display.
     * @param {'info'|'success'|'error'|'loading'} type - Type of message, affects color.
     */
    function showUploadStatus(message, type = 'info') {
        uploadStatusDiv.textContent = message;
        uploadStatusDiv.className = 'text-sm mt-2 sm:mt-0 sm:ml-4'; // Reset classes

        switch (type) {
            case 'info':
                uploadStatusDiv.classList.add('text-slate-400');
                break;
            case 'loading':
                uploadStatusDiv.classList.add('text-yellow-400');
                break;
            case 'success':
                uploadStatusDiv.classList.add('text-green-400');
                break;
            case 'error':
                uploadStatusDiv.classList.add('text-rose-400');
                break;
        }
    }

    /**
     * Adds a new message bubble to the chat container with a subtle animation.
     * @param {string} text - The message content.
     * @param {'user'|'ai'} sender - The sender of the message ('user' or 'ai').
     */
    function addMessageToChat(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chat-message', sender);
        // Align messages using Tailwind classes (flexbox parent in index.html)
        messageDiv.classList.add(sender === 'user' ? 'self-end' : 'self-start');

        const senderLabel = document.createElement('span');
        senderLabel.classList.add('font-semibold', 'text-sm', 'block', 'mb-1');
        senderLabel.textContent = sender === 'user' ? 'You:' : 'AI Coach:';
        
        const messageText = document.createElement('p');
        messageText.textContent = text;

        messageDiv.appendChild(senderLabel);
        messageDiv.appendChild(messageText);

        // Apply initial styles for fade-in animation
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateY(10px)';
        chatMessagesContainer.appendChild(messageDiv);
        
        // Trigger reflow and then apply final styles for animation
        setTimeout(() => {
            messageDiv.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
            messageDiv.style.opacity = '1';
            messageDiv.style.transform = 'translateY(0)';
            // Scroll to the bottom after adding and animating the message
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        }, 50); // Small delay for animation to be visible
    }

    /**
     * Attempts to start SpeechRecognition, handling restarts and re-initialization.
     * This function is crucial for continuous listening.
     */
    function tryStartRecognition() {
        // Only attempt to start if the conversation is active and AI is not speaking
        if (!isConversationActive || aiSpeaking) {
            console.log(`Skipping tryStartRecognition: isConversationActive=${isConversationActive}, aiSpeaking=${aiSpeaking}`);
            return;
        }

        // Clear any pending restart timeouts to avoid multiple recognition instances
        if (restartRecognitionTimeout) {
            clearTimeout(restartRecognitionTimeout);
            restartRecognitionTimeout = null;
        }

        // Abort any existing recognition before creating a new one for a clean state
        // This handles cases where recognition might be stuck in 'starting' or 'listening'
        if (recognition && (recognition.readyState === 'starting' || recognition.readyState === 'listening')) {
            try {
                recognition.abort(); 
                console.log('Aborted existing recognition before re-initialization.');
            } catch (e) {
                console.warn('Could not abort existing recognition:', e);
            }
        }
        recognition = null; // Ensure a fresh object is created

        recognition = initRecognition(); // Create a brand new SpeechRecognition object
        if (!recognition) {
            showStatus("Failed to initialize Speech Recognition. Please ensure your browser supports it.", 'error');
            return;
        }
        
        // Attempt to start the new recognition object
        try {
            recognition.start();
            console.log('SpeechRecognition start called via tryStartRecognition (re-init).');
        } catch (e) {
            console.error('Error starting recognition via tryStartRecognition (re-init):', e);
            showStatus(`Error resuming listening: ${e.message}. Please click 'Start Conversation' again.`, 'error');
        }
    }

    /**
     * Speaks the given text using SpeechSynthesis.
     * @param {string} text - The text to speak.
     */
    function speakText(text) {
        if (!text) return;

        // Cancel any ongoing speech before starting new one to prevent overlap
        if (synth.speaking) {
            synth.cancel();
        }
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.pitch = 1;
        utterance.rate = 1;

        // Try to find a preferred English voice (Google US, or default US)
        const preferredVoice = availableVoices.find(voice => 
            (voice.lang === 'en-US' && voice.name.includes('Google')) || 
            (voice.lang === 'en-US' && voice.default)
        );
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        } else {
            console.warn('Preferred English voice not found or voices not yet loaded, using default browser voice.');
        }

        // Event handler for when AI speech starts
        utterance.onstart = () => {
            aiSpeaking = true;
            console.log('AI speaking started.');
            // Record AI speech start time for latency calculation
            const aiSpeechStartTime = performance.now();
            if (conversationMetrics.lastUserInputTime !== null) {
                const latency = aiSpeechStartTime - conversationMetrics.lastUserInputTime;
                conversationMetrics.aiResponseLatenciesMs.push(latency);
                console.log(`AI Response Latency: ${latency.toFixed(2)}ms`);
            }

            // Abort SpeechRecognition immediately to prevent self-transcription
            if (isRecognizing && recognition) {
                recognition.abort(); 
                isRecognizing = false; // Manually update flag as onend/onerror won't fire for abort
            }
            showStatus('AI is speaking...', 'speaking');
        };

        // Event handler for when AI speech ends
        utterance.onend = () => {
            aiSpeaking = false;
            console.log('AI speaking ended.');
            // Record AI speech end time for next user response latency calculation
            conversationMetrics.lastAiSpeechEndTime = performance.now();
            // Count words spoken by AI
            conversationMetrics.aiWordCount += text.split(/\s+/).filter(word => word.length > 0).length;

            // Only attempt to restart recognition if the overall conversation is still active
            if (isConversationActive) {
                console.log('Attempting to restart SpeechRecognition after AI speech...');
                // A small delay is often necessary for the browser's ASR engine to be ready again
                restartRecognitionTimeout = setTimeout(tryStartRecognition, 200); 
            } else { 
                // If conversation was ended by user during AI speech, update status
                showStatus("Conversation ended.", 'info');
            }
        };

        // Event handler for errors during AI speech
        utterance.onerror = (event) => {
            console.error('SpeechSynthesisUtterance error:', event.error);
            aiSpeaking = false;
            showStatus(`Speech error: ${event.error.message || 'Could not speak.'} Please check browser settings or try another browser.`, 'error');
            // Attempt to restart recognition even on error if conversation is active
            if (isConversationActive) {
                console.log('Attempting to restart SpeechRecognition after TTS error...');
                restartRecognitionTimeout = setTimeout(tryStartRecognition, 200);
            }
        };

        try {
            synth.speak(utterance);
        } catch (error) {
            console.error('Error calling synth.speak():', error);
            showStatus('Text-to-Speech failed. Ensure your browser supports it and sound is enabled.', 'error');
            aiSpeaking = false;
            if (isConversationActive) {
                console.log('Attempting to restart SpeechRecognition after synth.speak() error...');
                restartRecognitionTimeout = setTimeout(tryStartRecognition, 200);
            }
        }
    }

    // --- Socket.IO Event Handlers ---

    // Event fired when connected to the Socket.IO server
    socket.on('connect', () => {
        console.log('Connected to Socket.IO server.');
        startConversationButton.disabled = false; // Enable start button
        endConversationButton.disabled = true; // Disable end button
        textInputArea.style.display = 'none'; // Hide text input initially
        resetStatus(); // Reset main status indicator
        showUploadStatus('No file selected.', 'info'); // Initial upload status
    });

    // Event fired when disconnected from the Socket.IO server
    socket.on('disconnect', () => {
        console.log('Disconnected from Socket.IO server.');
        stopConversation(); // Stop all processes and reset UI
        showStatus("Disconnected. Please refresh to reconnect.", 'error');
    });

    // Event fired when AI sends a response (feedback + next question)
    socket.on('ai_response', (data) => {
        console.log('AI response received:', data.text);
        conversationMetrics.aiTurns++; // Increment AI turn count
        addMessageToChat(data.text, 'ai'); // Add AI message to chat display
        speakText(data.text); // Speak the AI's response
    });

    // Event fired when AI starts thinking (server-side processing)
    socket.on('ai_thinking', () => {
        console.log('AI thinking...');
        showStatus('AI is thinking...', 'thinking'); // Show thinking status
        // Stop recognition while AI is thinking to prevent self-transcription/unnecessary processing
        if (isRecognizing && recognition) {
            recognition.abort(); // Use abort to stop quickly without final result
            isRecognizing = false; // Manually update flag
        }
    });

    // Event fired to update resume upload status from server
    socket.on('resume_upload_status', (data) => {
        console.log('Resume upload status:', data.message);
        showUploadStatus(data.message, data.type);
        if (data.type === 'success') {
            // On successful upload, disable upload elements to prevent re-uploading
            uploadResumeButton.disabled = true;
            resumeUploadInput.disabled = true;
            resumeUploadLabel.classList.add('opacity-50', 'cursor-not-allowed');
        } else if (data.type === 'error') {
            // Re-enable upload button on error to allow retry
            uploadResumeButton.disabled = false;
        }
    });

    // Event fired when AI analysis of conversation metrics is received
    socket.on('conversation_metrics_analysis', (data) => {
        console.log('Received AI analysis of conversation metrics:', data.analysis);
        // Display the analysis in the modal
        if (performanceMetricsContent) {
            // Set innerHTML directly as the analysis is expected to be Markdown formatted
            performanceMetricsContent.innerHTML = `
                <h2 class="text-3xl font-bold text-sky-400 mb-4">Interview Performance Analysis</h2>
                <p class="text-slate-400 mb-6">Here's a detailed review of your mock interview performance:</p>
                ${data.analysis}
            `;
            // Re-create Lucide icons within the modal content if any are used in the analysis
            if (typeof lucide !== "undefined") {
                lucide.createIcons();
            }
        }
        // Show the modal
        if (performanceMetricsModal) {
            performanceMetricsModal.classList.remove('hidden');
        }
        resetStatus(); // Reset main status after analysis is displayed
    });

    // Generic Socket.IO error handler
    socket.on('error', (data) => {
        console.error('Socket.IO Error:', data.message);
        showStatus(`Server Error: ${data.message}`, 'error');
        stopConversation(); // Stop all processes on critical server error
    });

    // --- Web Speech API (SpeechRecognition) Logic ---

    /**
     * Initializes a new SpeechRecognition object with all necessary event handlers.
     * @returns {SpeechRecognition|null} The new recognition object or null if not supported.
     */
    function initRecognition() {
        if (!SpeechRecognition) {
            showStatus("Speech Recognition not supported in this browser. Please use Chrome or Edge.", 'error');
            return null;
        }
        
        const newRecognition = new SpeechRecognition();
        newRecognition.continuous = true; // Keep listening after a pause
        newRecognition.interimResults = false; // Set to false for production to avoid sending partial results
        newRecognition.lang = 'en-US'; // Set language
        newRecognition.maxAlternatives = 1; // Only need the top alternative

        // Event fired when recognition starts
        newRecognition.onstart = () => {
            isRecognizing = true; 
            console.log('SpeechRecognition started. (onstart event)');
            showStatus('Listening...', 'listening');
        };

        // Event fired when a speech result is available
        newRecognition.onresult = (event) => {
            console.log('SpeechRecognition onresult event:', event);
            let finalTranscript = '';
            // Iterate through results to get the final transcript
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            
            // Process only non-empty final transcripts
            if (finalTranscript.trim().length > 0) {
                console.log('Final Transcription:', finalTranscript.trim());
                // Record user input time for latency calculation
                const userInputTime = performance.now();
                if (conversationMetrics.lastAiSpeechEndTime !== null) {
                    const latency = userInputTime - conversationMetrics.lastAiSpeechEndTime;
                    conversationMetrics.userResponseLatenciesMs.push(latency);
                    console.log(`User Response Latency: ${latency.toFixed(2)}ms`);
                }
                conversationMetrics.lastUserInputTime = userInputTime; // Update last user input time
                
                socket.emit('user_text_input', { text: finalTranscript.trim() }); // Send transcribed text to server
                addMessageToChat(finalTranscript.trim(), 'user'); // Display user message
                conversationMetrics.userTurns++; // Increment user turn count
                conversationMetrics.userWordCount += finalTranscript.trim().split(/\s+/).filter(word => word.length > 0).length; // Count user words
                showStatus('AI is thinking...', 'thinking'); // Show thinking status
            } else {
                console.log('Empty or unrecognized final transcription result.');
            }
        };

        // Event fired when recognition ends (e.g., due to silence, or explicit stop/abort)
        newRecognition.onend = () => {
            isRecognizing = false;
            console.log('SpeechRecognition ended. (onend event)');
            // Attempt to restart recognition if conversation is active and AI is not speaking
            if (isConversationActive && !aiSpeaking) {
                console.log('Attempting to restart SpeechRecognition from onend...');
                restartRecognitionTimeout = setTimeout(tryStartRecognition, 200); 
            } else if (!aiSpeaking) { // If conversation was ended by user and AI is not speaking
                showStatus("Conversation ended.", 'info');
            }
        };

        // Event fired on recognition errors
        newRecognition.onerror = (event) => {
            isRecognizing = false;
            // Handle 'aborted' error specifically, as it's often intentional
            if (event.error === 'aborted') {
                console.log('SpeechRecognition error: aborted. Message:', event.message || 'Recognition aborted intentionally.');
                // Still attempt to restart if conversation is active and AI is not speaking
                if (isConversationActive && !aiSpeaking) {
                    console.log('Attempting to restart SpeechRecognition after aborted event...');
                    restartRecognitionTimeout = setTimeout(tryStartRecognition, 500); // Slightly longer delay for errors
                }
                return; // Exit for aborted errors, as they are not critical
            }

            // For all other errors, log as an error and show user-friendly message
            console.error('SpeechRecognition error:', event.error, 'Message:', event.message);
            
            let errorMessage = `Microphone error: ${event.error}. Please check microphone access and try again.`;
            if (event.error === 'network') {
                errorMessage = "Network error: Could not connect to speech recognition service. Please check your internet connection, firewall, or VPN.";
            } else if (event.error === 'not-allowed') {
                errorMessage = "Microphone access denied. Please allow microphone access in your browser settings.";
            }

            showStatus(errorMessage, 'error');

            // Attempt to restart recognition on other errors if conversation is still active and AI is not speaking
            if (isConversationActive && !aiSpeaking) {
                console.log('Attempting to restart SpeechRecognition on general error...');
                restartRecognitionTimeout = setTimeout(tryStartRecognition, 500); 
            } else {
                // If conversation is not active or AI is speaking, just update button states
                startConversationButton.disabled = false;
                endConversationButton.disabled = true;
                textInputArea.style.display = 'none';
            }
        };
        return newRecognition;
    }

    /**
     * Initiates a new interview conversation.
     * Requests microphone access, resets metrics, and starts SpeechRecognition.
     */
    function startConversation() {
        console.log('startConversation() called.');
        if (isConversationActive) {
            console.log('Conversation already active, returning.');
            return;
        }

        // Reset all conversation metrics for a fresh start
        conversationMetrics = {
            startTime: performance.now(), // Record start time
            endTime: null,
            totalDurationMs: 0,
            userTurns: 0,
            aiTurns: 0,
            userWordCount: 0,
            aiWordCount: 0,
            userResponseLatenciesMs: [],
            aiResponseLatenciesMs: [],
            lastAiSpeechEndTime: null,
            lastUserInputTime: null,
        };
        console.log('Conversation metrics reset:', conversationMetrics);


        // Request microphone access
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(() => {
                console.log('Microphone access granted.');
                isConversationActive = true;
                chatMessagesContainer.innerHTML = ''; // Clear chat history on new conversation
                textInputArea.style.display = 'flex'; // Show text input area

                // Initialize recognition object if it's null (first start or after full stop)
                if (!recognition) {
                    console.log("Recognition object is null on startConversation. Initializing.");
                    recognition = initRecognition();
                    if (!recognition) { // If init failed, stop the process
                        console.log("Recognition initialization failed.");
                        isConversationActive = false;
                        startConversationButton.disabled = false;
                        endConversationButton.disabled = true;
                        textInputArea.style.display = 'none';
                        return;
                    }
                }
                
                // Start recognition if not already started
                if (!isRecognizing) { 
                    try {
                        console.log('Attempting recognition.start().');
                        recognition.start();
                        console.log('Initial SpeechRecognition start called.');
                    } catch (e) {
                        console.error('Error during initial SpeechRecognition start:', e);
                        showStatus(`Error starting listening: ${e.message}. Please click 'Start Conversation' again.`, 'error');
                        isConversationActive = false;
                        startConversationButton.disabled = false;
                        endConversationButton.disabled = true;
                        textInputArea.style.display = 'none';
                        return;
                    }
                }

                // Update UI button states
                startConversationButton.disabled = true;
                endConversationButton.disabled = false;
                
                console.log('Emitting start_conversation to server.');
                socket.emit('start_conversation'); // Inform server to start conversation and get first question
                showStatus('Waiting for AI to start...', 'thinking'); // Show thinking state until AI responds
            })
            .catch(error => {
                // Handle microphone access denial or unavailability
                console.error('Microphone access denied or not available (getUserMedia catch):', error);
                showStatus('Microphone access denied or not available. Please allow microphone access in your browser settings.', 'error');
                startConversationButton.disabled = false;
                endConversationButton.disabled = true;
                textInputArea.style.display = 'none';
            });
    }

    /**
     * Stops the current interview conversation.
     * Stops STT/TTS, collects final metrics, and sends them for analysis.
     */
    function stopConversation() {
        console.log('stopConversation() called.');
        if (!isConversationActive) {
            console.log('Conversation not active, returning.');
            return;
        }

        // Record end time and calculate total duration
        conversationMetrics.endTime = performance.now();
        conversationMetrics.totalDurationMs = conversationMetrics.endTime - conversationMetrics.startTime;
        console.log('Conversation metrics collected:', conversationMetrics);

        // Stop SpeechRecognition
        if (recognition) {
            console.log('Stopping recognition.');
            // Use stop() for explicit user-initiated stop to get any final results
            if (isRecognizing || recognition.readyState === 'starting' || recognition.readyState === 'listening') {
                 recognition.stop(); 
            }
            recognition = null; // Nullify to ensure fresh start next time
        }
        isRecognizing = false;

        // Stop SpeechSynthesis
        if (synth.speaking) {
            console.log('Cancelling speech synthesis.');
            synth.cancel();
        }
        aiSpeaking = false;

        // Clear any pending recognition restart timeouts
        if (restartRecognitionTimeout) {
            clearTimeout(restartRecognitionTimeout);
            restartRecognitionTimeout = null;
        }

        // Update UI states
        isConversationActive = false;
        startConversationButton.disabled = false;
        endConversationButton.disabled = true;
        textInputArea.style.display = 'none'; // Hide text input on end
        resetStatus(); // Reset main status indicator
        addMessageToChat("Conversation ended. Thank you for practicing!", 'ai'); // Add a final message to chat
        
        console.log('Emitting end_conversation to server.');
        socket.emit('end_conversation'); // Inform server conversation has ended

        // Emit conversation metrics to the server for analysis
        socket.emit('conversation_metrics', conversationMetrics);
        showStatus('Analyzing performance...', 'thinking'); // Show thinking state while AI analyzes
    }

    /**
     * Sends the text from the input field to the server.
     */
    function sendTextInput() {
        const text = userInput.value.trim();
        if (text.length > 0) {
            // Record user input time for latency calculation (for text input)
            const userInputTime = performance.now();
            if (conversationMetrics.lastAiSpeechEndTime !== null) {
                const latency = userInputTime - conversationMetrics.lastAiSpeechEndTime;
                conversationMetrics.userResponseLatenciesMs.push(latency);
                console.log(`User Response Latency (text): ${latency.toFixed(2)}ms`);
            }
            conversationMetrics.lastUserInputTime = userInputTime; // Update last user input time

            addMessageToChat(text, 'user'); // Display user message
            socket.emit('user_text_input', { text: text }); // Send text to server
            userInput.value = ''; // Clear input field
            conversationMetrics.userTurns++; // Increment user turn count
            conversationMetrics.userWordCount += text.split(/\s+/).filter(word => word.length > 0).length; // Count user words
            showStatus('AI is thinking...', 'thinking'); // Show thinking status
        }
    }

    // --- Resume Upload Logic ---
    const MAX_FILE_SIZE_MB = 2; // Maximum file size for resume upload in MB

    // Event listener for when a file is selected in the resume input
    resumeUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            fileNameDisplay.textContent = file.name; // Display selected file name
            uploadResumeButton.disabled = false; // Enable upload button
            showUploadStatus(`File selected: ${file.name}`, 'info');

            // Basic client-side file size validation
            if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                showUploadStatus(`File size exceeds ${MAX_FILE_SIZE_MB}MB. Please choose a smaller file.`, 'error');
                uploadResumeButton.disabled = true; // Disable if too large
                return;
            }

            // Basic client-side file type validation
            const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(file.type)) {
                showUploadStatus('Invalid file type. Please upload a PDF, DOC, or DOCX file.', 'error');
                uploadResumeButton.disabled = true; // Disable if wrong type
                return;
            }
        } else {
            // If no file is selected
            fileNameDisplay.textContent = 'Choose File (PDF, DOCX)';
            uploadResumeButton.disabled = true;
            showUploadStatus('No file selected.', 'info');
        }
    });

    // Event listener for the "Upload" resume button click
    uploadResumeButton.addEventListener('click', () => {
        const file = resumeUploadInput.files[0];
        if (!file) {
            showUploadStatus('No file to upload.', 'error');
            return;
        }

        showUploadStatus('Uploading...', 'loading'); // Show loading status
        uploadResumeButton.disabled = true; // Disable during upload to prevent multiple submissions

        const reader = new FileReader();
        // Event fired when file content is loaded
        reader.onload = (e) => {
            const fileContent = e.target.result; // This will be Base64 encoded string (Data URL)
            const fileName = file.name;
            const fileType = file.type;

            // Emit the file data to the server via Socket.IO
            socket.emit('upload_resume', {
                fileName: fileName,
                fileType: fileType,
                fileContent: fileContent // Send as Base64 string
            });
        };

        // Event fired if FileReader encounters an error
        reader.onerror = (error) => {
            console.error('FileReader error:', error);
            showUploadStatus('Error reading file. Please try again.', 'error');
            uploadResumeButton.disabled = false; // Re-enable on error
        };
        
        // Read the file as a Data URL (Base64 encoded string)
        // This is suitable for text-based documents like PDF (text content extracted on server) or DOCX
        reader.readAsDataURL(file); 
    });


    // --- General Event Listeners ---
    if (startConversationButton) {
        startConversationButton.addEventListener('click', startConversation);
    }

    if (endConversationButton) {
        endConversationButton.addEventListener('click', stopConversation);
    }

    if (sendButton) {
        sendButton.addEventListener('click', sendTextInput);
    }

    if (userInput) {
        // Allow sending message by pressing Enter in the text input
        userInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                sendTextInput();
            }
        });
    }

    // Close performance metrics modal button
    if (closeMetricsModalButton) {
        closeMetricsModalButton.addEventListener('click', () => {
            if (performanceMetricsModal) {
                performanceMetricsModal.classList.add('hidden'); // Hide the modal
            }
        });
    }

    // --- Initial Setup ---
    // Set initial UI states when the page loads
    resetStatus(); // Main chat status
    startConversationButton.disabled = true; // Disabled until Socket.IO connects
    endConversationButton.disabled = true;
    textInputArea.style.display = 'none'; // Hide text input
    uploadResumeButton.disabled = true; // Ensure upload button is disabled initially
    showUploadStatus('No file selected.', 'info'); // Initial status for resume section

    // Initialize Lucide icons (redundant if already in index.html, but harmless for robustness)
    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    } else {
        console.error("Lucide icons library is not loaded properly. Ensure the CDN link is correct and accessible.");
    }
});


