import React from 'react';
import type { User } from '../../services/api';

interface CustomerDashboardProps {
  user: User;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ user }) => {
  return (
    <div>
      {/* Welcome Section */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm bg-primary text-white">
            <div className="card-body p-4">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h2 className="h3 fw-bold mb-2">
                    Welcome, {user.full_name}!
                  </h2>
                  <p className="mb-0 opacity-90">
                    Manage your finances effortlessly. Explore our tools to upload statements, 
                    analyze transactions, get your credit score, and stay on top of your financial health.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Services Overview */}
      <div className="row g-4">
        {/* Bank Statement */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center p-4">
              <i className="bi bi-bank fs-1 text-primary mb-3"></i>
              <h5 className="fw-semibold">Bank Statement Analysis</h5>
              <p className="text-muted">
                Upload your bank statements to automatically extract transactions, balances, 
                and account details in an organized way.
              </p>
            </div>
          </div>
        </div>

        {/* Credit Card */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center p-4">
              <i className="bi bi-credit-card-2-front fs-1 text-success mb-3"></i>
              <h5 className="fw-semibold">Credit Card Insights</h5>
              <p className="text-muted">
                Analyze credit card statements to track spending, identify patterns, 
                and keep tabs on your card usage.
              </p>
            </div>
          </div>
        </div>

        {/* Credit Scoring */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center p-4">
              <i className="bi bi-bar-chart-line fs-1 text-warning mb-3"></i>
              <h5 className="fw-semibold">Credit Scoring</h5>
              <p className="text-muted">
                Get an instant credit score based on your financial history, 
                helping you understand your creditworthiness and improve your profile.
              </p>
            </div>
          </div>
        </div>

        {/* Chatbot Assistance */}
        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center p-4">
              <i className="bi bi-robot fs-1 text-info mb-3"></i>
              <h5 className="fw-semibold">Chatbot Assistance</h5>
              <p className="text-muted">
                Have questions? Our intelligent chatbot is available 24/7 to 
                help you learn more about the platform and guide you through its services.
              </p>
            </div>
          </div>
        </div>

        {/* Activity Alerts */}
        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center p-4">
              <i className="bi bi-exclamation-triangle fs-1 text-danger mb-3"></i>
              <h5 className="fw-semibold">Unusual Activity Alerts</h5>
              <p className="text-muted">
                Stay protected! Get instant warnings whenever unusual or 
                suspicious activities are detected in your statements.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="row mt-5">
        <div className="col-12 text-center">
          <h4 className="fw-bold mb-3">Get Started Today</h4>
          <p className="text-muted mb-4">
            Upload your statements and let our system do the work for you. 
            Gain valuable insights, improve your credit profile, and stay safe.
          </p>
        </div>
      </div>
    </div>
  );
};
