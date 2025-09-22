from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, DateTime, Boolean, func
from sqlalchemy.orm import relationship, sessionmaker, declarative_base
from datetime import datetime, timezone
from dotenv import load_dotenv
from datetime import datetime
from logger import Logger
import json
import os
import hashlib
import secrets
import base64

load_dotenv()

# SUPABASE_KEY = str(os.getenv('SUPABASE_KEY'))
# SUPABASE_PASSWORD = str(os.getenv('SUPABASE_PASSWORD'))

Base = declarative_base()
log = Logger()

def init_db():
    # project_ref = SUPABASE_URL.split('//')[1].split('.')[0]
    # db_url = f"postgresql://postgres:{SUPABASE_PASSWORD}@db.{project_ref}.supabase.co:5432/postgres"
    # db_url = str(os.getenv('SUPABASE_URL'))

    # host = os.getenv('SUPABASE_HOST')
    # port = os.getenv('SUPABASE_PORT')
    # database = os.getenv('SUPABASE_DATABASE')
    # user = os.getenv('SUPABASE_USER')
    # password = os.getenv('SUPABASE_PASSWORD')
    
    # Build connection string with proper escaping
    # db_url = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{database}?sslmode=require"
    
    db_url = db_url ='postgresql://neondb_owner:npg_AaNcEL1f9tjh@ep-royal-lab-addw37jt-pooler.c-2.us-east-1.aws.neon.tech/REC_DB?sslmode=require&channel_binding=require'

    engine = create_engine(db_url, pool_size=10, max_overflow=20, pool_pre_ping=True, echo=False)

    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)

    log.logEvent("SYSTEM", "PostgreSQL Database (Supabase) Initialized")
    return engine, Session

def generate_password_hash(password, iterations=100000):
    """
    Generate a secure password hash using PBKDF2 with SHA-256
    
    Args:
        password (str): The plain text password to hash
        iterations (int): Number of iterations (default 100,000 for security)
    
    Returns:
        str: Base64 encoded hash in format: salt$iterations$hash
    """

    salt = secrets.token_bytes(32)

    password_bytes = password.encode('utf-8')
    hash_bytes = hashlib.pbkdf2_hmac('sha256', password_bytes, salt, iterations)

    salt_b64 = base64.b64encode(salt).decode('ascii')
    hash_b64 = base64.b64encode(hash_bytes).decode('ascii')

    return f"{salt_b64}${iterations}${hash_b64}"

def check_password_hash(stored_hash, password):
    """
    Verify a password against a stored hash
    
    Args:
        stored_hash (str): The stored hash from database
        password (str): The plain text password to verify
    
    Returns:
        bool: True if password matches, False otherwise
    """
    try:
        # Split the stored hash into components
        parts = stored_hash.split('$')
        if len(parts) != 3:
            return False
        
        salt_b64, iterations_str, stored_hash_b64 = parts
        
        # Decode the salt and convert iterations to int
        salt = base64.b64decode(salt_b64)
        iterations = int(iterations_str)
        
        # Hash the provided password with the same salt and iterations
        password_bytes = password.encode('utf-8')
        new_hash_bytes = hashlib.pbkdf2_hmac('sha256', password_bytes, salt, iterations)
        new_hash_b64 = base64.b64encode(new_hash_bytes).decode('ascii')
        
        # Secure comparison to prevent timing attacks
        return secrets.compare_digest(stored_hash_b64, new_hash_b64)
            
    except (ValueError, TypeError):
        # Handle any decoding or conversion errors
        return False

