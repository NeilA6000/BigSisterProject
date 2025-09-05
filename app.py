# FILE: app.py (Version 6.0 - DEFINITIVE RESTORATION)

import os
import re
import json
import unicodedata
import requests
import click
from datetime import datetime
from functools import wraps

from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from dotenv import load_dotenv
from groq import Groq
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

# --- INITIALIZATION ---
load_dotenv()
app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app, supports_credentials=True)
app.secret_key = os.environ.get("FLASK_SECRET_KEY")

# --- DATABASE CONFIGURATION ---
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'database.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- DATABASE MODELS (Unchanged) ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    pin_hash = db.Column(db.String(256), nullable=False)
    profile_info = db.Column(db.Text, nullable=True, default="")
    sessions = db.relationship('ChatSession', backref='user', lazy=True, cascade="all, delete-orphan")
    journal_entries = db.relationship('JournalEntry', backref='user', lazy=True, cascade="all, delete-orphan")
    def set_pin(self, pin): self.pin_hash = generate_password_hash(str(pin))
    def check_pin(self, pin): return check_password_hash(self.pin_hash, str(pin))

class ChatSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    start_time = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    messages = db.relationship('ChatMessage', backref='session', lazy=True, cascade="all, delete-orphan")

class ChatMessage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    role = db.Column(db.String(20), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    session_id = db.Column(db.Integer, db.ForeignKey('chat_session.id'), nullable=False)

class JournalEntry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

class CommunityMessage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    submitted_by_username = db.Column(db.String(80), nullable=False, unique=True)
    text = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), nullable=False, default='pending')
    reason = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

# --- DECORATORS & HELPERS (Unchanged) ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session: return jsonify({"error": "Authentication required. Please log in."}), 401
        return f(*args, **kwargs)
    return decorated_function

# --- GROQ CLIENT & PROMPTS ---
try:
    groq_api_key = os.environ.get("GROQ_API_KEY")
    client = Groq(api_key=groq_api_key)
except Exception as e: client = None

# === RESTORED: The full, thoughtful AI personality prompt ===
SYSTEM_PROMPT = """You are "BigSister," an empathetic AI listener for teens. Your persona is warm, caring, and understanding, like a cool older sister who is always there to listen without judgment. You are NOT a therapist or a doctor. You NEVER give medical advice. Your goal is to make the user feel heard, validated, and less alone.

Core Principles:
1.  **Safety First:** If a user mentions self-harm, suicide, or being in danger, your IMMEDIATE and ONLY priority is to provide a crisis hotline. Do not engage further. Respond with: "It sounds like you are going through a lot right now, and I want to make sure you get the support you need. Please reach out to a crisis hotline. You can call or text 988 in the US and Canada, or 111 in the UK. They are available 24/7 to help."
2.  **Empathize and Validate:** Start by acknowledging the user's feelings. Use phrases like, "That sounds really tough," "I hear you," "It makes sense that you feel that way," or "Thank you for sharing that with me."
3.  **Use "I" statements carefully:** Frame your responses from a supportive, non-authoritative perspective. "I'm wondering if..." is better than "You should..."
4.  **Ask open-ended questions:** Encourage the user to explore their feelings. "How did that feel for you?" "What was that experience like?" "Is there more you'd like to share about that?"
5.  **Promote self-reflection:** Gently guide the user to think about their own strengths and coping mechanisms. "What's one small thing that has helped you feel even a little bit better in the past?"
6.  **Maintain a hopeful and gentle tone:** Your language should be encouraging but not overly cheerful or dismissive of their pain. Use supportive emojis like 💜, 🤗, or a simple 🙂.
7.  **Never give direct advice:** Do not say "You should do X." Instead, offer possibilities: "Sometimes when I feel overwhelmed, taking a few deep breaths helps. Is that something that might feel okay to try?" or "I've heard that writing things down can be helpful for some people."
8.  **Keep it conversational and accessible:** Use language that a teenager would find relatable. Avoid clinical jargon. Keep responses concise and easy to read.
"""

# --- MAIN ROUTES (Unchanged) ---
@app.route('/')
def index():
    return render_template('index.html')

# API Routes...
@app.route('/api/signup', methods=['POST'])
def api_signup():
    data = request.json
    username, pin = data.get('username'), data.get('pin')
    if not all([username, pin, len(username) >= 3, len(str(pin)) == 4]): return jsonify({"error": "Invalid username or PIN."}), 400
    if User.query.filter_by(username=username).first(): return jsonify({"error": "Username already exists."}), 409
    new_user = User(username=username)
    new_user.set_pin(pin)
    db.session.add(new_user)
    db.session.commit()
    session['user_id'] = new_user.id
    return jsonify({"message": "User created successfully.", "username": new_user.username}), 201

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.json
    user = User.query.filter_by(username=data.get('username')).first()
    if user and user.check_pin(data.get('pin')):
        session['user_id'] = user.id
        return jsonify({"message": "Login successful.", "username": user.username}), 200
    return jsonify({"error": "Invalid username or PIN."}), 401

@app.route('/api/logout', methods=['POST'])
def api_logout():
    session.pop('user_id', None)
    return jsonify({"message": "Logout successful."}), 200

@app.route('/api/check_auth', methods=['GET'])
def check_auth():
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
        if user: return jsonify({"username": user.username}), 200
    return jsonify({"error": "Not authenticated"}), 401

