import React, { useState } from 'react';
import type { User } from '../../services/api';
import { FileUpload } from '../FileUpload';
import { ExtractedData } from '../ExtractedData';
import { useOCR } from '../../hooks/useOCR';
import { extractBankStatementData } from '../../utils/dataExtractor';
import { apiService } from '../../services/api';


const mockText = `
Account Holder: JOHN DOE
Bank: Example Bank
Account Number: 1234567890
Statement Period: 01/01/2024 - 01/31/2024

01/01/2024  Salary Deposit        2000.00  credit  2000.00
01/03/2024  Grocery Store         150.50   debit   1849.50
01/10/2024  Online Shopping       100.00   debit   1749.50
01/15/2024  Refund                50.00    credit  1799.50
`;

const extracted = extractBankStatementData(mockText);
console.log(JSON.stringify(extracted, null, 2));

interface CustomerDashboardProps {
  user: User;
}

interface ExtractedDataRaw {
  accountNumber?: string | null;
  accountHolder?: string | null;
  bankName?: string | null;
  statementPeriod?: string | null;
  cardNumber?: string | null;
  expiryDate?: string | null;
  transactions: Array<{
    date: string;
    description: string;
    amount: number;
    type: 'credit' | 'debit';
    balance?: number;
  }>;
  summary: {
    totalCredits: number;
    totalDebits: number;
    openingBalance: number;
    closingBalance: number;
  };
}

interface BankStatementData {
  accountNumber?: string;
  accountHolder?: string;
  bankName?: string;
  statementPeriod?: string;
  cardNumber?: string;
  expiryDate?: string;
  transactions: Array<{
    date: string;
    description: string;
    amount: number;
    type: 'credit' | 'debit';
    balance?: number;
  }>;
  summary: {
    totalCredits: number;
    totalDebits: number;
    openingBalance: number;
    closingBalance: number;
  };
}

