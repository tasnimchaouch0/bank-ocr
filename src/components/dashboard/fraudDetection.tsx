// src/components/dashboard/FraudDetection.tsx
import React, { useState, useEffect } from "react";
import { apiService } from "../../services/api";
import type { Transaction, FraudPrediction } from "../../services/api";

type TransactionWithFraud = Transaction & Partial<FraudPrediction>;

export const FraudDetection: React.FC = () => {
  const [transactions, setTransactions] = useState<TransactionWithFraud[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setError(null);
        const data = await apiService.getAllTransactions();
        console.log("data",data)
        setTransactions(data);
      } catch (err: any) {
        console.error("Failed to fetch transactions:", err);
        setError("Failed to fetch transactions");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const getFraudStatus = (tx: TransactionWithFraud) => {
    if (tx.is_fraudulent === undefined) return "Unknown";
    return tx.is_fraudulent ? "High Risk" : "Low Risk";
  };

  if (loading) return <p>Loading transactions...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div className="container mt-4">
      <h2>Fraud Detection - Transactions</h2>

      {/* Back button */}
      <button className="btn btn-secondary mb-3" onClick={() => window.history.back()}>
        ← Back
      </button>

      {transactions.length === 0 ? (
        <p>No transactions available</p>
      ) : (
        <table className="table table-striped mt-3">
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Email</th>
              <th>Amount</th>
              <th>Merchant</th>
              <th>Category</th>
              <th>Date</th>
              <th>Fraud Score</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id}>
                <td>{tx.id}</td>
                <td>{tx.customer_full_name}</td>
                <td>{tx.customer_mail}</td>
                <td>${tx.amount.toFixed(2)}</td>
                <td>{tx.merchant || "-"}</td>
                <td>{tx.category || "-"}</td>
                <td>{new Date(tx.date).toLocaleString()}</td>
                <td>{tx.fraud_score !== undefined ? tx.fraud_score.toFixed(2) : "-"}</td>
                <td>{getFraudStatus(tx)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default FraudDetection;
