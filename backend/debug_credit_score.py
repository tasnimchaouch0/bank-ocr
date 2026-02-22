"""
Debug script to check credit scoring predictions
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from urllib.parse import quote_plus
import joblib
import pickle
import pandas as pd

# Database connection
password = quote_plus("tesstess@123")
DATABASE_URL = f"postgresql://postgres:{password}@localhost:5432/bank_ocr"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Load models
rf_model = joblib.load("src/models/random_forest_model.pkl")
scaler = joblib.load("src/models/scaler.pkl")
with open("src/models/categorical_encoders.pkl", "rb") as f:
    encoders = pickle.load(f)

categorical_cols = list(encoders.keys())
expected_features = scaler.feature_names_in_.tolist()

def check_user(user_id):
    db = SessionLocal()
    result = db.execute(text(f"SELECT * FROM users WHERE id={user_id}"))
    user = result.fetchone()
    
    result = db.execute(text(f"SELECT * FROM bank_statements WHERE user_id={user_id}"))
    statement = result.fetchone()
    
    print(f"\n{'='*60}")
    print(f"User: {user.username} (ID: {user.id})")
    print(f"{'='*60}")
    
    if statement:
        print(f"\nBank Statement Data:")
        print(f"  Credit Mix: {statement.credit_mix}")
        print(f"  Payment Behaviour: {statement.payment_behaviour}")
        print(f"  Payment of Min Amount: {statement.payment_of_min_amount}")
        print(f"  Outstanding Debt: {statement.outstanding_debt}")
        print(f"  Credit Utilization: {statement.credit_utilization_ratio}")
        print(f"  Delayed Payments: {statement.num_of_delayed_payment}")
        print(f"  Credit History Age: {statement.credit_history_age}")
        print(f"  Monthly Balance: {statement.monthly_balance}")
    
    # Build features
    features = {
        "Month": statement.month if statement and statement.month else "January",
        "Name": user.full_name or "Unknown",
        "SSN": user.ssn or "000-00-0000",
        "Occupation": user.occupation or "Unknown",
        "Type_of_Loan": statement.type_of_loan if statement and statement.type_of_loan else "Not Specified",
        "Credit_Mix": statement.credit_mix if statement and statement.credit_mix else "Standard",
        "Credit_History_Age": statement.credit_history_age if statement and statement.credit_history_age else "0 Years and 0 Months",
        "Payment_of_Min_Amount": statement.payment_of_min_amount if statement and statement.payment_of_min_amount else "No",
        "Payment_Behaviour": statement.payment_behaviour if statement and statement.payment_behaviour else "Low_spent_Small_value_payments",
        "Age": user.age if user.age else 30,
        "Annual_Income": float(user.annual_income) if user.annual_income else 50000.0,
        "Monthly_Inhand_Salary": float(user.monthly_inhand_salary) if user.monthly_inhand_salary else 4000.0,
        "Num_Bank_Accounts": user.num_bank_accounts if user.num_bank_accounts else 2,
        "Num_Credit_Card": user.num_credit_card if user.num_credit_card else 1,
        "Interest_Rate": float(statement.interest_rate) if statement and statement.interest_rate else 12.0,
        "Num_of_Loan": statement.num_of_loan if statement and statement.num_of_loan else 0,
        "Delay_from_due_date": float(statement.delay_from_due_date) if statement and statement.delay_from_due_date else 0.0,
        "Num_of_Delayed_Payment": statement.num_of_delayed_payment if statement and statement.num_of_delayed_payment else 0,
        "Changed_Credit_Limit": float(statement.changed_credit_limit) if statement and statement.changed_credit_limit else 0.0,
        "Num_Credit_Inquiries": statement.num_credit_inquiries if statement and statement.num_credit_inquiries else 0,
        "Outstanding_Debt": float(statement.outstanding_debt) if statement and statement.outstanding_debt else 0.0,
        "Credit_Utilization_Ratio": float(statement.credit_utilization_ratio) if statement and statement.credit_utilization_ratio else 0.0,
        "Total_EMI_per_month": float(statement.total_emi_per_month) if statement and statement.total_emi_per_month else 0.0,
        "Amount_invested_monthly": float(statement.amount_invested_monthly) if statement and statement.amount_invested_monthly else 0.0,
        "Monthly_Balance": float(statement.monthly_balance) if statement and statement.monthly_balance else 1000.0,
    }
    
    print(f"\n\nRaw Features (before encoding):")
    for k, v in features.items():
        print(f"  {k}: {v}")
    
    # Convert to DataFrame
    df = pd.DataFrame([features])
    
    # Encode categorical
    print(f"\n\nEncoding categorical features...")
    for col in categorical_cols:
        if col in df.columns:
            le = encoders[col]
            original_val = df[col][0]
            df[col] = df[col].astype(str).fillna("Unknown")
            if df[col][0] not in le.classes_:
                encoded_val = le.transform([le.classes_[0]])[0]
                print(f"  {col}: '{original_val}' NOT IN CLASSES -> using '{le.classes_[0]}' -> {encoded_val}")
            else:
                encoded_val = le.transform(df[col])[0]
                print(f"  {col}: '{original_val}' -> {encoded_val}")
            df[col] = [encoded_val]
    
    # Add missing features
    for col in expected_features:
        if col not in df.columns:
            df[col] = 0
    
    # Reorder
    df = df[expected_features]
    
    print(f"\n\nFeatures after encoding (before scaling):")
    print(df.iloc[0].to_dict())
    
    # Scale
    df_scaled = pd.DataFrame(scaler.transform(df), columns=df.columns).fillna(0)
    
    print(f"\n\nScaled features:")
    print(df_scaled.iloc[0].to_dict())
    
    # Predict
    pred_class = rf_model.predict(df_scaled)[0]
    pred_proba = rf_model.predict_proba(df_scaled)
    
    print(f"\n\nModel Prediction:")
    print(f"  Predicted class: {pred_class}")
    print(f"  Probabilities: Poor={pred_proba[0][0]:.3f}, Standard={pred_proba[0][1]:.3f}, Good={pred_proba[0][2]:.3f}")
    
    label_map = {0: "Poor", 1: "Standard", 2: "Good"}
    pred_label = label_map.get(pred_class, "Unknown")
    
    print(f"  Label: {pred_label}")
    
    db.close()

if __name__ == "__main__":
    print("Checking user predictions...\n")
    check_user(14)  # testuser1_poor
    check_user(16)  # testuser3_good
