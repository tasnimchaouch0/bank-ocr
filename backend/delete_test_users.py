"""
Delete test users
"""
from sqlalchemy import create_engine, text
from urllib.parse import quote_plus

password = quote_plus("tesstess@123")
DATABASE_URL = f"postgresql://postgres:{password}@localhost:5432/bank_ocr"
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    conn.execute(text("DELETE FROM bank_statements WHERE user_id > 7"))
    conn.execute(text("DELETE FROM users WHERE id > 7"))
    conn.commit()
    print("✅ Deleted all test users (IDs > 7)")
