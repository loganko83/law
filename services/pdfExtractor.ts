/**
 * PDF Text Extraction Service
 *
 * Uses pdf.js to extract text content from PDF files client-side.
 * Supports multi-page documents and Korean text.
 */
import * as pdfjsLib from "pdfjs-dist";

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface PdfExtractionResult {
  text: string;
  pageCount: number;
  success: boolean;
  error?: string;
}

/**
 * Extract text content from a PDF file
 * @param file - PDF file to extract text from
 * @returns Extraction result with text content
 */
export async function extractPdfText(file: File): Promise<PdfExtractionResult> {
  try {
    // Validate file type
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      return {
        text: "",
        pageCount: 0,
        success: false,
        error: "Invalid file type. Expected PDF.",
      };
    }

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      // Enable CMap for Korean text support
      cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/",
      cMapPacked: true,
    });

    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;

    if (numPages === 0) {
      return {
        text: "",
        pageCount: 0,
        success: false,
        error: "PDF has no pages.",
      };
    }

    // Extract text from all pages
    const textParts: string[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Combine text items with proper spacing
      const pageText = textContent.items
        .map((item: { str?: string }) => item.str || "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (pageText) {
        textParts.push(pageText);
      }
    }

    const fullText = textParts.join("\n\n");

    // Check if we got meaningful text
    if (fullText.length < 10) {
      return {
        text: "",
        pageCount: numPages,
        success: false,
        error:
          "Could not extract text from PDF. The document may be scanned or image-based.",
      };
    }

    return {
      text: fullText,
      pageCount: numPages,
      success: true,
    };
  } catch (error) {
    console.error("PDF extraction failed:", error);
    return {
      text: "",
      pageCount: 0,
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown PDF extraction error",
    };
  }
}

/**
 * Check if a PDF file can be processed
 * @param file - File to check
 * @returns true if file is a valid PDF
 */
export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}
