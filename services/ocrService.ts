/**
 * OCR Service
 *
 * Uses Tesseract.js to extract text from images client-side.
 * Supports Korean and English text recognition.
 *
 * NOTE: Tesseract.js is dynamically imported to reduce initial bundle size.
 * It will only be loaded when an image file needs OCR processing.
 */

// Dynamic import for tesseract.js - loaded on demand
let tesseractModule: typeof import('tesseract.js') | null = null;

async function getTesseract() {
  if (!tesseractModule) {
    tesseractModule = await import('tesseract.js');
  }
  return tesseractModule.default;
}

export interface OcrResult {
  text: string;
  confidence: number;
  success: boolean;
  error?: string;
}

export interface OcrProgress {
  status: string;
  progress: number;
}

type ProgressCallback = (progress: OcrProgress) => void;

/**
 * Extract text from an image file using OCR
 * @param file - Image file to process
 * @param onProgress - Optional callback for progress updates
 * @returns OCR result with extracted text
 */
export async function extractImageText(
  file: File,
  onProgress?: ProgressCallback
): Promise<OcrResult> {
  try {
    // Validate file type
    if (!isImageFile(file)) {
      return {
        text: "",
        confidence: 0,
        success: false,
        error: "Invalid file type. Expected image.",
      };
    }

    // Check file size (limit to 10MB for client-side OCR)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        text: "",
        confidence: 0,
        success: false,
        error: "Image too large. Maximum size is 10MB.",
      };
    }

    // Dynamically load tesseract.js
    const Tesseract = await getTesseract();

    // Perform OCR with Korean + English language support
    const result = await Tesseract.recognize(file, "kor+eng", {
      logger: (m) => {
        if (onProgress && m.status) {
          onProgress({
            status: translateStatus(m.status),
            progress: m.progress || 0,
          });
        }
      },
    });

    const text = result.data.text.trim();
    const confidence = result.data.confidence;

    // Check if we got meaningful text
    if (text.length < 10) {
      return {
        text: "",
        confidence: 0,
        success: false,
        error:
          "Could not extract text from image. The image may be unclear or contain no text.",
      };
    }

    // Warn if confidence is low
    if (confidence < 60) {
      console.warn(`Low OCR confidence: ${confidence}%`);
    }

    return {
      text,
      confidence,
      success: true,
    };
  } catch (error) {
    console.error("OCR failed:", error);
    return {
      text: "",
      confidence: 0,
      success: false,
      error: error instanceof Error ? error.message : "Unknown OCR error",
    };
  }
}

/**
 * Check if a file is a supported image type
 * @param file - File to check
 * @returns true if file is a supported image
 */
export function isImageFile(file: File): boolean {
  const imageTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/bmp",
    "image/tiff",
  ];
  return (
    imageTypes.includes(file.type) ||
    /\.(jpg|jpeg|png|webp|bmp|tiff?)$/i.test(file.name)
  );
}

/**
 * Translate Tesseract status messages to Korean
 */
function translateStatus(status: string): string {
  const translations: Record<string, string> = {
    loading: "OCR loading...",
    "loading tesseract core": "Loading OCR engine...",
    "initializing tesseract": "Initializing OCR...",
    "loading language traineddata": "Loading language data...",
    "initializing api": "Preparing...",
    "recognizing text": "Recognizing text...",
  };
  return translations[status.toLowerCase()] || status;
}
