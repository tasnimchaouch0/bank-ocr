import { useState, useCallback } from 'react';

interface OCRResult {
  text: string;
  confidence: number;
}

export const useOCR = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const processImage = useCallback(async (file: File): Promise<OCRResult> => {
    setIsProcessing(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      setProgress(25);

      const response = await fetch('http://localhost:8000/process-ocr', {
        method: 'POST',
        body: formData,
      });

      setProgress(50);

      const result = await response.json();

      setProgress(75);

      await new Promise(resolve => setTimeout(resolve, 300));

      if (result.error) {
        throw new Error(result.error);
      }

      setProgress(100);

      return {
        text: result.text,
        confidence: result.confidence || 1.0,
      };
    } catch (error) {
      console.error('OCR processing error:', error);
      throw new Error(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    processImage,
    isProcessing,
    progress,
  };
};
