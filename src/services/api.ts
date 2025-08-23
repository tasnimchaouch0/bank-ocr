const API_BASE_URL = 'http://localhost:8000';

interface LoginCredentials {
  username: string;
  password: string;
}

interface RegisterData {
  email: string;
  username: string;
  full_name: string;
  password: string;
  role?: string;
}

interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

interface BankStatementData {
  id?: number;
  filename: string;
  extracted_data: string| null;
  account_number?: string;
  account_holder?: string;
  bank_name?: string;
  statement_period?: string;
  total_credits?: number;
  total_debits?: number;
}

// 👇 Add transaction & fraud types
export interface Customer {
  id: number;
  full_name: string;
  email: string;
}

export interface Transaction {
  [x: string]: any;
  id: number;
  date: string;
  amount: number;
  merchant?: string;
  category?: string;
  customer: Customer;
}

export interface FraudPrediction {
  fraud_score: number;
  is_fraudulent: boolean;
}
export interface CreditScoreResponse {
  predicted_credit_score: string;
  probability: number;
  model_used: string;
  user_id: number;
  username: string;
}

export interface AllCreditScoresResponse {
  scores: CreditScoreResponse[];
}
class ApiService {
  private getAuthHeaders() {
    const token = localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  }

  async register(userData: RegisterData): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }

    return response.json();
  }

  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    return response.json();
  }

  async createBankStatement(data: BankStatementData) {
    const response = await fetch(`${API_BASE_URL}/statements`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to save bank statement');
    }

    return response.json();
  }

  async getUserStatements() {
    const response = await fetch(`${API_BASE_URL}/statements`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get statements');
    }

    return response.json();
  }

  async getStatement(id: number) {
    const response = await fetch(`${API_BASE_URL}/statements/${id}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get statement');
    }

    return response.json();
  }

  async deleteStatement(id: number) {
    const response = await fetch(`${API_BASE_URL}/statements/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete statement');
    }

    return response.json();
  }

  // Admin endpoints
  async getAllUsers() {
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get users');
    }

    return response.json();
  }

  async getAllStatements() {
    const response = await fetch(`${API_BASE_URL}/admin/statements`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get all statements');
    }

    return response.json();
  }

  async toggleUserStatus(userId: number) {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/toggle-status`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to toggle user status');
    }

    return response.json();
  }
async updateBankStatement(id: number, data: Partial<BankStatementData>) {
  const response = await fetch(`${API_BASE_URL}/statements/${id}`, {
    method: 'PUT',
    headers: this.getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to update bank statement');
  }

  return response.json();
}

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    console.log('User logged out successfully');
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('access_token');
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch (error) {
      return false;
    }
  }

  getCurrentUserFromStorage(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // 👇 Added methods for FraudDetection.tsx
  async getAllTransactions(): Promise<Transaction[]> {
    const response = await fetch(`${API_BASE_URL}/admin/predict/transactions`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch transactions');
    }

    return response.json();

  }
  async getAllCreditScores(): Promise<CreditScoreResponse[]> {
    const response = await fetch(`${API_BASE_URL}/credit_score/predict_all`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch credit scores');
    }

    return response.json();
   
  }
  // services/api.ts
async getCreditScore(user_id: number): Promise<CreditScoreResponse> {
  const response = await fetch(`${API_BASE_URL}/credit_score/predict/${user_id}`, {
    headers: this.getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch credit score');
  }
  return response.json(); 
}

  async predictFraud(transactionId: number): Promise<FraudPrediction> {
    const response = await fetch(`${API_BASE_URL}/transactions/${transactionId}/fraud-prediction`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch fraud prediction');
    }



    return response.json();

  }
}
export const apiService = new ApiService();
export type { 
  User, 
  AuthResponse, 
  LoginCredentials, 
  RegisterData, 
  BankStatementData, 
  
};