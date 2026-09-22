import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Pure mathematical OKLCH to sRGB converter to guarantee accurate conversion
 * even in environments where 2D canvas context cannot parse oklch.
 */
function oklchToRgb(colorStr: string): string {
  try {
    // Standard format: oklch(L C H) or oklch(L C H / A)
    const match = colorStr.match(/oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+(?:deg)?)(?:\s*\/\s*([\d.]+%?))?\s*\)/i);
    if (match) {
      let L = match[1].endsWith('%') ? parseFloat(match[1]) / 100 : parseFloat(match[1]);
      const C = parseFloat(match[2]);
      let H = parseFloat(match[3]);
      const A = match[4] ? (match[4].endsWith('%') ? parseFloat(match[4]) / 100 : parseFloat(match[4])) : 1;

      // Convert OKLCH to OKLab
      const hRad = (H * Math.PI) / 180;
      const a_lab = C * Math.cos(hRad);
      const b_lab = C * Math.sin(hRad);

      // OKLab to linear LMS
      const l_ = L + 0.3963377774 * a_lab + 0.2158037573 * b_lab;
      const m_ = L - 0.1055613458 * a_lab - 0.0638541728 * b_lab;
      const s_ = L - 0.0894841775 * a_lab - 1.2914855480 * b_lab;

      const l = l_ * l_ * l_;
      const m = m_ * m_ * m_;
      const s = s_ * s_ * s_;

      // LMS to linear sRGB
      let r_lin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
      let g_lin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
      let b_lin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

      // Gamma correction to sRGB
      const gamma = (x: number) => {
        const clamped = Math.max(0, Math.min(1, x));
        return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
      };

      const r = Math.round(gamma(r_lin) * 255);
      const g = Math.round(gamma(g_lin) * 255);
      const b = Math.round(gamma(b_lin) * 255);

      if (A < 1) {
        return `rgba(${r}, ${g}, ${b}, ${A.toFixed(3)})`;
      }
      return `rgb(${r}, ${g}, ${b})`;
    }
  } catch {
    // fallback to offscreen canvas or default
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000000';
      ctx.fillStyle = colorStr;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      return a < 255 ? `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})` : `rgb(${r}, ${g}, ${b})`;
    }
  } catch {
    // fallback
  }

  return 'rgb(0, 0, 0)';
}

/**
 * Traverses cloned elements and replaces any computed or inline oklch/color(...) styles with standard rgb/rgba
 */
function sanitizeColorsForHtml2Canvas(clonedDoc: Document): void {
  // 1. Sanitize style tags
  const styleTags = clonedDoc.querySelectorAll('style');
  styleTags.forEach((styleTag) => {
    if (styleTag.textContent && styleTag.textContent.includes('oklch')) {
      styleTag.textContent = styleTag.textContent.replace(
        /oklch\([^)]+\)/gi,
        (match) => oklchToRgb(match)
      );
    }
  });

  // 1b. Sanitize all stylesheets if accessible
  try {
    const styleSheets = Array.from(clonedDoc.styleSheets);
    styleSheets.forEach((sheet) => {
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (!rules) return;
        for (let i = 0; i < rules.length; i++) {
          const rule = rules[i];
          if (rule.cssText && rule.cssText.includes('oklch')) {
            // If the rule text contains oklch, try to patch style properties if it's a CSSStyleRule
            if ('style' in rule && rule instanceof CSSStyleRule) {
              const style = rule.style;
              for (let j = 0; j < style.length; j++) {
                const prop = style[j];
                const val = style.getPropertyValue(prop);
                if (val && val.includes('oklch')) {
                  style.setProperty(prop, oklchToRgb(val));
                }
              }
            }
          }
        }
      } catch {
        // Ignore cross-origin stylesheet errors
      }
    });
  } catch {
    // Ignore stylesheet collection errors
  }

  // 2. Sanitize all DOM elements
  const allElements = clonedDoc.querySelectorAll('*');
  const colorProps = [
    'color',
    'backgroundColor',
    'borderColor',
    'borderTopColor',
    'borderBottomColor',
    'borderLeftColor',
    'borderRightColor',
    'outlineColor',
    'textDecorationColor',
    'fill',
    'stroke',
    'boxShadow',
    'textShadow',
  ];

  allElements.forEach((el) => {
    if (el instanceof HTMLElement || el instanceof SVGElement) {
      // Check computed styles on element
      const win = clonedDoc.defaultView || window;
      const computed = win.getComputedStyle(el);

      colorProps.forEach((prop) => {
        const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
        const val = computed.getPropertyValue(cssProp);
        if (val && val.includes('oklch')) {
          el.style.setProperty(
            cssProp,
            oklchToRgb(val),
            'important'
          );
        }
      });

      // Also clean inline styles
      const inlineStyle = el.getAttribute('style');
      if (inlineStyle && inlineStyle.includes('oklch')) {
        const cleaned = inlineStyle.replace(
          /oklch\([^)]+\)/gi,
          (match) => oklchToRgb(match)
        );
        el.setAttribute('style', cleaned);
      }
    }
  });
}