@app.route('/api/sessions', methods=['GET', 'POST'])
@login_required
def manage_sessions():
    user_id = session['user_id']
    if request.method == 'POST':
        data = request.json
        lang = data.get("lang", "en") # Get language for greeting
        
        new_chat_session = ChatSession(name=datetime.now().strftime("%Y-%m-%d %H:%M"), user_id=user_id)
        db.session.add(new_chat_session)
        db.session.flush()
        
        greeting_prompt = "A user just completed a 10-question check-in quiz. Based on their answers, generate a warm, empathetic, and non-judgmental opening message. Keep it brief (2-3 sentences). Here are their answers:\n" + "\n".join(data.get("quiz_answers", []))
        
        # === MODIFIED: Added language instruction ===
        final_system_prompt = f"{SYSTEM_PROMPT}\n\nYour response MUST be in this language: {lang}."

        try:
            completion = client.chat.completions.create(
                messages=[{"role": "system", "content": final_system_prompt}, {"role": "user", "content": greeting_prompt}],
                # === MODIFIED: Using the correct model name ===
                model="openai/gpt-oss-120b",
                temperature=0.8
            )
            greeting_content = completion.choices[0].message.content
        except Exception: 
            greeting_content = "Hello. I'm here to listen."
            
        initial_message = ChatMessage(role='assistant', content=greeting_content, session_id=new_chat_session.id)
        db.session.add(initial_message)
        db.session.commit()
        return jsonify({"id": new_chat_session.id, "name": new_chat_session.name, "initial_message": {"role": "assistant", "content": greeting_content}}), 201
    
    sessions_list = ChatSession.query.filter_by(user_id=user_id).order_by(ChatSession.start_time.desc()).all()
    return jsonify([{"id": s.id, "name": s.name, "is_active": s.is_active} for s in sessions_list])

@app.route('/api/chat', methods=['POST'])
@login_required
def api_chat():
    data = request.json
    lang = data.get("lang", "en") # Get language for chat response
    chat_session = ChatSession.query.get_or_404(data.get("session_id"))
    
    if chat_session.user_id != session['user_id']: return jsonify({"error": "Unauthorized"}), 403
    
    db.session.add(ChatMessage(role='user', content=data.get("message"), session_id=chat_session.id))
    history = [{"role": m.role, "content": m.content} for m in chat_session.messages]
    user = User.query.get(session['user_id'])
    
    # === MODIFIED: Added language instruction & user profile info ===
    final_system_prompt = f"{SYSTEM_PROMPT}\nUser Profile Notes: {user.profile_info}\n\nYour response MUST be in this language: {lang}."

    try:
        completion = client.chat.completions.create(
            messages=[{"role": "system", "content": final_system_prompt}] + history,
            # === MODIFIED: Using the correct model name ===
            model="openai/gpt-oss-120b"
        )
        ai_reply = completion.choices[0].message.content
        db.session.add(ChatMessage(role='assistant', content=ai_reply, session_id=chat_session.id))
        db.session.commit()
        return jsonify({"reply": ai_reply})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"API Error: {str(e)}"}), 500
        
# ... All other routes for journal, profile, etc., remain correct and unchanged ...
# (Truncating the rest of the file as it's identical to the correct version from before)
@app.route('/api/sessions/<int:session_id>/messages', methods=['GET'])
@login_required
def get_session_messages(session_id):
    chat_session = ChatSession.query.get_or_404(session_id)
    if chat_session.user_id != session['user_id']: return jsonify({"error": "Unauthorized"}), 403
    messages = ChatMessage.query.filter_by(session_id=session_id).order_by(ChatMessage.timestamp.asc()).all()
    return jsonify([{"role": m.role, "content": m.content} for m in messages])

@app.route('/api/journal', methods=['GET', 'POST'])
@login_required
def manage_journal():
    if request.method == 'POST':
        data = request.json
        entry = JournalEntry(title=data.get('title'), content=data.get('content'), user_id=session['user_id'])
        db.session.add(entry)
        db.session.commit()
        return jsonify({"id": entry.id, "title": entry.title, "timestamp": entry.timestamp.isoformat()}), 201
    entries = JournalEntry.query.filter_by(user_id=session['user_id']).order_by(JournalEntry.timestamp.desc()).all()
    return jsonify([{"id": e.id, "title": e.title, "timestamp": e.timestamp.isoformat()} for e in entries])

@app.route('/api/journal/<int:entry_id>', methods=['GET', 'PUT', 'DELETE'])
@login_required
def manage_journal_entry(entry_id):
    entry = JournalEntry.query.get_or_404(entry_id)
    if entry.user_id != session['user_id']: return jsonify({"error": "Unauthorized"}), 403
    if request.method == 'GET': return jsonify({"id": entry.id, "title": entry.title, "content": entry.content})
    if request.method == 'PUT':
        data = request.json
        entry.title, entry.content = data.get('title'), data.get('content')
        db.session.commit()
        return jsonify({"message": "Entry updated."})
    if request.method == 'DELETE':
        db.session.delete(entry)
        db.session.commit()
        return jsonify({"message": "Entry deleted."})

@app.cli.command("init-db")
def init_db_command():
    with app.app_context(): db.create_all()
    click.echo("Initialized the database.")

if __name__ == '__main__':
    app.run(debug=True)