function cleanExtractedData(data: ExtractedDataRaw): BankStatementData {
  return {
    ...data,
    accountNumber: data.accountNumber ?? undefined,
    accountHolder: data.accountHolder ?? undefined,
    bankName: data.bankName ?? undefined,
    statementPeriod: data.statementPeriod ?? undefined,
    cardNumber: data.cardNumber ?? undefined,
    expiryDate: data.expiryDate ?? undefined,
  };
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ user }) => {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [extractedData, setExtractedData] = useState<BankStatementData | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [uploadType, setUploadType] = useState<'bank' | 'creditcard' | null>(null);
  const { processImage, isProcessing, progress } = useOCR();

  const handleFileSelect = async (file: File, type: 'bank' | 'creditcard') => {
    try {
      setUploadStatus('uploading');
      setExtractedData(null);
      setUploadType(type);
      setCurrentFileName(file.name);

      let rawData: ExtractedDataRaw;
      let cleanedData: BankStatementData;

      if (file.type === 'application/pdf') {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        rawData = extractBankStatementData('');
      } else {
        const result = await processImage(file);
        rawData = extractBankStatementData(result.text);
      }

      cleanedData = cleanExtractedData(rawData);

      await apiService.createBankStatement({
        filename: file.name,
        extracted_data: JSON.stringify(cleanedData),
        account_number: cleanedData.accountNumber,
        account_holder: cleanedData.accountHolder,
        bank_name: cleanedData.bankName,
        statement_period: cleanedData.statementPeriod,
        total_credits: cleanedData.summary.totalCredits,
        total_debits: cleanedData.summary.totalDebits,
      });

      setExtractedData(cleanedData);
      
      setUploadStatus('success');
    } catch (error) {
      console.error('Error processing file:', error);
      setUploadStatus('error');
    }
  };

  const handleNewUpload = () => {
    setExtractedData(null);
    setUploadStatus('idle');
    setUploadType(null);
    setCurrentFileName('');
  };
   console.log('Extracted Data:',extractedData)
  return (
    <div>
      <pre>{JSON.stringify(extractedData, null, 2)}</pre>
      {/* Welcome Section */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm bg-primary text-white">
            <div className="card-body p-4">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h2 className="h3 fw-bold mb-2">
                    Welcome back, {user.full_name}!
                  </h2>
                  <p className="mb-0 opacity-90">
                    Upload your statements or credit card data to extract information automatically.
                  </p>
                </div>
                <div className="col-md-4 text-md-end">
                  <div className="bg-white bg-opacity-20 rounded p-3 d-inline-block">
                    <i className="bi bi-file-earmark-text fs-1"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!extractedData ? (
        <div>
          {/* Upload Options */}
          <div className="row justify-content-center g-4 mb-5">
            <div className="col-md-5">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body text-center p-4">
                  <i className="bi bi-bank fs-1 text-primary mb-3"></i>
                  <h5 className="fw-semibold">Upload Bank Statement</h5>
                  <p className="text-muted">
                    Extract transactions, balances, and account info from bank statements.
                  </p>
                  <FileUpload
                    onFileSelect={(file) => handleFileSelect(file, 'bank')}
                    isProcessing={isProcessing}
                    uploadStatus={uploadStatus}
                  />
                </div>
              </div>
            </div>
            <div className="col-md-5">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body text-center p-4">
                  <i className="bi bi-credit-card-2-front fs-1 text-success mb-3"></i>
                  <h5 className="fw-semibold">Upload Credit Card Statement</h5>
                  <p className="text-muted">
                    Extract card numbers, expiry dates, and credit card transactions.
                  </p>
                  <FileUpload
                    onFileSelect={(file) => handleFileSelect(file, 'creditcard')}
                    isProcessing={isProcessing}
                    uploadStatus={uploadStatus}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {isProcessing && (
            <div className="row justify-content-center mt-4">
              <div className="col-lg-8">
                <div className="card border-0 shadow-sm">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="fw-medium">Processing Progress</span>
                      <span className="text-muted">{progress}%</span>
                    </div>
                    <div className="progress" style={{ height: '8px' }}>
                      <div
                        className="progress-bar progress-bar-striped progress-bar-animated"
                        role="progressbar"
                        style={{ width: `${progress}%` }}
                        aria-valuenow={progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Back Button */}
          <button
            onClick={handleNewUpload}
            className="btn btn-outline-primary btn-icon mb-4"
          >
            <i className="bi bi-arrow-left"></i>
            Upload New File
          </button>

          {/* Success Message */}
          <div className="alert alert-success d-flex align-items-center mb-4" role="alert">
            <i className="bi bi-check-circle-fill me-2"></i>
            <div>
              <strong>Success!</strong> Your {uploadType === 'creditcard' ? 'credit card statement' : 'bank statement'} "<strong>{currentFileName}</strong>" has been processed and saved.
            </div>
          </div>

          {/* Uploaded File Details */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <h5 className="fw-bold mb-3">Uploaded File Details</h5>
              <ul className="list-group list-group-flush">
                <li className="list-group-item">
                  <strong>File Name:</strong> {currentFileName}
                </li>
                <li className="list-group-item">
                  <strong>Upload Type:</strong> {uploadType === 'creditcard' ? 'Credit Card Statement' : 'Bank Statement'}
                </li>
                {extractedData.accountHolder && (
                  <li className="list-group-item">
                    <strong>Account Holder:</strong> {extractedData.accountHolder}
                  </li>
                )}
                {extractedData.bankName && (
                  <li className="list-group-item">
                    <strong>Bank:</strong> {extractedData.bankName}
                  </li>
                )}
                {extractedData.accountNumber && (
                  <li className="list-group-item">
                    <strong>Account Number:</strong> {extractedData.accountNumber}
                  </li>
                )}
                {extractedData.cardNumber && (
                  <li className="list-group-item">
                    <strong>Card Number:</strong> {extractedData.cardNumber}
                  </li>
                )}
                {extractedData.expiryDate && (
                  <li className="list-group-item">
                    <strong>Expiry Date:</strong> {extractedData.expiryDate}
                  </li>
                )}
                {extractedData.statementPeriod && (
                  <li className="list-group-item">
                    <strong>Statement Period:</strong> {extractedData.statementPeriod}
                  </li>
                )}
              </ul>
            </div>
          </div>
          <ExtractedData data={extractedData} />
        </div>
      )}
    </div>
  );
}; 