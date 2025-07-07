import React from 'react';

interface Transaction {
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  balance?: number;
}

interface ExtractedDataProps {
  data: {
    accountNumber?: string;
    accountHolder?: string;
    bankName?: string;
    statementPeriod?: string;
    cardNumber?: string;
    expiryDate?: string;
    transactions: Transaction[];
    summary: {
      totalCredits: number;
      totalDebits: number;
      openingBalance: number;
      closingBalance: number;
    };
  };
}

export const ExtractedData: React.FC<ExtractedDataProps> = ({ data }) => {
  const handleExport = () => {
    const csvContent = [
      ['Date', 'Description', 'Amount', 'Type', 'Balance'],
      ...data.transactions.map(tx => [
        tx.date,
        tx.description,
        tx.amount.toString(),
        tx.type,
        tx.balance?.toString() || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bank-statement-data.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const maskCardNumber = (cardNumber: string) => {
    if (!cardNumber) return 'Not detected';
    const cleaned = cardNumber.replace(/\s/g, '');
    if (cleaned.length < 4) return cardNumber;
    return '**** **** **** ' + cleaned.slice(-4);
  };

  return (
    <div className="w-100">
      {/* Header */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="h3 fw-bold mb-0">Extracted Data</h2>
            <button
              onClick={handleExport}
              className="btn btn-primary btn-icon"
            >
              <i className="bi bi-download"></i>
              Export CSV
            </button>
          </div>

          {/* Account Information */}
          <div className="row g-3">
            <div className="col-md-4">
              <div className="bg-light rounded p-3">
                <div className="d-flex align-items-center mb-2">
                  <i className="bi bi-building text-primary me-2"></i>
                  <small className="fw-medium text-muted">Bank</small>
                </div>
                <p className="h6 mb-0 text-dark">
                  {data.bankName || 'Unknown Bank'}
                </p>
              </div>
            </div>

            <div className="col-md-4">
              <div className="bg-light rounded p-3">
                <div className="d-flex align-items-center mb-2">
                  <i className="bi bi-eye text-primary me-2"></i>
                  <small className="fw-medium text-muted">Account</small>
                </div>
                <p className="h6 mb-0 text-dark">
                  {data.accountNumber || 'Not detected'}
                </p>
              </div>
            </div>

            <div className="col-md-4">
              <div className="bg-light rounded p-3">
                <div className="d-flex align-items-center mb-2">
                  <i className="bi bi-calendar text-primary me-2"></i>
                  <small className="fw-medium text-muted">Period</small>
                </div>
                <p className="h6 mb-0 text-dark">
                  {data.statementPeriod || 'Not detected'}
                </p>
              </div>
            </div>
          </div>

          {/* Additional Card Information if detected */}
          {(data.cardNumber || data.expiryDate) && (
            <div className="mt-4 pt-4 border-top">
              <h5 className="fw-semibold mb-3">Card Information</h5>
              <div className="row g-3">
                {data.cardNumber && (
                  <div className="col-md-6">
                    <div className="bg-primary bg-opacity-10 rounded p-3">
                      <div className="d-flex align-items-center mb-2">
                        <i className="bi bi-credit-card text-primary me-2"></i>
                        <small className="fw-medium text-muted">Card Number</small>
                      </div>
                      <p className="h6 mb-0 text-dark font-monospace">
                        {maskCardNumber(data.cardNumber)}
                      </p>
                    </div>
                  </div>
                )}

                {data.expiryDate && (
                  <div className="col-md-6">
                    <div className="bg-primary bg-opacity-10 rounded p-3">
                      <div className="d-flex align-items-center mb-2">
                        <i className="bi bi-calendar text-primary me-2"></i>
                        <small className="fw-medium text-muted">Expiry Date</small>
                      </div>
                      <p className="h6 mb-0 text-dark">
                        {data.expiryDate}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Account Holder */}
          {data.accountHolder && (
            <div className="mt-4 pt-4 border-top">
              <div className="bg-success bg-opacity-10 rounded p-3">
                <div className="d-flex align-items-center mb-2">
                  <i className="bi bi-person text-success me-2"></i>
                  <small className="fw-medium text-muted">Account Holder</small>
                </div>
                <p className="h6 mb-0 text-dark">
                  {data.accountHolder}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row g-4 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted small mb-1">Total Credits</p>
                  <h4 className="text-success fw-bold mb-0">
                    ${data.summary.totalCredits.toFixed(2)}
                  </h4>
                </div>
                <div className="bg-success bg-opacity-10 rounded p-2">
                  <i className="bi bi-arrow-up-circle text-success fs-5"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted small mb-1">Total Debits</p>
                  <h4 className="text-danger fw-bold mb-0">
                    ${data.summary.totalDebits.toFixed(2)}
                  </h4>
                </div>
                <div className="bg-danger bg-opacity-10 rounded p-2">
                  <i className="bi bi-arrow-down-circle text-danger fs-5"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted small mb-1">Opening Balance</p>
                  <h4 className="text-dark fw-bold mb-0">
                    ${data.summary.openingBalance.toFixed(2)}
                  </h4>
                </div>
                <div className="bg-primary bg-opacity-10 rounded p-2">
                  <i className="bi bi-wallet text-primary fs-5"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted small mb-1">Transactions</p>
                  <h4 className="text-dark fw-bold mb-0">
                    {data.transactions.length}
                  </h4>
                </div>
                <div className="bg-info bg-opacity-10 rounded p-2">
                  <i className="bi bi-list-ul text-info fs-5"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom">
          <h5 className="fw-semibold mb-0">Transaction History</h5>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th className="border-0 fw-semibold">Date</th>
                  <th className="border-0 fw-semibold">Description</th>
                  <th className="border-0 fw-semibold">Type</th>
                  <th className="border-0 fw-semibold text-end">Amount</th>
                  <th className="border-0 fw-semibold text-end">Balance</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((transaction, index) => (
                  <tr key={index}>
                    <td className="fw-medium">{transaction.date}</td>
                    <td>{transaction.description}</td>
                    <td>
                      <span className={`badge ${
                        transaction.type === 'credit' 
                          ? 'bg-success bg-opacity-10 text-success' 
                          : 'bg-danger bg-opacity-10 text-danger'
                      }`}>
                        {transaction.type}
                      </span>
                    </td>
                    <td className={`text-end fw-medium ${
                      transaction.type === 'credit' ? 'text-success' : 'text-danger'
                    }`}>
                      {transaction.type === 'credit' ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                    </td>
                    <td className="text-end text-muted">
                      ${transaction.balance?.toFixed(2) || 'N/A'}
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