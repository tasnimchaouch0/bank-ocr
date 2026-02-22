"""
Test credit scoring predictions
"""
import requests

response = requests.get('http://localhost:8000/credit_score/predict_all')
data = response.json()

print('\nCredit Score Predictions:')
print(f"{'ID':<5} {'Username':<25} {'Predicted':<12} {'Score':<6} {'Prob':<8} {'Model'}")
print('='*75)

for r in sorted(data, key=lambda x: x['user_id']):
    print(f"{r['user_id']:<5} {r['username']:<25} {r['predicted_credit_score']:<12} {r['numeric_score']:<6} {r['probability']*100:.1f}%    {r['model_used']}")

print()
