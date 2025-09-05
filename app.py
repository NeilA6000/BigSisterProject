# FILE: app.py

import os
import re
import json
import unicodedata
import requests
import click
from datetime import datetime
from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from dotenv import load_dotenv
from groq import Groq
from flask_cors import CORS
# --- NEW IMPORTS ---
from flask_sqlalchemy import SQLAlchemy

load_dotenv()
app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)
app.secret_key = os.environ.get("FLASK_SECRET_KEY")

# --- DATABASE CONFIGURATION ---
# Render provides the DATABASE_URL environment variable automatically.
# The 'postgresql://' dialect is automatically handled by SQLAlchemy.
db_uri = os.environ.get('DATABASE_URL')
if db_uri and db_uri.startswith("postgres://"):
    db_uri = db_uri.replace("postgres://", "postgresql://", 1)
app.config['SQLALCHEMY_DATABASE_URI'] = db_uri
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- DATABASE MODEL DEFINITION ---
# This class defines the structure of our 'community_message' table in the database.
class CommunityMessage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    # Each user can only submit one message, so their username must be unique.
    submitted_by_username = db.Column(db.String(80), nullable=False, unique=True)
    text = db.Column(db.Text, nullable=False)
    # Status can be 'pending', 'approved', or 'rejected'
    status = db.Column(db.String(20), nullable=False, default='pending')
    reason = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self):
        return f'<Message from {self.submitted_by_username}>'


# --- OLD DATABASE SIMULATION IS NOW REMOVED ---
# The functions load_messages_db() and save_messages_db() are no longer needed.


# --- LOCAL MODERATION FILTERS ---
def basic_local_filter(message):
    normalized = unicodedata.normalize("NFKC", message.lower())
    patterns = [
        r"\b\d{7,}\b",
        r"(instagram|snap|discord|tik ?tok|@|\.com)",
        r"(suicide|kill myself|end it|there.?s no point|nothing matters|hopeless|depressed|anxious|sad|hurting)",
    ]
    for p in patterns:
        if re.search(p, normalized):
            return False, "Message contains disallowed personal info, crisis language, or unsafe references."
    if "stress" in normalized:
        bad_pairs = ["good", "great", "positive", "helpful", "useful", "beneficial"]
        if any(word in normalized for word in bad_pairs):
            return False, "Message frames stress as positive, which is unsafe."
    return True, "Safe"

# --- GROQ CLIENT & PROMPTS (Unchanged) ---
try:
    groq_api_key = os.environ.get("GROQ_API_KEY")
    client = Groq(api_key=groq_api_key)
except Exception as e:
    print(f"Error initializing Groq client: {e}")
    client = None

SYSTEM_PROMPT = """You are "BigSister," an empathetic AI listener for teens... [UNCHANGED TRUNCATED FOR BREVITY]"""
SYSTEM_PROMPT_MODERATOR = """
You are an inhumanly strict, safety-obsessed content moderation bot... [UNCHANGED TRUNCATED FOR BREVITY]
"""

# --- ROUTES (Unchanged Routes) ---
@app.route('/')
def index():
    if not session.get('authenticated'):
        return redirect(url_for('login'))
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        SITE_PASSWORD = os.environ.get("SITE_PASSWORD")
        if request.form.get('password') == SITE_PASSWORD:
            session['authenticated'] = True
            return redirect(url_for('index'))
        else:
            error = 'Invalid password. Please try again.'
    return render_template('login.html', error=error)

@app.route('/get-greeting', methods=['POST'])
def get_greeting():
    # This route is unchanged
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
    # This route is unchanged
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
    # This route is unchanged
    data = request.json
    lat, lon, place_type = data.get('lat'), data.get('lon'), data.get('place_type', 'mental_health')
    if not lat or not lon:
        return jsonify({"error": "Latitude and longitude are required."}), 400
    overpass_url = "http://overpass-api.de/api/interpreter"
    return jsonify([])


# --- ROUTES (UPDATED DATABASE-DRIVEN ROUTES) ---

@app.route('/api/post-message', methods=['POST'])
def post_message():
    if not client:
        return jsonify({"error": "Moderation service is down."}), 503

    data = request.json
    username = data.get('username')
    message_text = data.get('message_text')

    if not username or not message_text:
        return jsonify({"error": "Username and message are required."}), 400

    # Find if the user already has a message in the database.
    message_entry = CommunityMessage.query.filter_by(submitted_by_username=username).first()

    safe, reason = basic_local_filter(message_text)
    if not safe:
        if message_entry:
            # Update the existing message
            message_entry.text = message_text
            message_entry.status = "rejected"
            message_entry.reason = reason
            message_entry.timestamp = datetime.utcnow()
        else:
            # Create a new message
            message_entry = CommunityMessage(
                submitted_by_username=username,
                text=message_text,
                status="rejected",
                reason=reason
            )
            db.session.add(message_entry)
        db.session.commit() # Save changes to the database
        return jsonify({"status": "rejected", "message": reason})

    # If local filter passes, proceed with AI moderation
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
        print(f"Moderation API Error: {e}")
        return jsonify({"error": "Could not moderate message due to an API error."}), 500

    status = "approved" if decision == "APPROVE" else "rejected"

    if message_entry:
        # Update the existing entry
        message_entry.text = message_text
        message_entry.status = status
        message_entry.reason = reason
        message_entry.timestamp = datetime.utcnow()
    else:
        # Create a new entry
        message_entry = CommunityMessage(
            submitted_by_username=username,
            text=message_text,
            status=status,
            reason=reason
        )
        db.session.add(message_entry)
    
    db.session.commit() # Save changes to the database

    return jsonify({"status": status, "message": "Your message has been reviewed.", "reason": reason})


@app.route('/api/get-messages', methods=['GET'])
def get_messages():
    # Query the database for all messages with the status 'approved'.
    approved_messages = CommunityMessage.query.filter_by(status='approved').all()
    # Extract just the text from each message object to send to the frontend.
    message_texts = [msg.text for msg in approved_messages]
    return jsonify(message_texts)


@app.route('/api/get-my-message', methods=['GET'])
def get_my_message():
    username = request.args.get('username')
    if not username:
        return jsonify({"error": "Username is required."}), 400
    
    # Query the database for the message submitted by this specific user.
    user_message = CommunityMessage.query.filter_by(submitted_by_username=username).first()
    
    if user_message:
        # If found, return its details.
        return jsonify({
            "text": user_message.text,
            "status": user_message.status,
            "reason": user_message.reason,
            "timestamp": user_message.timestamp.isoformat()
        })
    else:
        # If not found, let the frontend know.
        return jsonify({"status": "not_found"})


# ======================================================================
# === NEW DATABASE CLI COMMANDS
# ======================================================================

@app.cli.command("init-db")
def init_db_command():
    """Creates the database tables from the models."""
    with app.app_context():
        db.create_all()
    click.echo("Initialized the database and created all tables.")


if __name__ == '__main__':
    app.run(debug=True)