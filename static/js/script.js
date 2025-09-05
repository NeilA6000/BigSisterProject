// FILE: static/js/script.js (Version 2.0 - API Driven)

document.addEventListener('DOMContentLoaded', () => {

    // --- STATE MANAGEMENT ---
    // This state is now managed by the server. The frontend just keeps track of the current user and session for API calls.
    let appState = {
        currentUser: null,
        currentSessionId: null,
        currentJournalId: null,
        isBotTyping: false,
        map: null,
    };

    // --- CONSTANTS ---
    const FRIENDLY_ERROR_MESSAGE = "Sweetheart, my thoughts got a little tangled just now and I couldn’t finish what I wanted to say.\n\nIt’s nothing you did — sometimes the wires behind me get a bit messy.\n\nCould you try again in a little while? 💜";

    // --- DOM ELEMENT SELECTORS (Unchanged) ---
    const allSections = document.querySelectorAll('main section');
    const header = document.querySelector('header');
    const authSection = document.getElementById('auth-section');
    const loginBox = document.getElementById('login-box');
    const signupBox = document.getElementById('signup-box');
    const loginUsernameInput = document.getElementById('login-username');
    const loginPinInput = document.getElementById('login-pin');
    const signupUsernameInput = document.getElementById('signup-username');
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const showSignupLink = document.getElementById('show-signup');
    const showLoginLink = document.getElementById('show-login');
    const loginError = document.getElementById('login-error');
    const signupError = document.getElementById('signup-error');
    const welcomeUserEl = document.getElementById('welcome-user');
    const logoutBtn = document.getElementById('logout-btn');
    // ... all other selectors are the same ...
    const languageSwitcher = document.getElementById('language-switcher');
    const themeCheckbox = document.getElementById('theme-checkbox');
    const navLinks = document.querySelectorAll('.nav-links a');
    const quizSection = document.getElementById('quiz-section');
    const questionText = document.getElementById('question-text');
    const answerButtons = document.getElementById('answer-buttons');
    const quizComplete = document.getElementById('quiz-complete');
    const startChatBtn = document.getElementById('start-chat-btn');
    const questionArea = document.getElementById('question-area');
    const sessionList = document.getElementById('session-list');
    const newSessionBtn = document.getElementById('new-session-btn');
    const endSessionBtn = document.getElementById('end-session-btn');
    const chatSessionName = document.getElementById('chat-session-name');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const journalList = document.getElementById('journal-list');
    const editorHeading = document.getElementById('editor-heading');
    const journalTitleInput = document.getElementById('journal-title');
    const journalContentInput = document.getElementById('journal-content');
    const saveJournalBtn = document.getElementById('save-journal-btn');
    const deleteJournalBtn = document.getElementById('delete-journal-btn');
    const reflectJournalBtn = document.getElementById('reflect-journal-btn');
    const pinModal = document.getElementById('pin-modal');
    const pinModalTitle = document.getElementById('pin-modal-title');
    const pinModalPrompt = document.getElementById('pin-modal-prompt');
    const pinInputs = document.querySelectorAll('.pin-input');
    const pinError = document.getElementById('pin-error');
    const pinSubmitBtn = document.getElementById('pin-submit-btn');
    const pinCancelBtn = document.getElementById('pin-cancel-btn');
    const changePinBtn = document.getElementById('change-pin-btn');
    const userProfileTextarea = document.getElementById('user-profile-textarea');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const saveMyMessageBtn = document.getElementById('save-my-message-btn');
    const myMessageTextarea = document.getElementById('my-message-textarea');
    const myMessageStatus = document.getElementById('my-message-status');
    const messageWall = document.getElementById('message-wall');

    // --- UI CONTROL FUNCTIONS ---
    function showSection(sectionId) {
        allSections.forEach(section => section.classList.add('hidden'));
        const activeSection = document.getElementById(sectionId);
        if (activeSection) activeSection.classList.remove('hidden');
        navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.section === sectionId);
        });
    }

    function showAuthUI() {
        header.classList.add('hidden');
        showSection('auth-section');
        appState.currentUser = null;
        appState.currentSessionId = null;
    }

    function showMainAppUI(username) {
        appState.currentUser = username;
        header.classList.remove('hidden');
        welcomeUserEl.textContent = `Hi, ${username}`;
        showSection('chat-section'); // Go directly to chat after login
        loadChatView(); // New function to load all chat data
    }

    function setTheme(isDark) {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        localStorage.setItem('theme', isDark ? 'dark' : 'light'); // Theme is a UI preference, OK for localStorage
        themeCheckbox.checked = isDark;
    }

    // --- API HELPER ---
    // A single helper for all API calls to handle authentication and errors
    async function apiFetch(endpoint, options = {}) {
        // Automatically include credentials (like session cookies)
        options.credentials = 'include';
        if (options.body) {
            options.headers = { 'Content-Type': 'application/json', ...options.headers };
            options.body = JSON.stringify(options.body);
        }

        const response = await fetch(endpoint, options);

        if (response.status === 401) {
            // If we get an unauthorized error, the session is invalid. Log the user out.
            showAuthUI();
            throw new Error('Not authenticated');
        }
        return response;
    }

    // --- AUTHENTICATION ---
    async function handleSignup() {
        signupError.textContent = '';
        const username = signupUsernameInput.value.trim();
        if (username.length < 3) {
            signupError.textContent = 'Username must be at least 3 characters.';
            return;
        }

        try {
            const pin = await getPin({ title: 'Set Your Account PIN', prompt: 'Create a 4-digit PIN for your new account.', buttonText: 'Set PIN' });
            const confirmPin = await getPin({ title: 'Confirm PIN', prompt: 'Please enter the PIN again to confirm.', buttonText: 'Confirm' });

            if (pin !== confirmPin) {
                alert('PINs did not match. Please try again.');
                return;
            }

            const response = await apiFetch('/api/signup', {
                method: 'POST',
                body: { username, pin }
            });

            const data = await response.json();
            if (response.ok) {
                showMainAppUI(data.username);
            } else {
                signupError.textContent = data.error || 'An error occurred.';
            }
        } catch (error) {
            console.log("PIN setup cancelled or failed.", error);
        }
    }

    async function handleLogin() {
        loginError.textContent = '';
        const username = loginUsernameInput.value.trim();
        const pin = loginPinInput.value.trim();
        if (!username || !pin) {
            loginError.textContent = 'Username and PIN are required.';
            return;
        }

        const response = await apiFetch('/api/login', {
            method: 'POST',
            body: { username, pin }
        });

        const data = await response.json();
        if (response.ok) {
            showMainAppUI(data.username);
        } else {
            loginError.textContent = data.error || 'An error occurred.';
        }
    }

    async function handleLogout() {
        await apiFetch('/api/logout', { method: 'POST' });
        showAuthUI();
        // Clear input fields
        loginUsernameInput.value = '';
        loginPinInput.value = '';
        signupUsernameInput.value = '';
    }

    // --- INITIALIZATION ---
    async function initialize() {
        // Set theme based on localStorage (this is fine as it's just a UI preference)
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(savedTheme === 'dark' || (savedTheme === null && systemPrefersDark));

        // Add all event listeners
        addEventListeners();

        // Check if the user has a valid session with the server
        try {
            const response = await apiFetch('/api/check_auth');
            if (response.ok) {
                const data = await response.json();
                showMainAppUI(data.username);
            } else {
                showAuthUI();
            }
        } catch (error) {
            showAuthUI();
        }
    }

    function addEventListeners() {
        themeCheckbox.addEventListener('change', () => setTheme(themeCheckbox.checked));
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = e.target.dataset.section;
                showSection(sectionId);
                // Load data for the specific section when it's clicked
                if (sectionId === 'chat-section') loadChatView();
                if (sectionId === 'journal-section') loadJournalView();
                if (sectionId === 'settings-section') loadProfileView();
                if (sectionId === 'community-section') loadCommunityView();
            });
        });
        showSignupLink.addEventListener('click', () => { loginBox.classList.add('hidden'); signupBox.classList.remove('hidden'); });
        showLoginLink.addEventListener('click', () => { signupBox.classList.add('hidden'); loginBox.classList.remove('hidden'); });
        signupBtn.addEventListener('click', handleSignup);
        loginBtn.addEventListener('click', handleLogin);
        logoutBtn.addEventListener('click', handleLogout);
        newSessionBtn.addEventListener('click', () => { showSection('quiz-section'); resetQuiz(); });
        startChatBtn.addEventListener('click', handleQuizCompletion);
        sendBtn.addEventListener('click', handleSendMessage);
        chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } });
        saveJournalBtn.addEventListener('click', saveJournalEntry);
        deleteJournalBtn.addEventListener('click', deleteJournalEntry);
        saveProfileBtn.addEventListener('click', saveUserProfile);
        saveMyMessageBtn.addEventListener('click', handleSaveMyMessage);
        // ... (other minor event listeners can be added here)
    }

    // --- CHAT & QUIZ ---
    let userQuizAnswers = [];
    const quizQuestions = [ { question: "In one word, how are you feeling right now?", answers: ["Overwhelmed", "Sad", "Anxious", "Okay"] }, /* ... all 10 questions ... */ ];
    let currentQuestionIndex = 0;
    function resetQuiz() { userQuizAnswers = []; currentQuestionIndex = 0; questionArea.classList.remove('hidden'); quizComplete.classList.add('hidden'); displayQuestion(); }
    function displayQuestion() { if (currentQuestionIndex < quizQuestions.length) { const q = quizQuestions[currentQuestionIndex]; questionText.textContent = q.question; answerButtons.innerHTML = ''; q.answers.forEach(ans => { const btn = document.createElement('button'); btn.textContent = ans; btn.classList.add('answer-btn'); btn.addEventListener('click', () => { userQuizAnswers.push(`${q.question}: ${ans}`); currentQuestionIndex++; displayQuestion(); }); answerButtons.appendChild(btn); }); } else { questionArea.classList.add('hidden'); quizComplete.classList.remove('hidden'); } }
    
    async function handleQuizCompletion() {
        try {
            const response = await apiFetch('/api/sessions', {
                method: 'POST',
                body: { quiz_answers: userQuizAnswers }
            });
            const newSession = await response.json();
            appState.currentSessionId = newSession.id;
            await renderSessionList(); // Re-render the list with the new session
            chatMessages.innerHTML = ''; // Clear messages
            renderMessage(newSession.initial_message); // Render the greeting from the server
            chatSessionName.textContent = newSession.name;
            showSection('chat-section');
        } catch (error) {
            console.error("Failed to create new session:", error);
            alert("Could not start a new session. Please try again.");
        }
    }

    async function loadChatView() {
        chatMessages.innerHTML = '<p>Loading sessions...</p>';
        await renderSessionList();
        if (appState.currentSessionId) {
            loadSession(appState.currentSessionId);
        } else {
            chatMessages.innerHTML = '<p class="info-message">Select a session or start a new one.</p>';
            chatSessionName.textContent = 'BigSister';
        }
    }

    async function renderSessionList() {
        try {
            const response = await apiFetch('/api/sessions');
            const sessions = await response.json();
            sessionList.innerHTML = '';
            sessions.forEach(session => {
                const li = document.createElement('li');
                li.dataset.sessionId = session.id;
                li.className = (session.id === appState.currentSessionId) ? 'active' : '';
                li.textContent = session.name;
                li.addEventListener('click', () => {
                    appState.currentSessionId = session.id;
                    loadSession(session.id);
                });
                sessionList.appendChild(li);
            });
            // Auto-select the first session if none is selected
            if (!appState.currentSessionId && sessions.length > 0) {
                appState.currentSessionId = sessions[0].id;
                loadSession(sessions[0].id);
            }
        } catch (error) {
            console.error("Failed to load sessions:", error);
            sessionList.innerHTML = '<li>Could not load sessions.</li>';
        }
    }

    async function loadSession(sessionId) {
        // Highlight the active session in the list
        document.querySelectorAll('#session-list li').forEach(li => {
            li.classList.toggle('active', li.dataset.sessionId == sessionId);
        });

        try {
            const response = await apiFetch(`/api/sessions/${sessionId}/messages`);
            const messages = await response.json();
            chatMessages.innerHTML = '';
            messages.forEach(renderMessage);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            // You can also fetch session details like name if needed
        } catch (error) {
            console.error("Failed to load messages for session:", sessionId, error);
            chatMessages.innerHTML = '<p class="error-message">Could not load messages.</p>';
        }
    }

    async function handleSendMessage() {
        if (appState.isBotTyping || !appState.currentSessionId) return;
        const userText = chatInput.value.trim();
        if (!userText) return;

        renderMessage({ role: 'user', content: userText });
        chatInput.value = '';
        appState.isBotTyping = true;

        try {
            const response = await apiFetch('/api/chat', {
                method: 'POST',
                body: { message: userText, session_id: appState.currentSessionId }
            });
            const data = await response.json();
            if (response.ok) {
                renderMessage({ role: 'assistant', content: data.reply });
            } else {
                renderMessage({ role: 'assistant', content: FRIENDLY_ERROR_MESSAGE });
            }
        } catch (error) {
            console.error("Chat API error:", error);
            renderMessage({ role: 'assistant', content: FRIENDLY_ERROR_MESSAGE });
        } finally {
            appState.isBotTyping = false;
        }
    }

    function renderMessage(message) {
        const div = document.createElement('div');
        div.className = `message ${message.role === 'user' ? 'user-message' : 'bot-message'}`;
        // Use a library like 'marked' for markdown rendering if needed
        div.innerHTML = `<p>${message.content.replace(/\n/g, '<br>')}</p>`;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // --- JOURNAL ---
    async function loadJournalView() {
        resetJournalEditor();
        await renderJournalList();
    }
    
    async function renderJournalList() {
        const response = await apiFetch('/api/journal');
        const entries = await response.json();
        journalList.innerHTML = '';
        entries.forEach(entry => {
            const item = document.createElement('div');
            item.className = 'journal-item';
            item.dataset.journalId = entry.id;
            item.innerHTML = `<h4>${entry.title}</h4><p>${new Date(entry.timestamp).toLocaleDateString()}</p>`;
            item.addEventListener('click', () => loadJournalEntry(entry.id));
            journalList.appendChild(item);
        });
    }

    async function loadJournalEntry(journalId) {
        appState.currentJournalId = journalId;
        const response = await apiFetch(`/api/journal/${journalId}`);
        const entry = await response.json();
        journalTitleInput.value = entry.title;
        journalContentInput.value = entry.content;
        editorHeading.textContent = `Editing: ${entry.title}`;
        deleteJournalBtn.classList.remove('hidden');
        saveJournalBtn.textContent = 'Update Entry';
    }

    function resetJournalEditor() {
        appState.currentJournalId = null;
        journalTitleInput.value = '';
        journalContentInput.value = '';
        editorHeading.textContent = 'New Entry';
        deleteJournalBtn.classList.add('hidden');
        saveJournalBtn.textContent = 'Save Entry';
    }

    async function saveJournalEntry() {
        const title = journalTitleInput.value.trim();
        const content = journalContentInput.value.trim();
        if (!title || !content) {
            alert('Title and content cannot be empty.');
            return;
        }

        const method = appState.currentJournalId ? 'PUT' : 'POST';
        const endpoint = appState.currentJournalId ? `/api/journal/${appState.currentJournalId}` : '/api/journal';

        await apiFetch(endpoint, { method, body: { title, content } });
        await loadJournalView(); // Reload the whole view to show changes
    }
    
    async function deleteJournalEntry() {
        if (!appState.currentJournalId || !confirm('Are you sure you want to delete this entry?')) return;
        await apiFetch(`/api/journal/${appState.currentJournalId}`, { method: 'DELETE' });
        await loadJournalView();
    }

    // --- PROFILE & COMMUNITY (Example stubs) ---
    async function loadProfileView() {
        const response = await apiFetch('/api/profile');
        const data = await response.json();
        userProfileTextarea.value = data.profile_info || '';
    }

    async function saveUserProfile() {
        await apiFetch('/api/profile', {
            method: 'POST',
            body: { profile_info: userProfileTextarea.value.trim() }
        });
        alert('Profile saved!');
    }
    
    async function loadCommunityView() {
        // Fetch public messages
        const messagesRes = await apiFetch('/api/get-messages');
        const messages = await messagesRes.json();
        messageWall.innerHTML = '';
        messages.forEach(msg => {
            const card = document.createElement('div');
            card.className = 'message-card';
            card.innerHTML = `<p>${msg}</p>`;
            messageWall.appendChild(card);
        });

        // Fetch user's own message
        const myMessageRes = await apiFetch('/api/get-my-message');
        const myMessage = await myMessageRes.json();
        if (myMessage.status !== 'not_found') {
            myMessageTextarea.value = myMessage.text;
            myMessageStatus.textContent = `Your message status: ${myMessage.status}`;
        } else {
            myMessageStatus.textContent = "You haven't posted a message yet.";
        }
    }

    async function handleSaveMyMessage() {
        const message_text = myMessageTextarea.value.trim();
        if (!message_text) { alert('Message cannot be empty.'); return; }
        const response = await apiFetch('/api/post-message', {
            method: 'POST',
            body: { message_text }
        });
        const data = await response.json();
        myMessageStatus.textContent = `Status: ${data.status}. ${data.reason || ''}`;
    }

    // PIN modal helper (this is a UI component, logic is simple, unchanged)
    function getPin(config) {
        return new Promise((resolve, reject) => {
            pinModalTitle.textContent = config.title;
            pinModalPrompt.textContent = config.prompt;
            pinSubmitBtn.textContent = config.buttonText;
            pinError.textContent = '';
            pinInputs.forEach(input => input.value = '');
            pinModal.style.display = 'flex';
            pinInputs[0].focus();
            const onSubmit = () => {
                const pin = Array.from(pinInputs).map(i => i.value).join('');
                if (pin.length === 4) {
                    cleanup();
                    resolve(pin);
                } else {
                    pinError.textContent = 'Please enter a 4-digit PIN.';
                }
            };
            const onCancel = () => {
                cleanup();
                reject('PIN entry cancelled');
            };
            const cleanup = () => {
                pinModal.style.display = 'none';
                pinSubmitBtn.removeEventListener('click', onSubmit);
                pinCancelBtn.removeEventListener('click', onCancel);
            };
            pinSubmitBtn.addEventListener('click', onSubmit);
            pinCancelBtn.addEventListener('click', onCancel);
        });
    }

    // Start the application
    initialize();
});