import { useState, useCallback } from 'react';
import { createWorker } from 'tesseract.js';

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
      const worker = await createWorker('eng'); // v6 API: pass language here directly

      const { data } = await worker.recognize(file); // only recognize() available in v6

      await worker.terminate();

      return {
        text: data.text,
        confidence: data.confidence,
      };
    } catch (error) {
      console.error('OCR processing error:', error);
      throw new Error('Failed to process image');
    } finally {
      setIsProcessing(false);
      setProgress(100); // No progress API in v6 — we just set 100% at the end
    }
  }, []);

  return {
    processImage,
    isProcessing,
    progress,
  };
};
