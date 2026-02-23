"""
ML-based credit scoring system
Uses trained model on "Give Me Some Credit" dataset
Maps user/statement features to model features, predicts probability of default,
converts to credit score (300-850) and category (Poor/Standard/Good)
"""
import numpy as np
import joblib
import json
import os
import math

# ============================================================
# Load model artifacts once at import time
# ============================================================
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_MODELS_DIR = os.path.join(_BASE_DIR, "models")

try:
    _model = joblib.load(os.path.join(_MODELS_DIR, "credit_best_model.pkl"))
    _scaler = joblib.load(os.path.join(_MODELS_DIR, "credit_scaler.pkl"))
    with open(os.path.join(_MODELS_DIR, "credit_model_metadata.json"), "r") as f:
        _metadata = json.load(f)
    _feature_cols = _metadata["feature_columns"]
    _income_median = _metadata["income_median"]
    _dependents_median = _metadata["dependents_median"]
    _age_median = _metadata["age_median"]
    _ML_AVAILABLE = True
    print(f"[CreditScore] ML model loaded: {_metadata['best_model']} (AUC={_metadata['auc_scores'][_metadata['best_model']]:.4f})")
except Exception as e:
    print(f"[CreditScore] WARNING: Could not load ML model: {e}")
    print("[CreditScore] Falling back to rule-based scoring")
    _ML_AVAILABLE = False


def _map_features(features: dict) -> np.ndarray:
    """
    Map backend user/statement features to the model's expected feature vector.
    
    Backend features -> Model features mapping:
      Credit_Utilization_Ratio (0-100%) -> RevolvingUtilizationOfUnsecuredLines (0-1.5)
      Age -> age
      Num_of_Delayed_Payment -> NumberOfTime30-59DaysPastDueNotWorse
      Outstanding_Debt / Monthly_Inhand_Salary -> DebtRatio
      Monthly_Inhand_Salary -> MonthlyIncome
      Num_Bank_Accounts + Num_Credit_Card -> NumberOfOpenCreditLinesAndLoans
      (derived) -> NumberOfTimes90DaysLate
      Num_of_Loan -> NumberRealEstateLoansOrLines
      (derived) -> NumberOfTime60-89DaysPastDueNotWorse
      (default) -> NumberOfDependents
    """
    # Base features extraction with safe defaults
    credit_util_pct = float(features.get("Credit_Utilization_Ratio", 30))
    revolving_util = min(credit_util_pct / 100.0, 1.5)  # Convert % to ratio, cap at 1.5
    
    age = float(features.get("Age", _age_median))
    if age < 18 or age > 100:
        age = _age_median
    
    num_delayed = float(features.get("Num_of_Delayed_Payment", 0))
    delay_days = float(features.get("Delay_from_due_date", 0))
    
    # Map delayed payments to past-due categories
    # 30-59 days: moderate delays
    times_30_59 = min(num_delayed, 13)  # Cap at 13
    # 60-89 days: significant delays (estimate from delay days)
    times_60_89 = min(max(0, num_delayed - 3), 5) if delay_days > 30 else 0
    # 90+ days: severe (estimate from extreme delays)
    times_90 = min(max(0, num_delayed - 5), 3) if delay_days > 60 else 0
    
    monthly_income = float(features.get("Monthly_Inhand_Salary", _income_median))
    if monthly_income <= 0:
        monthly_income = _income_median
    
    outstanding_debt = float(features.get("Outstanding_Debt", 0))
    debt_ratio = outstanding_debt / monthly_income if monthly_income > 0 else 0
    debt_ratio = min(debt_ratio, 10.0)  # Cap at 10
    
    num_bank = int(features.get("Num_Bank_Accounts", 2))
    num_credit_card = int(features.get("Num_Credit_Card", 1))
    num_open_lines = min(num_bank + num_credit_card, 40)  # Cap at 40
    
    num_loans = float(features.get("Num_of_Loan", 0))
    real_estate_loans = min(num_loans, 10)  # Use num_of_loan as proxy
    
    dependents = float(features.get("NumberOfDependents", _dependents_median))
    dependents = min(dependents, 10)
    
    # Base feature vector (10 features matching FEATURE_COLS)
    base_features = [
        revolving_util,                    # RevolvingUtilizationOfUnsecuredLines
        age,                               # age
        times_30_59,                       # NumberOfTime30-59DaysPastDueNotWorse
        debt_ratio,                        # DebtRatio
        monthly_income,                    # MonthlyIncome
        num_open_lines,                    # NumberOfOpenCreditLinesAndLoans
        times_90,                          # NumberOfTimes90DaysLate
        real_estate_loans,                 # NumberRealEstateLoansOrLines
        times_60_89,                       # NumberOfTime60-89DaysPastDueNotWorse
        dependents,                        # NumberOfDependents
    ]
    
    # Engineered features (7 features matching ALL_FEATURES additions)
    total_times_late = times_30_59 + times_60_89 + times_90
    has_late_payment = 1 if total_times_late > 0 else 0
    has_severe_late = 1 if times_90 > 0 else 0
    high_utilization = 1 if revolving_util > 1.0 else 0
    
    # Age group (matching training bins: [0,25,35,45,55,65,100] -> labels [0,1,2,3,4,5])
    if age <= 25:
        age_group = 0
    elif age <= 35:
        age_group = 1
    elif age <= 45:
        age_group = 2
    elif age <= 55:
        age_group = 3
    elif age <= 65:
        age_group = 4
    else:
        age_group = 5
    
    income_debt_interaction = monthly_income * (1 - min(debt_ratio, 1.0))
    log_income = np.log1p(monthly_income)
    
    engineered_features = [
        total_times_late,
        has_late_payment,
        has_severe_late,
        high_utilization,
        float(age_group),
        income_debt_interaction,
        log_income,
    ]
    
    return np.array(base_features + engineered_features).reshape(1, -1)


