document.addEventListener('DOMContentLoaded', () => {

    // --- STATE MANAGEMENT ---
    let appState = { currentUser: null, currentSessionId: null, currentLang: 'en', isBotTyping: false, map: null, currentJournalId: null, };

    // --- CONSTANTS ---
    const FRIENDLY_ERROR_MESSAGE = "Sweetheart, my thoughts got a little tangled just now and I couldn’t finish what I wanted to say.\n\nIt’s nothing you did — sometimes the wires behind me get a bit messy.\n\nCould you try again in a little while? 💜";

    // --- DOM ELEMENT SELECTORS ---
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
    const audioGallery = document.getElementById('audio-gallery');
    const resourceList = document.getElementById('resource-list');
    const filterCountry = document.getElementById('filter-country');
    const filterType = document.getElementById('filter-type');
    const filterAnonymity = document.getElementById('filter-anonymity');
    const findNearbyBtn = document.getElementById('find-nearby-btn');
    const locationStatus = document.getElementById('location-status');
    const emergencyResults = document.getElementById('emergency-results');
    const mapContainer = document.getElementById('map');
    const placeTypeFilter = document.getElementById('place-type-filter');
    const emergencyResultsContainer = document.getElementById('emergency-results-container');
    const tosModal = document.getElementById('tos-modal');
    const tosLink = document.getElementById('tos-link');
    const privacyLink = document.getElementById('privacy-link');
    const closeTosModalBtn = document.querySelector('#tos-modal .close-button');
    const saveMyMessageBtn = document.getElementById('save-my-message-btn');
    const myMessageTextarea = document.getElementById('my-message-textarea');
    const myMessageStatus = document.getElementById('my-message-status');
    const messageWall = document.getElementById('message-wall');

    // --- TRANSLATIONS ---
    const translations = {
        'en': { 'nav_chat': 'Chat', 'nav_journal': 'Journal', 'nav_community': 'Community', 'nav_mind_matters': 'Mind Matters', 'nav_resources': 'Resources', 'nav_emergency': 'Emergency', 'nav_settings': 'Settings', 'nav_about': 'About', 'logout_btn': 'Logout', 'login_title': 'Welcome Back', 'login_subtitle': 'Enter your username and PIN to continue.', 'username_placeholder': 'Username', 'pin_placeholder': '4-Digit PIN', 'login_btn': 'Login', 'show_signup_link': "Don't have an account? Sign up.", 'signup_title': 'Create Your Private Account', 'signup_subtitle': 'Choose a username. This is all you need.', 'signup_btn': 'Sign Up', 'show_login_link': 'Already have an account? Login.', 'quiz_title': "Welcome. Let's see how you're feeling.", 'quiz_subtitle': "Your answers help create a private emotional snapshot for this session. This is completely anonymous.", 'quiz_thanks': 'Thank you for sharing.', 'quiz_next_steps': 'You can now start chatting with our listening bot.', 'quiz_start_chat': 'Start Chat', 'sessions_title': 'Sessions', 'new_session_btn': '+ New Session', 'chat_header': 'Big Sister (Anonymous)', 'end_session_btn': 'End Session', 'chat_placeholder': 'Type your message here...', 'journal_title': 'Private Journal', 'journal_entries': 'Your Entries', 'journal_new_entry': 'New Entry', 'journal_title_placeholder': 'Entry Title', 'journal_content_placeholder': "Write what's on your mind...", 'journal_save': 'Save Entry', 'journal_delete': 'Delete', 'journal_reflect': 'Reflect with BigSister', 'community_title': 'A Wall of Support', 'community_subtitle': 'Read anonymous, supportive messages from others, and leave one of your own. All messages are strictly reviewed by an AI to keep this a safe space.', 'community_my_message': 'Your Anonymous Message', 'community_privacy': "You can post one message to the wall. It will be reviewed by our AI moderator before it appears publicly. Your username is never shown.", 'community_placeholder': 'Write something kind and supportive...', 'community_save_btn': 'Save & Submit for Review', 'mind_matters_title': 'Mind Matters', 'mind_matters_subtitle': 'A collection of guided audio sessions to help you find your calm.', 'resources_title': 'Support Services & Hotlines', 'resources_subtitle': 'Select your country from the dropdown to find relevant hotlines and services.', 'filter_all_countries': 'All Countries', 'filter_all_types': 'All Service Types', 'filter_general': 'General', 'filter_substance': 'Substance Abuse', 'filter_all_anon': 'All Anonymity', 'filter_anonymous': 'Anonymous', 'filter_confidential': 'Confidential', 'emergency_title': 'Location-Based Emergency Resources', 'emergency_subtitle': "If you're in immediate danger, please call 911 (or your local emergency number).", 'emergency_mental_health': 'Mental Health Support', 'emergency_hospitals': 'Hospitals', 'emergency_police': 'Police Stations', 'emergency_find_btn': 'Find Help Near Me', 'emergency_status_initial': 'Select a service type and click the button to find help on the map.', 'emergency_results': 'Results', 'settings_title': 'Settings', 'settings_change_pin': 'Change Your PIN', 'settings_pin_desc': "Your 4-digit PIN protects your journal and your account access.", 'settings_change_pin_btn': 'Change PIN', 'settings_about_you': 'About You (Optional & Private)', 'settings_about_you_desc': "<strong>This is COMPLETELY anonymous.</strong> The information below is stored ONLY on your device in your browser's local storage. It is never sent to a server until you chat, and is only used to help BigSister understand you better during a conversation.", 'settings_about_you_placeholder': "Tell me anything you'd like me to remember (e.g., your pronouns, things you're struggling with, your goals).", 'settings_save_profile_btn': 'Save Info', 'about_title': 'About BigSister', 'about_para_1': 'Big Sister is a personal project that grew out of my passion for supporting mental health through technology. I wanted to create a friendly AI companion that feels approachable and comforting, someone people can talk to when they need a listening ear. Big Sister is designed to provide a safe, judgment-free space where you can share your thoughts and feelings openly.', 'about_para_2': 'She listens with empathy, offers gentle guidance, and encourages self-reflection, helping users practice self-care and cope with challenging moments. Big Sister is not a replacement for professional therapy, but she is meant to be a source of comfort and support, like a caring older sister who is always there for you.', 'about_para_3': 'This project reflects my belief that even small acts of understanding and kindness can make a difference. Through Big Sister, I hope to bring a little more connection, reassurance, and care into people’s daily lives, one conversation at a time.', 'footer_privacy': 'Privacy Policy', 'footer_tos': 'Terms of Service', 'tos_title': 'Terms of Service & Privacy', 'tos_last_updated': 'Last Updated: October 2024' },
        'es': { 'nav_chat': 'Chatear', 'nav_journal': 'Diario', 'nav_community': 'Comunidad', 'nav_mind_matters': 'Mente Sana', 'nav_resources': 'Recursos', 'nav_emergency': 'Emergencia', 'nav_settings': 'Ajustes', 'nav_about': 'Sobre', 'logout_btn': 'Cerrar Sesión', 'login_title': 'Bienvenido/a de Nuevo', 'login_subtitle': 'Ingresa tu nombre de usuario y PIN para continuar.', 'username_placeholder': 'Usuario', 'pin_placeholder': 'PIN de 4 dígitos', 'login_btn': 'Iniciar Sesión', 'show_signup_link': '¿No tienes cuenta? Regístrate.', 'signup_title': 'Crea Tu Cuenta Privada', 'signup_subtitle': 'Elige un nombre de usuario. Es todo lo que necesitas.', 'signup_btn': 'Registrarse', 'show_login_link': '¿Ya tienes cuenta? Inicia sesión.' },
        'fr': { 'nav_chat': 'Discuter', 'nav_journal': 'Journal', 'nav_community': 'Communauté', 'nav_mind_matters': "L'Esprit Compte", 'nav_resources': 'Ressources', 'nav_emergency': 'Urgence', 'nav_settings': 'Paramètres', 'nav_about': 'À Propos', 'logout_btn': 'Déconnexion', 'login_title': 'Bon Retour', 'login_subtitle': "Entrez votre nom d'utilisateur et PIN pour continuer.", 'username_placeholder': "Nom d'utilisateur", 'pin_placeholder': 'PIN à 4 chiffres', 'login_btn': 'Connexion', 'show_signup_link': "Vous n'avez pas de compte? S'inscrire.", 'signup_title': 'Créez Votre Compte Privé', 'signup_subtitle': "Choisissez un nom d'utilisateur. C'est tout ce dont vous avez besoin.", 'signup_btn': "S'inscrire", 'show_login_link': 'Vous avez déjà un compte? Connexion.' }
    };
    function setLanguage(lang) { appState.currentLang = lang; document.documentElement.lang = lang; document.querySelectorAll('[data-translate-key]').forEach(el => { const key = el.dataset.translateKey; const translation = translations[lang]?.[key] || translations['en'][key]; if (translation) { if (el.placeholder) el.placeholder = translation; else if (el.tagName === 'BUTTON' && el.querySelector('span')) el.querySelector('span').innerText = translation; else el.innerHTML = translation; } }); }

    const db = { getUserData: (username) => JSON.parse(localStorage.getItem(`bigsister_${username}`)), setUserData: (username, data) => localStorage.setItem(`bigsister_${username}`, JSON.stringify(data)), userExists: (username) => localStorage.getItem(`bigsister_${username}`) !== null, };
    function showSection(sectionId) { allSections.forEach(section => section.classList.add('hidden')); const activeSection = document.getElementById(sectionId); if (activeSection) activeSection.classList.remove('hidden'); navLinks.forEach(link => { link.classList.toggle('active', link.dataset.section === sectionId); }); }
    function showAuthUI() { header.classList.add('hidden'); showSection('auth-section'); }
    function showMainAppUI() { header.classList.remove('hidden'); welcomeUserEl.textContent = `Hi, ${appState.currentUser}`; showSection('quiz-section'); resetQuiz(); }
    function setTheme(isDark) { document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light'); localStorage.setItem('theme', isDark ? 'dark' : 'light'); themeCheckbox.checked = isDark; }

    function initialize() { const savedTheme = localStorage.getItem('theme'); const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches; setTheme(savedTheme === 'dark' || (savedTheme === null && systemPrefersDark)); renderMindMatters(); renderResources(); const loggedInUser = sessionStorage.getItem('bigsister_currentUser'); if (loggedInUser && db.userExists(loggedInUser)) { appState.currentUser = loggedInUser; showMainAppUI(); } else { showAuthUI(); } addEventListeners(); setLanguage('en'); }

    function addEventListeners() {
        themeCheckbox.addEventListener('change', () => setTheme(themeCheckbox.checked));
        languageSwitcher.addEventListener('change', (e) => setLanguage(e.target.value));
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = e.target.dataset.section;
                if (sectionId === 'journal-section') { handleJournalAccess(); } 
                else if (sectionId === 'community-section') { loadCommunityPage(); } 
                else {
                    showSection(sectionId);
                    if (sectionId === 'chat-section') { renderSessionList(); if (appState.currentSessionId) { loadSession(appState.currentSessionId); } else { chatMessages.innerHTML = '<p class="info-message">Select a session or start a new one.</p>'; chatSessionName.textContent = 'BigSister'; } } 
                    else if (sectionId === 'settings-section') { loadUserProfile(); }
                }
            });
        });
        showSignupLink.addEventListener('click', () => { loginBox.classList.add('hidden'); signupBox.classList.remove('hidden'); });
        showLoginLink.addEventListener('click', () => { signupBox.classList.add('hidden'); loginBox.classList.remove('hidden'); });
        signupBtn.addEventListener('click', handleSignup);
        loginBtn.addEventListener('click', handleLogin);
        logoutBtn.addEventListener('click', handleLogout);
        startChatBtn.addEventListener('click', handleQuizCompletion);
        newSessionBtn.addEventListener('click', () => { showSection('quiz-section'); resetQuiz(); });
        endSessionBtn.addEventListener('click', endCurrentSession);
        sendBtn.addEventListener('click', () => handleSendMessage());
        chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleSendMessage(); } });
        saveJournalBtn.addEventListener('click', saveJournalEntry);
        deleteJournalBtn.addEventListener('click', deleteJournalEntry);
        reflectJournalBtn.addEventListener('click', reflectOnJournalEntry);
        changePinBtn.addEventListener('click', handleChangePin);
        saveProfileBtn.addEventListener('click', saveUserProfile);
        saveMyMessageBtn.addEventListener('click', handleSaveMyMessage);
        tosLink.addEventListener('click', (e) => { e.preventDefault(); tosModal.style.display = 'flex'; });
        privacyLink.addEventListener('click', (e) => { e.preventDefault(); tosModal.style.display = 'flex'; });
        closeTosModalBtn.addEventListener('click', () => tosModal.style.display = 'none');
        pinCancelBtn.addEventListener('click', () => pinModal.style.display = 'none');
        window.addEventListener('click', (event) => { if (event.target == tosModal || event.target == pinModal) { event.target.style.display = 'none'; } });
        [filterCountry, filterType, filterAnonymity].forEach(f => f.addEventListener('change', renderResources));
        findNearbyBtn.addEventListener('click', findNearbyHelp);
    }

    async function handleSignup() {
        const username = signupUsernameInput.value.trim();
        if (username.length < 3) { signupError.textContent = 'Username must be at least 3 characters.'; return; }
        if (db.userExists(username)) { signupError.textContent = 'Username already exists.'; return; }
        try {
            const newPin = await getPin({ title: 'Set Your Account PIN', prompt: 'Create a 4-digit PIN. You will use this to log in.', buttonText: 'Set PIN', cancellable: false });
            const confirmPin = await getPin({ title: 'Confirm PIN', prompt: 'Please enter the PIN again to confirm.', buttonText: 'Confirm', cancellable: false });
            if (newPin !== confirmPin) { alert('PINs did not match. Please try again.'); return handleSignup(); }
            const userData = { pin: newPin, sessions: {}, journal: {}, userProfile: "" };
            db.setUserData(username, userData);
            loginUser(username);
        } catch (error) { console.log("PIN setup cancelled by user."); }
    }
    function handleLogin() {
        const username = loginUsernameInput.value.trim();
        const pin = loginPinInput.value.trim();
        if (!username || !pin) { loginError.textContent = 'Username and PIN are required.'; return; }
        if (!db.userExists(username)) { loginError.textContent = 'User does not exist.'; return; }
        const userData = db.getUserData(username);
        if (userData.pin !== pin) { loginError.textContent = 'Incorrect username or PIN.'; return; }
        loginUser(username);
    }
    function loginUser(username) { appState.currentUser = username; sessionStorage.setItem('bigsister_currentUser', username); showMainAppUI(); }
    function handleLogout() { appState.currentUser = null; appState.currentSessionId = null; sessionStorage.removeItem('bigsister_currentUser'); showAuthUI(); loginUsernameInput.value = ''; loginPinInput.value = ''; signupUsernameInput.value = ''; }
    function getPin(config) {
        return new Promise((resolve, reject) => {
            pinModalTitle.textContent = config.title;
            pinModalPrompt.textContent = config.prompt;
            pinSubmitBtn.textContent = config.buttonText;
            pinCancelBtn.style.display = config.cancellable === false ? 'none' : 'inline-block';
            pinError.textContent = '';
            pinInputs.forEach(input => input.value = '');
            pinModal.style.display = 'flex';
            pinInputs[0].focus();
            pinSubmitBtn.onclick = () => { const pin = Array.from(pinInputs).map(i => i.value).join(''); if (pin.length === 4) { pinModal.style.display = 'none'; resolve(pin); } else { pinError.textContent = 'Please enter a 4-digit PIN.'; } };
            pinCancelBtn.onclick = () => { pinModal.style.display = 'none'; reject('PIN entry cancelled'); };
        });
    }
    pinInputs.forEach((input, index) => { input.addEventListener('keydown', (e) => { if (e.key >= 0 && e.key <= 9) { input.value = ''; setTimeout(() => { if (index < 3) pinInputs[index + 1].focus(); }, 10); } else if (e.key === 'Backspace') { setTimeout(() => { if (index > 0) pinInputs[index - 1].focus(); }, 10); } }); });
    async function handleJournalAccess() { const userData = db.getUserData(appState.currentUser); try { const enteredPin = await getPin({ title: 'Enter PIN', prompt: 'Enter your 4-digit PIN to access your journal.', buttonText: 'Unlock' }); if (enteredPin === userData.pin) { showJournal(); } else { alert('Incorrect PIN.'); } } catch (error) { console.log(error); showSection('chat-section'); } }
    function showJournal() { renderJournalList(); resetJournalEditor(); showSection('journal-section'); }
    
    async function handleChangePin() {
        const userData = db.getUserData(appState.currentUser);
        try {
            const oldPin = await getPin({ title: 'Enter Old PIN', prompt: 'Enter your current 4-digit PIN.', buttonText: 'Confirm' });
            if (oldPin !== userData.pin) { alert('Incorrect old PIN.'); return; }
            const newPin = await getPin({ title: 'Enter New PIN', prompt: 'Enter your new 4-digit PIN.', buttonText: 'Set New PIN' });
            const confirmPin = await getPin({ title: 'Confirm New PIN', prompt: 'Confirm your new 4-digit PIN.', buttonText: 'Confirm' });
            if (newPin === confirmPin) { userData.pin = newPin; db.setUserData(appState.currentUser, userData); alert('PIN changed successfully!'); } else { alert('New PINs did not match.'); }
        } catch (err) { console.log('Change PIN cancelled.'); }
    }
    function loadUserProfile() { const userData = db.getUserData(appState.currentUser); userProfileTextarea.value = userData.userProfile || ''; }
    function saveUserProfile() { const userData = db.getUserData(appState.currentUser); userData.userProfile = userProfileTextarea.value.trim(); db.setUserData(appState.currentUser, userData); alert('Your information has been saved locally.'); }

    let userQuizAnswers = [];
    const quizQuestions = [ { question: "In one word, how are you feeling right now?", answers: ["Overwhelmed", "Sad", "Anxious", "Okay"] }, { question: "How has your energy been lately?", answers: ["Totally drained", "Lower than usual", "Pretty normal", "Full of energy"] }, { question: "What's taking up most of your headspace?", answers: ["Relationships with others", "School or work pressure", "How I feel about myself", "Something from the past"] }, { question: "Have you felt more like being alone or with people?", answers: ["Definitely alone", "A little of both", "I want to be around others", "I haven't thought about it"] }, { question: "How have you been sleeping?", answers: ["Restlessly, or not enough", "A bit off", "Fairly well", "Very well"] }, { question: "How does the idea of the next few days feel?", answers: ["Daunting or scary", "A bit stressful", "Manageable", "Hopeful or exciting"] }, { question: "Have you been able to do things you normally enjoy?", answers: ["Not at all", "Only a little", "For the most part", "Yes, definitely"] }, { question: "How critical have you been of yourself recently?", answers: ["Extremely critical", "More than usual", "About the same", "I've been kind to myself"] }, { question: "Where do you feel the most tension in your body?", answers: ["In my chest or stomach", "In my shoulders or neck", "Headaches", "I feel pretty relaxed"] }, { question: "What kind of support feels most needed right now?", answers: ["Just someone to listen", "Help finding a distraction", "Understanding my feelings", "I'm not sure yet"] } ];
    let currentQuestionIndex = 0;
    function resetQuiz() { userQuizAnswers = []; currentQuestionIndex = 0; questionArea.classList.remove('hidden'); quizComplete.classList.add('hidden'); displayQuestion(); }
    function displayQuestion() { if (currentQuestionIndex < quizQuestions.length) { const q = quizQuestions[currentQuestionIndex]; questionText.textContent = q.question; answerButtons.innerHTML = ''; q.answers.forEach(ans => { const btn = document.createElement('button'); btn.textContent = ans; btn.classList.add('answer-btn'); btn.addEventListener('click', handleAnswer); answerButtons.appendChild(btn); }); } else { questionArea.classList.add('hidden'); quizComplete.classList.remove('hidden'); } }
    function handleAnswer() { userQuizAnswers.push(`${quizQuestions[currentQuestionIndex].question}: ${this.textContent}`); currentQuestionIndex++; displayQuestion(); }
    function handleQuizCompletion() { const newSessionId = `session_${Date.now()}`; appState.currentSessionId = newSessionId; const userData = db.getUserData(appState.currentUser); userData.sessions[newSessionId] = { id: newSessionId, name: new Date().toLocaleString(), startTime: new Date().toISOString(), messages: [], isActive: true, }; db.setUserData(appState.currentUser, userData); showSection('chat-section'); renderSessionList(); getInitialBotGreeting(newSessionId); }
    
    function handleApiError(error, sessionId) {
        console.error("API Error:", error);
        const userData = db.getUserData(appState.currentUser);
        if (userData && sessionId && userData.sessions[sessionId]) {
            const botMessage = { role: 'assistant', content: FRIENDLY_ERROR_MESSAGE };
            userData.sessions[sessionId].messages.push(botMessage);
            db.setUserData(appState.currentUser, userData);
            loadSession(sessionId);
        }
    }
    async function getInitialBotGreeting(sessionId) {
        chatMessages.innerHTML = ''; endSessionBtn.classList.remove('hidden');
        try {
            const response = await fetch('/get-greeting', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quiz_answers: userQuizAnswers, lang: appState.currentLang }) });
            if (!response.ok) throw new Error('Server responded with an error.');
            const data = await response.json();
            const userData = db.getUserData(appState.currentUser);
            userData.sessions[sessionId].messages.push({ role: 'assistant', content: data.greeting });
            db.setUserData(appState.currentUser, userData);
            loadSession(sessionId);
        } catch (error) { handleApiError(error, sessionId); }
    }
    function typeMessage(text, sender) { appState.isBotTyping = true; const messageContainer = document.createElement('div'); messageContainer.className = `message ${sender}-message`; const contentP = document.createElement('p'); messageContainer.appendChild(contentP); chatMessages.appendChild(messageContainer); let i = 0; const interval = setInterval(() => { contentP.innerHTML = marked.parse(text.slice(0, ++i)); chatMessages.scrollTop = chatMessages.scrollHeight; if (i >= text.length) { clearInterval(interval); appState.isBotTyping = false; } }, 20); }
    function renderMessage(message) { const div = document.createElement('div'); div.className = `message ${message.role === 'user' ? 'user-message' : 'bot-message'}`; const p = document.createElement('p'); p.innerHTML = marked.parse(message.content); div.appendChild(p); chatMessages.appendChild(div); }
    async function handleSendMessage(journalContext = null, userVisibleMessage = null) {
        if (appState.isBotTyping || !appState.currentSessionId) return;
        const userData = db.getUserData(appState.currentUser);
        if (!userData.sessions[appState.currentSessionId]?.isActive) { alert("This session has ended. Please start a new one."); return; }
        const userText = userVisibleMessage || chatInput.value.trim();
        if (!userText) return;
        const userMessage = { role: 'user', content: userText };
        renderMessage(userMessage);
        userData.sessions[appState.currentSessionId].messages.push(userMessage);
        db.setUserData(appState.currentUser, userData);
        chatInput.value = '';
        const history = userData.sessions[appState.currentSessionId].messages.slice(0, -1);
        const apiPayload = { message: userText, history: history, lang: appState.currentLang, journal_context: journalContext, user_profile: userData.userProfile };
        try {
            const response = await fetch('/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(apiPayload) });
            if (!response.ok) throw new Error('Server responded with an error.');
            const data = await response.json();
            const botMessage = { role: 'assistant', content: data.reply };
            const updatedUserData = db.getUserData(appState.currentUser);
            updatedUserData.sessions[appState.currentSessionId].messages.push(botMessage);
            db.setUserData(appState.currentUser, updatedUserData);
            typeMessage(data.reply, 'bot');
        } catch (error) {
            console.error("Chat Error:", error);
            typeMessage(FRIENDLY_ERROR_MESSAGE, 'bot');
            const updatedUserData = db.getUserData(appState.currentUser);
            if (updatedUserData && appState.currentSessionId && updatedUserData.sessions[appState.currentSessionId]) {
                updatedUserData.sessions[appState.currentSessionId].messages.push({ role: 'assistant', content: FRIENDLY_ERROR_MESSAGE });
                db.setUserData(appState.currentUser, updatedUserData);
            }
        }
    }

    function renderSessionList() {
        const userData = db.getUserData(appState.currentUser);
        sessionList.innerHTML = '';
        Object.values(userData.sessions).sort((a, b) => new Date(b.startTime) - new Date(a.startTime)).forEach(session => {
            const li = document.createElement('li');
            li.dataset.sessionId = session.id;
            if (session.id === appState.currentSessionId) li.classList.add('active');
            const nameSpan = document.createElement('span');
            nameSpan.textContent = session.name || new Date(session.startTime).toLocaleString();
            li.appendChild(nameSpan);
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'session-buttons';
            const renameBtn = document.createElement('button');
            renameBtn.className = 'rename-session-btn';
            renameBtn.innerHTML = '<i class="fas fa-pencil-alt"></i>';
            renameBtn.title = 'Rename session';
            renameBtn.onclick = (e) => { e.stopPropagation(); renameSession(session.id); };
            buttonsDiv.appendChild(renameBtn);
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-session-btn';
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteBtn.title = 'Delete session';
            deleteBtn.onclick = (e) => { e.stopPropagation(); deleteSession(session.id); };
            buttonsDiv.appendChild(deleteBtn);
            li.appendChild(buttonsDiv);
            li.addEventListener('click', () => { appState.currentSessionId = session.id; loadSession(session.id); renderSessionList(); });
            sessionList.appendChild(li);
        });
    }
    function loadSession(sessionId) { const userData = db.getUserData(appState.currentUser); const session = userData.sessions[sessionId]; if (!session) return; chatMessages.innerHTML = ''; session.messages.forEach(renderMessage); chatMessages.scrollTop = chatMessages.scrollHeight; chatSessionName.textContent = session.name || new Date(session.startTime).toLocaleString(); endSessionBtn.classList.toggle('hidden', !session.isActive); chatInput.disabled = !session.isActive; sendBtn.disabled = !session.isActive; }
    function endCurrentSession() { if (!appState.currentSessionId) return; const userData = db.getUserData(appState.currentUser); const session = userData.sessions[appState.currentSessionId]; if (session) { const newName = prompt("Name this session:", session.name); if (newName) session.name = newName; session.isActive = false; db.setUserData(appState.currentUser, userData); appState.currentSessionId = null; chatMessages.innerHTML = '<p class="info-message">Session ended. Select another or start a new one.</p>'; chatSessionName.textContent = 'BigSister'; endSessionBtn.classList.add('hidden'); renderSessionList(); } }
    function renameSession(sessionId) { const userData = db.getUserData(appState.currentUser); const session = userData.sessions[sessionId]; const newName = prompt("Rename session:", session.name); if (newName && newName.trim() !== "") { session.name = newName.trim(); db.setUserData(appState.currentUser, userData); renderSessionList(); if (sessionId === appState.currentSessionId) { chatSessionName.textContent = newName.trim(); } } }
    function deleteSession(sessionId) { if (!confirm("Are you sure you want to permanently delete this chat session? This cannot be undone.")) return; const userData = db.getUserData(appState.currentUser); delete userData.sessions[sessionId]; db.setUserData(appState.currentUser, userData); if (appState.currentSessionId === sessionId) { appState.currentSessionId = null; chatMessages.innerHTML = '<p class="info-message">Select a session or start a new one.</p>'; chatSessionName.textContent = 'BigSister'; endSessionBtn.classList.add('hidden'); chatInput.disabled = true; sendBtn.disabled = true; } renderSessionList(); }

    function renderJournalList() { const userData = db.getUserData(appState.currentUser); journalList.innerHTML = ''; Object.values(userData.journal).sort((a, b) => b.timestamp - a.timestamp).forEach(entry => { const item = document.createElement('div'); item.className = 'journal-item'; item.dataset.journalId = entry.id; if (entry.id === appState.currentJournalId) item.classList.add('active'); item.innerHTML = `<h4>${entry.title}</h4><p>${new Date(entry.timestamp).toLocaleDateString()}</p>`; item.addEventListener('click', () => loadJournalEntry(entry.id)); journalList.appendChild(item); }); }
    function loadJournalEntry(journalId) { appState.currentJournalId = journalId; const userData = db.getUserData(appState.currentUser); const entry = userData.journal[journalId]; if (entry) { journalTitleInput.value = entry.title; journalContentInput.value = entry.content; editorHeading.textContent = `Editing: ${entry.title}`; deleteJournalBtn.classList.remove('hidden'); reflectJournalBtn.classList.remove('hidden'); } renderJournalList(); }
    function resetJournalEditor() { appState.currentJournalId = null; journalTitleInput.value = ''; journalContentInput.value = ''; editorHeading.textContent = 'New Entry'; deleteJournalBtn.classList.add('hidden'); reflectJournalBtn.classList.add('hidden'); renderJournalList(); }
    function saveJournalEntry() { const title = journalTitleInput.value.trim(); const content = journalContentInput.value.trim(); if (!title || !content) { alert('Title and content cannot be empty.'); return; } const userData = db.getUserData(appState.currentUser); const journalId = appState.currentJournalId || `journal_${Date.now()}`; userData.journal[journalId] = { id: journalId, title, content, timestamp: Date.now(), }; db.setUserData(appState.currentUser, userData); appState.currentJournalId = journalId; resetJournalEditor(); loadJournalEntry(journalId); }
    function deleteJournalEntry() { if (!appState.currentJournalId || !confirm('Are you sure you want to delete this entry?')) return; const userData = db.getUserData(appState.currentUser); delete userData.journal[appState.currentJournalId]; db.setUserData(appState.currentUser, userData); resetJournalEditor(); }
    function reflectOnJournalEntry() { if (!appState.currentJournalId) return; const userData = db.getUserData(appState.currentUser); const entry = userData.journal[appState.currentJournalId]; const activeSessionId = Object.keys(userData.sessions).find(id => userData.sessions[id].isActive); if (!activeSessionId) { alert("Please start a new chat session before reflecting."); showSection('quiz-section'); resetQuiz(); return; } appState.currentSessionId = activeSessionId; showSection('chat-section'); loadSession(activeSessionId); const userVisibleMessage = `I want to talk about my journal entry titled "${entry.title}".`; const hiddenContext = `Title: ${entry.title}\nContent:\n${entry.content}`; handleSendMessage(hiddenContext, userVisibleMessage); }
    
    async function loadCommunityPage() {
        showSection('community-section');
        myMessageTextarea.value = '';
        myMessageStatus.textContent = 'Loading your message...';
        messageWall.innerHTML = '<p>Loading supportive messages...</p>';
        try {
            const response = await fetch(`/api/get-my-message?username=${appState.currentUser}`);
            const data = await response.json();
            if (response.ok) {
                if (data.status === 'not_found') { myMessageStatus.textContent = 'You haven\'t posted a message yet.'; } 
                else { myMessageTextarea.value = data.text; if (data.status === 'approved') { myMessageStatus.textContent = 'Your message is live on the wall! ✨'; } else if (data.status === 'rejected') { myMessageStatus.textContent = 'Your message was not approved as it did not meet our safety guidelines for being a supportive space.'; } else { myMessageStatus.textContent = 'Your message is pending review.'; } }
            } else { myMessageStatus.textContent = 'Could not load your message status.'; }
        } catch (error) { console.error("Error fetching user's message:", error); myMessageStatus.textContent = 'Error loading your message status.'; }
        try {
            const response = await fetch('/api/get-messages');
            const messages = await response.json();
            renderMessageWall(messages);
        } catch (error) { console.error("Error fetching community messages:", error); messageWall.innerHTML = '<p>Could not load messages right now. Please try again later.</p>'; }
    }
    function renderMessageWall(messages) {
        messageWall.innerHTML = '';
        if (!messages || messages.length === 0) { messageWall.innerHTML = '<p>Be the first to leave a supportive message!</p>'; return; }
        messages.sort(() => 0.5 - Math.random()).forEach(msgText => {
            const card = document.createElement('div'); card.className = 'message-card';
            const p = document.createElement('p'); p.textContent = msgText;
            card.appendChild(p); messageWall.appendChild(card);
        });
    }
    async function handleSaveMyMessage() {
        const messageText = myMessageTextarea.value.trim();
        if (!messageText) { alert('Your message cannot be empty.'); return; }
        myMessageStatus.textContent = 'Submitting for review...';
        saveMyMessageBtn.disabled = true;
        try {
            const response = await fetch('/api/post-message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: appState.currentUser, message_text: messageText }) });
            const data = await response.json();
            if (response.ok) { if (data.status === 'approved') { myMessageStatus.textContent = 'Your message was approved and is now live! ✨'; } else { myMessageStatus.textContent = 'Your message was not approved as it did not meet our safety guidelines for being a supportive space.'; } } 
            else { throw new Error(data.error || 'Server error'); }
        } catch (error) { console.error("Error posting message:", error); myMessageStatus.textContent = 'Could not submit your message. Please try again.'; } 
        finally { saveMyMessageBtn.disabled = false; }
    }

    const mindMattersAudio = [ { title: "How To Get Rid Of Overwhelm", description: "A 10-minute session to guide you through moments when everything feels like too much.", file: "how-to-get-rid-of-overwhelm.mp3", cover: "cover-overwhelm.png" }, { title: "1-Minute Mindfulness Meditation", description: "A short, guided practice to bring you back to the present moment.", file: "5-minute-mindfulness-meditation.mp3", cover: "cover-mindfulness.png" }, { title: "About Panic Attacks", description: "Learn what happens during a panic attack and how to manage it.", file: "guided-breathing-for-anxiety.mp3", cover: "cover-breathing.png" }, { title: "Finding Calm in the Storm", description: "An audio guide to help you find your anchor during difficult emotions.", file: "finding-calm-in-the-storm.mp3", cover: "cover-storm.png" }, { title: "A Meditation on Self-Love", description: "Cultivate kindness and compassion for yourself with this gentle session.", file: "a-meditation-on-self-love.mp3", cover: "cover-self-love.png" }, { title: "Deep Sleep Story", description: "A calming story to help you drift off to a peaceful and restorative sleep.", file: "deep-sleep-story.mp3", cover: "cover-sleep.png" } ]; function renderMindMatters() { audioGallery.innerHTML = ''; mindMattersAudio.forEach(audioItem => { const card = document.createElement('div'); card.className = 'audio-card'; card.innerHTML = ` <div class="audio-card-cover"> <img src="static/img/audio-covers/${audioItem.cover}" alt="${audioItem.title}"> </div> <div class="audio-card-info"> <h3>${audioItem.title}</h3> <p>${audioItem.description}</p> <audio src="static/audio/${audioItem.file}"></audio> <div class="custom-audio-player"> <button class="play-pause-btn"><i class="fas fa-play"></i></button> <div class="time-container"> <span class="current-time">0:00</span> / <span class="total-duration">0:00</span> </div> <input type="range" class="seek-bar" value="0" step="1"> <a href="static/audio/${audioItem.file}" download class="download-btn" title="Download Audio"> <i class="fas fa-download"></i> </a> </div> </div> `; audioGallery.appendChild(card); }); initializeAudioPlayers(); } function initializeAudioPlayers() { document.querySelectorAll('.audio-card').forEach(card => { const audio = card.querySelector('audio'); const playPauseBtn = card.querySelector('.play-pause-btn'); const playIcon = playPauseBtn.querySelector('i'); const seekBar = card.querySelector('.seek-bar'); const currentTimeEl = card.querySelector('.current-time'); const totalDurationEl = card.querySelector('.total-duration'); const formatTime = (time) => { const minutes = Math.floor(time / 60); const seconds = Math.floor(time % 60); return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`; }; playPauseBtn.addEventListener('click', () => { if (audio.paused) { audio.play(); } else { audio.pause(); } }); audio.addEventListener('play', () => playIcon.className = 'fas fa-pause'); audio.addEventListener('pause', () => playIcon.className = 'fas fa-play'); audio.addEventListener('loadedmetadata', () => { totalDurationEl.textContent = formatTime(audio.duration); seekBar.max = audio.duration; }); audio.addEventListener('timeupdate', () => { currentTimeEl.textContent = formatTime(audio.currentTime); seekBar.value = audio.currentTime; const progress = (audio.currentTime / audio.duration) * 100; seekBar.style.backgroundSize = `${progress}% 100%`; }); seekBar.addEventListener('input', () => { audio.currentTime = seekBar.value; }); }); }
    const allResources = [ { name: "Crisis Text Line", country: "USA", type: "Crisis", anonymity: "Anonymous", contact: { text: "HOME to 741741" }, description: "24/7, free, confidential crisis support by text." }, { name: "The Trevor Project", country: "USA", type: "LGBTQ+", anonymity: "Anonymous", contact: { call: "1-866-488-7386", chat: "thetrevorproject.org" }, description: "Crisis intervention and suicide prevention for LGBTQ youth." }, { name: "SAMHSA National Helpline", country: "USA", type: "Substance Abuse", anonymity: "Confidential", contact: { call: "1-800-662-4357" }, description: "Treatment referral and information service." }, { name: "Kids Help Phone", country: "Canada", type: "General", anonymity: "Anonymous", contact: { call: "1-800-668-6868", text: "CONNECT to 686868" }, description: "Canada’s 24/7 e-mental health service for youth." }, { name: "Samaritans", country: "UK", type: "Crisis", anonymity: "Confidential", contact: { call: "116 123" }, description: "Whatever you're going through, a Samaritan will face it with you, 24/7." }, { name: "Shout", country: "UK", type: "Crisis", anonymity: "Anonymous", contact: { text: "SHOUT to 85258" }, description: "Free, confidential, 24/7 text messaging support service." } ]; function renderResources() { resourceList.innerHTML = ''; const country = filterCountry.value; const type = filterType.value; const anonymity = filterAnonymity.value; const filtered = allResources.filter(r => (country === 'all' || r.country === country) && (type === 'all' || r.type === type) && (anonymity === 'all' || r.anonymity === anonymity)); if (filtered.length === 0) { resourceList.innerHTML = '<p>No resources match your filters.</p>'; return; } filtered.forEach(r => { const card = document.createElement('div'); card.className = 'resource-card'; card.innerHTML = `<h3>${r.name}</h3><div class="resource-tags"><span class="tag ${r.anonymity === 'Anonymous' ? 'tag-anon' : 'tag-conf'}">${r.anonymity}</span>${r.contact.call ? '<span class="tag tag-call">Call</span>' : ''}${r.contact.text ? '<span class="tag tag-text">Text</span>' : ''}${r.contact.chat ? '<span class="tag tag-chat">Chat</span>' : ''}</div><p>${r.description}</p><div class="contact-info">${r.contact.call ? `<p><strong>Call:</strong> ${r.contact.call}</p>` : ''}${r.contact.text ? `<p><strong>Text:</strong> ${r.contact.text}</p>` : ''}${r.contact.chat ? `<p><strong>Chat:</strong> ${r.contact.chat}</p>` : ''}</div>`; resourceList.appendChild(card); }); }
    function findNearbyHelp() { locationStatus.textContent = 'Attempting to find your location...'; emergencyResults.innerHTML = ''; mapContainer.style.display = 'none'; emergencyResultsContainer.classList.add('hidden'); if (!navigator.geolocation) { locationStatus.textContent = 'Geolocation is not supported.'; return; } navigator.geolocation.getCurrentPosition( async (position) => { locationStatus.textContent = 'Location found! Searching...'; try { const { latitude, longitude } = position.coords; const placeType = placeTypeFilter.value; const response = await fetch('/find-nearby', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lat: latitude, lon: longitude, place_type: placeType }) }); if (!response.ok) throw new Error((await response.json()).error || 'Server error'); const nearbyPlaces = await response.json(); locationStatus.textContent = 'Here are some resources we found near you:'; mapContainer.style.display = 'block'; emergencyResultsContainer.classList.remove('hidden'); if (appState.map) { appState.map.setView([latitude, longitude], 12); } else { appState.map = L.map('map').setView([latitude, longitude], 12); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(appState.map); } appState.map.eachLayer((layer) => { if (layer instanceof L.Marker) appState.map.removeLayer(layer); }); L.marker([latitude, longitude]).addTo(appState.map).bindPopup("<b>Your Location</b>").openPopup(); if (nearbyPlaces.length === 0) { emergencyResults.innerHTML = '<p>No specific local centers found, but national hotlines are always available.</p>'; } else { nearbyPlaces.forEach(place => { const card = document.createElement('div'); card.className = 'resource-card'; let cardHTML = `<h3>${place.name}</h3>`; if (place.address) cardHTML += `<p>${place.address}</p>`; if (place.phone) cardHTML += `<p><strong>Phone:</strong> <a href="tel:${place.phone}">${place.phone}</a></p>`; if (place.website) cardHTML += `<p><strong>Website:</strong> <a href="${place.website}" target="_blank" rel="noopener noreferrer">Visit Site</a></p>`; if (!place.is_permanent && place.lat && place.lon) { cardHTML += `<p><em>Location shown on map.</em></p>`; L.marker([place.lat, place.lon]).addTo(appState.map).bindPopup(`<b>${place.name}</b><br>${place.phone || ''}`); } card.innerHTML = cardHTML; emergencyResults.appendChild(card); }); } } catch (error) { locationStatus.textContent = `An error occurred while searching. (${error.message})`; } }, () => { locationStatus.innerHTML = 'Unable to retrieve location. You can still use the <a href="#" data-section="resources-section" id="emergency-fallback-link">main Resources list</a>.'; document.getElementById('emergency-fallback-link').addEventListener('click', (e) => { e.preventDefault(); showSection('resources-section'); }); } ); }

    initialize();
});