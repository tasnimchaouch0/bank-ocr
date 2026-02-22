"""
Seed users and bank statements for credit scoring model testing
Creates diverse credit profiles: Poor, Standard, Good
"""
import random
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from urllib.parse import quote_plus

# Database connection
password = quote_plus("tesstess@123")
DATABASE_URL = f"postgresql://postgres:{password}@localhost:5432/bank_ocr"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Credit profile templates - using typical credit score ranges
PROFILES = [
    {
        "label": "Poor",
        "user": {"age": 23, "annual_income": 19400.98, "monthly_inhand_salary": 1824.843, "num_bank_accounts": 3, "num_credit_card": 4},
        "statement": {
            "payment_behaviour": "Low_spent_Large_value_payments",
            "payment_of_min_amount": "NM",  # No minimum payment
            "credit_mix": "Bad",
            "outstanding_debt": 1850.541,
            "credit_utilization_ratio": 36.5,  # High utilization
            "total_emi_per_month": 154.56,
            "interest_rate": 16.0,
            "num_of_loan": 4,
            "type_of_loan": "Payday Loan, Credit-Builder Loan, Debt Consolidation Loan, and Not Specified",
            "delay_from_due_date": 22.0,  # Frequent delays
            "num_of_delayed_payment": 12,  # Many delays
            "changed_credit_limit": 12.36,
            "num_credit_inquiries": 8,  # Many inquiries
            "credit_history_age": "3 Years and 4 Months",
            "amount_invested_monthly": 28.431,
            "monthly_balance": 187.25,
        }
    },
    {
        "label": "Standard",
        "user": {"age": 28, "annual_income": 35000.78, "monthly_inhand_salary": 2917.56, "num_bank_accounts": 4, "num_credit_card": 6},
        "statement": {
            "payment_behaviour": "Low_spent_Medium_value_payments",
            "payment_of_min_amount": "Yes",  # Changed from "No" to "Yes"
            "credit_mix": "Standard",
            "outstanding_debt": 1265.78,
            "credit_utilization_ratio": 29.8,  # Moderate utilization
            "total_emi_per_month": 95.42,
            "interest_rate": 12.0,
            "num_of_loan": 3,
            "type_of_loan": "Auto Loan, Credit-Builder Loan, and Home Equity Loan",
            "delay_from_due_date": 5.0,  # Reduced from 9.0
            "num_of_delayed_payment": 4,  # Reduced from 7
            "changed_credit_limit": 10.23,
            "num_credit_inquiries": 4,
            "credit_history_age": "7 Years and 8 Months",
            "amount_invested_monthly": 58.34,
            "monthly_balance": 245.76,
        }
    },
    {
        "label": "Good",
        "user": {"age": 35, "annual_income": 58000.45, "monthly_inhand_salary": 4833.374, "num_bank_accounts": 8, "num_credit_card": 7},
        "statement": {
            "payment_behaviour": "High_spent_Large_value_payments",
            "payment_of_min_amount": "Yes",
            "credit_mix": "Good",
            "outstanding_debt": 780.23,
            "credit_utilization_ratio": 24.5,  # Low utilization
            "total_emi_per_month": 78.56,
            "interest_rate": 8.5,
            "num_of_loan": 2,
            "type_of_loan": "Mortgage Loan and Auto Loan",
            "delay_from_due_date": 3.0,  # Rare delays
            "num_of_delayed_payment": 4,  # Few delays
            "changed_credit_limit": 8.72,
            "num_credit_inquiries": 2,  # Few inquiries
            "credit_history_age": "15 Years and 2 Months",
            "amount_invested_monthly": 125.48,
            "monthly_balance": 385.92,
        }
    }
]

N_USERS = 6  # 2 of each profile

