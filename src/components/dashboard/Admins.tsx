import React, { useState, useEffect } from 'react';
import { apiService, type User } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const Admins: React.FC = () => {
  const [admins, setAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAdmin, setNewAdmin] = useState({
    full_name: '',
    email: '',
    username: '',
    password: '',
  });
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const allUsers = await apiService.getAllUsers();
      setAdmins(allUsers.filter((u: { role: string }) => u.role === 'admin'));
    } catch (error) {
      console.error('Failed to load admins:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      await apiService.register({ ...newAdmin, role: 'admin' });
      setNewAdmin({ full_name: '', email: '', username: '', password: '' });
      await loadAdmins();
    } catch (error) {
      console.error('Failed to create admin:', error);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div>Loading admins...</div>;

  return (
    <div className="container mt-4">
      <h2>Admin Management</h2>

      <button className="btn btn-secondary mb-3" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-striped mt-3">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Username</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {admins.map(a => (
                  <tr key={a.id}>
                    <td>{a.full_name}</td>
                    <td>{a.email}</td>
                    <td>{a.username}</td>
                    <td>{new Date(a.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <h5 className="fw-semibold mb-3">Create New Admin</h5>
          <form onSubmit={handleCreateAdmin}>
            <div className="row g-3">
              <div className="col-md-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Full Name"
                  value={newAdmin.full_name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="col-md-3">
                <input
                  type="email"
                  className="form-control"
                  placeholder="Email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  required
                />
              </div>
              <div className="col-md-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Username"
                  value={newAdmin.username}
                  onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })}
                  required
                />
              </div>
              <div className="col-md-2">
                <input
                  type="password"
                  className="form-control"
                  placeholder="Password"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                  required
                />
              </div>
              <div className="col-md-1">
                <button type="submit" className="btn btn-primary w-100" disabled={creating}>
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Admins;