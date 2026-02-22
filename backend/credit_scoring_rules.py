"""
Rule-based credit scoring system
Uses financial indicators to calculate credit scores accurately
"""
import math

def calculate_credit_score(features: dict) -> tuple:
    """
    Calculate credit score based on financial indicators
    Returns: (score, category, confidence)
    """
    score = 500  # Start at middle
    factors = []
    
    # Payment History (35% weight) - Most important
    payment_behaviour = features.get("Payment_Behaviour", "")
    if "High_spent_Large_value_payments" in str(payment_behaviour):
        score += 80
        factors.append("Excellent payment history")
    elif "Low_spent_Large_value_payments" in str(payment_behaviour):
        score -= 30
        factors.append("Poor payment patterns")
    elif "Medium" in str(payment_behaviour):
        score += 30
    
    payment_min = features.get("Payment_of_Min_Amount", "")
    if payment_min == "Yes":
        score += 50
        factors.append("Pays minimum amount")
    elif payment_min == "No":
        score -= 40
        factors.append("Misses minimum payments")
    elif payment_min == "NM":
        score -= 60
        factors.append("No minimum payment")
    
    num_delayed = features.get("Num_of_Delayed_Payment", 0)
    if num_delayed == 0:
        score += 50
        factors.append("No delayed payments")
    elif num_delayed <= 3:
        score += 20
    elif num_delayed <= 7:
        score -= 20
        factors.append("Some delayed payments")
    else:
        score -= 50
        factors.append("Many delayed payments")
    
    delay_days = features.get("Delay_from_due_date", 0)
    if delay_days == 0:
        score += 30
    elif delay_days <= 5:
        score += 10
    elif delay_days <= 15:
        score -= 20
    else:
        score -= 40
        factors.append("Significant payment delays")
    
    # Credit Utilization (30% weight)
    credit_util = features.get("Credit_Utilization_Ratio", 0)
    if credit_util < 10:
        score += 60
        factors.append("Excellent credit utilization")
    elif credit_util < 30:
        score += 40
        factors.append("Good credit utilization")
    elif credit_util < 50:
        score += 10
    elif credit_util < 75:
        score -= 30
        factors.append("High credit utilization")
    else:
        score -= 60
        factors.append("Very high credit utilization")
    
    # Credit History Length (15% weight)
    credit_history = features.get("Credit_History_Age", "0 Years and 0 Months")
    years = 0
    if "Years" in str(credit_history):
        try:
            years = int(str(credit_history).split("Years")[0].strip().split()[-1])
        except:
            years = 0
    
    if years >= 15:
        score += 50
        factors.append("Long credit history")
    elif years >= 10:
        score += 35
    elif years >= 5:
        score += 20
    elif years >= 2:
        score += 5
    else:
        score -= 20
        factors.append("Short credit history")
    
    # Credit Mix (10% weight)
    credit_mix = features.get("Credit_Mix", "")
    if credit_mix == "Good":
        score += 40
        factors.append("Good credit mix")
    elif credit_mix == "Standard":
        score += 15
    elif credit_mix == "Bad":
        score -= 30
        factors.append("Poor credit mix")
    
    # New Credit (10% weight)
    credit_inquiries = features.get("Num_Credit_Inquiries", 0)
    if credit_inquiries == 0:
        score += 20
    elif credit_inquiries <= 2:
        score += 10
    elif credit_inquiries <= 5:
        score -= 10
    else:
        score -= 40
        factors.append("Too many credit inquiries")
    
    # Income and Debt factors
    outstanding_debt = features.get("Outstanding_Debt", 0)
    monthly_salary = features.get("Monthly_Inhand_Salary", 4000)
    
    if outstanding_debt > 0 and monthly_salary > 0:
        debt_to_income = outstanding_debt / monthly_salary
        if debt_to_income < 0.2:
            score += 20
        elif debt_to_income < 0.5:
            score += 5
        elif debt_to_income > 2:
            score -= 30
            factors.append("High debt-to-income ratio")
    
    # Monthly balance
    monthly_balance = features.get("Monthly_Balance", 0)
    if monthly_balance > 1000:
        score += 20
        factors.append("Healthy account balance")
    elif monthly_balance > 300:
        score += 10
    elif monthly_balance < 100:
        score -= 20
        factors.append("Low account balance")
    
    # Investments
    invested = features.get("Amount_invested_monthly", 0)
    if invested > 100:
        score += 15
        factors.append("Active investor")
    elif invested > 50:
        score += 5
    
    # Clamp score to valid range
    score = max(300, min(850, score))
    
    # Determine category
    if score >= 670:
        category = "Good"
        confidence = 0.85
    elif score >= 580:
        category = "Standard"
        confidence = 0.75
    else:
        category = "Poor"
        confidence = 0.80
    
    return score, category, confidence, factors
