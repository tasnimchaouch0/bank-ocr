"""Read seeded test users from DB and score them using the current ML model."""
import sys
sys.path.insert(0, ".")
from sqlalchemy import create_engine, text
from urllib.parse import quote_plus
from credit_scoring_rules import calculate_credit_score

password = quote_plus("tesstess@123")
engine = create_engine(f"postgresql://postgres:{password}@localhost:5432/bank_ocr")

with engine.connect() as conn:
    rows = conn.execute(text("""
        SELECT u.id, u.username, u.age, u.monthly_inhand_salary,
               u.num_bank_accounts, u.num_credit_card,
               s.credit_utilization_ratio, s.outstanding_debt, s.num_of_delayed_payment,
               s.delay_from_due_date, s.num_of_loan, s.credit_history_age,
               s.amount_invested_monthly, s.monthly_balance
        FROM users u
        LEFT JOIN bank_statements s ON s.user_id = u.id
        WHERE u.username LIKE 'testuser%'
        ORDER BY u.id
    """)).fetchall()

header = "Username" + " " * 20 + "Score   Category"
print(header)
print("-" * 50)
for row in rows:
    features = {
        "Age": row.age or 30,
        "Monthly_Inhand_Salary": float(row.monthly_inhand_salary or 4000),
        "Num_Bank_Accounts": row.num_bank_accounts or 2,
        "Num_Credit_Card": row.num_credit_card or 1,
        "Credit_Utilization_Ratio": float(row.credit_utilization_ratio or 0),
        "Outstanding_Debt": float(row.outstanding_debt or 0),
        "Num_of_Delayed_Payment": row.num_of_delayed_payment or 0,
        "Delay_from_due_date": float(row.delay_from_due_date or 0),
        "Num_of_Loan": row.num_of_loan or 0,
        "Credit_History_Age": row.credit_history_age or "0 Years and 0 Months",
        "Amount_invested_monthly": float(row.amount_invested_monthly or 0),
        "Monthly_Balance": float(row.monthly_balance or 1000),
    }
    score, cat, conf, _ = calculate_credit_score(features)
    name = row.username
    print(name.ljust(28) + str(score).rjust(5) + "  " + cat)
