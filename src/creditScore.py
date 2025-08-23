import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from imblearn.over_sampling import SMOTE
from sklearn.impute import SimpleImputer
import joblib
import pickle
import os

# Ensure models folder exists
os.makedirs("models", exist_ok=True)

# Load dataset
df = pd.read_csv("./data/train.csv", low_memory=False)

# Drop unnecessary columns
drop_df = df.drop(["ID", "Customer_ID"], axis=1).copy()

# Encode target and drop rows with NaN target
drop_df["credit__score_label"] = drop_df["Credit_Score"].map({"Poor": 0, "Standard": 1, "Good": 2})
drop_df = drop_df.dropna(subset=["credit__score_label"])
drop_df = drop_df.drop("Credit_Score", axis=1)

# Convert numeric columns safely
numeric_cols = ["Age", "Annual_Income", "Monthly_Inhand_Salary",
                "Num_Bank_Accounts", "Num_Credit_Card", "Interest_Rate",
                "Num_of_Loan", "Delay_from_due_date", "Num_of_Delayed_Payment",
                "Changed_Credit_Limit", "Num_Credit_Inquiries",
                "Outstanding_Debt", "Credit_Utilization_Ratio",
                "Total_EMI_per_month", "Amount_invested_monthly", "Monthly_Balance"]

for col in numeric_cols:
    if col in drop_df.columns:
        drop_df[col] = pd.to_numeric(drop_df[col], errors="coerce")

# Fix Age
drop_df.loc[(drop_df["Age"] > 90) | (drop_df["Age"] < 10), "Age"] = np.nan

# Fill numeric NaNs with mean
num_imputer = SimpleImputer(strategy="mean")
drop_df[numeric_cols] = num_imputer.fit_transform(drop_df[numeric_cols])

# Fill categorical NaNs with most frequent
categorical_cols = drop_df.select_dtypes(include=["object"]).columns
cat_imputer = SimpleImputer(strategy="most_frequent")
drop_df[categorical_cols] = cat_imputer.fit_transform(drop_df[categorical_cols])
print("categorical",categorical_cols)
# Encode categorical columns and save the encoders
encoders = {}
for col in categorical_cols:
    le = LabelEncoder()
    drop_df[col] = le.fit_transform(drop_df[col].astype(str))
    encoders[col] = le  # store the encoder

# Split features and target
X = drop_df.drop("credit__score_label", axis=1)
y = drop_df["credit__score_label"]

# SMOTE balancing
sm = SMOTE(random_state=42)
X_res, y_res = sm.fit_resample(X, y)

# Scale numeric features
scaler = StandardScaler()
X_res = scaler.fit_transform(X_res)

# Train/test split
X_train, X_test, y_train, y_test = train_test_split(X_res, y_res, test_size=0.2, random_state=42)

# Logistic Regression
lr = LogisticRegression(max_iter=500)
lr.fit(X_train, y_train)
y_pred = lr.predict(X_test)
print("Logistic Regression Report:")
print(classification_report(y_test, y_pred))

# Decision Tree
dt = DecisionTreeClassifier(random_state=42)
dt.fit(X_train, y_train)
y_pred = dt.predict(X_test)
print("Decision Tree Report:")
print(classification_report(y_test, y_pred))

# Random Forest
rf = RandomForestClassifier(random_state=42)
rf.fit(X_train, y_train)
y_pred = rf.predict(X_test)
print("Random Forest Report:")
print(classification_report(y_test, y_pred))

# Save trained models
joblib.dump(lr, "models/logistic_regression_model.pkl")
joblib.dump(dt, "models/decision_tree_model.pkl")
joblib.dump(rf, "models/random_forest_model.pkl")
joblib.dump(scaler, "models/scaler.pkl")

# Save label encoders
with open("models/categorical_encoders.pkl", "wb") as f:
    pickle.dump(encoders, f)

print("Models, scaler, and encoders have been saved successfully!")
