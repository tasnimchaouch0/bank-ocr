import React, { useState, useEffect } from 'react';
import { type User, type BankStatementData as ApiBankStatementData, apiService } from '../../services/api';
import { FileUpload } from '../FileUpload';
import { ExtractedData } from '../ExtractedData';
import { useOCR } from '../../hooks/useOCR';
import { extractBankStatementData } from '../../utils/StatementdataExtractor';
import { useNavigate } from 'react-router-dom';

interface BankStatementProps {
  user: User;
}

interface BankStatementData {
  id?: number;
  filename?: string;
  accountNumber?: string;
  accountHolder?: string;
  bankName?: string;
  statementPeriod?: string;
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

interface ExtractedDataRaw extends Omit<BankStatementData, 'id' | 'filename'> {}

function cleanExtractedData(data: ExtractedDataRaw): BankStatementData {
  return {
    ...data,
    accountNumber: data.accountNumber ?? undefined,
    accountHolder: data.accountHolder ?? undefined,
    bankName: data.bankName ?? undefined,
    statementPeriod: data.statementPeriod ?? undefined,
  };
}

export const BankStatementEdit: React.FC<BankStatementProps> = ({ user }) => {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [extractedData, setExtractedData] = useState<BankStatementData | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [hasExistingStatement, setHasExistingStatement] = useState<boolean>(false);
  const { processImage, isProcessing, progress } = useOCR();
  const [rawOCRText, setRawOCRText] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchExistingStatement = async () => {
      try {
        const statements: ApiBankStatementData[] = await apiService.getUserStatements();
        if (statements.length > 0) {
          // Sort by id descending (latest first)
          const latest = statements.sort((a, b) => b.id - a.id)[0];
          setExtractedData({ ...JSON.parse(latest.extracted_data), id: latest.id, filename: latest.filename });
          setCurrentFileName(latest.filename);
          setHasExistingStatement(true);
        } else {
          setHasExistingStatement(false);
        }
      } catch (error) {
        console.error('Error fetching bank statements:', error);
        setHasExistingStatement(false);
      }
    };

    fetchExistingStatement();
  }, []);

  const handleFileSelect = async (file: File) => {
    try {
      setUploadStatus('uploading');
      setExtractedData(null);
      setCurrentFileName(file.name);

      let rawData: ExtractedDataRaw;

      if (file.type === 'application/pdf') {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        rawData = extractBankStatementData('');
      } else {
        const result = await processImage(file);
        rawData = extractBankStatementData(result.text);
        setRawOCRText(result.text);
      }

      const cleanedData = cleanExtractedData(rawData);

      const payload: ApiBankStatementData = {
        filename: file.name,
        extracted_data: JSON.stringify(cleanedData),
        account_number: cleanedData.accountNumber,
        account_holder: cleanedData.accountHolder,
        bank_name: cleanedData.bankName,
        statement_period: cleanedData.statementPeriod,
        total_credits: cleanedData.summary.totalCredits,
        total_debits: cleanedData.summary.totalDebits,
      };

      const response = await apiService.createBankStatement(payload);

      setExtractedData({ ...cleanedData, id: response.id, filename: file.name });
      setUploadStatus('success');
      setHasExistingStatement(true);
    } catch (error) {
      console.error('Error processing file:', error);
      setUploadStatus('error');
    }
  };

  const handleNewUpload = () => {
    setExtractedData(null);
    setUploadStatus('idle');
    setCurrentFileName('');
    setHasExistingStatement(false);
  };
  const handleReturn = () => {
    navigate('/');
  };
  const handleModifyStatement = () => {
    if (extractedData?.id) {
      navigate(`/modify-statement/${extractedData.id}`);
    }
  };

  return (
    <div className="container">
      <style>{`
        .container {
          min-height: 100vh;
          background-color: #f0f4f8;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 1rem;
        }
        .card {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          padding: 2rem;
          width: 100%;
          max-width: 800px;
        }
        .card h4 {
          font-size: 1.5rem;
          font-weight: bold;
          color: #1a202c;
          margin-bottom: 1.5rem;
        }
        .header-group {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        .success {
          background-color: #d1fae5;
          border-left: 4px solid #10b981;
          color: #065f46;
          padding: 1rem;
          margin-bottom: 1.5rem;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .success strong {
          font-weight: 600;
        }
        .list-group {
          margin-bottom: 1.5rem;
        }
        .list-group-item {
          padding: 0.75rem 0;
          border-bottom: 1px solid #e5e7eb;
          font-size: 0.875rem;
          color: #1a202c;
        }
        .list-group-item:last-child {
          border-bottom: none;
        }
        .list-group-item strong {
          font-weight: 600;
          margin-right: 0.5rem;
        }
        .button-group {
          display: flex;
          gap: 1rem;
        }
        .button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .button-primary {
          background-color: #2563eb;
          color: white;
        }
        .button-primary:hover {
          background-color: #1d4ed8;
        }
        .button-secondary {
          background-color: #6b7280;
          color: white;
        }
        .button-secondary:hover {
          background-color: #4b5563;
        }
        .button i {
          font-size: 1rem;
        }
        .upload-card {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          padding: 2rem;
          text-align: center;
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
        }
        .upload-card i {
          font-size: 2.5rem;
          color: #2563eb;
          margin-bottom: 1rem;
        }
        .upload-card h5 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1a202c;
          margin-bottom: 0.75rem;
        }
        .upload-card p {
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 1.5rem;
        }
      `}</style>
      {hasExistingStatement && extractedData ? (
        <div className="card">
          <div className="header-group">
            <h4>Bank Statement Details</h4>
            <div className="button-group">
              <button onClick={handleModifyStatement} className="button button-primary">
                <i className="fas fa-edit"></i> Modify Statement
              </button>
              <button onClick={handleReturn} className="button button-secondary">
                <i className="fas fa-arrow-left"></i> Back
              </button>
            </div>
          </div>

          <div className="success">
            <i className="fas fa-check-circle"></i>
            <div>
              <strong>Success!</strong> Your bank statement "<strong>{currentFileName}</strong>" is loaded.
            </div>
          </div>

          <div className="list-group">
            <div className="list-group-item"><strong>File Name:</strong> {currentFileName}</div>
            <div className="list-group-item"><strong>Upload Type:</strong> Bank Statement</div>
            {extractedData.accountHolder && <div className="list-group-item"><strong>Account Holder:</strong> {extractedData.accountHolder}</div>}
            {extractedData.bankName && <div className="list-group-item"><strong>Bank:</strong> {extractedData.bankName}</div>}
            {extractedData.accountNumber && <div className="list-group-item"><strong>Account Number:</strong> {extractedData.accountNumber}</div>}
            {extractedData.statementPeriod && <div className="list-group-item"><strong>Statement Period:</strong> {extractedData.statementPeriod}</div>}
          </div>
          <ExtractedData data={extractedData} />
        </div>
      ) : (
        <div className="card">
          <div className="header-group">
            <div className="button-group">
              <button onClick={handleModifyStatement} className="button button-primary">
                <i className="fas fa-edit"></i> Modify Statement
              </button>
              <button onClick={handleReturn} className="button button-secondary">
                <i className="fas fa-arrow-left"></i> Return
              </button>
            </div>
          </div>
        <div className="upload-card">
          <i className="fas fa-university"></i>
          <h5>Upload Bank Statement</h5>
          <p>Extract transactions, balances, and account info from bank statements.</p>
          <FileUpload
            onFileSelect={handleFileSelect}
            isProcessing={isProcessing}
            uploadStatus={uploadStatus}
          />
        </div>
        </div>
      )}
    </div>
  );
};

export default BankStatementEdit;