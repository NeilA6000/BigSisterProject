# FILE: app.py (FINAL MERGED VERSION)

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
DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL or 'sqlite:///' + os.path.join(os.path.abspath(os.path.dirname(__file__)), 'database.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- DATABASE MODELS ---
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

# --- DECORATORS ---
def site_password_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'authenticated' not in session:
            return redirect(url_for('login_site'))
        return f(*args, **kwargs)
    return decorated_function

def user_login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session: return jsonify({"error": "User authentication required"}), 401
        return f(*args, **kwargs)
    return decorated_function

# --- GROQ & PROMPTS ---
try:
    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
except Exception as e: client = None
SYSTEM_PROMPT = """You are "BigSister," an empathetic AI listener for teens... [UNCHANGED TRUNCATED FOR BREVITY]"""
SYSTEM_PROMPT_MODERATOR = """You are an inhumanly strict, safety-obsessed content moderation bot... [UNCHANGED TRUNCATED FOR BREVITY]"""

# --- ROUTES ---

# SECTION 1: PAGE RENDERING & SITE PASSWORD
@app.route('/login')
def login_site():
    return render_template('login.html')

@app.route('/login', methods=['POST'])
def handle_login_site():
    if request.form.get('password') == os.environ.get("SITE_PASSWORD"):
        session['authenticated'] = True
        return redirect(url_for('index'))
    return render_template('login.html', error='Invalid password.')

@app.route('/')
@site_password_required
def index():
    return render_template('index.html')

# SECTION 2: USER AUTH API (USERNAME & PIN)
@app.route('/api/signup', methods=['POST'])
def api_signup():
    data = request.json
    username, pin = data.get('username'), data.get('pin')
    if not all([username, pin, len(username) >= 3, str(pin).isdigit(), len(str(pin)) == 4]):
        return jsonify({"error": "Username must be > 3 chars, PIN must be 4 digits."}), 400
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
        user = db.session.get(User, session['user_id'])
        if user: return jsonify({"username": user.username}), 200
    return jsonify({"error": "Not authenticated"}), 401

# SECTION 3: CHAT API
@app.route('/api/sessions', methods=['GET', 'POST'])
@user_login_required
def manage_sessions():
    user_id = session['user_id']
    if request.method == 'POST':
        data = request.json
        new_s = ChatSession(name=datetime.now().strftime("%b %d, %Y %-I:%M %p"), user_id=user_id)
        db.session.add(new_s)
        db.session.flush()
        prompt = "A user just completed a check-in quiz. Generate a warm, empathetic opening message. Here are their answers:\n" + "\n".join(data.get("quiz_answers", []))
        try:
            completion = client.chat.completions.create(messages=[{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": prompt}], model="openai/gpt-oss-120b", temperature=0.8)
            greeting = completion.choices[0].message.content
        except Exception: greeting = "Hello. I'm here to listen."
        initial_msg = ChatMessage(role='assistant', content=greeting, session_id=new_s.id)
        db.session.add(initial_msg)
        db.session.commit()
        return jsonify({"id": new_s.id, "name": new_s.name, "initial_message": {"role": "assistant", "content": greeting}}), 201
    
    sessions_list = ChatSession.query.filter_by(user_id=user_id).order_by(ChatSession.start_time.desc()).all()
    return jsonify([{"id": s.id, "name": s.name} for s in sessions_list])

@app.route('/api/sessions/<int:session_id>', methods=['PUT', 'DELETE'])
@user_login_required
def manage_single_session(session_id):
    chat_session = ChatSession.query.get_or_404(session_id)
    if chat_session.user_id != session['user_id']: return jsonify({"error": "Unauthorized"}), 403
    if request.method == 'PUT':
        chat_session.name = request.json.get('name', chat_session.name)
        db.session.commit()
        return jsonify({"message": "Session updated."})
    if request.method == 'DELETE':
        db.session.delete(chat_session)
        db.session.commit()
        return jsonify({"message": "Session deleted."})

@app.route('/api/sessions/<int:session_id>/messages', methods=['GET'])
@user_login_required
def get_session_messages(session_id):
    chat_session = ChatSession.query.get_or_404(session_id)
    if chat_session.user_id != session['user_id']: return jsonify({"error": "Unauthorized"}), 403
    messages = ChatMessage.query.filter_by(session_id=session_id).order_by(ChatMessage.timestamp.asc()).all()
    return jsonify([{"role": m.role, "content": m.content} for m in messages])

@app.route('/api/chat', methods=['POST'])
@user_login_required
def api_chat():
    data = request.json
    chat_session = ChatSession.query.get_or_404(data.get("session_id"))
    if chat_session.user_id != session['user_id']: return jsonify({"error": "Unauthorized"}), 403
    
    db.session.add(ChatMessage(role='user', content=data.get("message"), session_id=chat_session.id))
    history = [{"role": m.role, "content": m.content} for m in chat_session.messages]
    
    try:
        completion = client.chat.completions.create(messages=[{"role": "system", "content": SYSTEM_PROMPT}] + history, model="openai/gpt-oss-120b")
        ai_reply = completion.choices[0].message.content
        db.session.add(ChatMessage(role='assistant', content=ai_reply, session_id=chat_session.id))
        db.session.commit()
        return jsonify({"reply": ai_reply})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"API Error: {str(e)}"}), 500

# SECTION 4: JOURNAL API
@app.route('/api/journal', methods=['GET', 'POST'])
@user_login_required
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
@user_login_required
def manage_journal_entry(entry_id):
    entry = JournalEntry.query.get_or_404(entry_id)
    if entry.user_id != session['user_id']: return jsonify({"error": "Unauthorized"}), 403
    if request.method == 'GET': return jsonify({"id": entry.id, "title": entry.title, "content": entry.content})
    if request.method == 'PUT':
        entry.title, entry.content = request.json.get('title'), request.json.get('content')
        db.session.commit()
        return jsonify({"message": "Entry updated."})
    if request.method == 'DELETE':
        db.session.delete(entry)
        db.session.commit()
        return jsonify({"message": "Entry deleted."})

# SECTION 5: PROFILE & COMMUNITY API
@app.route('/api/profile', methods=['GET', 'POST'])
@user_login_required
def manage_profile():
    user = db.session.get(User, session['user_id'])
    if request.method == 'POST':
        user.profile_info = request.json.get('profile_info', '')
        db.session.commit()
        return jsonify({"message": "Profile updated."})
    return jsonify({"profile_info": user.profile_info})

@app.route('/api/pin', methods=['PUT'])
@user_login_required
def change_pin():
    data = request.json
    user = db.session.get(User, session['user_id'])
    if not user.check_pin(data.get('old_pin')): return jsonify({"error": "Incorrect old PIN."}), 403
    user.set_pin(data.get('new_pin'))
    db.session.commit()
    return jsonify({"message": "PIN changed successfully."})

@app.route('/api/community/message', methods=['GET', 'POST'])
@user_login_required
def community_message():
    user = db.session.get(User, session['user_id'])
    if request.method == 'POST':
        message_text = request.json.get('message_text')
        if not message_text: return jsonify({"error": "Message cannot be empty."}), 400
        message = CommunityMessage.query.filter_by(submitted_by_username=user.username).first()
        if not message:
            message = CommunityMessage(submitted_by_username=user.username)
            db.session.add(message)
        message.text = message_text
        message.status = 'pending' # AI moderation will happen here
        try:
            completion = client.chat.completions.create(messages=[{"role": "system", "content": SYSTEM_PROMPT_MODERATOR}, {"role": "user", "content": message_text}], model="openai/gpt-oss-120b", temperature=0.0, response_format={"type": "json_object"})
            mod_result = json.loads(completion.choices[0].message.content)
            message.status = "approved" if mod_result.get("decision") == "APPROVE" else "rejected"
            message.reason = mod_result.get("reason")
        except: message.status, message.reason = "rejected", "Moderation failed."
        db.session.commit()
        return jsonify({"status": message.status, "reason": message.reason})

    message = CommunityMessage.query.filter_by(submitted_by_username=user.username).first()
    if message: return jsonify({"text": message.text, "status": message.status})
    return jsonify({"status": "not_found"})

@app.route('/api/community/messages/approved', methods=['GET'])
def get_approved_messages():
    approved = CommunityMessage.query.filter_by(status='approved').all()
    return jsonify([msg.text for msg in approved])

# SECTION 6: OTHER RESOURCES (No DB needed)
@app.route('/find-nearby', methods=['POST'])
def find_nearby():
    # Placeholder to prevent frontend errors.
    return jsonify([])

# --- FLASK CLI COMMANDS ---
@app.cli.command("init-db")
def init_db_command():
    """Creates the database tables."""
    with app.app_context(): db.create_all()
    click.echo("Initialized the database.")

if __name__ == '__main__':
    with app.app_context(): db.create_all()
    app.run(debug=True)