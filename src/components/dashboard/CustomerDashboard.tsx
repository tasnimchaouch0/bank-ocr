import React, { useState } from 'react';
import type { User } from '../../services/api';
import { FileUpload } from '../FileUpload';
import { ExtractedData } from '../ExtractedData';
import { useOCR } from '../../hooks/useOCR';
import { extractBankStatementData } from '../../utils/dataExtractor';
import { apiService } from '../../services/api';

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
  const { processImage, isProcessing, progress } = useOCR();

  const handleFileSelect = async (file: File) => {
    try {
      setUploadStatus('uploading');
      setExtractedData(null);
      setCurrentFileName(file.name);

      let rawData: ExtractedDataRaw;
      let cleanedData: BankStatementData;

      if (file.type === 'application/pdf') {
        await new Promise(resolve => setTimeout(resolve, 3000));
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
    setCurrentFileName('');
  };

  return (
    <div>
      {/* Welcome Section */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm bg-primary text-white">
            <div className="card-body p-4">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h2 className="h3 fw-bold mb-2">Welcome back, {user.full_name}!</h2>
                  <p className="mb-0 opacity-90">
                    Upload your bank statements to extract transaction data automatically.
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
          {/* Features */}
          <div className="row g-4 mb-5">
            <div className="col-md-4">
              <div className="card h-100 border-0 shadow-sm card-hover">
                <div className="card-body text-center p-4">
                  <div className="feature-icon bg-primary bg-opacity-10">
                    <i className="bi bi-lightning-fill text-primary fs-3"></i>
                  </div>
                  <h5 className="card-title fw-semibold">Fast Processing</h5>
                  <p className="card-text text-muted">
                    Advanced OCR technology extracts data from your bank statements in seconds.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card h-100 border-0 shadow-sm card-hover">
                <div className="card-body text-center p-4">
                  <div className="feature-icon bg-success bg-opacity-10">
                    <i className="bi bi-shield-check text-success fs-3"></i>
                  </div>
                  <h5 className="card-title fw-semibold">Secure & Private</h5>
                  <p className="card-text text-muted">
                    All processing is done securely. Your data is encrypted and protected.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card h-100 border-0 shadow-sm card-hover">
                <div className="card-body text-center p-4">
                  <div className="feature-icon bg-info bg-opacity-10">
                    <i className="bi bi-bank text-info fs-3"></i>
                  </div>
                  <h5 className="card-title fw-semibold">Accurate Extraction</h5>
                  <p className="card-text text-muted">
                    Precisely extracts transactions, balances, and account information.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Section */}
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <FileUpload 
                onFileSelect={handleFileSelect}
                isProcessing={isProcessing}
                uploadStatus={uploadStatus}
              />
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
                    <div className="progress" style={{height: '8px'}}>
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
            Upload New Statement
          </button>

          {/* Success Message */}
          <div className="alert alert-success d-flex align-items-center mb-4" role="alert">
            <i className="bi bi-check-circle-fill me-2"></i>
            <div>
              <strong>Success!</strong> Your bank statement "{currentFileName}" has been processed and saved.
            </div>
          </div>

          {/* Extracted Data */}
          <ExtractedData data={extractedData} />
        </div>
      )}
    </div>
  );
};
