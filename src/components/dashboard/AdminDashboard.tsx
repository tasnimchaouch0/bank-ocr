import React, { useState, useEffect } from 'react';
import { type User, apiService } from '../../services/api';

interface AdminDashboardProps {
  user: User;
}

interface BankStatement {
  id: number;
  user_id: number;
  filename: string;
  account_number?: string;
  account_holder?: string;
  bank_name?: string;
  total_credits: number;
  total_debits: number;
  created_at: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'statements'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [usersData, statementsData] = await Promise.all([
        apiService.getAllUsers(),
        apiService.getAllStatements(),
      ]);
      setUsers(usersData);
      setStatements(statementsData);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: number) => {
    try {
      await apiService.toggleUserStatus(userId);
      await loadData(); // Reload data
    } catch (error) {
      console.error('Failed to toggle user status:', error);
    }
  };

  const getStats = () => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.is_active).length;
    const totalStatements = statements.length;
    const totalCredits = statements.reduce((sum, s) => sum + s.total_credits, 0);
    const totalDebits = statements.reduce((sum, s) => sum + s.total_debits, 0);

    return {
      totalUsers,
      activeUsers,
      totalStatements,
      totalCredits,
      totalDebits,
    };
  };

  const stats = getStats();

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="text-muted">Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Welcome Section */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm bg-dark text-white">
            <div className="card-body p-4">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h2 className="h3 fw-bold mb-2">Admin Dashboard</h2>
                  <p className="mb-0 opacity-90">
                    Manage users, monitor system activity, and oversee bank statement processing.
                  </p>
                </div>
                <div className="col-md-4 text-md-end">
                  <div className="bg-white bg-opacity-20 rounded p-3 d-inline-block">
                    <i className="bi bi-gear fs-1"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row g-4 mb-4">
        <div className="col-md-2">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="bg-primary bg-opacity-10 rounded-circle p-3 d-inline-flex mb-2">
                <i className="bi bi-people text-primary fs-4"></i>
              </div>
              <h4 className="fw-bold text-primary">{stats.totalUsers}</h4>
              <p className="text-muted small mb-0">Total Users</p>
            </div>
          </div>
        </div>

        <div className="col-md-2">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="bg-success bg-opacity-10 rounded-circle p-3 d-inline-flex mb-2">
                <i className="bi bi-person-check text-success fs-4"></i>
              </div>
              <h4 className="fw-bold text-success">{stats.activeUsers}</h4>
              <p className="text-muted small mb-0">Active Users</p>
            </div>
          </div>
        </div>

        <div className="col-md-2">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="bg-info bg-opacity-10 rounded-circle p-3 d-inline-flex mb-2">
                <i className="bi bi-file-earmark-text text-info fs-4"></i>
              </div>
              <h4 className="fw-bold text-info">{stats.totalStatements}</h4>
              <p className="text-muted small mb-0">Statements</p>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="bg-success bg-opacity-10 rounded-circle p-3 d-inline-flex mb-2">
                <i className="bi bi-arrow-up-circle text-success fs-4"></i>
              </div>
              <h4 className="fw-bold text-success">${stats.totalCredits.toFixed(2)}</h4>
              <p className="text-muted small mb-0">Total Credits</p>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="bg-danger bg-opacity-10 rounded-circle p-3 d-inline-flex mb-2">
                <i className="bi bi-arrow-down-circle text-danger fs-4"></i>
              </div>
              <h4 className="fw-bold text-danger">${stats.totalDebits.toFixed(2)}</h4>
              <p className="text-muted small mb-0">Total Debits</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom">
          <ul className="nav nav-tabs card-header-tabs">
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <i className="bi bi-graph-up me-2"></i>
                Overview
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
                onClick={() => setActiveTab('users')}
              >
                <i className="bi bi-people me-2"></i>
                Users ({users.length})
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'statements' ? 'active' : ''}`}
                onClick={() => setActiveTab('statements')}
              >
                <i className="bi bi-file-earmark-text me-2"></i>
                Statements ({statements.length})
              </button>
            </li>
          </ul>
        </div>

        <div className="card-body">
          {activeTab === 'overview' && (
            <div>
              <h5 className="fw-semibold mb-3">System Overview</h5>
              <div className="row g-4">
                <div className="col-md-6">
                  <div className="bg-light rounded p-3">
                    <h6 className="fw-semibold">Recent Activity</h6>
                    <p className="text-muted mb-0">
                      {statements.length > 0 
                        ? `Latest statement processed: ${new Date(statements[0]?.created_at).toLocaleDateString()}`
                        : 'No statements processed yet'
                      }
                    </p>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="bg-light rounded p-3">
                    <h6 className="fw-semibold">User Activity</h6>
                    <p className="text-muted mb-0">
                      {stats.activeUsers} of {stats.totalUsers} users are active
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              <h5 className="fw-semibold mb-3">User Management</h5>
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Username</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td className="fw-medium">{u.full_name}</td>
                        <td>{u.email}</td>
                        <td>{u.username}</td>
                        <td>
                          <span className={`badge ${u.role === 'admin' ? 'bg-danger' : 'bg-primary'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${u.is_active ? 'bg-success' : 'bg-secondary'}`}>
                            {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>{new Date(u.created_at).toLocaleDateString()}</td>
                        <td>
                          <button
                            className={`btn btn-sm ${u.is_active ? 'btn-outline-danger' : 'btn-outline-success'}`}
                            onClick={() => handleToggleUserStatus(u.id)}
                            disabled={u.id === user.id} // Can't disable own account
                          >
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'statements' && (
            <div>
              <h5 className="fw-semibold mb-3">Bank Statements</h5>
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>Filename</th>
                      <th>Account Holder</th>
                      <th>Bank</th>
                      <th>Account Number</th>
                      <th>Credits</th>
                      <th>Debits</th>
                      <th>Processed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statements.map((statement) => (
                      <tr key={statement.id}>
                        <td className="fw-medium">{statement.filename}</td>
                        <td>{statement.account_holder || 'N/A'}</td>
                        <td>{statement.bank_name || 'N/A'}</td>
                        <td>{statement.account_number || 'N/A'}</td>
                        <td className="text-success">${statement.total_credits.toFixed(2)}</td>
                        <td className="text-danger">${statement.total_debits.toFixed(2)}</td>
                        <td>{new Date(statement.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};