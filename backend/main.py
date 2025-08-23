from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text, Float, ForeignKey, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import os
import joblib
from dotenv import load_dotenv
from paddleocr import PaddleOCR
import pandas as pd
from pathlib import Path
from joblib import load
import traceback
import requests
from sqlalchemy.orm import Session
import pickle
import numpy as np

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
    age = Column(Integer, nullable=True)
    gender = Column(String(50), nullable=True)
    occupation = Column(String(255), nullable=True)
    ssn = Column(String(20), unique=True, index=True, nullable=True)
    annual_income = Column(Float, nullable=True)
    monthly_inhand_salary = Column(Float, nullable=True)
    num_bank_accounts = Column(Integer, default=0)
    num_credit_card = Column(Integer, default=0)
    role = Column(String(50), default="customer")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    statement = relationship("BankStatement", back_populates="user", uselist=False)
    transactions = relationship("Transaction", back_populates="user")

class BankStatement(Base):
    __tablename__ = "bank_statements"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    extracted_data = Column(Text, nullable=True)
    account_number = Column(String(100), nullable=True)
    account_holder = Column(String(255), nullable=True)
    bank_name = Column(String(255), nullable=True)
    statement_period = Column(String(255), nullable=True)
    total_credits = Column(Float, default=0.0)
    total_debits = Column(Float, default=0.0) 
    outstanding_debt = Column(Float, default=0.0)
    credit_utilization_ratio = Column(Float, default=0.0)
    payment_behaviour = Column(String(50), nullable=True)
    payment_of_min_amount = Column(String(50), nullable=True)
    credit_mix = Column(String(50), nullable=True)
    total_emi_per_month = Column(Float, default=0.0)
    interest_rate = Column(Float, nullable=True) 
    num_of_loan = Column(Integer, default=0) 
    type_of_loan = Column(String(255), nullable=True)  
    delay_from_due_date = Column(Float, nullable=True)
    num_of_delayed_payment = Column(Integer, default=0)  
    changed_credit_limit = Column(Float, default=0.0) 
    num_credit_inquiries = Column(Integer, default=0)  
    month = Column(String(50), nullable=True)
    credit_history_age = Column(String(50), nullable=True)   # e.g. "10 Years 2 Months"
    amount_invested_monthly = Column(Float, default=0.0)
    monthly_balance = Column(Float, default=0.0)

    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="statement")
    transactions = relationship("Transaction", back_populates="bank_statement")

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    bank_statement_id = Column(Integer, ForeignKey("bank_statements.id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(DateTime, nullable=False)
    unix_time = Column(Float, nullable=True)
    trans_hour = Column(Integer, nullable=True)
    trans_day_of_week = Column(Integer, nullable=True)
    merchant = Column(String(255), nullable=True)
    amount = Column(Float, nullable=False)
    category = Column(String(255), nullable=True)
    city = Column(String(255), nullable=True)
    state = Column(String(255), nullable=True)
    zip_code = Column(String(50), nullable=True)
    lat = Column(Float, nullable=True)       
    long = Column(Float, nullable=True)       
    merch_lat = Column(Float, nullable=True)   
    merch_long = Column(Float, nullable=True)  
    city_pop = Column(Integer, nullable=True)  
    fraud_score = Column(Float, nullable=True)

    user = relationship("User", back_populates="transactions")
    bank_statement = relationship("BankStatement", back_populates="transactions")

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

lr_model = joblib.load("../src/models/logistic_regression_model.pkl")
dt_model = joblib.load("../src/models/decision_tree_model.pkl")
rf_model = joblib.load("../src/models/random_forest_model.pkl")
scaler = joblib.load("../src/models/scaler.pkl")

with open("../src/models/categorical_encoders.pkl", "rb") as f:
    encoders = pickle.load(f)

# Define the numeric and categorical columns (same as training)
numeric_cols = [
    "Age", "Annual_Income", "Monthly_Inhand_Salary",
    "Num_Bank_Accounts", "Num_Credit_Card", "Interest_Rate",
    "Num_of_Loan", "Delay_from_due_date", "Num_of_Delayed_Payment",
    "Changed_Credit_Limit", "Num_Credit_Inquiries", "Outstanding_Debt",
    "Credit_Utilization_Ratio", "Total_EMI_per_month", "Amount_invested_monthly",
    "Monthly_Balance"
]

categorical_cols = list(encoders.keys())

# Load fraud model once
MODEL_PATH = "../src/models/random_forest.pkl"
fraud_model = joblib.load(MODEL_PATH)
preprocessor = joblib.load("../src/models/preprocessor.pkl")
X_train_columns = joblib.load("../src/models/X_train_columns.pkl")
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
@app.get("/statements/me", response_model=BankStatementResponse)
def get_user_statement(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    statement = db.query(BankStatement).filter(BankStatement.user_id == current_user.id).first()
    if not statement:
        raise HTTPException(status_code=404, detail="No bank statement found for this user")
    return statement
@app.put("/statements/{statement_id}", response_model=BankStatementResponse)
def update_statement(
    statement_id: int,
    statement: BankStatementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_statement = db.query(BankStatement).filter(
        BankStatement.id == statement_id,
        BankStatement.user_id == current_user.id
    ).first()
    if not db_statement:
        raise HTTPException(status_code=404, detail="Statement not found")
    
    for key, value in statement.dict().items():
        setattr(db_statement, key, value)
    
    db.commit()
    db.refresh(db_statement)
    return db_statement
@app.get("/admin/predict/transactions")
def predict_all_transactions(db: Session = Depends(get_db)):
    transactions = db.query(Transaction).all()
    results = []

    for tx in transactions:
        user = db.query(User).filter(User.id == tx.customer_id).first()
        features = {
            "merchant": tx.merchant,
            "category": tx.category,
            "city": tx.city,
            "state": tx.state,
            "zip_code": tx.zip_code,
            "lat": tx.lat,
            "long": tx.long,
            "city_pop": tx.city_pop,
            "unix_time": tx.unix_time,
            "merch_lat": tx.merch_lat,
            "merch_long": tx.merch_long,
            "trans_hour": tx.trans_hour,
            "trans_day_of_week": tx.trans_day_of_week,
            "amt": tx.amount,
            "gender": getattr(user, "gender", None),
            "occupation": getattr(user, "occupation", None)
        }

        df = pd.DataFrame([features])

        # Encode categoricals same as training
        categorical_cols = ["merchant", "category", "city", "state", "zip_code", "gender", "occupation"]
        df_encoded = pd.get_dummies(df, columns=categorical_cols)
        df_encoded = df_encoded.reindex(columns=X_train_columns, fill_value=0)

        fraud_score = fraud_model.predict_proba(df_encoded)[:, 1][0]

        results.append({
            "id": tx.id,
            "customer_full_name": user.full_name,
            "customer_mail":user.email,
            "merchant": tx.merchant,
            "amount": tx.amount,
            "fraud_score": float(fraud_score),
            "is_fraudulent": bool(fraud_score > 0.5)
        })

    return results
@app.get("/credit_score/predict_all")
def predict_all_users(model_type: str = "rf", db: Session = Depends(get_db)):
    users = db.query(User).all()
    results = []

    # Get the features the scaler/model expects
    expected_features = scaler.feature_names_in_.tolist()

    for user in users:
        statement = getattr(user, "statement", None)

        # Build base features
        features = {
            "Month": getattr(statement, "month", np.nan),
            "Name": user.full_name,
            "SSN": user.ssn,
            "Occupation": user.occupation,
            "Type_of_Loan": getattr(statement, "type_of_loan", "unknown"),
            "Credit_Mix": getattr(statement, "credit_mix", "unknown"),
            "Credit_History_Age": getattr(statement, "credit_history_age", np.nan),
            "Payment_of_Min_Amount": getattr(statement, "payment_of_min_amount", "unknown"),
            "Payment_Behaviour": getattr(statement, "payment_behaviour", "unknown"),
            "Age": user.age,
            "Annual_Income": user.annual_income,
            "Monthly_Inhand_Salary": user.monthly_inhand_salary,
            "Num_Bank_Accounts": user.num_bank_accounts,
            "Num_Credit_Card": user.num_credit_card,
            "Interest_Rate": getattr(statement, "interest_rate", np.nan),
            "Num_of_Loan": getattr(statement, "num_of_loan", np.nan),
            "Delay_from_due_date": getattr(statement, "delay_from_due_date", np.nan),
            "Num_of_Delayed_Payment": getattr(statement, "num_of_delayed_payment", np.nan),
            "Changed_Credit_Limit": getattr(statement, "changed_credit_limit", np.nan),
            "Num_Credit_Inquiries": getattr(statement, "num_credit_inquiries", np.nan),
            "Outstanding_Debt": getattr(statement, "outstanding_debt", np.nan),
            "Credit_Utilization_Ratio": getattr(statement, "credit_utilization_ratio", np.nan),
            "Total_EMI_per_month": getattr(statement, "total_emi_per_month", np.nan),
            "Amount_invested_monthly": getattr(statement, "amount_invested_monthly", np.nan),
            "Monthly_Balance": getattr(statement, "monthly_balance", np.nan),
        }

        # Encode categorical columns
        for col in categorical_cols:
            features[col] = getattr(user, col, "unknown")

        df = pd.DataFrame([features])

        # Encode categorical columns using existing encoders
        for col in categorical_cols:
            le = encoders[col]
            df[col] = df[col].astype(str)
            if df[col][0] not in le.classes_:
                df[col] = le.transform([le.classes_[0]])  # fallback to first known class
            else:
                df[col] = le.transform(df[col])

        # Align columns with model/scaler
        for col in expected_features:
            if col not in df.columns:
                df[col] = 0

        df = df[expected_features]

        # Scale numeric columns
        df_scaled = pd.DataFrame(scaler.transform(df), columns=df.columns)

        # Fill any remaining NaNs (just in case)
        df_scaled = df_scaled.fillna(0)

        # Select model
        if model_type.lower() == "lr":
            model = lr_model
        elif model_type.lower() == "dt":
            model = dt_model
        else:
            model = rf_model

        # Make predictions
        pred_class = model.predict(df_scaled)[0]
        pred_proba = model.predict_proba(df_scaled).max()
        label_map = {0: "Poor", 1: "Standard", 2: "Good"}
        pred_label = label_map.get(pred_class, "Unknown")

        results.append({
            "user_id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "predicted_credit_score": pred_label,
            "probability": float(pred_proba),
            "model_used": model_type
        })

    return results
@app.get("/credit_score/predict/{user_id}")
def predict_user_credit_score(user_id: int, model_type: str = "rf", db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    statement = getattr(user, "statement", None)

    # Get expected features
    expected_features = scaler.feature_names_in_.tolist()

    # Build features dict
    features = {
        "Month": getattr(statement, "month", np.nan),
        "Name": user.full_name,
        "SSN": user.ssn,
        "Occupation": user.occupation,
        "Type_of_Loan": getattr(statement, "type_of_loan", "unknown"),
        "Credit_Mix": getattr(statement, "credit_mix", "unknown"),
        "Credit_History_Age": getattr(statement, "credit_history_age", np.nan),
        "Payment_of_Min_Amount": getattr(statement, "payment_of_min_amount", "unknown"),
        "Payment_Behaviour": getattr(statement, "payment_behaviour", "unknown"),
        "Age": user.age,
        "Annual_Income": user.annual_income,
        "Monthly_Inhand_Salary": user.monthly_inhand_salary,
        "Num_Bank_Accounts": user.num_bank_accounts,
        "Num_Credit_Card": user.num_credit_card,
        "Interest_Rate": getattr(statement, "interest_rate", np.nan),
        "Num_of_Loan": getattr(statement, "num_of_loan", np.nan),
        "Delay_from_due_date": getattr(statement, "delay_from_due_date", np.nan),
        "Num_of_Delayed_Payment": getattr(statement, "num_of_delayed_payment", np.nan),
        "Changed_Credit_Limit": getattr(statement, "changed_credit_limit", np.nan),
        "Num_Credit_Inquiries": getattr(statement, "num_credit_inquiries", np.nan),
        "Outstanding_Debt": getattr(statement, "outstanding_debt", np.nan),
        "Credit_Utilization_Ratio": getattr(statement, "credit_utilization_ratio", np.nan),
        "Total_EMI_per_month": getattr(statement, "total_emi_per_month", np.nan),
        "Amount_invested_monthly": getattr(statement, "amount_invested_monthly", np.nan),
        "Monthly_Balance": getattr(statement, "monthly_balance", np.nan),
    }

    # Encode categorical columns
    for col in categorical_cols:
        features[col] = getattr(user, col, "unknown")

    df = pd.DataFrame([features])

    # Encode categorical features
    for col in categorical_cols:
        le = encoders[col]
        df[col] = df[col].astype(str)
        if df[col][0] not in le.classes_:
            df[col] = le.transform([le.classes_[0]])
        else:
            df[col] = le.transform(df[col])

    # Align columns with expected features
    for col in expected_features:
        if col not in df.columns:
            df[col] = 0
    df = df[expected_features]

    # Scale numeric columns and fill NaNs
    df_scaled = pd.DataFrame(scaler.transform(df), columns=df.columns).fillna(0)

    # Select model
    if model_type.lower() == "lr":
        model = lr_model
    elif model_type.lower() == "dt":
        model = dt_model
    else:
        model = rf_model

    # Predict
    pred_class = model.predict(df_scaled)[0]
    pred_proba = model.predict_proba(df_scaled).max()
    label_map = {0: "Poor", 1: "Standard", 2: "Good"}
    pred_label = label_map.get(pred_class, "Unknown")
    print("done")
    return {
        "user_id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "predicted_credit_score": pred_label,
        "probability": float(pred_proba),
        "model_used": model_type
    }

# Fraud prediction endpoint
@app.get("/fraud/predict/{transaction_id}")
def predict_transaction(transaction_id: int, db: Session = Depends(get_db)):
    # Fetch transaction
    tx = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Fetch linked user (for gender & occupation)
    user = db.query(User).filter(User.id == tx.customer_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prepare features for ML model
    features = {
        "merchant": tx.merchant,
        "category": tx.category,
        "city": tx.city,
        "state": tx.state,
        "zip_code": tx.zip_code,
        "lat": tx.lat,
        "long": tx.long,
        "city_pop": tx.city_pop,
        "unix_time": tx.unix_time,
        "merch_lat": tx.merch_lat,
        "merch_long": tx.merch_long,
        "trans_hour": tx.trans_hour,
        "trans_day_of_week": tx.trans_day_of_week,
        "amt": tx.amount,
        "gender": getattr(user, "gender", None),
        "occupation": getattr(user, "occupation", None)
    }

    df = pd.DataFrame([features])

    # --- Preprocess categorical features like during training ---
    categorical_cols = ["merchant", "category", "city", "state", "zip_code", "gender", "occupation"]
    df_encoded = pd.get_dummies(df, columns=categorical_cols)

    # Ensure columns match training data
    df_encoded = df_encoded.reindex(columns=X_train_columns, fill_value=0)  # X_train_columns = list of columns from training

    # Predict fraud probability
    fraud_score = fraud_model.predict_proba(df_encoded)[:, 1][0]  # probability fraud

    return {
        "transaction_id": tx.id,
        "customer_id": tx.customer_id,
        "merchant": tx.merchant,
        "amount": tx.amount,
        "fraud_score": float(fraud_score),
        "is_fraudulent": bool(fraud_score > 0.5)
    }


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