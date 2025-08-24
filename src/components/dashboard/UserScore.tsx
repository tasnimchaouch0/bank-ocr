import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiService, type CreditScoreResponse } from '../../services/api';

const UserScore: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [score, setScore] = useState<CreditScoreResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchScore = async () => {
      try {
        setError(null);
        const data = await apiService.getCreditScore(Number(userId));
        setScore(data);
      } catch (err: any) {
        console.error("Failed to fetch credit score:", err);
        setError("Failed to fetch credit score");
      } finally {
        setLoading(false);
      }
    };

    fetchScore();
  }, [userId]);

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

  if (loading) return <div>Loading credit score...</div>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!score) return <p>No credit score available</p>;

  return (
    <div className="container mt-4">
      <h2>Credit Scoring - {score.full_name}</h2>
      <button className="btn btn-secondary mb-3" onClick={() => window.history.back()}>
        ← Back
      </button>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="table-responsive">
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
                <tr>
                  <td>{score.user_id}</td>
                  <td>{score.username}</td>
                  <td>{getCreditStatus(score)}</td>
                  <td>{score.numeric_score}</td>
                  <td>{(score.probability * 100).toFixed(1)}%</td>
                  <td>{score.model_used}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserScore;