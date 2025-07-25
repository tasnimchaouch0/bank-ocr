from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import os
from dotenv import load_dotenv
from paddleocr import PaddleOCR
import io
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
import shutil
import os

app = FastAPI()
ocr = PaddleOCR(use_angle_cls=False, lang='en')  # Load only once


# Load environment variables
load_dotenv()

# Database settings
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME")

# SQLAlchemy URL for MySQL using PyMySQL driver
SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# SQLAlchemy setup
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Security settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# FastAPI app
app = FastAPI(title="Bank OCR API", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://radiant-pika-d2d030.netlify.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="customer")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class BankStatement(Base):
    __tablename__ = "bank_statements"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    filename = Column(String(255), nullable=False)
    extracted_data = Column(Text, nullable=True)
    account_number = Column(String(100), nullable=True)
    account_holder = Column(String(255), nullable=True)
    bank_name = Column(String(255), nullable=True)
    statement_period = Column(String(255), nullable=True)
    total_credits = Column(Float, default=0.0)
    total_debits = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

# Create tables
Base.metadata.create_all(bind=engine)

# Schemas
class UserCreate(BaseModel):
    email: EmailStr
    username: str
    full_name: str
    password: str
    role: Optional[str] = "customer"

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class BankStatementCreate(BaseModel):
    filename: str
    extracted_data: str
    account_number: Optional[str] = None
    account_holder: Optional[str] = None
    bank_name: Optional[str] = None
    statement_period: Optional[str] = None
    total_credits: Optional[float] = 0.0
    total_debits: Optional[float] = 0.0

class BankStatementResponse(BaseModel):
    id: int
    user_id: int
    filename: str
    extracted_data: str
    account_number: Optional[str]
    account_holder: Optional[str]
    bank_name: Optional[str]
    statement_period: Optional[str]
    total_credits: float
    total_debits: float
    created_at: datetime
    class Config:
        orm_mode = True

class OCRResult(BaseModel):
    text: str
    confidence: float

# DB Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Utils
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        return username
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

def get_current_user(db: Session = Depends(get_db), username: str = Depends(verify_token)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

def get_current_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    return current_user

# OCR Processing with PaddleOCR
async def process_with_paddleocr(file: UploadFile) -> OCRResult:
    try:
        # Read file content
        content = await file.read()
        
        # Save file temporarily if needed
        temp_file_path = f"temp_{file.filename}"
        with open(temp_file_path, "wb") as f:
            f.write(content)
        
        # Process with PaddleOCR
        result = ocr.ocr(temp_file_path, cls=True)
        print("🔍 OCR raw result:", result) 
        # Clean up temporary file
        os.remove(temp_file_path)
        
        # Extract text from PaddleOCR result
        extracted_text = ""
        total_confidence = 0
        count = 0
        
        for line in result:
            for item in line:
                text = item[1][0]  # Extracted text
                confidence = item[1][1]  # Confidence score
                extracted_text += text + "\n"
                total_confidence += confidence
                count += 1
        
        avg_confidence = total_confidence / count if count > 0 else 0
        
        return OCRResult(text=extracted_text, confidence=avg_confidence)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")

# Routes
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import requests

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update with your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/process-ocr")
async def process_ocr(file: UploadFile = File(...)):
    try:
        receipt_ocr_endpoint = 'https://ocr.asprise.com/api/v1/receipt'
        response = requests.post(
            receipt_ocr_endpoint,
            data={
                'api_key': 'TEST',
                'recognizer': 'auto',
                'ref_no': 'ocr_python_123',
            },
            files={"file": (file.filename, await file.read(), file.content_type)}
        )
        response.raise_for_status()
        data = response.json()
        raw_text = data['receipts'][0].get('ocr_text', '')
        return {"text": raw_text, "confidence": 1.0}
    except Exception as e:
        return {"error": str(e)}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        file_path = os.path.join("temp", file.filename)
        os.makedirs("temp", exist_ok=True)
        with open(file_path, "wb") as f:
            f.write(contents)

        result = ocr.ocr(file_path)
        texts = []
        total_conf = 0
        count = 0

        for line in result[0]:
            try:
                if len(line) > 1 and isinstance(line[1], (list, tuple)) and len(line[1]) >= 2:
                    text = line[1][0]
                    conf = float(line[1][1])
                    texts.append({'text': text, 'confidence': conf})
                    total_conf += conf
                    count += 1
            except Exception as e:
                print(f"⚠️ Skipping line due to error: {e}")

        avg_confidence = total_conf / count if count > 0 else 0
        return {"results": texts, "avg_confidence": avg_confidence}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")
@app.post("/auth/register", response_model=UserResponse)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter((User.email == user.email) | (User.username == user.username)).first():
        raise HTTPException(status_code=400, detail="Email or username already registered")
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        hashed_password=hashed_password,
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/auth/login", response_model=Token)
def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == user_credentials.username).first()
    if not user or not verify_password(user_credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    access_token = create_access_token(data={"sub": user.username}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@app.get("/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@app.post("/statements", response_model=BankStatementResponse)
def create_statement(statement: BankStatementCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_statement = BankStatement(user_id=current_user.id, **statement.dict())
    db.add(db_statement)
    db.commit()
    db.refresh(db_statement)
    return db_statement

@app.get("/statements", response_model=List[BankStatementResponse])
def list_statements(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(BankStatement).filter(BankStatement.user_id == current_user.id).offset(skip).limit(limit).all()

@app.get("/statements/{statement_id}", response_model=BankStatementResponse)
def get_statement(statement_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    statement = db.query(BankStatement).filter(BankStatement.id == statement_id, BankStatement.user_id == current_user.id).first()
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")
    return statement

@app.delete("/statements/{statement_id}")
def delete_statement(statement_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    statement = db.query(BankStatement).filter(BankStatement.id == statement_id, BankStatement.user_id == current_user.id).first()
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")
    db.delete(statement)
    db.commit()
    return {"message": "Statement deleted successfully"}

@app.get("/admin/users", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin_user)):
    return db.query(User).all()

@app.get("/admin/statements", response_model=List[BankStatementResponse])
def get_all_statements(db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin_user)):
    return db.query(BankStatement).all()

@app.put("/admin/users/{user_id}/toggle-status")
def toggle_user(user_id: int, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    return {"message": f"User {'activated' if user.is_active else 'deactivated'} successfully"}

@app.post("/ocr/process", response_model=OCRResult)
async def process_ocr(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    if file.content_type not in ["application/pdf", "image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF, JPG, or PNG are supported.")
    return await process_with_paddleocr(file)

@app.get("/")
def read_root():
    return {"message": "Bank OCR API is running"}
import traceback

@app.post("/ocr/")
async def process_image(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    try:
        print(f"Received file: {file.filename}, type: {file.content_type}")
        contents = await file.read()

        if file.content_type not in ["application/pdf", "application/x-pdf", "image/jpeg", "image/jpg", "image/png"]:
            raise HTTPException(status_code=400, detail="Invalid file type. Only PDF, JPG, or PNG are supported.")

        temp_file_path = f"temp_{file.filename}"
        with open(temp_file_path, "wb") as f:
            f.write(contents)

        result = process_with_paddleocr(temp_file_path)
        os.remove(temp_file_path)

        return {"text": result}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
