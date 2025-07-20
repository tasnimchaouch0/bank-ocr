import React, { useState } from 'react';
import type { User } from '../../services/api';
import { FileUpload } from '../FileUpload';
import { ExtractedData } from '../ExtractedData';
import { useOCR } from '../../hooks/useOCR';
import { extractBankStatementData } from '../../utils/StatementdataExtractor';
import {extractCreditCardStatementData} from '../../utils/CreditCarddataExtractor';
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
  const [uploadType, setUploadType] = useState<'bank' | 'creditcard' | null>(null);
  const { processImage, isProcessing, progress } = useOCR();
  const [rawOCRText, setRawOCRText] = useState("");
  
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
  const result =  `
TECHOICE                                                                 July 1,2018 through July 31,2018
                                                                       Primary Account: 00000958581485
  JRMartin Choice Bank
  West Virginia
  PO Box 900180
 Country Roads WV 70826-0180
                                                                     CUSTOMER SERVICE INFORMATION
                                                                    WebSite:         www.choicebank.com
                                                                     Service Center:       1-800-555-9935
                                                                     Hearing Impaired:     1-800-555-7383
                                                                     Para Espanol:         1-877-555-4273
                                                                     International Calls   1-713-555-1679
  00013422 DDA 001 LA 10206-YYNT 100000000 07 0000
  Company Name                                                       Contact us by phone for questions, on this
  Company Address                                                    statement, change information, and general
  State, Zip                                                        inquiries, 24 hours a day, 7 days a week
 Account Summary
 Opening Balance                                            $5,234.09
 Withdrawals                                                $2,395.67
 Deposits                                                   $2,872.45
 Closing Balance on Apr 18,2010                             $9,710.87
 Your Transaction Details
 Date                    Details                      Withdrawals                   Deposits                 Balance
 Apr 8                  Opening Balance                                                                      5,234.09
 Apr 8                  Insurance                                                     272.45                 5,506.54
 Apr 10                 ATM                                 200.00                                           5,306.54
 Apr 12                 Internet Transfer                                             250.00                 5,556.54
 Apr 12                 Payroll                                                      2100.00                 7,656.54
 Apr 13                 Bill payment                        135.07                                           7,521.47
 Apr 14                 Direct debit                        200.00                                           7,321.47
 Apr 14                 Deposit                                                       250.00                 7.567.87
 Apr 15                 Bill payment                        525.72                                           7,042.15
 Apr 17                 Bill payment                        327.63                                           6,714.52
 Apr 17                 Bill payment                        729.96                                           5,984.56
 Apr 18                 Insurance                                                     272.45                 5,506.54
 Apr 18                 ATM                                 200.00                                           5,306.54
 Apr 18                 Internet Transfer                                             250.00                 5,556.54
 Apr 18                 Payroll                                                      2100.00                 7,656.54
 Apr 18                 Bill payment                        135.07                                           7,521.47
 Apr 19                 Direct debit                        200.00                                           7,321.47
 Apr 19                 Deposit                                                       250.00                 7.567.87
 Apr 19                  Bill payment                       525.72                                           7,042.15
 Apr 20                 Bill payment                        327.63                                           6,714.52
 Apr 20                  Bill payment                       729.96                                           5,984.56
 Apr 20                 Deposit                                                       250.00                 7.567.87
 Apr 20                 Bill payment                        525.72                                           7,042.15
 Apr 20                  Bill payment                       327.63                                           6,714.52
 Apr 21                  Bill payment                       729.96                                           5,984.56
                        Closing Balance                                                                     $9,710.87
`;

  console.log("=== RAW OCR TEXT START ===");
  console.log(result);
  console.log("=== RAW OCR TEXT END ===");

  if (type === 'bank') {
    rawData = extractBankStatementData(result);
  } else {
    rawData = extractCreditCardStatementData(result);
  }
  setRawOCRText(result);
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
      <pre style={{ whiteSpace: "pre-wrap", background: "#f8f9fa", padding: "10px" }}>
  {rawOCRText}
</pre>

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