def _generate_factors(features: dict, prob_default: float, score: int) -> list:
    """Generate human-readable explanation factors for the score."""
    factors = []
    
    credit_util = float(features.get("Credit_Utilization_Ratio", 30))
    if credit_util < 30:
        factors.append("Good credit utilization")
    elif credit_util > 75:
        factors.append("Very high credit utilization")
    elif credit_util > 50:
        factors.append("High credit utilization")
    
    num_delayed = float(features.get("Num_of_Delayed_Payment", 0))
    if num_delayed == 0:
        factors.append("No delayed payments")
    elif num_delayed > 5:
        factors.append("Many delayed payments")
    elif num_delayed > 0:
        factors.append("Some delayed payments")
    
    delay_days = float(features.get("Delay_from_due_date", 0))
    if delay_days > 30:
        factors.append("Significant payment delays")
    
    outstanding_debt = float(features.get("Outstanding_Debt", 0))
    monthly_salary = float(features.get("Monthly_Inhand_Salary", 4000))
    if monthly_salary > 0:
        dti = outstanding_debt / monthly_salary
        if dti < 0.3:
            factors.append("Low debt-to-income ratio")
        elif dti > 2:
            factors.append("High debt-to-income ratio")
    
    age = float(features.get("Age", 30))
    if age >= 45:
        factors.append("Mature borrower profile")
    elif age < 25:
        factors.append("Young borrower - limited history")
    
    monthly_balance = float(features.get("Monthly_Balance", 0))
    if monthly_balance > 1000:
        factors.append("Healthy account balance")
    elif monthly_balance < 100:
        factors.append("Low account balance")
    
    if prob_default < 0.1:
        factors.append("Very low default risk")
    elif prob_default > 0.5:
        factors.append("Elevated default risk")
    
    return factors[:5]  # Return top 5 factors


def calculate_credit_score(features: dict) -> tuple:
    """
    Calculate credit score using ML model.
    
    Args:
        features: dict of user/statement features from backend
        
    Returns:
        (numeric_score, category, confidence, factors)
        - numeric_score: 300-850 credit score
        - category: "Poor", "Standard", or "Good"
        - confidence: model confidence (probability)
        - factors: list of human-readable factor explanations
    """
    if _ML_AVAILABLE:
        return _predict_ml(features)
    else:
        return _predict_rules(features)


