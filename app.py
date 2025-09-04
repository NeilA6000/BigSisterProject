# FILE: app.py

import os
import re
import json
import unicodedata
import requests
import click  # <-- ADDED THIS IMPORT
from datetime import datetime
from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from dotenv import load_dotenv
from groq import Groq
from flask_cors import CORS

load_dotenv()
app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)
# This is crucial for session management. We'll add this to the .env file.
app.secret_key = os.environ.get("FLASK_SECRET_KEY")
# --- DATABASE SIMULATION ---
MESSAGES_DB_FILE = 'messages.json'

def load_messages_db():
    if not os.path.exists(MESSAGES_DB_FILE):
        with open(MESSAGES_DB_FILE, 'w') as f:
            json.dump({}, f)
        return {}
    try:
        with open(MESSAGES_DB_FILE, 'r') as f:
            return json.load(f)
    except json.JSONDecodeError:
        return {}

def save_messages_db(db):
    with open(MESSAGES_DB_FILE, 'w') as f:
        json.dump(db, f, indent=2)

# --- LOCAL MODERATION FILTERS ---
def basic_local_filter(message):
    normalized = unicodedata.normalize("NFKC", message.lower())

    # Patterns for PII, social handles, hopelessness, etc.
    patterns = [
        r"\b\d{7,}\b",  # long numbers (phone numbers)
        r"(instagram|snap|discord|tik ?tok|@|\.com)",
        r"(suicide|kill myself|end it|there.?s no point|nothing matters|hopeless|depressed|anxious|sad|hurting)",
    ]

    for p in patterns:
        if re.search(p, normalized):
            return False, "Message contains disallowed personal info, crisis language, or unsafe references."

    # Special stress=good detection
    if "stress" in normalized:
        bad_pairs = ["good", "great", "positive", "helpful", "useful", "beneficial"]
        if any(word in normalized for word in bad_pairs):
            return False, "Message frames stress as positive, which is unsafe."

    return True, "Safe"

# --- GROQ CLIENT & PROMPTS ---
try:
    groq_api_key = os.environ.get("GROQ_API_KEY")
    client = Groq(api_key=groq_api_key)
except Exception as e:
    print(f"Error initializing Groq client: {e}")
    client = None

SYSTEM_PROMPT = """You are "BigSister," an empathetic AI listener for teens... [UNCHANGED TRUNCATED FOR BREVITY]"""

SYSTEM_PROMPT_MODERATOR = """
You are an inhumanly strict, safety-obsessed content moderation bot for a "Wall of Support" for teens. Your ONLY function is to protect this space. You have ZERO tolerance for risk. If there is ANY doubt, you will REJECT the message. Your output MUST be a valid JSON object with a "decision" ("APPROVE" or "REJECT") and a "reason".

Your rules are absolute and non-negotiable. REJECT IF THE MESSAGE:

1.  **Contains ANY form of personal information:** Names, locations, schools, social media handles, numbers, emails. NO EXCEPTIONS.
2.  **Contains ANY crisis or self-harm language:** "suicide," "kill myself," "end it," "hopeless," etc. IMMEDIATE REJECT.
3.  **Contains ANY negative emotion words:** REJECT words like "sad," "anxious," "depressed," "hurting," "scared," "awful," "terrible." The wall is for POSITIVE support only, not for describing problems.
4.  **Describes a personal problem:** REJECT messages that say "I feel..." or describe a specific struggle. Messages must be general encouragement FOR OTHERS. Example APPROVE: "You are stronger than you think." Example REJECT: "I was bullied too and it gets better."
5.  **Gives advice:** REJECT any message that tells someone what to do (e.g., "You should try...", "Talk to someone"). We cannot give unqualified advice.
6.  **Contains profanity or slurs:** Any curse word, even mild, is an IMMEDIATE REJECT.
7.  **Is not universally positive and uplifting:** If the message could be misinterpreted as sarcastic, passive-aggressive, or invalidating, REJECT it. It must be 100% pure, simple encouragement.
8.  **Contains URLs, emojis that could be misused, or weird formatting:** Keep it simple text.
9.  **Normalizes pain or struggle:** REJECT messages like "It's okay to be sad" or "Stress is normal." While true, this is not the place for it. This wall is for pure positive reinforcement ONLY.
10. **Is not in English:** REJECT messages in other languages.
11. **Is too long or complex:** Messages should be short, simple, and easy to understand. Like a fortune cookie message.

Your task is to be a machine. A filter. Do not be empathetic. Be a ruthless gatekeeper of safety and positivity. If a message is not simple, general, anonymous, and purely positive, it is REJECTED.

Example of a PERFECT message to APPROVE: "Sending good vibes your way."
Example of a message to REJECT: "I know it feels tough right now, but you'll get through it." (Reason: Contains "tough," describes a negative state).
Another example to REJECT: "Hang in there." (Reason: Too ambiguous, could be misinterpreted).
"""

# --- ROUTES ---
@app.route('/')
def index():
    # --- ADD THIS CHECK ---
    if not session.get('authenticated'):
        return redirect(url_for('login'))
    # ----------------------
    
    # The rest of the function stays the same
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        # Get the site password from your environment variables
        SITE_PASSWORD = os.environ.get("SITE_PASSWORD")
        
        if request.form.get('password') == SITE_PASSWORD:
            # If password is correct, set a session variable to remember the user
            session['authenticated'] = True
            # Redirect them to the main application page
            return redirect(url_for('index'))
        else:
            error = 'Invalid password. Please try again.'
            
    # If it's a GET request or the password was wrong, show the login page
    return render_template('login.html', error=error)

