# Bank OCR & Financial Intelligence System

A comprehensive banking application that combines OCR document processing, fraud detection, and credit scoring capabilities. Built with FastAPI backend and React + TypeScript frontend.

## 🚀 Features

### Core Functionalities
- **OCR Processing**: Extract data from bank statements and credit card documents using PaddleOCR
- **Fraud Detection**: Machine learning-based transaction fraud detection system
- **Credit Scoring**: Automated credit score calculation and prediction
- **User Management**: Secure authentication with JWT tokens and role-based access control
- **Transaction Management**: Track and manage bank transactions with comprehensive analytics

### User Roles
- **Customers**: View personal statements, credit scores, and transaction history
- **Admins**: Monitor all users, detect fraud patterns, and manage system-wide operations

## 📋 Prerequisites

- Python 3.12 or higher
- Node.js 18+ and npm
- PostgreSQL database
- Virtual environment (venv) - already included in the project

## 🛠️ Installation & Setup

### 1. Environment Configuration

Create a `.env` file in the `backend` directory with the following variables:

```env
# Database Configuration
DB_USER=your_postgres_username
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name

# JWT Configuration
SECRET_KEY=your-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### 2. Database Setup

Ensure PostgreSQL is running and create your database:

```sql
CREATE DATABASE your_database_name;
```

### 3. Install Dependencies

**Note**: This project already has a working virtual environment. No need to create a new one.

The required dependencies are listed in:
- Backend: `backend/requirements.txt`
- Frontend: `package.json`

### 4. n8n Chat Integration

To use the n8n chat widget in the frontend, make sure your n8n server is running at the URL specified in your code (default: http://localhost:5678).

**How to start n8n:**

1. Open a terminal.
2. If n8n is installed globally, run:
   ```
   n8n start
   ```
   Or, if using npx:
   ```
   npx n8n start
   ```
3. By default, n8n will be available at http://localhost:5678.
4. To change the port, use:
   ```
   n8n start --port=5678
   ```

The chat widget will connect automatically if the n8n server is running and accessible at the webhook URL configured in your frontend code.

## 🚀 Running the Application

### Start Backend Server

From the project root directory:

```powershell
# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Navigate to backend directory and start server
cd backend
python -m uvicorn main:app --reload --port 8000 --host 0.0.0.0
```

Or use the one-liner:

```powershell
.\venv\Scripts\Activate.ps1; cd backend; python -m uvicorn main:app --reload --port 8000 --host 0.0.0.0
```

The API will be available at: **http://localhost:8000**

### Start Frontend Development Server

From the project root directory (in a new terminal):

```powershell
npm run dev
```

The frontend will be available at: **http://localhost:5173**

## 📚 API Documentation

Once the backend server is running, access the interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key API Endpoints

#### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user info

#### Bank Statements
- `POST /statements` - Create new statement
- `GET /statements` - Get all statements
- `GET /statements/{id}` - Get specific statement
- `PUT /statements/{id}` - Update statement
- `DELETE /statements/{id}` - Delete statement

#### OCR Processing
- `POST /process-ocr` - Process document with OCR
- `POST /predict` - Predict document type

#### Fraud Detection
- `GET /fraud/predict/{transaction_id}` - Predict fraud for transaction
- `GET /admin/predict/transactions` - Bulk fraud prediction (admin only)

#### Credit Scoring
- `GET /credit_score/predict/{user_id}` - Get user credit score
- `GET /credit_score/predict_all` - Get all credit scores (admin only)

#### Admin Operations
- `GET /admin/users` - List all users
- `GET /admin/statements` - List all statements
- `PUT /api/users/{user_id}` - Update user information

## 🏗️ Project Structure

```
bank-ocr/
├── backend/                    # FastAPI backend
│   ├── main.py                # Main application file
│   ├── schemas.py             # Pydantic schemas
│   ├── requirements.txt       # Python dependencies
│   └── __pycache__/
├── src/                       # React frontend source
│   ├── components/            # React components
│   │   ├── auth/             # Authentication components
│   │   └── dashboard/        # Dashboard components
│   ├── services/             # API services
│   ├── utils/                # Utility functions
│   └── hooks/                # Custom React hooks
├── data/                      # Fraud detection datasets
│   ├── fraudTrain.csv
│   └── fraudTest.csv
├── models/                    # Machine learning models
├── venv/                      # Python virtual environment
└── package.json              # Node.js dependencies
```

## 🔧 Technologies Used

### Backend
- **FastAPI** - Modern web framework for building APIs
- **SQLAlchemy** - SQL toolkit and ORM
- **PaddleOCR** - OCR text recognition
- **PostgreSQL** - Relational database
- **JWT** - Authentication tokens
- **Scikit-learn/Joblib** - Machine learning models
- **Pandas** - Data manipulation

### Frontend
- **React 19** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **React Router** - Routing
- **Axios** - HTTP client
- **Bootstrap** - CSS framework
- **Tesseract.js** - Client-side OCR

## 🔒 Security Features

- Password hashing with Argon2
- JWT-based authentication
- Role-based access control (RBAC)
- CORS middleware configuration
- Secure database connection handling

## 🐛 Troubleshooting

### Backend Issues

**Issue**: `uvicorn: command not found`
**Solution**: Use `python -m uvicorn` instead or ensure venv is activated

**Issue**: Database connection errors
**Solution**: Verify PostgreSQL is running and `.env` credentials are correct

**Issue**: PaddleOCR initialization hangs
**Solution**: Ensure sufficient memory and proper PaddlePaddle installation

### Frontend Issues

**Issue**: Port already in use
**Solution**: Kill the process using the port or change the port in vite.config.ts

## 📝 Development Notes

- The backend uses hot-reload with `--reload` flag for development
- Frontend uses Vite's HMR (Hot Module Replacement)
- Database migrations should be handled before running the application
- Machine learning models should be trained and placed in the `models/` directory

## 📧 Support

For issues and questions, please check the API documentation or review the source code.

## 📄 License

This project is part of the PixCard banking system.
