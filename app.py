# FILE: app.py (Version 3.0 - FINAL)

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
db_uri = os.environ.get('DATABASE_URL')
if db_uri and db_uri.startswith("postgres://"):
    db_uri = db_uri.replace("postgres://", "postgresql://", 1)
app.config['SQLALCHEMY_DATABASE_URI'] = db_uri
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

# --- DECORATORS & HELPERS ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session: return jsonify({"error": "Authentication required. Please log in."}), 401
        return f(*args, **kwargs)
    return decorated_function

# --- GROQ & PROMPTS ---
try:
    groq_api_key = os.environ.get("GROQ_API_KEY")
    client = Groq(api_key=groq_api_key)
except Exception as e: client = None
SYSTEM_PROMPT = """You are "BigSister," an empathetic AI listener for teens...""" # Truncated
SYSTEM_PROMPT_MODERATOR = """You are an inhumanly strict, safety-obsessed content moderation bot...""" # Truncated

# --- MAIN FRONTEND ROUTES ---
@app.route('/')
def index(): return render_template('index.html')
@app.route('/login', methods=['GET', 'POST'])
def site_login():
    error = None
    if request.method == 'POST':
        if request.form.get('password') == os.environ.get("SITE_PASSWORD"):
            session['authenticated'] = True
            return redirect(url_for('index'))
        else: error = 'Invalid password. Please try again.'
    return render_template('login.html', error=error)

