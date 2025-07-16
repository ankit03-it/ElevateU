document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded: script.js is running.');

    // --- UI Element Selectors ---
    const startConversationButton = document.getElementById('start-conversation');
    const endConversationButton = document.getElementById('end-conversation');
    const chatMessagesContainer = document.getElementById('chat-messages');
    const statusIndicator = document.getElementById('status-indicator');
    const statusTextSpan = document.getElementById('status-text');
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

    // --- Socket.IO Connection ---
    const socket = io();

    // --- Web Speech API Variables ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let isRecognizing = false;
    let isConversationActive = false;
    let restartRecognitionTimeout = null;

    // --- Speech Synthesis (Text-to-Speech) Variables ---
    const synth = window.speechSynthesis;
    let aiSpeaking = false;
    let availableVoices = [];

    synth.onvoiceschanged = () => {
        availableVoices = synth.getVoices();
        console.log('SpeechSynthesis voices loaded:', availableVoices.map(v => v.name));
    };

    // --- Utility Functions for UI Feedback ---

    function showStatus(message, type = 'info') {
        errorMessageDisplay.classList.add('hidden');
        errorMessageDisplay.textContent = '';

        statusIndicator.className = 'flex-grow text-center text-lg font-semibold flex items-center justify-center gap-3 min-h-[40px]';
        statusIndicator.classList.remove('recording-active');
        statusTextSpan.textContent = message;

        let iconHtml = '';
        switch (type) {
            case 'info':
                statusIndicator.classList.add('text-sky-400');
                iconHtml = '<i data-lucide="info" class="w-6 h-6"></i>';
                break;
            case 'listening':
                statusIndicator.classList.add('text-green-400', 'recording-active');
                iconHtml = '<i data-lucide="mic" class="w-6 h-6"></i>';
                break;
            case 'speaking':
                statusIndicator.classList.add('text-purple-400');
                iconHtml = '<i data-lucide="volume-2" class="w-6 h-6"></i>';
                break;
            case 'thinking':
                statusIndicator.classList.add('text-yellow-400');
                iconHtml = '<div class="loader"></div>';
                break;
            case 'error':
                errorMessageDisplay.textContent = message;
                errorMessageDisplay.classList.remove('hidden');
                statusTextSpan.textContent = '';
                return;
            default:
                statusIndicator.classList.add('text-slate-400');
                break;
        }
        statusIndicator.innerHTML = `${iconHtml} <span id="status-text">${message}</span>`;
        if (typeof lucide !== "undefined") {
            lucide.createIcons();
        }
    }

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

    function showUploadStatus(message, type = 'info') {
        uploadStatusDiv.textContent = message;
        uploadStatusDiv.className = 'text-sm mt-2 sm:mt-0 sm:ml-4';

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

    function addMessageToChat(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chat-message', sender);
        messageDiv.classList.add(sender === 'user' ? 'self-end' : 'self-start');

        const senderLabel = document.createElement('span');
        senderLabel.classList.add('font-semibold', 'text-sm', 'block', 'mb-1');
        senderLabel.textContent = sender === 'user' ? 'You:' : 'AI Coach:';
        
        const messageText = document.createElement('p');
        messageText.textContent = text;

        messageDiv.appendChild(senderLabel);
        messageDiv.appendChild(messageText);

        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateY(10px)';
        chatMessagesContainer.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
            messageDiv.style.opacity = '1';
            messageDiv.style.transform = 'translateY(0)';
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        }, 50);
    }

    function tryStartRecognition() {
        if (!isConversationActive || aiSpeaking) {
            console.log(`Skipping tryStartRecognition: isConversationActive=${isConversationActive}, aiSpeaking=${aiSpeaking}`);
            return;
        }

        if (restartRecognitionTimeout) {
            clearTimeout(restartRecognitionTimeout);
            restartRecognitionTimeout = null;
        }

        if (recognition && (recognition.readyState === 'starting' || recognition.readyState === 'listening')) {
            try {
                recognition.abort(); 
                console.log('Aborted existing recognition before re-initialization.');
            } catch (e) {
                console.warn('Could not abort existing recognition:', e);
            }
        }
        recognition = null;

        recognition = initRecognition();
        if (!recognition) {
            showStatus("Failed to initialize Speech Recognition. Please ensure your browser supports it.", 'error');
            return;
        }
        
        try {
            recognition.start();
            console.log('SpeechRecognition start called via tryStartRecognition (re-init).');
        } catch (e) {
            console.error('Error starting recognition via tryStartRecognition (re-init):', e);
            showStatus(`Error resuming listening: ${e.message}. Please click 'Start Conversation' again.`, 'error');
        }
    }

    function speakText(text) {
        if (!text) return;

        if (synth.speaking) {
            synth.cancel();
        }
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.pitch = 1;
        utterance.rate = 1;

        const preferredVoice = availableVoices.find(voice => 
            (voice.lang === 'en-US' && voice.name.includes('Google')) || 
            (voice.lang === 'en-US' && voice.default)
        );
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        } else {
            console.warn('Preferred English voice not found or voices not yet loaded, using default browser voice.');
        }

        utterance.onstart = () => {
            aiSpeaking = true;
            console.log('AI speaking started.');
            if (isRecognizing && recognition) {
                recognition.abort(); 
                isRecognizing = false; 
            }
            showStatus('AI is speaking...', 'speaking');
        };

        utterance.onend = () => {
            aiSpeaking = false;
            console.log('AI speaking ended.');
            if (isConversationActive) {
                console.log('Attempting to restart SpeechRecognition after AI speech...');
                restartRecognitionTimeout = setTimeout(tryStartRecognition, 200); 
            } else { 
                showStatus("Conversation ended.", 'info');
            }
        };

        utterance.onerror = (event) => {
            console.error('SpeechSynthesisUtterance error:', event.error);
            aiSpeaking = false;
            showStatus(`Speech error: ${event.error.message || 'Could not speak.'} Please check browser settings or try another browser.`, 'error');
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

    socket.on('connect', () => {
        console.log('Connected to Socket.IO server.');
        startConversationButton.disabled = false;
        endConversationButton.disabled = true;
        textInputArea.style.display = 'none';
        resetStatus();
        showUploadStatus('No file selected.', 'info');
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from Socket.IO server.');
        stopConversation();
        showStatus("Disconnected. Please refresh to reconnect.", 'error');
    });

    socket.on('ai_response', (data) => {
        console.log('AI response received:', data.text);
        addMessageToChat(data.text, 'ai');
        speakText(data.text);
    });

    socket.on('ai_thinking', () => {
        console.log('AI thinking...');
        showStatus('AI is thinking...', 'thinking');
        if (isRecognizing && recognition) {
            recognition.abort();
            isRecognizing = false;
        }
    });

    socket.on('resume_upload_status', (data) => {
        console.log('Resume upload status:', data.message);
        showUploadStatus(data.message, data.type);
        if (data.type === 'success') {
            uploadResumeButton.disabled = true;
            resumeUploadInput.disabled = true;
            resumeUploadLabel.classList.add('opacity-50', 'cursor-not-allowed');
        } else if (data.type === 'error') {
            uploadResumeButton.disabled = false;
        }
    });

    socket.on('error', (data) => {
        console.error('Socket.IO Error:', data.message);
        showStatus(`Server Error: ${data.message}`, 'error');
        stopConversation();
    });

    // --- Web Speech API (SpeechRecognition) Logic ---

    function initRecognition() {
        if (!SpeechRecognition) {
            showStatus("Speech Recognition not supported in this browser. Please use Chrome or Edge.", 'error');
            return null;
        }
        
        const newRecognition = new SpeechRecognition();
        newRecognition.continuous = true;
        newRecognition.interimResults = false;
        newRecognition.lang = 'en-US';
        newRecognition.maxAlternatives = 1;

        newRecognition.onstart = () => {
            isRecognizing = true; 
            console.log('SpeechRecognition started. (onstart event)');
            showStatus('Listening...', 'listening');
        };

        newRecognition.onresult = (event) => {
            console.log('SpeechRecognition onresult event:', event);
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            
            if (finalTranscript.trim().length > 0) {
                console.log('Final Transcription:', finalTranscript.trim());
                socket.emit('user_text_input', { text: finalTranscript.trim() });
                addMessageToChat(finalTranscript.trim(), 'user');
                showStatus('AI is thinking...', 'thinking');
            } else {
                console.log('Empty or unrecognized final transcription result.');
            }
        };

        newRecognition.onend = () => {
            isRecognizing = false;
            console.log('SpeechRecognition ended. (onend event)');
            if (isConversationActive && !aiSpeaking) {
                console.log('Attempting to restart SpeechRecognition from onend...');
                restartRecognitionTimeout = setTimeout(tryStartRecognition, 200); 
            } else if (!aiSpeaking) {
                showStatus("Conversation ended.", 'info');
            }
        };

        newRecognition.onerror = (event) => {
            isRecognizing = false;
            // Changed this from console.error to console.log for 'aborted' events
            if (event.error === 'aborted') {
                console.log('SpeechRecognition error: aborted. Message:', event.message || 'Recognition aborted intentionally.');
                if (isConversationActive && !aiSpeaking) {
                    console.log('Attempting to restart SpeechRecognition after aborted event...');
                    restartRecognitionTimeout = setTimeout(tryStartRecognition, 500);
                }
                return;
            }

            // For all other errors, keep logging as error
            console.error('SpeechRecognition error:', event.error, 'Message:', event.message);
            
            let errorMessage = `Microphone error: ${event.error}. Please check microphone access and try again.`;
            if (event.error === 'network') {
                errorMessage = "Network error: Could not connect to speech recognition service. Please check your internet connection, firewall, or VPN.";
            } else if (event.error === 'not-allowed') {
                errorMessage = "Microphone access denied. Please allow microphone access in your browser settings.";
            }

            showStatus(errorMessage, 'error');

            if (isConversationActive && !aiSpeaking) {
                console.log('Attempting to restart SpeechRecognition on general error...');
                restartRecognitionTimeout = setTimeout(tryStartRecognition, 500); 
            } else {
                startConversationButton.disabled = false;
                endConversationButton.disabled = true;
                textInputArea.style.display = 'none';
            }
        };
        return newRecognition;
    }

    function startConversation() {
        console.log('startConversation() called.'); // Debug log
        if (isConversationActive) {
            console.log('Conversation already active, returning.'); // Debug log
            return;
        }

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(() => {
                console.log('Microphone access granted.'); // Debug log
                isConversationActive = true;
                chatMessagesContainer.innerHTML = '';
                textInputArea.style.display = 'flex';

                if (!recognition) {
                    console.log("Recognition object is null on startConversation. Initializing."); // Debug log
                    recognition = initRecognition();
                    if (!recognition) {
                        console.log("Recognition initialization failed."); // Debug log
                        isConversationActive = false;
                        startConversationButton.disabled = false;
                        endConversationButton.disabled = true;
                        textInputArea.style.display = 'none';
                        return;
                    }
                }
                
                if (!isRecognizing) { 
                    try {
                        console.log('Attempting recognition.start().'); // Debug log
                        recognition.start();
                        console.log('Initial SpeechRecognition start called.');
                    } catch (e) {
                        console.error('Error during initial SpeechRecognition start:', e); // Debug log
                        showStatus(`Error starting listening: ${e.message}. Please click 'Start Conversation' again.`, 'error');
                        isConversationActive = false;
                        startConversationButton.disabled = false;
                        endConversationButton.disabled = true;
                        textInputArea.style.display = 'none';
                        return;
                    }
                }

                startConversationButton.disabled = true;
                endConversationButton.disabled = false;
                
                console.log('Emitting start_conversation to server.'); // Debug log
                socket.emit('start_conversation');
                showStatus('Waiting for AI to start...', 'thinking');
            })
            .catch(error => {
                console.error('Microphone access denied or not available (getUserMedia catch):', error); // Debug log
                showStatus('Microphone access denied or not available. Please allow microphone access in your browser settings.', 'error');
                startConversationButton.disabled = false;
                endConversationButton.disabled = true;
                textInputArea.style.display = 'none';
            });
    }

    function stopConversation() {
        console.log('stopConversation() called.'); // Debug log
        if (!isConversationActive) {
            console.log('Conversation not active, returning.'); // Debug log
            return;
        }

        if (recognition) {
            console.log('Stopping recognition.'); // Debug log
            if (isRecognizing || recognition.readyState === 'starting' || recognition.readyState === 'listening') {
                 recognition.stop(); 
            }
            recognition = null;
        }
        isRecognizing = false;

        if (synth.speaking) {
            console.log('Cancelling speech synthesis.'); // Debug log
            synth.cancel();
        }
        aiSpeaking = false;

        if (restartRecognitionTimeout) {
            clearTimeout(restartRecognitionTimeout);
            restartRecognitionTimeout = null;
        }

        isConversationActive = false;
        startConversationButton.disabled = false;
        endConversationButton.disabled = true;
        textInputArea.style.display = 'none';
        resetStatus();
        addMessageToChat("Conversation ended. Thank you for practicing!", 'ai');
        console.log('Emitting end_conversation to server.'); // Debug log
        socket.emit('end_conversation');
    }

    function sendTextInput() {
        const text = userInput.value.trim();
        if (text.length > 0) {
            addMessageToChat(text, 'user');
            socket.emit('user_text_input', { text: text });
            userInput.value = '';
            showStatus('AI is thinking...', 'thinking');
        }
    }

    // --- Resume Upload Logic ---
    const MAX_FILE_SIZE_MB = 2;

    resumeUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            fileNameDisplay.textContent = file.name;
            uploadResumeButton.disabled = false;
            showUploadStatus(`File selected: ${file.name}`, 'info');

            if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                showUploadStatus(`File size exceeds ${MAX_FILE_SIZE_MB}MB. Please choose a smaller file.`, 'error');
                uploadResumeButton.disabled = true;
                return;
            }

            const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(file.type)) {
                showUploadStatus('Invalid file type. Please upload a PDF, DOC, or DOCX file.', 'error');
                uploadResumeButton.disabled = true;
                return;
            }
        } else {
            fileNameDisplay.textContent = 'Choose File (PDF, DOCX)';
            uploadResumeButton.disabled = true;
            showUploadStatus('No file selected.', 'info');
        }
    });

    uploadResumeButton.addEventListener('click', () => {
        const file = resumeUploadInput.files[0];
        if (!file) {
            showUploadStatus('No file to upload.', 'error');
            return;
        }

        showUploadStatus('Uploading...', 'loading');
        uploadResumeButton.disabled = true;

        const reader = new FileReader();
        reader.onload = (e) => {
            const fileContent = e.target.result;
            const fileName = file.name;
            const fileType = file.type;

            socket.emit('upload_resume', {
                fileName: fileName,
                fileType: fileType,
                fileContent: fileContent
            });
        };

        reader.onerror = (error) => {
            console.error('FileReader error:', error);
            showUploadStatus('Error reading file. Please try again.', 'error');
            uploadResumeButton.disabled = false;
        };
        
        reader.readAsDataURL(file); 
    });


    // --- Event Listeners ---
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
        userInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                sendTextInput();
            }
        });
    }

    // --- Initial Setup ---
    resetStatus();
    startConversationButton.disabled = true;
    endConversationButton.disabled = true;
    textInputArea.style.display = 'none';
    uploadResumeButton.disabled = true;
    showUploadStatus('No file selected.', 'info');

    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    } else {
        console.error("Lucide icons library is not loaded properly. Ensure the CDN link is correct and accessible.");
    }
});

