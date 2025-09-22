from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, DateTime, Boolean, func
from sqlalchemy.orm import relationship, sessionmaker, declarative_base
from datetime import datetime, timezone
from dotenv import load_dotenv
from datetime import datetime
from logger import Logger
import json
import os

load_dotenv()

DB_PATH = str(os.getenv('DB_PATH'))
DB_FILE = str(os.getenv('DB_FILE'))
DB_LOCK = str(os.getenv('DB_LOCK'))
QUEUE_FILE = str(os.getenv('QUEUE_FILE'))

Base = declarative_base()
log = Logger()

def init_db(path, file):
    db_url = os.path.join(path, file)
    db_url="sqlite:///" + db_url 

    engine = create_engine(db_url)
    Base.metadata.create_all(engine)
    
    Session = sessionmaker(bind=engine)
    
    log.logEvent("SYSTEM", "SQLite Database Initialized")
    return engine, Session

class User(Base):
    __tablename__ = 'users'

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(30), nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_login_date = Column(DateTime)
    is_active = Column(Boolean, default=True)

    chats = relationship("Chat", back_populates="user", cascade="all, delete-orphan")

class Chat(Base):
    __tablename__ = 'chats'

    chat_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)
    chat_name = Column(String, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    

    messages = relationship("ChatMessage", back_populates="chat")

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
    vectorized = Column(Boolean, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    images = relationship("Image", back_populates="document")

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

class DBToolKit:
    def __init__(self) -> None:
        log.logEvent("SYSTEM", "DBToolKit class Initialized")
        self.engine, self.Session = init_db(DB_PATH, DB_FILE)


    # DB Helping Functions
    def __is_json_empty__(self):
        if os.path.getsize(QUEUE_FILE) == 0:
            return True

        with open(QUEUE_FILE, "r") as f:
            try:
                data = json.load(f)
                return not data
            except json.JSONDecodeError:
                return True
        
    def __aquire_lock__(self):
        if os.path.exists(DB_LOCK):
            return False
        
        with open(DB_LOCK, 'w') as lock:
            lock.write("[LOCKED] - [Write In Progress]")

        log.logEvent("SYSTEM", "SQLite Database lock aquired")
        return True
    
    def __release_lock__(self):
        if os.path.exists(DB_LOCK):
            os.remove(DB_LOCK)
            log.logEvent("SYSTEM", "SQLite Database lock released")

    def __read_write_Q__(self):
        with open(QUEUE_FILE, "r") as queue:
            data = json.load(queue)
        
        first_key = next(iter(data))
        first_value = data[first_key]

        return first_value

    def __insert_Write_Q__(self, user_id, chat_id, sender, msg):
        try:
            with open(QUEUE_FILE, 'r') as queue:
                data = json.load(queue)
        except FileNotFoundError as fe:
            data = {}

        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        
        data[timestamp] = [user_id, chat_id, sender, msg]

        log.logEvent("SYSTEM", "Inserted a message to writeQ.json")
        with open(QUEUE_FILE, 'w') as queue:
            json.dump(data, queue, indent=4)

    def __delete_from_Q__(self) -> None:
        with open(QUEUE_FILE, "r") as f:
            data = json.load(f)
        if not data:
            return None

        first_key = next(iter(data))
        first_value = data[first_key]

        del data[first_key]

        log.logEvent("SYSTEM", "Deleted a message from writeQ.json")

        with open(QUEUE_FILE, "w") as f:
            json.dump(data, f, indent=4)
    
    def __sort_Q__(self) -> None:
        with open(QUEUE_FILE, "r") as f:
            data = json.load(f)

        sorted_data = dict(sorted(data.items(), key=lambda x: datetime.strptime(x[0], "%Y-%m-%d %H:%M:%S")))

        with open(QUEUE_FILE, "w") as f:
            json.dump(sorted_data, f, indent=4)

    def __format_chat_history__(self, chat_data) -> str:
        formatted_output = ""

        # all_messages = [msg for chat in chat_data for msg in chat]

        sorted_chats = sorted(chat_data, key=lambda x: x["timestamp"])
        last_chats = sorted_chats[-10:]

        for msg in last_chats:
            sender_label = "[User]" if msg["sender"] == "user" else "[LLM]"
            formatted_output += f"{sender_label}: {msg['content']}\n"

        return formatted_output


    # READ Functions
    def get_user_chats(self, user_id: int) -> list:
        uchats = []

        with self.Session() as session:
            user_chats = session.query(Chat).filter_by(user_id=user_id).all()

            for chat in user_chats:
                chat_data = []
                for message in chat.messages:
                    chat_data.append({
                        "message_id": message.message_id,
                        "sender": message.sender,
                        "content": message.message,
                        "timestamp": message.timestamp,
                    })
                uchats.append(chat_data)

        return chat_data

    def get_msgs_byID(self, user_id, chat_id: int) -> list[dict[int, tuple[str, str, datetime]]]:
        chat = []

        with self.Session() as session:
            msgs = session.query(ChatMessage).filter_by(chat_id=chat_id).order_by(ChatMessage.timestamp).all()

            for msg in msgs:
                chat.append({
                    msg.message_id: (msg.sender, msg.message, msg.timestamp)
                })
        
        return chat
    
    def get_all_document_desc(self):
        docs = []
        with self.Session() as session:
            docu = session.query(Document.description).all()
        
        for doc in docu:
            docs.append(doc[0])

        return "\n".join([f"Document {i+1}: {item} \n" for i, item in enumerate(docs)])
    
    def get_all_document_path(self):
        docs = []
        with self.Session() as session:
            docu = session.query(Document.path).all()
        
        for doc in docu:
            docs.append(doc[0])

        return docs
    
    def get_image_descriptions(self) -> list[dict]:
        img_desc = []

        with self.Session() as session:
            images = session.query(Image).all()

            for image in images:
                img_desc.append({
                    image.image_id: image.description
                })
        
        return img_desc
    
    def get_image_path(self, image_id) -> str:
        with self.Session() as session:
            path = session.query(Image.path).filter_by(image_id=image_id).first()
            
        return path[0]


    # UPDATE Functions
    def update_document_vectorized(self, document_id, vectorized_value) -> None:
        with self.Session() as session:
            document = session.query(Document).filter_by(document_id=document_id).first()
            
            if document:
                document.vectorized = vectorized_value
                session.commit()


    # INSERT Functions
    def insert_msg(self, user_id, chat_id, sender, message) -> None:
        with self.Session() as session:
            chat_exists = session.query(Chat).filter_by(chat_id=chat_id).first()

        if chat_exists:
            with self.Session() as session:
                session.add(ChatMessage(chat_id=chat_id, sender=sender, message=message))
                session.commit()
        else:
            with self.Session() as session:
                session.add(Chat(user_id=user_id, chat_name="Unnamed")) 
                session.add(ChatMessage(chat_id=chat_id, sender=sender, message=message)) 
                session.commit()

        log.logEvent("SYSTEM", "Inserted a message to SQLite Database")

    def insert_document(self, path, description, vectorized=False) -> None:
        name = os.path.basename(path) 
        format = os.path.splitext(name)[1]

        with self.Session() as session:
            session.add(Document(name=name, format=format, path=path, description=description, vectorized=vectorized))
            session.commit()

        log.logEvent("SYSTEM", "Inserted a document to SQLite Database")
    
    def insert_image(self, name, format, path, description, document_id, page_no) -> None:
        with self.Session() as session:
            session.add(Image(name=name, format=format, path=path, description=description, document_id=document_id, page_no=page_no))
            session.commit()

        log.logEvent("SYSTEM", "Inserted a image to SQLite Database")


####################################################################
####################################################################
### TESTING ###

# db = DBToolKit()
# print(db.__format_chat_history__(db.get_user_chats(1)))

# description = ""
# print(db.get_all_document_desc())
# chats = db.get_user_chats(1)
# print(chats[0])
# db.__insert_Write_Q__(1, 1, "user", "yoo!")
# db.__delete_from_Q__()
# db.__sort_Q__()
# print(db.__read_write_Q__())
# print(db.__aquire_lock__())
# print(db.__release_lock__())
# print(db.get_image_path(1))
# db.insert_image('hello', '.png', 'images/hello.png', 'hello12345', '1', 2)

# print(db.get_user_chats(1))
# print(db.get_msgs_byID(1, 1))
# db.insert_msg(1, 1, "bot", "wassup")
# db.insert_msg(1, 1, "user", "yooo")
# db.insert_document('documents/Security_Guard_User_Manual_EnduserV1 1.pdf', 'Hello')
# db.update_document_vectorized(1, True)

# import fitz
# pdf_document = fitz.open("documents/Security_Guard_User_Manual_EnduserV1 1.pdf")

### TESTING ###
####################################################################
####################################################################