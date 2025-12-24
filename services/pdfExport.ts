/**
 * PDF Export Service
 * Lazy loads jsPDF and html2canvas only when needed
 */

interface ExportOptions {
  filename?: string;
  margin?: number;
  quality?: number;
  onProgress?: (status: string) => void;
}

interface ExportResult {
  success: boolean;
  filename?: string;
  error?: string;
}

let jsPDFModule: typeof import('jspdf') | null = null;
let html2canvasModule: typeof import('html2canvas') | null = null;

async function loadPdfLibraries() {
  if (!jsPDFModule || !html2canvasModule) {
    const [jspdf, h2c] = await Promise.all([
      import('jspdf'),
      import('html2canvas'),
    ]);
    jsPDFModule = jspdf;
    html2canvasModule = h2c;
  }
  return {
    jsPDF: jsPDFModule.jsPDF,
    html2canvas: html2canvasModule.default,
  };
}

export async function exportToPdf(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<ExportResult> {
  const {
    filename = 'document.pdf',
    margin = 10,
    quality = 0.95,
    onProgress,
  } = options;

  try {
    onProgress?.('Loading PDF libraries...');

    const { jsPDF, html2canvas } = await loadPdfLibraries();

    onProgress?.('Capturing content...');

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });

    onProgress?.('Generating PDF...');

    const imgData = canvas.toDataURL('image/jpeg', quality);
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    // Add first page
    pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight - margin * 2;

    // Add additional pages if content is longer
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight - margin * 2;
    }

    onProgress?.('Saving...');

    pdf.save(filename);

    return { success: true, filename };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Export element to PDF and return as Blob
 */
export async function exportToPdfBlob(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<Blob | null> {
  const { margin = 10, quality = 0.95, onProgress } = options;

  try {
    onProgress?.('Loading PDF libraries...');

    const { jsPDF, html2canvas } = await loadPdfLibraries();

    onProgress?.('Capturing content...');

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });

    onProgress?.('Generating PDF...');

    const imgData = canvas.toDataURL('image/jpeg', quality);
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const imgWidth = pdfWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);

    return pdf.output('blob');
  } catch (error) {
    console.error('PDF export error:', error);
    return null;
  }
}

export default exportToPdf;
