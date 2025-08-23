import React, { useState, useEffect } from 'react';
import { apiService, type User } from '../../services/api';
import { CustomerDashboard } from './CustomerDashboard';
import { AdminDashboard } from './AdminDashboard';
import { Link } from 'react-router-dom';
interface DashboardProps {
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await apiService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Failed to load user:', error);
        onLogout();
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, [onLogout]);

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      onLogout();
    }
  };

  if (isLoading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-vh-100 gradient-bg">
      {/* Header */}
      <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm border-bottom">
        <div className="container">
          <div className="navbar-brand d-flex align-items-center">
            <div className="bg-primary rounded p-2 me-3">
              <i className="bi bi-bank text-white fs-4"></i>
            </div>
            <div>
              <h1 className="h4 mb-0 fw-bold text-dark">BankOCR</h1>
              <small className="text-muted">
                {user.role === 'admin' ? 'Admin Dashboard' : 'Customer Portal'}
              </small>
            </div>
          </div>
          
          <div className="d-flex align-items-center w-100">
            {/* Navigation Links */}
            {user.role === 'admin' ? (
              <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                <li className="nav-item">
                  <Link className="nav-link active" to="/customers">Customers</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link active" to="/admins">Admins</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link active" to="/fraudDetection">Fraud Detection</Link>
                </li>
              </ul>
            ) : (
              <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                {/*<li className="nav-item">
                  <Link className="nav-link active" to="/creditScoring">Credit Card</Link>
                </li>*/}
                <li className="nav-item"> 
                  <Link className="nav-link active" to="/bankStatement">Bank Statement</Link>

                </li>
                <li className="nav-item">
                  <Link className="nav-link active" to={`/score/${user.id}`}>Credit Scoring</Link>
                </li>
              </ul>
            )}
            
            {/* User Info */}
            <div className="me-3 text-end d-none d-md-block">
              <div className="fw-medium text-dark">{user.full_name}</div>
              <small className="text-muted">{user.email}</small>
            </div>
            {/* User Avatar & Dropdown */}
            <div className="dropdown">
              <button
                className="btn btn-outline-primary dropdown-toggle d-flex align-items-center"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <div className="bg-primary rounded-circle p-2 me-2">
                  <i className="bi bi-person text-white"></i>
                </div>
                <span className="d-none d-sm-inline">{user.username}</span>
              </button>
              <ul className="dropdown-menu dropdown-menu-end shadow">
                <li>
                  <div className="dropdown-item-text">
                    <div className="d-flex align-items-center">
                      <div className="bg-primary rounded-circle p-2 me-3">
                        <i className="bi bi-person text-white"></i>
                      </div>
                      <div>
                        <div className="fw-medium">{user.full_name}</div>
                        <small className="text-muted">{user.email}</small>
                      </div>
                    </div>
                  </div>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <div className="dropdown-item-text">
                    <div className="d-flex align-items-center">
                      <i className="bi bi-shield me-2 text-muted"></i>
                      <span className="small">
                        Role: <span className={`badge ${user.role === 'admin' ? 'bg-danger' : 'bg-primary'}`}>
                          {user.role}
                        </span>
                      </span>
                    </div>
                  </div>
                </li>
                <li>
                  <div className="dropdown-item-text">
                    <div className="d-flex align-items-center">
                      <i className="bi bi-calendar me-2 text-muted"></i>
                      <span className="small">
                        Joined: {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button className="dropdown-item text-danger d-flex align-items-center" onClick={handleLogout}>
                    <i className="bi bi-box-arrow-right me-2"></i>
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </nav>
      {/* Dashboard Content */}
      <div className="container py-4">
        {user.role === 'admin' ? (
          <AdminDashboard user={user} />
        ) : (
          <CustomerDashboard user={user} />
        )}
      </div>
    </div>
  );
};