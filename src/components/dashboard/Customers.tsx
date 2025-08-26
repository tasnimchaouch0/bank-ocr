import React, { useState, useEffect } from 'react';
import { apiService, type User } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const allUsers = await apiService.getAllUsers();
      setCustomers(allUsers.filter((u: { role: string }) => u.role !== 'admin'));
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);
const handleViewStatement = (userId: number) => {
  navigate(`/bankStatementEdit`);
};
  const handleToggleStatus = async (userId: number) => {
    try {
      await apiService.toggleUserStatus(userId);
      await loadCustomers();
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
  };

  const handleModify = (user: User) => {
    setSelectedUser(user);
    setShowModal(true);
  };

const [saving, setSaving] = useState(false);
const [errorMsg, setErrorMsg] = useState<string | null>(null);

const handleSave = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!selectedUser) return;

  setSaving(true);
  setErrorMsg(null);

  try {
    await apiService.updateUser(selectedUser.id, selectedUser);
    setShowModal(false);
    await loadCustomers();
  } catch (error) {
    console.error('Failed to update user:', error);
    setErrorMsg("Failed to save changes. Please try again.");
  } finally {
    setSaving(false);
  }
};


  if (loading) return <div>Loading customers...</div>;

  return (
    <div className="container mt-4">
      <h2>Customer Management</h2>

      <button className="btn btn-secondary mb-3" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-striped mt-3">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Username</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(u => (
                  <tr key={u.id}>
                    <td>{u.full_name}</td>
                    <td>{u.email}</td>
                    <td>{u.username}</td>
                    <td>
                      <span className={`badge ${u.is_active ? 'bg-success' : 'bg-secondary'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        className={`btn btn-sm ${u.is_active ? 'btn-outline-danger' : 'btn-outline-success'} me-2`}
                        onClick={() => handleToggleStatus(u.id)}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => handleModify(u)}
                      >
                        Modify
                      </button>

                    
                                          <button
    onClick={() => handleViewStatement(u.id)}
    className="btn btn-sm btn-info"
  >
    Bank Statement
  </button>
  </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal for editing customer */}
      {showModal && selectedUser && (
        <div className="modal fade show d-block" tabIndex={-1}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <form onSubmit={handleSave}>
                <div className="modal-header">
                  <h5 className="modal-title">Edit Customer</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Full Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={selectedUser.full_name}
                        onChange={e => setSelectedUser({ ...selectedUser, full_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        value={selectedUser.email}
                        onChange={e => setSelectedUser({ ...selectedUser, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Username</label>
                      <input
                        type="text"
                        className="form-control"
                        value={selectedUser.username}
                        onChange={e => setSelectedUser({ ...selectedUser, username: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Age</label>
                      <input
                        type="number"
                        className="form-control"
                        value={selectedUser.age ?? ''}
                        onChange={e => setSelectedUser({ ...selectedUser, age: Number(e.target.value) })}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Gender</label>
                      <input
                        type="text"
                        className="form-control"
                        value={selectedUser.gender ?? ''}
                        onChange={e => setSelectedUser({ ...selectedUser, gender: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Occupation</label>
                      <input
                        type="text"
                        className="form-control"
                        value={selectedUser.occupation ?? ''}
                        onChange={e => setSelectedUser({ ...selectedUser, occupation: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">SSN</label>
                      <input
                        type="text"
                        className="form-control"
                        value={selectedUser.ssn ?? ''}
                        onChange={e => setSelectedUser({ ...selectedUser, ssn: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Annual Income</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        value={selectedUser.annual_income ?? ''}
                        onChange={e => setSelectedUser({ ...selectedUser, annual_income: Number(e.target.value) })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Monthly Salary</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        value={selectedUser.monthly_inhand_salary ?? ''}
                        onChange={e => setSelectedUser({ ...selectedUser, monthly_inhand_salary: Number(e.target.value) })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Bank Accounts</label>
                      <input
                        type="number"
                        className="form-control"
                        value={selectedUser.num_bank_accounts ?? 0}
                        onChange={e => setSelectedUser({ ...selectedUser, num_bank_accounts: Number(e.target.value) })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Credit Cards</label>
                      <input
                        type="number"
                        className="form-control"
                        value={selectedUser.num_credit_card ?? 0}
                        onChange={e => setSelectedUser({ ...selectedUser, num_credit_card: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
