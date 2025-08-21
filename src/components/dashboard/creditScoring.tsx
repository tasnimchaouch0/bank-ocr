import React from 'react';
import type { User } from '../../services/api';

interface CreditScoringProps {
  user: User;
}

export const CreditScoring: React.FC<CreditScoringProps> = ({ user }) => {
  return (
    <div>
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <h5 className="fw-bold mb-3">Credit Scoring</h5>
          <p>Credit scoring information for {user.full_name} will be displayed here.</p>
          {/* Add credit scoring UI and logic here */}
          <div className="alert alert-info">
            <i className="bi bi-info-circle me-2"></i>
            This feature is under development. Contact support for more information.
          </div>
        </div>
      </div>
    </div>
  );
};
export default CreditScoring ;