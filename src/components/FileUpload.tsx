import React, { useCallback, useState } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error';
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  isProcessing,
  uploadStatus
}) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (file && (file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'application/pdf')) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'uploading':
        return <i className="bi bi-arrow-clockwise fs-1 text-primary" style={{animation: 'spin 1s linear infinite'}}></i>;
      case 'success':
        return <i className="bi bi-check-circle fs-1 text-success"></i>;
      case 'error':
        return <i className="bi bi-exclamation-circle fs-1 text-danger"></i>;
      default:
        return <i className="bi bi-cloud-upload fs-1 text-primary"></i>;
    }
  };

  const getStatusText = () => {
    switch (uploadStatus) {
      case 'uploading':
        return 'Processing your bank statement...';
      case 'success':
        return 'Bank statement processed successfully!';
      case 'error':
        return 'Error processing bank statement. Please try again.';
      default:
        return 'Upload your bank statement';
    }
  };

  const getUploadZoneClasses = () => {
    let classes = 'upload-zone p-5 text-center position-relative';
    if (dragActive) classes += ' drag-active';
    if (uploadStatus === 'success') classes += ' success';
    if (uploadStatus === 'error') classes += ' error';
    if (isProcessing) classes += ' pe-none opacity-75';
    return classes;
  };

  return (
    <div className="w-100">
      <div
        className={getUploadZoneClasses()}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileInput}
          className="position-absolute top-0 start-0 w-100 h-100 opacity-0"
          style={{cursor: 'pointer'}}
          disabled={isProcessing}
        />
        
        <div className="d-flex flex-column align-items-center">
          <div className="mb-4">
            {getStatusIcon()}
          </div>
          
          <div className="mb-3">
            <h5 className="fw-semibold text-dark mb-2">
              {getStatusText()}
            </h5>
            <p className="text-muted mb-0">
              {uploadStatus === 'idle' && 'Drag and drop your bank statement here, or click to browse'}
              {uploadStatus === 'uploading' && 'Extracting transaction data using OCR...'}
              {uploadStatus === 'success' && 'Data extracted successfully! Check the results below.'}
              {uploadStatus === 'error' && 'Please ensure your file is a valid bank statement (PDF, JPG, or PNG)'}
            </p>
          </div>
          
          <div className="d-flex align-items-center text-muted small">
            <div className="d-flex align-items-center me-3">
              <i className="bi bi-file-earmark-text me-1"></i>
              <span>PDF, JPG, PNG supported</span>
            </div>
            <span className="text-secondary">•</span>
            <span className="ms-3">Max 10MB</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};