from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, DateTime, Boolean, func
from sqlalchemy.orm import relationship, sessionmaker, declarative_base
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone
import os

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(30), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)  # Changed from 'password'
    role = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_login_date = Column(DateTime)
    is_active = Column(Boolean, default=True)

    chats = relationship("Chat", back_populates="user", cascade="all, delete-orphan")

    # Authentication methods
    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check if provided password matches hash"""
        return check_password_hash(self.password_hash, password)
    
    def update_login_time(self):
        """Update last login timestamp"""
        self.last_login_date = datetime.now(timezone.utc)

    # User-specific methods that were in DBToolKit
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
            return user
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
    user_id = Column(Integer, ForeignKey('users.user_id'), nullable=False)  # Fixed FK
    chat_name = Column(String, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="chats")
    messages = relationship("ChatMessage", back_populates="chat", cascade="all, delete-orphan")

    # Chat-specific methods
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