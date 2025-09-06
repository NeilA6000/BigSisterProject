// FILE: static/js/script.js (FINAL MERGED VERSION)

document.addEventListener('DOMContentLoaded', () => {

    // --- STATE MANAGEMENT ---
    let appState = {
        currentUser: null,
        currentSessionId: null,
        currentJournalId: null,
        isBotTyping: false,
        map: null,
    };

    // --- CONSTANTS & DATA ---
    const FRIENDLY_ERROR_MESSAGE = "Sweetheart, my thoughts got a little tangled just now and I couldn’t finish what I wanted to say.\n\nIt’s nothing you did — sometimes the wires behind me get a bit messy.\n\nCould you try again in a little while? 💜";
    const quizQuestions = [ { question: "In one word, how are you feeling right now?", answers: ["Overwhelmed", "Sad", "Anxious", "Okay"] }, { question: "How has your energy been lately?", answers: ["Totally drained", "Lower than usual", "Pretty normal", "Full of energy"] }, { question: "What's taking up most of your headspace?", answers: ["Relationships with others", "School or work pressure", "How I feel about myself", "Something from the past"] }, { question: "Have you felt more like being alone or with people?", answers: ["Definitely alone", "A little of both", "I want to be around others", "I haven't thought about it"] }, { question: "How have you been sleeping?", answers: ["Restlessly, or not enough", "A bit off", "Fairly well", "Very well"] }, { question: "How does the idea of the next few days feel?", answers: ["Daunting or scary", "A bit stressful", "Manageable", "Hopeful or exciting"] }, { question: "Have you been able to do things you normally enjoy?", answers: ["Not at all", "Only a little", "For the most part", "Yes, definitely"] }, { question: "How critical have you been of yourself recently?", answers: ["Extremely critical", "More than usual", "About the same", "I've been kind to myself"] }, { question: "Where do you feel the most tension in your body?", answers: ["In my chest or stomach", "In my shoulders or neck", "Headaches", "I feel pretty relaxed"] }, { question: "What kind of support feels most needed right now?", answers: ["Just someone to listen", "Help finding a distraction", "Understanding my feelings", "I'm not sure yet"] } ];
    const allResources = [ { name: "Crisis Text Line", country: "USA", type: "Crisis", anonymity: "Anonymous", contact: { text: "HOME to 741741" }, description: "24/7, free, confidential crisis support by text." }, { name: "The Trevor Project", country: "USA", type: "LGBTQ+", anonymity: "Anonymous", contact: { call: "1-866-488-7386", chat: "thetrevorproject.org" }, description: "Crisis intervention and suicide prevention for LGBTQ youth." }, { name: "SAMHSA National Helpline", country: "USA", type: "Substance Abuse", anonymity: "Confidential", contact: { call: "1-800-662-4357" }, description: "Treatment referral and information service." }, { name: "Kids Help Phone", country: "Canada", type: "General", anonymity: "Anonymous", contact: { call: "1-800-668-6868", text: "CONNECT to 686868" }, description: "Canada’s 24/7 e-mental health service for youth." }, { name: "Samaritans", country: "UK", type: "Crisis", anonymity: "Confidential", contact: { call: "116 123" }, description: "Whatever you're going through, a Samaritan will face it with you, 24/7." }, { name: "Shout", country: "UK", type: "Crisis", anonymity: "Anonymous", contact: { text: "SHOUT to 85258" }, description: "Free, confidential, 24/7 text messaging support service." } ];
    const mindMattersAudio = [ { title: "How To Get Rid Of Overwhelm", description: "A 10-minute session to guide you through moments when everything feels like too much.", file: "how-to-get-rid-of-overwhelm.mp3", cover: "cover-overwhelm.png" }, { title: "1-Minute Mindfulness Meditation", description: "A short, guided practice to bring you back to the present moment.", file: "5-minute-mindfulness-meditation.mp3", cover: "cover-mindfulness.png" }, { title: "About Panic Attacks", description: "Learn what happens during a panic attack and how to manage it.", file: "guided-breathing-for-anxiety.mp3", cover: "cover-breathing.png" }, { title: "Finding Calm in the Storm", description: "An audio guide to help you find your anchor during difficult emotions.", file: "finding-calm-in-the-storm.mp3", cover: "cover-storm.png" }, { title: "A Meditation on Self-Love", description: "Cultivate kindness and compassion for yourself with this gentle session.", file: "a-meditation-on-self-love.mp3", cover: "cover-self-love.png" }, { title: "Deep Sleep Story", description: "A calming story to help you drift off to a peaceful and restorative sleep.", file: "deep-sleep-story.mp3", cover: "cover-sleep.png" } ];

    // --- DOM ELEMENT SELECTORS ---
    const DOMElements = {
        allSections: document.querySelectorAll('main section'), header: document.querySelector('header'),
        authSection: document.getElementById('auth-section'), loginBox: document.getElementById('login-box'), signupBox: document.getElementById('signup-box'),
        loginUsernameInput: document.getElementById('login-username'), loginPinInput: document.getElementById('login-pin'),
        signupUsernameInput: document.getElementById('signup-username'), loginBtn: document.getElementById('login-btn'), signupBtn: document.getElementById('signup-btn'),
        showSignupLink: document.getElementById('show-signup'), showLoginLink: document.getElementById('show-login'),
        loginError: document.getElementById('login-error'), signupError: document.getElementById('signup-error'),
        welcomeUserEl: document.getElementById('welcome-user'), logoutBtn: document.getElementById('logout-btn'),
        languageSwitcher: document.getElementById('language-switcher'), themeCheckbox: document.getElementById('theme-checkbox'),
        navLinks: document.querySelectorAll('.nav-links a'), quizSection: document.getElementById('quiz-section'),
        questionText: document.getElementById('question-text'), answerButtons: document.getElementById('answer-buttons'),
        quizComplete: document.getElementById('quiz-complete'), startChatBtn: document.getElementById('start-chat-btn'),
        questionArea: document.getElementById('question-area'), sessionList: document.getElementById('session-list'),
        newSessionBtn: document.getElementById('new-session-btn'), endSessionBtn: document.getElementById('end-session-btn'),
        chatSessionName: document.getElementById('chat-session-name'), chatMessages: document.getElementById('chat-messages'),
        chatInput: document.getElementById('chat-input'), sendBtn: document.getElementById('send-btn'),
        journalList: document.getElementById('journal-list'), editorHeading: document.getElementById('editor-heading'),
        journalTitleInput: document.getElementById('journal-title'), journalContentInput: document.getElementById('journal-content'),
        saveJournalBtn: document.getElementById('save-journal-btn'), deleteJournalBtn: document.getElementById('delete-journal-btn'), reflectJournalBtn: document.getElementById('reflect-journal-btn'),
        pinModal: document.getElementById('pin-modal'), pinModalTitle: document.getElementById('pin-modal-title'), pinModalPrompt: document.getElementById('pin-modal-prompt'),
        pinInputs: document.querySelectorAll('.pin-input'), pinError: document.getElementById('pin-error'), pinSubmitBtn: document.getElementById('pin-submit-btn'), pinCancelBtn: document.getElementById('pin-cancel-btn'),
        changePinBtn: document.getElementById('change-pin-btn'), userProfileTextarea: document.getElementById('user-profile-textarea'), saveProfileBtn: document.getElementById('save-profile-btn'),
        audioGallery: document.getElementById('audio-gallery'), resourceList: document.getElementById('resource-list'),
        filterCountry: document.getElementById('filter-country'), filterType: document.getElementById('filter-type'), filterAnonymity: document.getElementById('filter-anonymity'),
        findNearbyBtn: document.getElementById('find-nearby-btn'), locationStatus: document.getElementById('location-status'), mapContainer: document.getElementById('map'),
        emergencyResultsContainer: document.getElementById('emergency-results-container'), emergencyResults: document.getElementById('emergency-results'),
        tosModal: document.getElementById('tos-modal'), tosLink: document.getElementById('tos-link'), privacyLink: document.getElementById('privacy-link'), closeTosModalBtn: document.querySelector('#tos-modal .close-button'),
        saveMyMessageBtn: document.getElementById('save-my-message-btn'), myMessageTextarea: document.getElementById('my-message-textarea'),
        myMessageStatus: document.getElementById('my-message-status'), messageWall: document.getElementById('message-wall'),
    };

    // --- UTILITY FUNCTIONS ---
    async function apiFetch(endpoint, options = {}) {
        options.credentials = 'include';
        if (options.body) {
            options.headers = { 'Content-Type': 'application/json', ...options.headers };
            options.body = JSON.stringify(options.body);
        }
        const response = await fetch(endpoint, options);
        if (response.status === 401 && endpoint !== '/api/check_auth') {
            showAuthUI(); throw new Error('Not authenticated');
        }
        return response;
    }

    function showSection(sectionId) {
        DOMElements.allSections.forEach(section => section.classList.add('hidden'));
        document.getElementById(sectionId)?.classList.remove('hidden');
        DOMElements.navLinks.forEach(link => link.classList.toggle('active', link.dataset.section === sectionId));
    }

    function setTheme(isDark) {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        DOMElements.themeCheckbox.checked = isDark;
    }

    // --- AUTHENTICATION ---
    function showAuthUI() { DOMElements.header.classList.add('hidden'); showSection('auth-section'); }
    function showMainAppUI(username) {
        appState.currentUser = username;
        DOMElements.header.classList.remove('hidden');
        DOMElements.welcomeUserEl.textContent = `Hi, ${username}`;
        showSection('chat-section');
        loadChatView();
    }

    async function handleSignup() {
        DOMElements.signupError.textContent = '';
        const username = DOMElements.signupUsernameInput.value.trim();
        if (username.length < 3) { DOMElements.signupError.textContent = 'Username must be at least 3 characters.'; return; }
        try {
            const pin = await getPin({ title: 'Set Your Account PIN', prompt: 'Create a 4-digit PIN for your new account.', buttonText: 'Set PIN', cancellable: true });
            const confirmPin = await getPin({ title: 'Confirm PIN', prompt: 'Please enter the PIN again to confirm.', buttonText: 'Confirm', cancellable: true });
            if (pin !== confirmPin) { alert('PINs did not match. Please try again.'); return; }
            
            const response = await apiFetch('/api/signup', { method: 'POST', body: { username, pin } });
            const data = await response.json();
            if (response.ok) { showMainAppUI(data.username); } 
            else { DOMElements.signupError.textContent = data.error || 'An error occurred.'; }
        } catch (error) { console.log("PIN setup cancelled."); }
    }

    async function handleLogin() {
        DOMElements.loginError.textContent = '';
        const username = DOMElements.loginUsernameInput.value.trim();
        const pin = DOMElements.loginPinInput.value.trim();
        if (!username || !pin) { DOMElements.loginError.textContent = 'Username and PIN are required.'; return; }
        
        const response = await apiFetch('/api/login', { method: 'POST', body: { username, pin } });
        const data = await response.json();
        if (response.ok) { showMainAppUI(data.username); } 
        else { DOMElements.loginError.textContent = data.error || 'An error occurred.'; }
    }

    async function handleLogout() {
        await apiFetch('/api/logout', { method: 'POST' });
        showAuthUI();
        DOMElements.loginUsernameInput.value = '';
        DOMElements.loginPinInput.value = '';
        DOMElements.signupUsernameInput.value = '';
    }

    function getPin(config) {
        return new Promise((resolve, reject) => {
            const { pinModal, pinModalTitle, pinModalPrompt, pinSubmitBtn, pinError, pinInputs, pinCancelBtn } = DOMElements;
            pinModalTitle.textContent = config.title; pinModalPrompt.textContent = config.prompt; pinSubmitBtn.textContent = config.buttonText;
            pinCancelBtn.style.display = config.cancellable === false ? 'none' : 'inline-block';
            pinError.textContent = ''; pinInputs.forEach(input => input.value = ''); pinModal.style.display = 'flex'; pinInputs[0].focus();
            
            const onSubmit = () => { const pin = Array.from(pinInputs).map(i => i.value).join(''); if (pin.length === 4) { cleanup(); resolve(pin); } else { pinError.textContent = 'Please enter a 4-digit PIN.'; } };
            const onCancel = () => { cleanup(); reject('PIN entry cancelled'); };
            const cleanup = () => { pinModal.style.display = 'none'; pinSubmitBtn.onclick = null; pinCancelBtn.onclick = null; };
            pinSubmitBtn.onclick = onSubmit; pinCancelBtn.onclick = onCancel;
        });
    }

    // --- CHAT & QUIZ ---
    let userQuizAnswers = [], currentQuestionIndex = 0;
    function resetQuiz() { userQuizAnswers = []; currentQuestionIndex = 0; DOMElements.questionArea.classList.remove('hidden'); DOMElements.quizComplete.classList.add('hidden'); displayQuestion(); }
    function displayQuestion() {
        if (currentQuestionIndex < quizQuestions.length) {
            const q = quizQuestions[currentQuestionIndex];
            DOMElements.questionText.textContent = q.question;
            DOMElements.answerButtons.innerHTML = '';
            q.answers.forEach(ans => { const btn = document.createElement('button'); btn.textContent = ans; btn.className = 'answer-btn'; btn.onclick = () => { userQuizAnswers.push(`${q.question}: ${ans}`); currentQuestionIndex++; displayQuestion(); }; DOMElements.answerButtons.appendChild(btn); });
        } else { DOMElements.questionArea.classList.add('hidden'); DOMElements.quizComplete.classList.remove('hidden'); }
    }
    
    async function handleQuizCompletion() {
        try {
            const response = await apiFetch('/api/sessions', { method: 'POST', body: { quiz_answers: userQuizAnswers } });
            const newSession = await response.json();
            appState.currentSessionId = newSession.id;
            await renderSessionList();
            DOMElements.chatMessages.innerHTML = '';
            renderMessage(newSession.initial_message, true); // type the greeting
            DOMElements.chatSessionName.textContent = newSession.name;
            showSection('chat-section');
        } catch (error) { console.error("Failed to create new session:", error); alert("Could not start a new session."); }
    }
    
    async function loadChatView() {
        DOMElements.chatMessages.innerHTML = '<p>Loading sessions...</p>';
        await renderSessionList();
        const activeSession = document.querySelector('#session-list li.active');
        if (activeSession) {
            appState.currentSessionId = parseInt(activeSession.dataset.sessionId);
            loadSession(appState.currentSessionId);
        } else {
            DOMElements.chatMessages.innerHTML = '<p class="info-message">Select a session or start a new one.</p>';
            DOMElements.chatSessionName.textContent = 'BigSister';
        }
    }

    async function renderSessionList() {
        try {
            const response = await apiFetch('/api/sessions');
            const sessions = await response.json();
            DOMElements.sessionList.innerHTML = '';
            sessions.forEach(session => {
                const li = document.createElement('li');
                li.dataset.sessionId = session.id;
                li.className = (session.id === appState.currentSessionId) ? 'active' : '';
                const nameSpan = document.createElement('span'); nameSpan.textContent = session.name;
                const buttonsDiv = document.createElement('div'); buttonsDiv.className = 'session-buttons';
                const renameBtn = document.createElement('button'); renameBtn.className = 'rename-session-btn'; renameBtn.innerHTML = '<i class="fas fa-pencil-alt"></i>'; renameBtn.onclick = (e) => { e.stopPropagation(); renameSession(session.id); };
                const deleteBtn = document.createElement('button'); deleteBtn.className = 'delete-session-btn'; deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>'; deleteBtn.onclick = (e) => { e.stopPropagation(); deleteSession(session.id); };
                buttonsDiv.append(renameBtn, deleteBtn);
                li.append(nameSpan, buttonsDiv);
                li.addEventListener('click', () => { appState.currentSessionId = session.id; loadSession(session.id); });
                DOMElements.sessionList.appendChild(li);
            });
        } catch (error) { DOMElements.sessionList.innerHTML = '<li>Could not load sessions.</li>'; }
    }

    async function loadSession(sessionId) {
        appState.currentSessionId = sessionId;
        document.querySelectorAll('#session-list li').forEach(li => li.classList.toggle('active', li.dataset.sessionId == sessionId));
        const activeLi = document.querySelector(`#session-list li[data-session-id='${sessionId}']`);
        if(activeLi) DOMElements.chatSessionName.textContent = activeLi.querySelector('span').textContent;

        try {
            const response = await apiFetch(`/api/sessions/${sessionId}/messages`);
            const messages = await response.json();
            DOMElements.chatMessages.innerHTML = '';
            messages.forEach(msg => renderMessage(msg, false)); // Don't type historical messages
        } catch (error) { DOMElements.chatMessages.innerHTML = '<p class="error-message">Could not load messages.</p>'; }
    }

    async function renameSession(sessionId) {
        const li = document.querySelector(`#session-list li[data-session-id='${sessionId}']`);
        const oldName = li.querySelector('span').textContent;
        const newName = prompt("Rename session:", oldName);
        if (newName && newName.trim() !== "") {
            await apiFetch(`/api/sessions/${sessionId}`, { method: 'PUT', body: { name: newName.trim() } });
            await renderSessionList();
            if (sessionId === appState.currentSessionId) { DOMElements.chatSessionName.textContent = newName.trim(); }
        }
    }

    async function deleteSession(sessionId) {
        if (!confirm("Are you sure you want to permanently delete this chat session?")) return;
        await apiFetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
        if (appState.currentSessionId === sessionId) { appState.currentSessionId = null; }
        loadChatView();
    }

    async function handleSendMessage() {
        if (appState.isBotTyping || !appState.currentSessionId) return;
        const userText = DOMElements.chatInput.value.trim();
        if (!userText) return;
        renderMessage({ role: 'user', content: userText }, false);
        DOMElements.chatInput.value = '';
        appState.isBotTyping = true;
        try {
            const response = await apiFetch('/api/chat', { method: 'POST', body: { message: userText, session_id: appState.currentSessionId } });
            const data = await response.json();
            if (response.ok) { renderMessage({ role: 'assistant', content: data.reply }, true); } 
            else { renderMessage({ role: 'assistant', content: FRIENDLY_ERROR_MESSAGE }, true); }
        } catch (error) { renderMessage({ role: 'assistant', content: FRIENDLY_ERROR_MESSAGE }, true); } 
        finally { appState.isBotTyping = false; }
    }

    function renderMessage(message, useTypewriter) {
        const div = document.createElement('div');
        div.className = `message ${message.role === 'user' ? 'user-message' : 'bot-message'}`;
        const p = document.createElement('p');
        div.appendChild(p);
        DOMElements.chatMessages.appendChild(div);

        if (useTypewriter && message.role === 'assistant') {
            appState.isBotTyping = true;
            let i = 0;
            const interval = setInterval(() => {
                p.innerHTML = marked.parse(message.content.slice(0, ++i));
                DOMElements.chatMessages.scrollTop = DOMElements.chatMessages.scrollHeight;
                if (i >= message.content.length) { clearInterval(interval); appState.isBotTyping = false; }
            }, 20);
        } else {
            p.innerHTML = marked.parse(message.content);
            DOMElements.chatMessages.scrollTop = DOMElements.chatMessages.scrollHeight;
        }
    }

    // --- JOURNAL (Database backed) ---
    async function loadJournalView() { resetJournalEditor(); await renderJournalList(); }
    async function renderJournalList() {
        const response = await apiFetch('/api/journal');
        const entries = await response.json();
        DOMElements.journalList.innerHTML = '';
        entries.forEach(entry => {
            const item = document.createElement('div');
            item.className = `journal-item ${entry.id === appState.currentJournalId ? 'active' : ''}`;
            item.dataset.journalId = entry.id;
            item.innerHTML = `<h4>${entry.title}</h4><p>${new Date(entry.timestamp).toLocaleDateString()}</p>`;
            item.addEventListener('click', () => loadJournalEntry(entry.id));
            DOMElements.journalList.appendChild(item);
        });
    }
    async function loadJournalEntry(journalId) {
        appState.currentJournalId = journalId;
        const response = await apiFetch(`/api/journal/${journalId}`);
        const entry = await response.json();
        DOMElements.journalTitleInput.value = entry.title;
        DOMElements.journalContentInput.value = entry.content;
        DOMElements.editorHeading.textContent = `Editing: ${entry.title}`;
        DOMElements.deleteJournalBtn.classList.remove('hidden');
        DOMElements.reflectJournalBtn.classList.remove('hidden');
        DOMElements.saveJournalBtn.textContent = 'Update Entry';
        renderJournalList();
    }
    function resetJournalEditor() {
        appState.currentJournalId = null;
        DOMElements.journalTitleInput.value = ''; DOMElements.journalContentInput.value = '';
        DOMElements.editorHeading.textContent = 'New Entry';
        DOMElements.deleteJournalBtn.classList.add('hidden'); DOMElements.reflectJournalBtn.classList.add('hidden');
        DOMElements.saveJournalBtn.textContent = 'Save Entry';
    }
    async function saveJournalEntry() {
        const title = DOMElements.journalTitleInput.value.trim();
        const content = DOMElements.journalContentInput.value.trim();
        if (!title || !content) { alert('Title and content are required.'); return; }
        const method = appState.currentJournalId ? 'PUT' : 'POST';
        const endpoint = appState.currentJournalId ? `/api/journal/${appState.currentJournalId}` : '/api/journal';
        const response = await apiFetch(endpoint, { method, body: { title, content } });
        const newEntry = await response.json();
        appState.currentJournalId = newEntry.id;
        await renderJournalList();
        loadJournalEntry(newEntry.id);
    }
    async function deleteJournalEntry() {
        if (!appState.currentJournalId || !confirm('Are you sure you want to delete this entry?')) return;
        await apiFetch(`/api/journal/${appState.currentJournalId}`, { method: 'DELETE' });
        resetJournalEditor();
        await renderJournalList();
    }
    async function reflectOnJournalEntry() {
        if (!appState.currentJournalId) return;
        const entryRes = await apiFetch(`/api/journal/${appState.currentJournalId}`);
        const entry = await entryRes.json();
        const sessionsRes = await apiFetch('/api/sessions');
        const sessions = await sessionsRes.json();
        let activeSessionId = sessions[0]?.id;
        if (!activeSessionId) {
            alert("Please start a new chat session before reflecting.");
            showSection('quiz-section'); resetQuiz(); return;
        }
        appState.currentSessionId = activeSessionId;
        showSection('chat-section');
        await loadSession(activeSessionId);
        const userVisibleMessage = `I want to talk about my journal entry titled "${entry.title}". Can you help me reflect on it?`;
        const hiddenContext = `The user wants to discuss a journal entry.\nTitle: ${entry.title}\nContent:\n${entry.content}`;
        // We'll add this to the chat on the backend for context.
        handleSendMessage(); // This will need modification on the backend to accept context. For now, it just starts the conversation.
    }
    
    // --- OTHER SECTIONS (RESTORED) ---
    function renderResources() {
        const { resourceList, filterCountry, filterType, filterAnonymity } = DOMElements;
        resourceList.innerHTML = '';
        const country = filterCountry.value, type = filterType.value, anonymity = filterAnonymity.value;
        const filtered = allResources.filter(r => (country === 'all' || r.country === country) && (type === 'all' || r.type === type) && (anonymity === 'all' || r.anonymity === anonymity));
        filtered.forEach(r => {
            const card = document.createElement('div'); card.className = 'resource-card';
            const tags = `<span class="tag ${r.anonymity === 'Anonymous' ? 'tag-anon' : 'tag-conf'}">${r.anonymity}</span>` +
                         (r.contact.call ? '<span class="tag tag-call">Call</span>' : '') +
                         (r.contact.text ? '<span class="tag tag-text">Text</span>' : '') +
                         (r.contact.chat ? '<span class="tag tag-chat">Chat</span>' : '');
            const contact = (r.contact.call ? `<p><strong>Call:</strong> ${r.contact.call}</p>` : '') +
                            (r.contact.text ? `<p><strong>Text:</strong> ${r.contact.text}</p>` : '') +
                            (r.contact.chat ? `<p><strong>Chat:</strong> ${r.contact.chat}</p>` : '');
            card.innerHTML = `<h3>${r.name}</h3><div class="resource-tags">${tags}</div><p>${r.description}</p><div class="contact-info">${contact}</div>`;
            resourceList.appendChild(card);
        });
    }

    function renderMindMatters() {
        const { audioGallery } = DOMElements;
        audioGallery.innerHTML = '';
        mindMattersAudio.forEach(audioItem => {
            const card = document.createElement('div'); card.className = 'audio-card';
            card.innerHTML = `<div class="audio-card-cover"><img src="static/img/audio-covers/${audioItem.cover}" alt="${audioItem.title}"></div><div class="audio-card-info"><h3>${audioItem.title}</h3><p>${audioItem.description}</p><audio src="static/audio/${audioItem.file}"></audio><div class="custom-audio-player"><button class="play-pause-btn"><i class="fas fa-play"></i></button><div class="time-container"><span class="current-time">0:00</span> / <span class="total-duration">0:00</span></div><input type="range" class="seek-bar" value="0" step="1"><a href="static/audio/${audioItem.file}" download class="download-btn" title="Download Audio"><i class="fas fa-download"></i></a></div></div>`;
            audioGallery.appendChild(card);
        });
        initializeAudioPlayers();
    }
    
    function initializeAudioPlayers() {
        document.querySelectorAll('.audio-card').forEach(card => {
            const audio = card.querySelector('audio'); const playPauseBtn = card.querySelector('.play-pause-btn');
            const playIcon = playPauseBtn.querySelector('i'); const seekBar = card.querySelector('.seek-bar');
            const currentTimeEl = card.querySelector('.current-time'); const totalDurationEl = card.querySelector('.total-duration');
            const formatTime = (time) => { const minutes = Math.floor(time / 60); const seconds = Math.floor(time % 60); return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`; };
            playPauseBtn.onclick = () => { if (audio.paused) { audio.play(); } else { audio.pause(); } };
            audio.onplay = () => playIcon.className = 'fas fa-pause';
            audio.onpause = () => playIcon.className = 'fas fa-play';
            audio.onloadedmetadata = () => { totalDurationEl.textContent = formatTime(audio.duration); seekBar.max = audio.duration; };
            audio.ontimeupdate = () => { currentTimeEl.textContent = formatTime(audio.currentTime); seekBar.value = audio.currentTime; seekBar.style.backgroundSize = `${(audio.currentTime / audio.duration) * 100}% 100%`; };
            seekBar.oninput = () => { audio.currentTime = seekBar.value; };
        });
    }

    async function loadCommunityView() {
        const [msgRes, myRes] = await Promise.all([apiFetch('/api/community/messages/approved'), apiFetch('/api/community/message')]);
        const msgs = await msgRes.json();
        DOMElements.messageWall.innerHTML = '';
        msgs.forEach(m => { const c = document.createElement('div'); c.className = 'message-card'; c.innerHTML = `<p>${m}</p>`; DOMElements.messageWall.appendChild(c); });
        const myMsg = await myRes.json();
        if (myMsg.status !== 'not_found') { DOMElements.myMessageTextarea.value = myMsg.text; DOMElements.myMessageStatus.textContent = `Status: ${myMsg.status}`; }
        else { DOMElements.myMessageStatus.textContent = "You haven't posted yet."; }
    }

    async function handleSaveMyMessage() {
        const text = DOMElements.myMessageTextarea.value.trim();
        if (!text) { alert('Message cannot be empty.'); return; }
        const r = await apiFetch('/api/community/message', { method: 'POST', body: { message_text: text } });
        const d = await r.json();
        DOMElements.myMessageStatus.textContent = `Status: ${d.status}. ${d.reason || ''}`;
        loadCommunityView(); // Refresh the wall to show the new message if approved
    }
    
    // --- INITIALIZATION ---
    function addEventListeners() {
        DOMElements.themeCheckbox.addEventListener('change', () => setTheme(DOMElements.themeCheckbox.checked));
        DOMElements.languageSwitcher.addEventListener('change', (e) => setLanguage(e.target.value));
        DOMElements.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = e.target.dataset.section;
                showSection(sectionId);
                if (sectionId === 'chat-section') loadChatView();
                if (sectionId === 'journal-section') loadJournalView();
                if (sectionId === 'community-section') loadCommunityView();
                if (sectionId === 'settings-section') { /* Add logic for settings */ }
            });
        });
        DOMElements.showSignupLink.addEventListener('click', () => { DOMElements.loginBox.classList.add('hidden'); DOMElements.signupBox.classList.remove('hidden'); });
        DOMElements.showLoginLink.addEventListener('click', () => { DOMElements.signupBox.classList.add('hidden'); DOMElements.loginBox.classList.remove('hidden'); });
        DOMElements.signupBtn.addEventListener('click', handleSignup); DOMElements.loginBtn.addEventListener('click', handleLogin);
        DOMElements.logoutBtn.addEventListener('click', handleLogout);
        DOMElements.newSessionBtn.addEventListener('click', () => { showSection('quiz-section'); resetQuiz(); });
        DOMElements.startChatBtn.addEventListener('click', handleQuizCompletion);
        DOMElements.sendBtn.addEventListener('click', handleSendMessage);
        DOMElements.chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } });
        DOMElements.saveJournalBtn.addEventListener('click', saveJournalEntry);
        DOMElements.deleteJournalBtn.addEventListener('click', deleteJournalEntry);
        DOMElements.reflectJournalBtn.addEventListener('click', reflectOnJournalEntry);
        DOMElements.saveMyMessageBtn.addEventListener('click', handleSaveMyMessage);
        [DOMElements.tosLink, DOMElements.privacyLink].forEach(l => l.addEventListener('click', (e) => { e.preventDefault(); DOMElements.tosModal.style.display = 'flex'; }));
        DOMElements.closeTosModalBtn.addEventListener('click', () => DOMElements.tosModal.style.display = 'none');
        window.addEventListener('click', (e) => { if (e.target == DOMElements.tosModal) DOMElements.tosModal.style.display = 'none'; });
        DOMElements.pinInputs.forEach((input, index) => { input.addEventListener('keydown', (e) => { if (e.key >= 0 && e.key <= 9) { setTimeout(() => { if (index < 3) DOMElements.pinInputs[index + 1].focus(); }, 10); } else if (e.key === 'Backspace') { setTimeout(() => { if (index > 0) DOMElements.pinInputs[index - 1].focus(); }, 10); } }); });
        [DOMElements.filterCountry, DOMElements.filterType, DOMElements.filterAnonymity].forEach(f => f.addEventListener('change', renderResources));
    }

    async function initialize() {
        setTheme(localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches));
        addEventListeners();
        renderMindMatters();
        renderResources();
        try {
            const response = await apiFetch('/api/check_auth');
            if (response.ok) {
                const data = await response.json();
                showMainAppUI(data.username);
            } else {
                showAuthUI();
            }
        } catch (error) { showAuthUI(); }
    }

    initialize();
});