/**
 * Exports an invoice HTML element directly to a downloadable PDF file.
 */
export async function downloadInvoiceAsPdf(element: HTMLElement, filename: string): Promise<void> {
  try {
    // Generate high-resolution canvas with onclone sanitization
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      onclone: (clonedDoc) => {
        sanitizeColorsForHtml2Canvas(clonedDoc);
      },
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
    const margin = 8; // 8mm margin
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = (canvas.height * contentWidth) / canvas.width;

    if (contentHeight <= pageHeight - margin * 2) {
      // Fits comfortably on single A4 page
      pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, contentHeight, undefined, 'FAST');
    } else {
      // Check if it fits with slight reduction
      const scaleFactor = (pageHeight - margin * 2) / contentHeight;
      if (scaleFactor >= 0.82) {
        const scaledWidth = contentWidth * scaleFactor;
        const scaledHeight = contentHeight * scaleFactor;
        const xOffset = margin + (contentWidth - scaledWidth) / 2;
        pdf.addImage(imgData, 'JPEG', xOffset, margin, scaledWidth, scaledHeight, undefined, 'FAST');
      } else {
        // Multi-page handling
        let remainingHeight = contentHeight;
        let position = margin;

        pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight, undefined, 'FAST');
        remainingHeight -= (pageHeight - margin * 2);

        while (remainingHeight > 0) {
          pdf.addPage();
          position = margin - (contentHeight - remainingHeight);
          pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight, undefined, 'FAST');
          remainingHeight -= (pageHeight - margin * 2);
        }
      }
    }

    const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(safeFilename);
  } catch (error: unknown) {
    console.error('Failed to generate PDF:', error);
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Gagal membuat file PDF (${detail}). Silakan gunakan tombol Cetak.`);
  }
}

/**
 * Prints an invoice element cleanly via an isolated hidden iframe
 * so that it doesn't print background dashboard elements or get clipped by modal overflows.
 */
export function printInvoiceElement(element: HTMLElement, title: string): void {
  try {
    // Clone all stylesheets and link tags from current document head
    const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((el) => el.outerHTML)
      .join('\n');

    // Create a temporary hidden iframe
    const iframe = document.createElement('iframe');
    iframe.id = 'invoice-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    iframe.setAttribute('title', 'Invoice Print Frame');
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          ${styleTags}
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body {
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            .invoice-card {
              border: 1px solid #d6d3d1 !important;
              box-shadow: none !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 auto !important;
              padding: 24px !important;
              box-sizing: border-box !important;
            }
            .no-print {
              display: none !important;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          </style>
        </head>
        <body>
          <div class="print-wrapper" style="padding: 10px;">
            ${element.outerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    // Give iframe time to load styles and render
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.warn('Iframe print error, falling back to window.print():', err);
        window.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }
    }, 400);
  } catch (err) {
    console.error('Error initiating print:', err);
    window.print();
  }
}
