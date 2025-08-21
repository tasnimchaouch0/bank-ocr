/*import React, { useState, useEffect } from "react";
import type { User } from "../../services/api";
import { FileUpload } from "../FileUpload";
import { ExtractedData } from "../ExtractedData";
import { useOCR } from "../../hooks/useOCR";
import { extractCreditCardStatementData } from "../../utils/CreditCarddataExtractor";
import { apiService } from "../../services/api";

// Props for CreditCard
interface CreditCardProps {
  user?: User; // ✅ optional to prevent errors when undefined is passed
}

// Raw OCR extracted data before cleaning
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
    type: "credit" | "debit";
    balance?: number;
  }>;
  summary?: {
    totalCredits: number;
    totalDebits: number;
    openingBalance: number;
    closingBalance: number;
  };
}

// Final cleaned version for saving
export interface BankStatementData {
  id?: number;
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
    type: "credit" | "debit";
    balance?: number;
  }>;
  summary: {
    totalCredits: number;
    totalDebits: number;
    openingBalance: number;
    closingBalance: number;
  };
}

// ✅ Safely clean extracted data
function cleanExtractedData(data: ExtractedDataRaw): BankStatementData {
  return {
    ...data,
    accountNumber: data.accountNumber ?? undefined,
    accountHolder: data.accountHolder ?? undefined,
    bankName: data.bankName ?? undefined,
    statementPeriod: data.statementPeriod ?? undefined,
    cardNumber: data.cardNumber ?? undefined,
    expiryDate: data.expiryDate ?? undefined,
    summary: data.summary ?? {
      totalCredits: 0,
      totalDebits: 0,
      openingBalance: 0,
      closingBalance: 0,
    },
  };
}

export const CreditCard: React.FC<CreditCardProps> = ({ user }) => {
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [extractedData, setExtractedData] = useState<BankStatementData | null>(
    null
  );
  const [currentFileName, setCurrentFileName] = useState<string>("");
  const { processImage, isProcessing, progress } = useOCR();
  const [rawOCRText, setRawOCRText] = useState("");

  // Load latest statement on mount
  useEffect(() => {
    const loadStatement = async () => {
      try {
        const statements = await apiService.getStatement("creditcard");
        if (statements.length > 0) {
          const latestStatement = statements[0];
          setExtractedData({
            ...JSON.parse(latestStatement.extracted_data),
            id: latestStatement.id,
          });
          setCurrentFileName(latestStatement.filename);
          setUploadStatus("success");
        }
      } catch (error) {
        console.error("Error fetching credit card statements:", error);
      }
    };
    loadStatement();
  }, []);

  // File upload handler
  const handleFileSelect = async (file: File) => {
    try {
      setUploadStatus("uploading");
      setExtractedData(null);
      setCurrentFileName(file.name);

      let rawData: ExtractedDataRaw;
      let cleanedData: BankStatementData;

      if (file.type === "application/pdf") {
        // Simulated PDF OCR for now
        await new Promise((resolve) => setTimeout(resolve, 3000));
        rawData = extractCreditCardStatementData("");
      } else {
        const result = await processImage(file);
        console.log("=== RAW OCR TEXT START ===");
        console.log(result.text);
        console.log("=== RAW OCR TEXT END ===");
        rawData = extractCreditCardStatementData(result.text);
        setRawOCRText(result.text);
      }

      cleanedData = cleanExtractedData(rawData);

      // Save to backend
      const response = await apiService.createBankStatement({
        filename: file.name,
        statement_type: "creditcard",
        extracted_data: JSON.stringify(cleanedData),
        account_number: cleanedData.accountNumber,
        account_holder: cleanedData.accountHolder,
        bank_name: cleanedData.bankName,
        statement_period: cleanedData.statementPeriod,
        card_number: cleanedData.cardNumber,
        expiry_date: cleanedData.expiryDate,
        total_credits: cleanedData.summary.totalCredits,
        total_debits: cleanedData.summary.totalDebits,
      });

      setExtractedData({ ...cleanedData, id: response.id });
      setUploadStatus("success");
    } catch (error) {
      console.error("Error processing file:", error);
      setUploadStatus("error");
    }
  };

  const handleNewUpload = () => {
    setExtractedData(null);
    setUploadStatus("idle");
    setCurrentFileName("");
  };

  const handleModifyData = (updatedData: BankStatementData) => {
    if (!updatedData.id) {
      console.error("No statement ID available for update");
      return;
    }
    setExtractedData(updatedData);
    apiService.updateBankStatement(updatedData.id, {
      extracted_data: JSON.stringify(updatedData),
      account_number: updatedData.accountNumber,
      account_holder: updatedData.accountHolder,
      bank_name: updatedData.bankName,
      statement_period: updatedData.statementPeriod,
      card_number: updatedData.cardNumber,
      expiry_date: updatedData.expiryDate,
      total_credits: updatedData.summary.totalCredits,
      total_debits: updatedData.summary.totalDebits,
    });
  };

  return (
    <div>
      {!extractedData ? (
        <div>
          <div className="row justify-content-center g-4 mb-5">
            <div className="col-md-5">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body text-center p-4">
                  <i className="bi bi-credit-card-2-front fs-1 text-success mb-3"></i>
                  <h5 className="fw-semibold">Upload Credit Card Statement</h5>
                  <p className="text-muted">
                    Extract card numbers, expiry dates, and credit card
                    transactions.
                  </p>
                  <FileUpload
                    onFileSelect={handleFileSelect}
                    isProcessing={isProcessing}
                    uploadStatus={uploadStatus}
                  />
                </div>
              </div>
            </div>
          </div>

          {isProcessing && (
            <div className="row justify-content-center mt-4">
              <div className="col-lg-8">
                <div className="card border-0 shadow-sm">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="fw-medium">Processing Progress</span>
                      <span className="text-muted">{progress}%</span>
                    </div>
                    <div className="progress" style={{ height: "8px" }}>
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
          <button
            onClick={handleNewUpload}
            className="btn btn-outline-primary btn-icon mb-4"
          >
            <i className="bi bi-arrow-left"></i>
            Upload New Credit Card Statement
          </button>

          <div
            className="alert alert-success d-flex align-items-center mb-4"
            role="alert"
          >
            <i className="bi bi-check-circle-fill me-2"></i>
            <div>
              <strong>Success!</strong> Your credit card statement "
              <strong>{currentFileName}</strong>" has been processed and saved.
            </div>
          </div>

          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <h5 className="fw-bold mb-3">
                Uploaded Credit Card Statement Details
              </h5>
              <ul className="list-group list-group-flush">
                <li className="list-group-item">
                  <strong>File Name:</strong> {currentFileName}
                </li>
                <li className="list-group-item">
                  <strong>Upload Type:</strong> Credit Card Statement
                </li>
                {extractedData.accountHolder && (
                  <li className="list-group-item">
                    <strong>Account Holder:</strong>
                    <input
                      type="text"
                      className="form-control d-inline-block ms-2"
                      value={extractedData.accountHolder || ""}
                      onChange={(e) =>
                        handleModifyData({
                          ...extractedData,
                          accountHolder: e.target.value,
                        })
                      }
                    />
                  </li>
                )}
                {extractedData.bankName && (
                  <li className="list-group-item">
                    <strong>Bank:</strong>
                    <input
                      type="text"
                      className="form-control d-inline-block ms-2"
                      value={extractedData.bankName || ""}
                      onChange={(e) =>
                        handleModifyData({
                          ...extractedData,
                          bankName: e.target.value,
                        })
                      }
                    />
                  </li>
                )}
                {extractedData.cardNumber && (
                  <li className="list-group-item">
                    <strong>Card Number:</strong>
                    <input
                      type="text"
                      className="form-control d-inline-block ms-2"
                      value={extractedData.cardNumber || ""}
                      onChange={(e) =>
                        handleModifyData({
                          ...extractedData,
                          cardNumber: e.target.value,
                        })
                      }
                    />
                  </li>
                )}
                {extractedData.expiryDate && (
                  <li className="list-group-item">
                    <strong>Expiry Date:</strong>
                    <input
                      type="text"
                      className="form-control d-inline-block ms-2"
                      value={extractedData.expiryDate || ""}
                      onChange={(e) =>
                        handleModifyData({
                          ...extractedData,
                          expiryDate: e.target.value,
                        })
                      }
                    />
                  </li>
                )}
                {extractedData.statementPeriod && (
                  <li className="list-group-item">
                    <strong>Statement Period:</strong>
                    <input
                      type="text"
                      className="form-control d-inline-block ms-2"
                      value={extractedData.statementPeriod || ""}
                      onChange={(e) =>
                        handleModifyData({
                          ...extractedData,
                          statementPeriod: e.target.value,
                        })
                      }
                    />
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
*/