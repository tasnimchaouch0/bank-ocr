import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from sklearn.compose import ColumnTransformer
from imblearn.over_sampling import SMOTE
import joblib
import os
import warnings

warnings.filterwarnings('ignore')


def load_data(train_path, test_path):
    """Load CSV files"""
    train_data = pd.read_csv(train_path)
    test_data = pd.read_csv(test_path)
    return train_data, test_data


def preprocess_data(train_data, test_data):
    """Feature engineering and drop unnecessary columns"""
    for df in [train_data, test_data]:
        df['trans_date_trans_time'] = pd.to_datetime(df['trans_date_trans_time'])
        df['trans_hour'] = df['trans_date_trans_time'].dt.hour
        df['trans_day_of_week'] = df['trans_date_trans_time'].dt.dayofweek
        df.drop(columns=['trans_date_trans_time'], inplace=True)

    columns_to_drop = ['trans_num', 'first', 'last', 'street', 'dob', 'Unnamed: 0', 'cc_num']
    for df in [train_data, test_data]:
        df.drop(columns=[col for col in columns_to_drop if col in df.columns], inplace=True)

    train_data = train_data.dropna()
    test_data = test_data.dropna()

    return train_data, test_data


def scale_and_balance(X_train, y_train, X_test):
    """Scale numerical features, one-hot encode categorical features, and apply SMOTE"""
    categorical = ["merchant", "category", "gender", "city", "state", "job", "zip"]
    numerical = ["amt", "lat", "long", "city_pop", "unix_time",
                 "merch_lat", "merch_long", "trans_hour", "trans_day_of_week"]

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), numerical),
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical)
        ]
    )

    X_train_processed = preprocessor.fit_transform(X_train)
    X_test_processed = preprocessor.transform(X_test)

    smote = SMOTE(sampling_strategy=0.1, random_state=42)
    X_train_res, y_train_res = smote.fit_resample(X_train_processed, y_train)

    return X_train_res, y_train_res, X_test_processed, preprocessor


def train_and_evaluate_models(X_train_res, y_train_res, X_test_scaled, y_test):
    """Train multiple models and return the main Random Forest model"""
    models = {
        'Logistic Regression': LogisticRegression(max_iter=1000, random_state=42, n_jobs=1),
        'Decision Tree': DecisionTreeClassifier(random_state=42, max_depth=10, min_samples_leaf=50),
        'Random Forest': RandomForestClassifier(
            n_estimators=50, max_depth=12, min_samples_leaf=50, random_state=42, n_jobs=-1
        )
    }

    os.makedirs("models", exist_ok=True)
    main_model = None

    for name, model in models.items():
        print(f"\n🚀 Training {name}...")
        model.fit(X_train_res, y_train_res)
        y_pred = model.predict(X_test_scaled)

        print(f"\n📊 Results for {name}:")
        print("Confusion Matrix:")
        print(confusion_matrix(y_test, y_pred))
        print("\nClassification Report:")
        print(classification_report(y_test, y_pred))
        print("ROC AUC Score:", roc_auc_score(y_test, y_pred))

        # Save each individual model
        model_file = f"models/{name.replace(' ', '_').lower()}.pkl"
        joblib.dump(model, model_file)
        print(f"✅ Model saved to {model_file}")

        if name == 'Random Forest':
            main_model = model

    return main_model


def main():
    # Load data
    train_data, test_data = load_data("data/fraudTrain.csv", "data/fraudTest.csv")
    print("Training Data Shape:", train_data.shape)
    print("Fraud Cases in Train:", len(train_data[train_data['is_fraud'] == 1]))
    print("Legitimate Cases in Train:", len(train_data[train_data['is_fraud'] == 0]))
    print("\nTest Data Shape:", test_data.shape)

    # Preprocess
    train_data, test_data = preprocess_data(train_data, test_data)

    # Features and target
    X_train = train_data.drop('is_fraud', axis=1)
    y_train = train_data['is_fraud']
    X_test = test_data.drop('is_fraud', axis=1)
    y_test = test_data['is_fraud']
    print("Features after preprocessing:", X_train.columns.tolist())

    # Scale, encode, and balance
    X_train_res, y_train_res, X_test_scaled, preprocessor = scale_and_balance(X_train, y_train, X_test)
    print("Shape of resampled training data:", X_train_res.shape)

    # Train models and get main Random Forest
    fraud_model = train_and_evaluate_models(X_train_res, y_train_res, X_test_scaled, y_test)

    # Save preprocessing pipeline
    joblib.dump(preprocessor, "models/preprocessor.pkl")
    print("✅ Preprocessing pipeline saved to models/preprocessor.pkl")

    # Save main model (Random Forest)
    joblib.dump(fraud_model, "models/fraud_model.pkl")
    print("✅ Main fraud model saved to models/fraud_model.pkl")

    # Save training columns (handles one-hot encoding)
    X_train_columns = preprocessor.get_feature_names_out()
    joblib.dump(X_train_columns, "models/X_train_columns.pkl")
    print("✅ Training columns saved to models/X_train_columns.pkl")


if __name__ == "__main__":
    main()
