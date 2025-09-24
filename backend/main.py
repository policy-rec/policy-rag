from fastapi import FastAPI, UploadFile, File, Form, HTTPException
# from apscheduler.schedulers.background import BackgroundScheduler
from fastapi.responses import JSONResponse
from fastapi.responses import FileResponse
from document_management import Document
from pydantic import BaseModel
from database import DBHandler
from dotenv import load_dotenv
from datetime import datetime
from typing import Optional
from logger import Logger
from llm import LLM
import mimetypes
import os
import json

load_dotenv()

app = FastAPI()
db = DBHandler()
llm = LLM()
doc = Document()
log = Logger()

DOC_FOLDER = os.environ.get("DOC_FOLDER")
CHAT_IMG_FOLDER = os.environ.get("CHAT_IMG_FOLDER")
IMAGE_FOLDER = os.environ.get("IMAGE_FOLDER")
os.makedirs(DOC_FOLDER, exist_ok=True)
os.makedirs(CHAT_IMG_FOLDER, exist_ok=True)
os.makedirs(IMAGE_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".png"}

# def run_message_insertion():
#     log.logEvent("SYSTEM", f"Maintenance task ran at {datetime.now()}")
#     if db.__aquire_lock__():
#         while not db.__is_json_empty__():
#             message = db.__read_write_Q__()
#             db.insert_msg(user_id=message[0], chat_id=message[1], sender=message[2], message=message[3])
#             db.__delete_from_Q__()
#         db.__release_lock__()
#     log.logEvent("SYSTEM", "Message Queue Emptied")

# scheduler = BackgroundScheduler()
# scheduler.add_job(run_message_insertion, 'cron', hour=5, minute=12)  # Runs every day at 2:00 AM
# scheduler.start()

# 1) POST - upload document
@app.post("/upload-document")
async def upload_document(file: UploadFile = File(...)):
    log.logEvent("SYSTEM", "/upload-document API Called")
    log.logEvent("SYSTEM", "Starting document processing...")
    
    file_location = os.path.join(DOC_FOLDER, file.filename)
    with open(file_location, "wb") as f:
        content = await file.read()
        f.write(content)
    log.logEvent("SYSTEM", "Document saved to local folder...")

    document_summary = doc.create_document_summary(llm=llm, document_path=file_location)
    log.logEvent("SYSTEM", "Document summary created...")

    db.insert_document(path=file_location, description=document_summary, vectorized=True)
    log.logEvent("SYSTEM", "Document inserted in Database...")

    doc.upsert_document(document_path=file_location)
    log.logEvent("SYSTEM", "Document inserted in PineconeDB...")

    document_images = doc.extract_images_with_context(document_path=file_location)
    log.logEvent("SYSTEM", "Images extracted from the document...")

    if document_images:
        print('why isnt this working', document_images)
        doc.embed_and_upsert_images(llm=llm, db=db, images=document_images)
        log.logEvent("SYSTEM", "Images inserted in PineconeDB...")
    
    log.logEvent("SYSTEM", "/upload-document API Returned")
    return {
        "status": "200 OK",
        "message": "File saved successfully", 
        "filename": file.filename
    }

