import React, { useState, useEffect } from 'react';
import { apiService, type User } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const allUsers = await apiService.getAllUsers();
      setCustomers(allUsers.filter((u: { role: string; }) => u.role !== 'admin')); // only customers
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleToggleStatus = async (userId: number) => {
    try {
      await apiService.toggleUserStatus(userId);
      await loadCustomers();
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
  };

  if (loading) return <p>Loading customers...</p>;

  return (
    <div>
      <button className="btn btn-outline-primary mb-3" onClick={() => navigate(-1)}>
        &larr; Back
      </button>

      <h2 className="mb-4">Customer Management</h2>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead className="table-light">
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
                        className={`btn btn-sm ${u.is_active ? 'btn-outline-danger' : 'btn-outline-success'}`}
                        onClick={() => handleToggleStatus(u.id)}
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
      </div>
    </div>
  );
};

export default Customers;