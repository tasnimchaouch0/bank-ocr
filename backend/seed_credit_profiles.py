"""
Seed users and bank statements for credit scoring model testing
Creates 6 INDIVIDUAL credit profiles (2 Poor, 2 Standard, 2 Good)
Each user has UNIQUE values so they produce different numeric scores
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

# 6 INDIVIDUAL profiles - each with distinct values producing different scores
# Two of each tier but with meaningful differences
INDIVIDUAL_PROFILES = [
    # ----- POOR TIER -----
    {
        "label": "poor",
        "description": "Severe - young, high debt, many late payments",
        "user": {
            "age": 21, "annual_income": 18000.0,
            "monthly_inhand_salary": 1500.0,
            "num_bank_accounts": 1, "num_credit_card": 6,
        },
        "statement": {
            "payment_behaviour": "Low_spent_Large_value_payments",
            "payment_of_min_amount": "NM",
            "credit_mix": "Bad",
            "outstanding_debt": 15000.0,        # debt ratio = 10x income
            "credit_utilization_ratio": 110.0,  # over-limit
            "total_emi_per_month": 400.0,
            "interest_rate": 22.0,
            "num_of_loan": 8,
            "type_of_loan": "Payday Loan, Debt Consolidation Loan",
            "delay_from_due_date": 75.0,
            "num_of_delayed_payment": 18,
            "changed_credit_limit": 14.0,
            "num_credit_inquiries": 10,
            "credit_history_age": "1 Years and 3 Months",
            "amount_invested_monthly": 0.0,
            "monthly_balance": 30.0,
        },
    },
    {
        "label": "poor",
        "description": "Moderate-poor - bad history but slightly better income",
        "user": {
            "age": 26, "annual_income": 24000.0,
            "monthly_inhand_salary": 2000.0,
            "num_bank_accounts": 1, "num_credit_card": 5,
        },
        "statement": {
            "payment_behaviour": "Low_spent_Large_value_payments",
            "payment_of_min_amount": "NM",
            "credit_mix": "Bad",
            "outstanding_debt": 10000.0,        # debt ratio = 5x income
            "credit_utilization_ratio": 88.0,
            "total_emi_per_month": 300.0,
            "interest_rate": 19.0,
            "num_of_loan": 6,
            "type_of_loan": "Payday Loan, Credit-Builder Loan",
            "delay_from_due_date": 65.0,           # >60 → activates 90-day severe flag
            "num_of_delayed_payment": 12,
            "changed_credit_limit": 11.0,
            "num_credit_inquiries": 7,
            "credit_history_age": "2 Years and 8 Months",
            "amount_invested_monthly": 0.0,
            "monthly_balance": 80.0,
        },
    },
    # ----- STANDARD TIER -----
    {
        "label": "standard",
        "description": "Lower-standard - decent income, occasional delays",
        "user": {
            "age": 35, "annual_income": 44000.0,
            "monthly_inhand_salary": 3700.0,
            "num_bank_accounts": 2, "num_credit_card": 2,
        },
        "statement": {
            "payment_behaviour": "Low_spent_Medium_value_payments",
            "payment_of_min_amount": "Yes",
            "credit_mix": "Standard",
            "outstanding_debt": 2200.0,         # debt ratio ~0.59
            "credit_utilization_ratio": 62.0,    # higher util → lower score
            "total_emi_per_month": 160.0,
            "interest_rate": 15.0,
            "num_of_loan": 3,
            "type_of_loan": "Auto Loan, Credit-Builder Loan",
            "delay_from_due_date": 20.0,
            "num_of_delayed_payment": 5,          # more delays → Standard/Poor range
            "changed_credit_limit": 9.0,
            "num_credit_inquiries": 4,
            "credit_history_age": "7 Years and 2 Months",
            "amount_invested_monthly": 60.0,
            "monthly_balance": 700.0,
        },
    },
    {
        "label": "standard",
        "description": "Upper-standard - good income, very few issues",
        "user": {
            "age": 44, "annual_income": 62000.0,
            "monthly_inhand_salary": 5200.0,
            "num_bank_accounts": 2, "num_credit_card": 2,
        },
        "statement": {
            "payment_behaviour": "Medium_spent_Medium_value_payments",
            "payment_of_min_amount": "Yes",
            "credit_mix": "Standard",
            "outstanding_debt": 1600.0,         # debt ratio ~0.31
            "credit_utilization_ratio": 45.0,    # moderate-high util
            "total_emi_per_month": 110.0,
            "interest_rate": 12.0,
            "num_of_loan": 2,
            "type_of_loan": "Auto Loan, Home Equity Loan",
            "delay_from_due_date": 8.0,
            "num_of_delayed_payment": 3,          # a few delays → upper Standard
            "changed_credit_limit": 7.0,
            "num_credit_inquiries": 2,
            "credit_history_age": "12 Years and 4 Months",
            "amount_invested_monthly": 120.0,
            "monthly_balance": 1200.0,
        },
    },
    # ----- GOOD TIER -----
    {
        "label": "good",
        "description": "Good - mid-career, clean record, moderate history",
        "user": {
            "age": 40, "annual_income": 68000.0,
            "monthly_inhand_salary": 5700.0,
            "num_bank_accounts": 3, "num_credit_card": 2,
        },
        "statement": {
            "payment_behaviour": "High_spent_Large_value_payments",
            "payment_of_min_amount": "Yes",
            "credit_mix": "Good",
            "outstanding_debt": 800.0,          # debt ratio ~0.14
            "credit_utilization_ratio": 22.0,   # slightly higher util → base ~810 not 850
            "total_emi_per_month": 80.0,
            "interest_rate": 7.5,
            "num_of_loan": 2,
            "type_of_loan": "Mortgage Loan, Auto Loan",
            "delay_from_due_date": 5.0,
            "num_of_delayed_payment": 1,          # 1 mild delay → base score ~810, not capped 850
            "changed_credit_limit": 4.0,
            "num_credit_inquiries": 2,
            "credit_history_age": "12 Years and 4 Months",  # shorter than testuser6 → lower bonus
            "amount_invested_monthly": 200.0,               # less than testuser6 → lower bonus
            "monthly_balance": 2200.0,                      # less than testuser6 → lower bonus
        },
    },
    {
        "label": "good",
        "description": "Excellent - very high income, spotless record, 25yr history",
        "user": {
            "age": 58, "annual_income": 120000.0,
            "monthly_inhand_salary": 10000.0,
            "num_bank_accounts": 4, "num_credit_card": 2,
        },
        "statement": {
            "payment_behaviour": "High_spent_Large_value_payments",
            "payment_of_min_amount": "Yes",
            "credit_mix": "Good",
            "outstanding_debt": 200.0,          # debt ratio ~0.02 — extremely low
            "credit_utilization_ratio": 6.0,
            "total_emi_per_month": 30.0,
            "interest_rate": 5.0,
            "num_of_loan": 1,
            "type_of_loan": "Mortgage Loan",
            "delay_from_due_date": 0.0,
            "num_of_delayed_payment": 0,
            "changed_credit_limit": 2.0,
            "num_credit_inquiries": 0,
            "credit_history_age": "25 Years and 2 Months",  # much longer → higher bonus
            "amount_invested_monthly": 600.0,               # much more → higher bonus
            "monthly_balance": 7000.0,                      # much more → higher bonus
        },
    },
]

def seed_users_and_statements():
    db = SessionLocal()
    try:
        for i, profile in enumerate(INDIVIDUAL_PROFILES):
            uname = f"testuser{i+1}_{profile['label']}"
            email = f"{uname}@bankocr.com"
            full_name = f"Test User {i+1} ({profile['label'].capitalize()} - {profile['description']})"
            pw = "test123"
            role = "customer"
            user_sql = text("""
                INSERT INTO users (email, username, full_name, hashed_password, age, annual_income, monthly_inhand_salary, num_bank_accounts, num_credit_card, role, is_active, created_at)
                VALUES (:email, :username, :full_name, :hashed_password, :age, :annual_income, :monthly_inhand_salary, :num_bank_accounts, :num_credit_card, :role, true, :created_at)
                RETURNING id
            """)
            # Hash password with bcrypt (truncate to 72 bytes — bcrypt limit)
            import bcrypt
            hashed_pw = bcrypt.hashpw(pw.encode()[:72], bcrypt.gensalt()).decode()
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
            print(f"✅ Created {uname} ({profile['label'].upper()}) — {profile['description']}")
        db.commit()
        print(f"\n✅ Seeded {len(INDIVIDUAL_PROFILES)} users with unique credit profiles!")
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