# 2) POST - chat (with optional image)
@app.post("/chat")
async def chat_endpoint(userID: int = Form(...), text: str = Form(...), image: Optional[UploadFile] = File(None)):
    log.logEvent("SYSTEM", "/chat API Called")
    
    response = ""
    image_location = None
    rag_img_ans = None

    if image:
        log.logEvent("SYSTEM", f"User {userID} provided an image")
        image_location = os.path.join(CHAT_IMG_FOLDER, image.filename)
        with open(image_location, "wb") as f:
            content = await image.read()
            f.write(content)

    db.insert_msg(user_id=userID, chat_id=1, sender='user', message=text)
    # log.logEvent("USER", msg=text, uid=userID, cid=1)
    # if db.__aquire_lock__():
    #     db.__release_lock__()
    # else:
    #     db.__insert_Write_Q__(user_id=userID, chat_id=1, sender='user', msg=text)

    input_classification = llm.validate(user_input=text, document_context=db.get_all_document_desc(), user_convo=db.__format_chat_history__(db.get_user_chats(userID)))
    log.logEvent("RESP", msg=f"Validator: {input_classification}", uid=userID, cid=1)

    if input_classification == "Valid RAG Question":
        rag_ans = doc.query_text(user_query=text)
        rag_img_ans = doc.query_images_with_text(query=text)      
        if rag_img_ans:
            response = llm.respond(user_input=llm.__format_RLLM_input__(document_context=db.get_all_document_desc(), user_input=text, vllm_classification=input_classification, rag_ans=rag_ans, convo=db.__format_chat_history__(db.get_user_chats(userID))), user_image_path=image_location, rag_image_path=os.path.join(IMAGE_FOLDER, rag_img_ans))
        else:
            response = llm.respond(user_input=llm.__format_RLLM_input__(document_context=db.get_all_document_desc(), user_input=text, vllm_classification=input_classification, rag_ans=rag_ans, convo=db.__format_chat_history__(db.get_user_chats(userID))), user_image_path=image_location, rag_image_path='')
        log.logEvent("RESP", msg=response, uid=userID, cid=1)
    else:
        response = llm.respond(user_input=llm.__format_RLLM_input__(document_context=db.get_all_document_desc(), user_input=text, vllm_classification=input_classification, rag_ans=None, convo=db.__format_chat_history__(db.get_user_chats(userID))), user_image_path=None, rag_image_path=None)
        log.logEvent("RESP", msg=response, uid=userID, cid=1)

    db.insert_msg(user_id=userID, chat_id=1, sender='bot', message=response)
    # if db.__aquire_lock__():
    #     db.__release_lock__()
    # else:
    #     db.__insert_Write_Q__(user_id=userID, chat_id=1, sender='bot', msg=response)

    log.logEvent("SYSTEM", "/chat API Returned")
    return {
        "status": "200 OK",
        "userID": userID,
        "text": text,
        "class": input_classification,
        "response": response,
        "image_answer": [rag_img_ans] if rag_img_ans else None
    }


# 3) GET - get user chats
class ChatMessage(BaseModel):
    message_id: int
    sender: str
    content: str
    timestamp: datetime

@app.get("/getuserchats/{user_id}", response_model=list[ChatMessage])
def get_user_chats(user_id: int):
    log.logEvent("SYSTEM", f"/getuserchats/{user_id} API Called")
    raw_chat_data = db.get_user_chats(user_id=user_id)
    log.logEvent("SYSTEM", f"/getuserchats/{user_id} API Returned")
    # print(raw_chat_data[0])
    # json.dumps(raw_chat_data)
    return raw_chat_data[0]


# 4) GET - get chat msgs by chatid
@app.get("/getchatmessage/{chat_id}", response_model=list[ChatMessage])
async def get_chat(chat_id: int):
    log.logEvent("SYSTEM", f"/getchatmessage/{chat_id} API Called")
    
    chat = db.get_msgs_byID(chat_id=chat_id)

    log.logEvent("SYSTEM", f"/getchatmessage/{chat_id} API Returned")
    return chat


# 5) GET - get RAG image answers
@app.get("/get-image")
async def get_file(filename: str, inline: bool = False):
    log.logEvent("SYSTEM", "/get-image API Called")
    if ".." in filename or filename.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid filename")

    file_path = os.path.join(IMAGE_FOLDER, filename)

    if not os.path.exists(file_path):
        log.logEvent("SYSTEM", "Requested image does not exists")
        raise HTTPException(status_code=404, detail="File not found")

    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        log.logEvent("SYSTEM", "Incorrect file type")
        raise HTTPException(status_code=403, detail="File type not allowed")

    mime_type, _ = mimetypes.guess_type(file_path)
    if mime_type is None:
        mime_type = "application/octet-stream"

    log.logEvent("SYSTEM", "/get-image API Returned")
    return FileResponse(
        path=file_path,
        media_type=mime_type,
        filename=filename,
        headers={"Content-Disposition": f"{'inline' if inline else 'attachment'}; filename={filename}"}
    )

@app.post("/authenticate")
async def authenticate_endpoint(username: str = Form(...), password: str = Form(...)):
    user = db.authenticate_user(username=username, password=password)
    
    return {
        "status": "200 OK",
        "userID": user[0],
        "role": user[1],
    }