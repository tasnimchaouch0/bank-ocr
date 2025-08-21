from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserOut(BaseModel):
    id: int
    full_name: str
    email: str

    class Config:
        orm_mode = True

class TransactionOut(BaseModel):
    id: int
    date: datetime
    amount: float
    merchant: Optional[str]
    category: Optional[str]
    customer: UserOut   # 👈 nested customer object

    class Config:
        orm_mode = True
