import React, { useEffect, useState } from 'react';
import { apiService, type CreditScoreResponse } from '../../services/api';

export const CreditScoring: React.FC = () => {
  const [scores, setScores] = useState<CreditScoreResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScores = async () => {
      try {
        setError(null);
        const data = await apiService.getAllCreditScores();
        setScores(data);
      } catch (err: any) {
        console.error("Failed to fetch credit scores:", err);
        setError("Failed to fetch credit scores");
      } finally {
        setLoading(false);
      }
    };
    fetchScores();
  }, []);

  const getCreditStatus = (score: CreditScoreResponse) => {
    switch (score.predicted_credit_score) {
      case "Poor":
        return <span className="badge bg-danger">Poor</span>;
      case "Standard":
        return <span className="badge bg-warning text-dark">Standard</span>;
      case "Good":
        return <span className="badge bg-success">Good</span>;
      default:
        return <span>-</span>;
    }
  };

  if (loading) return <div>Loading credit scores...</div>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div className="container mt-4">
      <h2>Credit Scoring - All Users</h2>

      {/* Back button */}
      <button className="btn btn-secondary mb-3" onClick={() => window.history.back()}>
        ← Back
      </button>

      {scores.length === 0 ? (
        <p>No credit scores available</p>
      ) : (
        <table className="table table-striped mt-3">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Username</th>
              <th>Predicted Score</th>
              <th>Numeric Score</th>
              <th>Probability</th>
              <th>Model Used</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((score) => (
              <tr key={score.user_id}>
                <td>{score.user_id}</td>
                <td>{score.username}</td>
                <td>{getCreditStatus(score)}</td>
                <td>{(score.numeric_score)}</td>
                <td>{(score.probability * 100).toFixed(1)}%</td>
                <td>{score.model_used}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CreditScoring;
