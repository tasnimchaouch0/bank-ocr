import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';

interface FormData {
  filename: string;
  extracted_data: string;
  account_number: string;
  account_holder: string;
  bank_name: string;
  statement_period: string;
  total_credits: number;
  total_debits: number;
}

const ModifyStatement: React.FC = () => {
  const { statementId } = useParams<{ statementId: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    filename: '',
    extracted_data: '',
    account_number: '',
    account_holder: '',
    bank_name: '',
    statement_period: '',
    total_credits: 0,
    total_debits: 0,
  });
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchStatement = async () => {
      if (!statementId) return;
      try {
        const statement = await apiService.getStatement(Number(statementId));
        setFormData({
          filename: statement.filename || '',
          extracted_data: statement.extracted_data || '',
          account_number: statement.account_number || '',
          account_holder: statement.account_holder || '',
          bank_name: statement.bank_name || '',
          statement_period: statement.statement_period || '',
          total_credits: statement.total_credits || 0,
          total_debits: statement.total_debits || 0,
        });
      } catch (err) {
        console.error('Error fetching statement:', err);
        setError('Failed to load statement');
      }
    };
    fetchStatement();
  }, [statementId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'total_credits' || name === 'total_debits'
          ? parseFloat(value) || 0
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statementId) return;
    try {
      await apiService.updateBankStatement(Number(statementId), formData);
      navigate('/bankStatement');
    } catch (err) {
      console.error('Error updating statement:', err);
      setError('Failed to update statement');
    }
  };

  const handleReturn = () => {
    navigate('/bankStatement');
  };

  return (
    <div className="container">
      <style>{`
        .container {
          min-height: 100vh;
          background-color: #f0f4f8;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 1rem;
        }
        .card {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          padding: 2rem;
          width: 100%;
          max-width: 600px;
        }
        .card h2 {
          font-size: 1.75rem;
          font-weight: bold;
          color: #1a202c;
          margin-bottom: 1.5rem;
        }
        .error {
          background-color: #fee2e2;
          border-left: 4px solid #dc2626;
          color: #991b1b;
          padding: 1rem;
          margin-bottom: 1.5rem;
          border-radius: 4px;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.25rem;
        }
        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 0.875rem;
          color: #1a202c;
          transition: border-color 0.2s;
        }
        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        .form-group textarea {
          resize: vertical;
          font-family: monospace;
        }
        .form-group small {
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 0.25rem;
          display: block;
        }
        .button-group {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 1.5rem;
        }
        .button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .button-primary {
          background-color: #2563eb;
          color: white;
        }
        .button-primary:hover {
          background-color: #1d4ed8;
        }
        .button-secondary {
          background-color: #6b7280;
          color: white;
        }
        .button-secondary:hover {
          background-color: #4b5563;
        }
        .button i {
          font-size: 1rem;
        }
      `}</style>
      <div className="card">
        <h2>Modify Bank Statement</h2>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label><i className="fas fa-file"></i> File Name</label>
            <input
              type="text"
              name="filename"
              value={formData.filename}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label><i className="fas fa-id-card"></i> Account Number</label>
            <input
              type="text"
              name="account_number"
              value={formData.account_number}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label><i className="fas fa-user"></i> Account Holder</label>
            <input
              type="text"
              name="account_holder"
              value={formData.account_holder}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label><i className="fas fa-university"></i> Bank Name</label>
            <input
              type="text"
              name="bank_name"
              value={formData.bank_name}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label><i className="fas fa-calendar"></i> Statement Period</label>
            <input
              type="text"
              name="statement_period"
              value={formData.statement_period}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label><i className="fas fa-arrow-up"></i> Total Credits</label>
            <input
              type="number"
              name="total_credits"
              value={formData.total_credits}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label><i className="fas fa-arrow-down"></i> Total Debits</label>
            <input
              type="number"
              name="total_debits"
              value={formData.total_debits}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label><i className="fas fa-code"></i> Extracted Data (JSON)</label>
            <textarea
              name="extracted_data"
              value={formData.extracted_data}
              onChange={handleChange}
              rows={10}
            />
            <small>Modify the extracted data if there are any OCR mistakes.</small>
          </div>
          <div className="button-group">
            <button type="button" onClick={handleReturn} className="button button-secondary">
              <i className="fas fa-arrow-left"></i> Return
            </button>
            <button type="submit" className="button button-primary">
              <i className="fas fa-save"></i> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModifyStatement;