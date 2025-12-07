import { Platform } from 'react-native';

// OCR.space API URL
const OCR_SPACE_API_URL = 'https://api.ocr.space/parse/image';

export type ReceiptItem = {
  description: string;
  amount: number;
};

export type ReceiptData = {
  items: ReceiptItem[];
  total: number;
  tax: number;
  tip: number;
  taxPercent?: number;
  tipPercent?: number;
  merchant: string;
};

export async function analyzeReceipt(imageUri: string, apiKey: string): Promise<ReceiptData> {
  try {
    console.log('Analyzing receipt with OCR.space...');
    
    const formData = new FormData();
    formData.append('file', {
      uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
      type: 'image/jpeg',
      name: 'receipt.jpg',
    } as any);
    
    formData.append('apikey', apiKey);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2'); // Engine 2 is better for numbers/receipts

    const response = await fetch(OCR_SPACE_API_URL, {
      method: 'POST',
      body: formData,
      // Headers are handled automatically for FormData
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('OCR.space API Error Status:', response.status);
      throw new Error(`API Error ${response.status}: ${responseText}`);
    }

    const data = JSON.parse(responseText);
    
    if (data.IsErroredOnProcessing) {
      throw new Error(`OCR Error: ${data.ErrorMessage?.[0] || 'Unknown error'}`);
    }

    const parsedText = data.ParsedResults?.[0]?.ParsedText || '';
    console.log('Raw OCR Text:', parsedText);

    return parseReceiptText(parsedText);

  } catch (error) {
    console.error('Receipt Analysis Failed:', error);
    throw error;
  }
}

function parseReceiptText(text: string): ReceiptData {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  
  let total = 0;
  let merchant = lines[0] || 'Unknown Merchant'; // Guess first line is merchant
  const items: ReceiptItem[] = [];

  // Regex to find prices (e.g., 10.99, 10,99) at the end of a line
  const priceRegex = /(\d+[.,]\d{2})\s*$/;
  
  // 1. Try to find TOTAL
  // Look for lines starting with "Total" or "Amount"
  const totalLines = lines.filter(l => /total|amount|due|balance/i.test(l));
  for (const line of totalLines.reverse()) { // Search from bottom up
    const match = line.match(/(\d+[.,]\d{2})/);
    if (match) {
      total = parseFloat(match[1].replace(',', '.'));
      break;
    }
  }

  // If no explicit "Total" label, find the largest number
  if (total === 0) {
    const allNumbers = lines
      .map(l => l.match(/(\d+[.,]\d{2})/))
      .filter(m => m)
      .map(m => parseFloat(m![1].replace(',', '.')));
    if (allNumbers.length > 0) {
      total = Math.max(...allNumbers);
    }
  }

  // 2. Try to extract items
  // STRATEGY A: Same-line Price (Classic)
  // Assumption: Lines that end in a number are likely items, excluding the total line
  for (const line of lines) {
    if (/total|tax|change|cash|subtotal/i.test(line)) continue; // Skip summary lines
    
    const match = line.match(priceRegex);
    if (match) {
      const price = parseFloat(match[1].replace(',', '.'));
      // Ignore if it looks like a date (e.g. 20.23) or huge outlier
      if (price > 0 && price < 10000 && price !== total) {
        const desc = line.replace(match[0], '').trim();
        if (desc.length > 2) { // Avoid noise
           items.push({ description: desc, amount: price });
        }
      }
    }
  }

  // STRATEGY B: Columnar Mode (Fallback)
  // If Strategy A failed to find items, try to find a list of descriptions and a list of prices
  if (items.length === 0) {
    console.log('Strategy A failed. Trying Strategy B (Columnar Mode)...');
    
    // Find lines that look like prices (standalone numbers or RM... lines)
    const priceCandidates = lines
      .map(l => {
        // Match "RM 10.00", "10.00", "RM10.50"
        const m = l.match(/^(?:RM\s?)?(\d+[.,]\d{2})$/i);
        return m ? parseFloat(m[1].replace(',', '.')) : null;
      })
      .filter(p => p !== null && p > 0 && p < 10000 && p !== total) as number[];

    // Define Header/Footer Boundaries to avoid picking up junk
    // 1. Start after Date/Time or common header keywords
    let startIndex = 0;
    const dateRegex = /\d{2}[/-]\d{2}[/-]\d{2,4}/;
    const timeRegex = /\d{1,2}:\d{2}/;
    
    for (let i = 0; i < lines.length; i++) {
       // Only set startIndex if we haven't found a definitive start yet
       if (startIndex === 0) {
          if (dateRegex.test(lines[i]) || timeRegex.test(lines[i])) {
             startIndex = i + 1; // Start AFTER the date line
             break; // Found the top date, stop searching to avoid picking up footer dates
          }
          // Also skip known header junk if we haven't found a date yet
          if (/jalan|tel:|fax:|sst|reg|pos|cashier|table|pax|order|queue|receipt/i.test(lines[i])) {
             // Treat this as a header line, so items must start after this
             // We don't break here because there might be more header lines or a date later
             // But we tentatively move start index
             // actually, let's just ignore this for now and rely on the date or the first valid item
          }
       }
    }

    // Fallback: If no date found, try to find the first line that looks like an item (starts with digit)
    if (startIndex === 0) {
       for (let i = 0; i < lines.length; i++) {
          // If line starts with a digit like "1 Item", it's likely the start
          if (/^\d+\s+[a-zA-Z]/.test(lines[i])) {
             startIndex = i;
             break;
          }
       }
    }

    // 2. End at Subtotal/Total
    let endIndex = lines.length;
    for (let i = startIndex; i < lines.length; i++) {
       if (/subtotal|total|amount due|balance/i.test(lines[i])) {
          endIndex = i;
          break;
       }
    }

    // Find lines that look like items (start with digit/quantity, or just text)
    // Exclude keywords like Total, Tax, Subtotal
    const itemCandidates = lines.slice(startIndex, endIndex).filter(l => {
      if (/total|tax|change|cash|subtotal|amount|due|balance|round|sst|syr chrg/i.test(l)) return false;
      if (/^(?:RM\s?)?(\d+[.,]\d{2})$/i.test(l)) return false; // Exclude price lines
      if (l.length < 3) return false; // Too short
      
      // Additional Filters for Header Junk (in case date wasn't found)
      if (/jalan|tel:|fax:|reg no|company|sdn bhd/i.test(l)) return false;

      // Heuristic: Items often start with a quantity digit (e.g. "1 Burger")
      // But we accept any text line that isn't a price or header
      return true;
    });

    // Pair them up
    // We assume the first N prices correspond to the first N items
    // This handles the case where prices appear in a block *after* the items
    const count = Math.min(itemCandidates.length, priceCandidates.length);
    for (let i = 0; i < count; i++) {
       items.push({
         description: itemCandidates[i],
         amount: priceCandidates[i]
       });
    }
  }

  // 3. Try to find TAX and SERVICE CHARGE
  let tax = 0;
  let tip = 0; // Service Charge
  let taxPercent = 0;
  let tipPercent = 0;

  // Look for Tax lines
  const taxLines = lines.filter(l => /tax|gst|sst|vat/i.test(l) && !/total|invoice/i.test(l));
  for (const line of taxLines) {
    // Try to find amount first
    const matchAmount = line.match(/(\d+[.,]\d{2})$/);
    if (matchAmount) {
      const val = parseFloat(matchAmount[1].replace(',', '.'));
      if (val < total) {
        tax += val;
      }
    }
    
    // Also look for percentage
    const matchPercent = line.match(/(\d+(?:\.\d+)?)%/);
    if (matchPercent) {
       taxPercent = parseFloat(matchPercent[1]);
    }
  }

  // Look for Service Charge / Tip lines
  const tipLines = lines.filter(l => /service charge|svc chg|tip|gratuity|syr chrg|surcharge/i.test(l));
  for (const line of tipLines) {
    const matchAmount = line.match(/(\d+[.,]\d{2})$/);
    if (matchAmount) {
      const val = parseFloat(matchAmount[1].replace(',', '.'));
      if (val < total) {
        tip = val;
      }
    }

    // Also look for percentage
    const matchPercent = line.match(/(\d+(?:\.\d+)?)%/);
    if (matchPercent) {
       tipPercent = parseFloat(matchPercent[1]);
    }
  }

  return {
    items,
    total,
    tax,
    tip,
    taxPercent,
    tipPercent,
    merchant,
  };
}