def _scorecard_bonus(features: dict) -> int:
    """
    Apply secondary scorecard adjustments after the base ML score.
    These attributes are NOT in the base model's training data but add
    meaningful score differentiation within the same GBM probability bucket.
    Returns an integer adjustment (-20 to +40 points).
    """
    bonus = 0
    
    # Credit history age: longer = better (up to +20 pts)
    credit_history = features.get("Credit_History_Age", "0 Years and 0 Months")
    years = 0
    if "Years" in str(credit_history):
        try:
            years = int(str(credit_history).split("Years")[0].strip().split()[-1])
        except:
            years = 0
    if years >= 20:
        bonus += 20
    elif years >= 15:
        bonus += 15
    elif years >= 10:
        bonus += 10
    elif years >= 5:
        bonus += 5
    elif years < 2:
        bonus -= 10

    # Monthly balance: higher = better (up to +10 pts)
    monthly_balance = float(features.get("Monthly_Balance", 0))
    if monthly_balance >= 5000:
        bonus += 10
    elif monthly_balance >= 2000:
        bonus += 7
    elif monthly_balance >= 1000:
        bonus += 4
    elif monthly_balance >= 500:
        bonus += 2
    elif monthly_balance < 100:
        bonus -= 10

    # Monthly investments: shows financial discipline (up to +8 pts)
    invested = float(features.get("Amount_invested_monthly", 0))
    if invested >= 400:
        bonus += 8
    elif invested >= 200:
        bonus += 5
    elif invested >= 50:
        bonus += 2

    # Number of open credit lines (up to +5 pts)
    num_bank = int(features.get("Num_Bank_Accounts", 2))
    num_card = int(features.get("Num_Credit_Card", 1))
    open_lines = num_bank + num_card
    if 3 <= open_lines <= 6:
        bonus += 5
    elif open_lines > 10:
        bonus -= 5

    return bonus


def _predict_ml(features: dict) -> tuple:
    """ML-based prediction using trained model + scorecard adjustments."""
    # Map backend features to model features
    X = _map_features(features)
    
    # Scale features
    X_scaled = _scaler.transform(X)
    
    # Predict probability of default
    prob_default = float(_model.predict_proba(X_scaled)[0][1])
    
    # Convert to credit score (300-850)
    # Linear mapping: lower probability of default = higher credit score
    base_score = int(300 + (1 - prob_default) * 550)
    
    # Apply scorecard bonus for secondary attributes not in the base model
    bonus = _scorecard_bonus(features)
    numeric_score = max(300, min(850, base_score + bonus))
    
    # Determine category using thresholds tuned for SMOTE-trained model
    # SMOTE inflates probabilities upward, so thresholds are adjusted accordingly:
    #   Good:     score >= 770  (prob_default < ~0.29)
    #   Standard: score >= 530  (prob_default between ~0.29 and ~0.59)
    #   Poor:     score <  530  (prob_default > ~0.59)
    if numeric_score >= 770:
        category = "Good"
        confidence = round(1 - prob_default, 3)
    elif numeric_score >= 530:
        category = "Standard"
        confidence = round(0.6 + (1 - prob_default) * 0.2, 3)
    else:
        category = "Poor"
        confidence = round(prob_default, 3)
    
    confidence = max(0.5, min(0.99, confidence))
    
    # Generate explanation factors
    factors = _generate_factors(features, prob_default, numeric_score)
    
    return numeric_score, category, confidence, factors


def _predict_rules(features: dict) -> tuple:
    """Fallback rule-based scoring if ML model unavailable."""
    score = 500
    factors = []
    
    # Credit Utilization
    credit_util = float(features.get("Credit_Utilization_Ratio", 30))
    if credit_util < 30:
        score += 60
        factors.append("Good credit utilization")
    elif credit_util < 50:
        score += 20
    elif credit_util < 75:
        score -= 30
    else:
        score -= 60
        factors.append("Very high credit utilization")
    
    # Payment history
    num_delayed = float(features.get("Num_of_Delayed_Payment", 0))
    if num_delayed == 0:
        score += 50
        factors.append("No delayed payments")
    elif num_delayed <= 3:
        score += 10
    elif num_delayed <= 7:
        score -= 30
    else:
        score -= 60
        factors.append("Many delayed payments")
    
    # Debt-to-income
    outstanding_debt = float(features.get("Outstanding_Debt", 0))
    monthly_salary = float(features.get("Monthly_Inhand_Salary", 4000))
    if monthly_salary > 0:
        dti = outstanding_debt / monthly_salary
        if dti < 0.3:
            score += 30
        elif dti > 2:
            score -= 40
            factors.append("High debt-to-income ratio")
    
    # Age factor
    age = float(features.get("Age", 30))
    if age >= 45:
        score += 20
    elif age < 25:
        score -= 15
    
    # Monthly balance
    monthly_balance = float(features.get("Monthly_Balance", 0))
    if monthly_balance > 1000:
        score += 20
    elif monthly_balance < 100:
        score -= 20
    
    score = max(300, min(850, score))
    
    if score >= 770:
        category = "Good"
        confidence = 0.75
    elif score >= 530:
        category = "Standard"
        confidence = 0.65
    else:
        category = "Poor"
        confidence = 0.70
    
    return score, category, confidence, factors