class User(Base):
    __tablename__ = 'users'

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(30), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_login_date = Column(DateTime)
    is_active = Column(Boolean, default=True)

    chats = relationship("Chat", back_populates="user", cascade="all, delete-orphan")

    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check if provided password matches hash"""
        return check_password_hash(self.password_hash, password)
    
    def update_login_time(self):
        """Update last login timestamp"""
        self.last_login_date = datetime.now(timezone.utc)

    def get_chats_formatted(self, session, limit=10):
        """Get formatted chat history for this user"""
        all_messages = []
        
        # Get all messages from all user's chats
        for chat in self.chats:
            for message in chat.messages:
                all_messages.append({
                    "sender": message.sender,
                    "content": message.message,
                    "timestamp": message.timestamp,
                })
        
        # Sort by timestamp and get last N messages
        sorted_messages = sorted(all_messages, key=lambda x: x["timestamp"])
        last_messages = sorted_messages[-limit:]
        
        formatted_output = ""
        for msg in last_messages:
            sender_label = "[User]" if msg["sender"] == "user" else "[LLM]"
            formatted_output += f"{sender_label}: {msg['content']}\n"
        
        return formatted_output

    def get_all_chats_data(self):
        """Get all chats data for this user"""
        user_chats = []
        
        for chat in self.chats:
            chat_data = []
            for message in chat.messages:
                chat_data.append({
                    "message_id": message.message_id,
                    "sender": message.sender,
                    "content": message.message,
                    "timestamp": message.timestamp,
                })
            user_chats.append(chat_data)
        
        return user_chats

    @classmethod
    def authenticate(cls, session, username, password):
        """Authenticate user and update login time"""

        user = session.query(cls).filter_by(username=username, is_active=True).first()
        
        if user and user.check_password(password):
            user.update_login_time()
            session.commit()
            return (user.user_id, user.role)
        return None
        
    @classmethod
    def create_user(cls, session, username, password, role="user"):
        """Create new user with hashed password"""
        
        user = cls(username=username, role=role)
        user.set_password(password)
        session.add(user)
        session.commit()
        return user

class Chat(Base):
    __tablename__ = 'chats'

    chat_id = Column(Integer, primary_key=True, autoincrement=True)
    # user_id = Column(Integer, nullable=False)
    user_id = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    chat_name = Column(String, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    user = relationship("User", back_populates="chats")
    messages = relationship("ChatMessage", back_populates="chat", cascade="all, delete-orphan")
    
    def add_message(self, session, sender, message):
        """Add a message to this chat"""
        new_message = ChatMessage(
            chat_id=self.chat_id,
            sender=sender,
            message=message
        )
        session.add(new_message)
        session.commit()
        return new_message
    
    def get_messages_formatted(self):
        """Get all messages in this chat formatted as dict"""
        chat_messages = []
        for msg in sorted(self.messages, key=lambda x: x.timestamp):
            chat_messages.append({
                msg.message_id: (msg.sender, msg.message, msg.timestamp)
            })
        return chat_messages
    
    @classmethod
    def create_chat(cls, session, user_id, chat_name="Unnamed"):
        """Create new chat for user"""
        chat = cls(user_id=user_id, chat_name=chat_name)
        session.add(chat)
        session.commit()
        return chat

    @classmethod
    def get_or_create_chat(cls, session, user_id, chat_id, chat_name="Unnamed"):
        """Get existing chat or create new one"""
        chat = session.query(cls).filter_by(chat_id=chat_id).first()
        if not chat:
            chat = cls.create_chat(session, user_id, chat_name)
        return chat
    
class ChatMessage(Base):
    __tablename__ = 'chat_messages'

    message_id = Column(Integer, primary_key=True, autoincrement=True)
    chat_id = Column(Integer, ForeignKey('chats.chat_id'), nullable=False)
    sender = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    chat = relationship("Chat", back_populates="messages")

class Document(Base):
    __tablename__ = 'documents'

    document_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    format = Column(String, nullable=False)
    path = Column(String, nullable=False)
    description = Column(String, nullable=False)
    vectorized = Column(Boolean, nullable=False, default=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    images = relationship("Image", back_populates="document", cascade="all, delete-orphan")

    # Document-specific methods
    def mark_vectorized(self, session):
        """Mark this document as vectorized"""

        self.vectorized = True
        session.commit()

    def add_image(self, session, name, format, path, description, page_no):
        """Add an image to this document"""
        
        image = Image(
            name=name,
            format=format,
            path=path,
            description=description,
            document_id=self.document_id,
            page_no=page_no
        )
        session.add(image)
        session.commit()
        return image

    @classmethod
    def create_document(cls, session, path, description, vectorized=False):
        """Create new document"""
        
        name = os.path.basename(path)
        format = os.path.splitext(name)[1]
        
        document = cls(
            name=name,
            format=format,
            path=path,
            description=description,
            vectorized=vectorized
        )
        session.add(document)
        session.commit()
        return document

    @classmethod
    def get_all_descriptions(cls, session):
        
        """Get all document descriptions formatted"""
        docs = session.query(cls.description).all()
        descriptions = [doc[0] for doc in docs]
        return "\n".join([f"Document {i+1}: {item}\n" for i, item in enumerate(descriptions)])

    @classmethod
    def get_all_paths(cls, session):
        
        """Get all document paths"""
        docs = session.query(cls.path).all()
        return [doc[0] for doc in docs]

class Image(Base):
    __tablename__ = 'images'

    image_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    format = Column(String, nullable=False)
    path = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    document_id = Column(Integer, ForeignKey('documents.document_id'), nullable=False)
    page_no = Column(Integer, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    document = relationship("Document", back_populates="images")

    @classmethod
    def get_all_descriptions(cls, session):
        """Get all image descriptions as list of dicts"""
        images = session.query(cls).all()
        return [{image.image_id: image.description} for image in images]

    @classmethod
    def get_path_by_id(cls, session, image_id):
        """Get image path by ID"""
        image = session.query(cls).filter_by(image_id=image_id).first()
        return image.path if image else None
    
class DBHandler:
    def __init__(self) -> None:
        log.logEvent("SYSTEM", "DBToolKit class Initialized")
        self.engine, self.Session = init_db()

    def __format_chat_history__(self, chat_data) -> str:
        formatted_output = ""

        # all_messages = [msg for chat in chat_data for msg in chat]

        sorted_chats = sorted(chat_data, key=lambda x: x["timestamp"])
        last_chats = sorted_chats[-10:]

        for msg in last_chats:
            sender_label = "[User]" if msg["sender"] == "user" else "[LLM]"
            formatted_output += f"{sender_label}: {msg['content']}\n"

        return formatted_output
    # === YOUR EXISTING QUEUE/LOCK METHODS (unchanged) ===
    # def __is_json_empty__(self):
    #     QUEUE_FILE = os.getenv('QUEUE_FILE')
    #     if os.path.getsize(QUEUE_FILE) == 0:
    #         return True
        # ... rest of your existing method

    # def __aquire_lock__(self):
    #     # ... your existing lock method

    # def __release_lock__(self):
    #     # ... your existing lock method

    # def __read_write_Q__(self):
    #     # ... your existing queue method

    # def __insert_Write_Q__(self, user_id, chat_id, sender, msg):
    #     # ... your existing queue method

    # === CONVENIENCE METHODS (bridge to model classes) ===
    
    # User operations
    def create_user(self, username, password, role="user"):
        """Create new user"""
        with self.Session() as session:
            return User.create_user(session, username, password, role)

    def authenticate_user(self, username, password):
        """Authenticate user"""
        with self.Session() as session:
            return User.authenticate(session, username, password)

    def get_user_chats(self, user_id):
        """Get all chats for a user"""
        with self.Session() as session:
            user = session.query(User).get(user_id)
            if user:
                return user.get_all_chats_data()
            return []

    # Chat operations
    def insert_msg(self, user_id, chat_id, sender, message):
        """Insert message, create chat if needed"""
        with self.Session() as session:
            # Get or create chat
            chat = Chat.get_or_create_chat(session, user_id, chat_id)
            # Add message to chat
            chat.add_message(session, sender, message)
        
        log.logEvent("SYSTEM", "Inserted a message to PostgreSQL Database")

    def get_msgs_byID(self, user_id, chat_id):
        """Get messages for a specific chat"""
        with self.Session() as session:
            chat = session.query(Chat).filter_by(chat_id=chat_id).first()
            if chat:
                return chat.get_messages_formatted()
            return []

    # Document operations
    def insert_document(self, path, description, vectorized=False):
        """Create new document"""
        with self.Session() as session:
            return Document.create_document(session, path, description, vectorized)

    def get_all_document_desc(self):
        """Get all document descriptions"""
        with self.Session() as session:
            return Document.get_all_descriptions(session)

    def get_all_document_path(self):
        """Get all document paths"""
        with self.Session() as session:
            return Document.get_all_paths(session)

    def update_document_vectorized(self, document_id, vectorized_value):
        """Mark document as vectorized"""
        with self.Session() as session:
            document = session.query(Document).get(document_id)
            if document:
                document.vectorized = vectorized_value
                session.commit()

    # Image operations
    def insert_image(self, name, format, path, description, document_id, page_no):
        """Add image to document"""
        with self.Session() as session:
            document = session.query(Document).get(document_id)
            if document:
                return document.add_image(session, name, format, path, description, page_no)

    def get_image_descriptions(self):
        """Get all image descriptions"""
        with self.Session() as session:
            return Image.get_all_descriptions(session)

    def get_image_path(self, image_id):
        """Get image path by ID"""
        with self.Session() as session:
            return Image.get_path_by_id(session, image_id)
        

########################################################################
######## -- TESTING -- #################################################
########################################################################

# db = DBHandler()

# db.create_user(username='taha.moiz', password='123', role='admin')
# print(db.authenticate_user('sahir.mansooo', password='123'))
# db.
########################################################################
########################################################################
########################################################################