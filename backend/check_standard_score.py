"""
Check Standard user credit score factors
"""
import requests

# Check Standard user
response = requests.get('http://localhost:8000/credit_score/predict/15')
data = response.json()

print(f"User: {data['username']}")
print(f"Score: {data['numeric_score']} ({data['predicted_credit_score']})")
print(f"\nKey Factors:")
for factor in data.get('key_factors', []):
    print(f"  - {factor}")