def seed_users_and_statements():
    db = SessionLocal()
    try:
        for i in range(N_USERS):
            profile = PROFILES[i % len(PROFILES)]
            uname = f"testuser{i+1}_{profile['label'].lower()}"
            email = f"{uname}@bankocr.com"
            full_name = f"Test User {i+1} ({profile['label']})"
            password = "test123"
            role = "customer"
            user_sql = text("""
                INSERT INTO users (email, username, full_name, hashed_password, age, annual_income, monthly_inhand_salary, num_bank_accounts, num_credit_card, role, is_active, created_at)
                VALUES (:email, :username, :full_name, :hashed_password, :age, :annual_income, :monthly_inhand_salary, :num_bank_accounts, :num_credit_card, :role, true, :created_at)
                RETURNING id
            """)
            # Hash password with bcrypt
            import bcrypt
            hashed_pw = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
            user_params = {
                "email": email,
                "username": uname,
                "full_name": full_name,
                "hashed_password": hashed_pw,
                "age": profile["user"]["age"],
                "annual_income": profile["user"]["annual_income"],
                "monthly_inhand_salary": profile["user"]["monthly_inhand_salary"],
                "num_bank_accounts": profile["user"]["num_bank_accounts"],
                "num_credit_card": profile["user"]["num_credit_card"],
                "role": role,
                "created_at": datetime.now()
            }
            result = db.execute(user_sql, user_params)
            user_id = result.fetchone()[0]
            # Create bank statement
            statement_sql = text("""
                INSERT INTO bank_statements (user_id, filename, extracted_data, account_number, account_holder, bank_name, statement_period, total_credits, total_debits, outstanding_debt, credit_utilization_ratio, payment_behaviour, payment_of_min_amount, credit_mix, total_emi_per_month, interest_rate, num_of_loan, type_of_loan, delay_from_due_date, num_of_delayed_payment, num_credit_inquiries, month, credit_history_age, amount_invested_monthly, monthly_balance, created_at)
                VALUES (:user_id, :filename, :extracted_data, :account_number, :account_holder, :bank_name, :statement_period, :total_credits, :total_debits, :outstanding_debt, :credit_utilization_ratio, :payment_behaviour, :payment_of_min_amount, :credit_mix, :total_emi_per_month, :interest_rate, :num_of_loan, :type_of_loan, :delay_from_due_date, :num_of_delayed_payment, :num_credit_inquiries, :month, :credit_history_age, :amount_invested_monthly, :monthly_balance, :created_at)
            """)
            statement_params = {
                "user_id": user_id,
                "filename": f"statement_{uname}.pdf",
                "extracted_data": None,
                "account_number": f"ACCT{i+1000}",
                "account_holder": full_name,
                "bank_name": "Mock Bank",
                "statement_period": "2026-01",
                "total_credits": random.uniform(1000, 10000),
                "total_debits": random.uniform(500, 9000),
                "created_at": datetime.now(),
                "month": "January",
                "extracted_data": None,
                "credit_history_age": profile["statement"]["credit_history_age"],
                "payment_behaviour": profile["statement"]["payment_behaviour"],
                "payment_of_min_amount": profile["statement"]["payment_of_min_amount"],
                "credit_mix": profile["statement"]["credit_mix"],
                "outstanding_debt": profile["statement"]["outstanding_debt"],
                "credit_utilization_ratio": profile["statement"]["credit_utilization_ratio"],
                "total_emi_per_month": profile["statement"]["total_emi_per_month"],
                "interest_rate": profile["statement"]["interest_rate"],
                "num_of_loan": profile["statement"]["num_of_loan"],
                "type_of_loan": profile["statement"]["type_of_loan"],
                "delay_from_due_date": profile["statement"]["delay_from_due_date"],
                "num_of_delayed_payment": profile["statement"]["num_of_delayed_payment"],
                "num_credit_inquiries": profile["statement"]["num_credit_inquiries"],
                "amount_invested_monthly": profile["statement"]["amount_invested_monthly"],
                "monthly_balance": profile["statement"]["monthly_balance"],
            }
            db.execute(statement_sql, statement_params)
            print(f"✅ Created user {uname} ({profile['label']}) and bank statement")
        db.commit()
        print(f"\n✅ Seeded {N_USERS} users and bank statements with diverse credit profiles!")
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Seeding credit profiles...")
    seed_users_and_statements()
    print("\n✅ Done!")