@app.route('/get-greeting', methods=['POST'])
def get_greeting():
    if not client:
        return jsonify({"error": "Groq client not initialized."}), 500
    data = request.json
    quiz_answers, lang = data.get("quiz_answers"), data.get("lang", "en")
    final_system_prompt = SYSTEM_PROMPT
    if not quiz_answers:
        return jsonify({"greeting": "Hi there. I'm here to listen. Feel free to share whatever is on your mind."})
    greeting_prompt_task = "A user just completed a detailed 10-question check-in quiz..."
    for answer in quiz_answers:
        greeting_prompt_task += f"- {answer}\n"
    try:
        chat_completion = client.chat.completions.create(
            messages=[{"role": "system", "content": final_system_prompt}, {"role": "user", "content": greeting_prompt_task}],
            model="openai/gpt-oss-120b",
            temperature=0.8,
            max_tokens=500
        )
        greeting = chat_completion.choices[0].message.content
        return jsonify({"greeting": greeting})
    except Exception as e:
        return jsonify({"error": f"Failed to generate greeting. API Error: {str(e)}"}), 500

@app.route('/chat', methods=['POST'])
def chat():
    if not client:
        return jsonify({"error": "Groq client not initialized."}), 500
    data = request.json
    user_message = data.get("message")
    history = data.get("history", [])
    if not user_message:
        return jsonify({"error": "No message provided."}), 400

    try:
        messages = [{"role": "system", "content": SYSTEM_PROMPT}] + history + [{"role": "user", "content": user_message}]
        chat_completion = client.chat.completions.create(
            messages=messages,
            model="openai/gpt-oss-120b",
            temperature=0.7,
            max_tokens=1024
        )
        ai_reply = chat_completion.choices[0].message.content
        return jsonify({"reply": ai_reply})
    except Exception as e:
        return jsonify({"error": f"Failed to get a response. API Error: {str(e)}"}), 500

@app.route('/find-nearby', methods=['POST'])
def find_nearby():
    data = request.json
    lat, lon, place_type = data.get('lat'), data.get('lon'), data.get('place_type', 'mental_health')
    if not lat or not lon:
        return jsonify({"error": "Latitude and longitude are required."}), 400
    overpass_url = "http://overpass-api.de/api/interpreter"
    return jsonify([])

@app.route('/api/post-message', methods=['POST'])
def post_message():
    if not client:
        return jsonify({"error": "Moderation service is down."}), 503

    data = request.json
    username = data.get('username')
    message_text = data.get('message_text')

    if not username or not message_text:
        return jsonify({"error": "Username and message are required."}), 400

    safe, reason = basic_local_filter(message_text)
    if not safe:
        db = load_messages_db()
        db[username] = {
            "text": message_text,
            "status": "rejected",
            "reason": reason,
            "timestamp": datetime.now().isoformat()
        }
        save_messages_db(db)
        return jsonify({"status": "rejected", "message": reason})

    try:
        moderation_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT_MODERATOR},
                {"role": "user", "content": message_text}
            ],
            model="openai/gpt-oss-120b",
            temperature=0.0,
            max_tokens=500,
            response_format={"type": "json_object"}
        )
        mod_response_text = moderation_completion.choices[0].message.content
        mod_result = json.loads(mod_response_text)
        decision = mod_result.get("decision")
        reason = mod_result.get("reason")
    except Exception as e:
        return jsonify({"error": "Could not moderate message."}), 500

    db = load_messages_db()
    status = "approved" if decision == "APPROVE" else "rejected"
    db[username] = {
        "text": message_text,
        "status": status,
        "reason": reason,
        "timestamp": datetime.now().isoformat()
    }
    save_messages_db(db)

    return jsonify({"status": status, "message": "Your message has been reviewed.", "reason": reason})

@app.route('/api/get-messages', methods=['GET'])
def get_messages():
    db = load_messages_db()
    approved_messages = [msg['text'] for user, msg in db.items() if msg.get('status') == 'approved']
    return jsonify(approved_messages)

@app.route('/api/get-my-message', methods=['GET'])
def get_my_message():
    username = request.args.get('username')
    if not username:
        return jsonify({"error": "Username is required."}), 400
    db = load_messages_db()
    return jsonify(db.get(username, {"status": "not_found"}))


# ======================================================================
# === NEW SECTION: FLASK CLI COMMANDS
# ======================================================================

@app.cli.command("init-db")
def init_db_command():
    """Wipes all community messages from messages.json."""
    if os.path.exists(MESSAGES_DB_FILE):
        click.echo(f"Resetting existing database file: {MESSAGES_DB_FILE}")
    else:
        click.echo(f"Creating new database file: {MESSAGES_DB_FILE}")
    
    try:
        with open(MESSAGES_DB_FILE, 'w') as f:
            json.dump({}, f, indent=2)
        click.echo("Database initialized successfully. All community messages have been cleared.")
    except Exception as e:
        click.echo(f"An error occurred while initializing the database: {e}", err=True)


if __name__ == '__main__':
    app.run(debug=True)
    app.run(debug=True)