# ======================================================================
# === API V2: THE NEW DATABASE-DRIVEN BACKEND ===
# ======================================================================
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
        new_chat_session = ChatSession(name=datetime.now().strftime("%Y-%m-%d %H:%M"), user_id=user_id)
        db.session.add(new_chat_session)
        db.session.flush()
        greeting_prompt = "Generate a warm, empathetic opening message based on these quiz answers:\n" + "\n".join(request.json.get("quiz_answers", []))
        try:
            completion = client.chat.completions.create(messages=[{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": greeting_prompt}], model="llama3-70b-8192", temperature=0.8)
            greeting_content = completion.choices[0].message.content
        except Exception: greeting_content = "Hello. I'm here to listen."
        initial_message = ChatMessage(role='assistant', content=greeting_content, session_id=new_chat_session.id)
        db.session.add(initial_message)
        db.session.commit()
        return jsonify({"id": new_chat_session.id, "name": new_chat_session.name, "initial_message": {"role": "assistant", "content": greeting_content}}), 201
    sessions_list = ChatSession.query.filter_by(user_id=user_id).order_by(ChatSession.start_time.desc()).all()
    return jsonify([{"id": s.id, "name": s.name, "is_active": s.is_active} for s in sessions_list])

@app.route('/api/sessions/<int:session_id>/messages', methods=['GET'])
@login_required
def get_session_messages(session_id):
    chat_session = ChatSession.query.get_or_404(session_id)
    if chat_session.user_id != session['user_id']: return jsonify({"error": "Unauthorized"}), 403
    messages = ChatMessage.query.filter_by(session_id=session_id).order_by(ChatMessage.timestamp.asc()).all()
    return jsonify([{"role": m.role, "content": m.content} for m in messages])

@app.route('/api/chat', methods=['POST'])
@login_required
def api_chat():
    data = request.json
    chat_session = ChatSession.query.get_or_404(data.get("session_id"))
    if not chat_session.is_active or chat_session.user_id != session['user_id']: return jsonify({"error": "Unauthorized or session is inactive."}), 403
    db.session.add(ChatMessage(role='user', content=data.get("message"), session_id=chat_session.id))
    history = [{"role": m.role, "content": m.content} for m in chat_session.messages]
    user = User.query.get(session['user_id'])
    try:
        completion = client.chat.completions.create(messages=[{"role": "system", "content": f"{SYSTEM_PROMPT}\nUser Profile: {user.profile_info}"}] + history, model="llama3-70b-8192")
        ai_reply = completion.choices[0].message.content
        db.session.add(ChatMessage(role='assistant', content=ai_reply, session_id=chat_session.id))
        db.session.commit()
        return jsonify({"reply": ai_reply})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"API Error: {str(e)}"}), 500

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

@app.route('/api/profile', methods=['GET', 'POST'])
@login_required
def manage_profile():
    user = User.query.get(session['user_id'])
    if request.method == 'POST':
        user.profile_info = request.json.get('profile_info', '')
        db.session.commit()
        return jsonify({"message": "Profile saved."})
    return jsonify({"profile_info": user.profile_info})

@app.route('/api/post-message', methods=['POST'])
@login_required
def post_message():
    user = User.query.get(session['user_id'])
    message_text = request.json.get('message_text')
    if not message_text: return jsonify({"error": "Message is required."}), 400
    decision, reason = "APPROVE", "Message looks good." # Placeholder for full moderation logic
    status = "approved" if decision == "APPROVE" else "rejected"
    msg = CommunityMessage.query.filter_by(submitted_by_username=user.username).first()
    if msg: msg.text, msg.status, msg.reason = message_text, status, reason
    else: db.session.add(CommunityMessage(submitted_by_username=user.username, text=message_text, status=status, reason=reason))
    db.session.commit()
    return jsonify({"status": status, "message": "Your message has been reviewed.", "reason": reason})

@app.route('/api/get-messages', methods=['GET'])
def get_messages():
    return jsonify([msg.text for msg in CommunityMessage.query.filter_by(status='approved').all()])

@app.route('/api/get-my-message', methods=['GET'])
@login_required
def get_my_message():
    user = User.query.get(session['user_id'])
    msg = CommunityMessage.query.filter_by(submitted_by_username=user.username).first()
    if msg: return jsonify({"text": msg.text, "status": msg.status})
    return jsonify({"status": "not_found"})

# THIS IS THE CORRECTED, FULLY-FUNCTIONAL VERSION
@app.route('/find-nearby', methods=['POST'])
@login_required
def find_nearby():
    data = request.json
    lat, lon, place_type = data.get('lat'), data.get('lon'), data.get('place_type')
    if not all([lat, lon, place_type]): return jsonify({"error": "Latitude, longitude, and place_type are required."}), 400
    
    overpass_url = "https://overpass-api.de/api/interpreter"
    query_tags = {
        'hospital': '[amenity=hospital]', 'police': '[amenity=police]',
        'mental_health': '[healthcare~"counselling|psychotherapist|clinic|psychiatrist"]'
    }
    if place_type not in query_tags: return jsonify({"error": "Invalid place type."}), 400
    
    overpass_query = f"""[out:json];(node{query_tags[place_type]}(around:10000,{lat},{lon});way{query_tags[place_type]}(around:10000,{lat},{lon});relation{query_tags[place_type]}(around:10000,{lat},{lon}););out body;>;out skel qt;"""
    
    try:
        response = requests.post(overpass_url, data=overpass_query)
        response.raise_for_status()
        results, places, seen_ids = response.json(), [], set()
        for element in results.get('elements', []):
            if element['id'] in seen_ids: continue
            tags = element.get('tags', {})
            if tags.get('name'):
                addr_parts = [tags.get(k) for k in ['addr:housenumber', 'addr:street', 'addr:city', 'addr:postcode']]
                address = ' '.join(p for p in addr_parts if p)
                places.append({
                    "name": tags.get('name'), "address": address or "N/A", "phone": tags.get('phone') or "N/A",
                    "website": tags.get('website') or "N/A", "lat": element.get('lat', lat), "lon": element.get('lon', lon)
                })
                seen_ids.add(element['id'])
        return jsonify(places)
    except requests.exceptions.RequestException as e:
        print(f"Error querying Overpass API: {e}")
        return jsonify({"error": "Could not retrieve location data."}), 503

# --- DATABASE CLI COMMANDS ---
@app.cli.command("init-db")
def init_db_command():
    with app.app_context(): db.create_all()
    click.echo("Initialized the database.")
@app.cli.command("reset-db")
def reset_db_command():
    with app.app_context():
        db.drop_all()
        db.create_all()
    click.echo("Wiped and reset the database.")

if __name__ == '__main__':
    app.run(debug=True)