import { parse, format, isValid } from 'date-fns';

export interface Transaction {
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  balance?: number;
}

export interface ExtractedData {
  accountNumber?: string;
  accountHolder?: string;
  bankName?: string;
  statementPeriod?: string;
  cardNumber?: string | null;
  expiryDate?: string | null;
  transactions: Transaction[];
  summary: {
    totalCredits: number;
    totalDebits: number;
    openingBalance: number;
    closingBalance: number;
  };
}

export const extractBankStatementData = (text: string): ExtractedData => {

  console.log("Full OCR text:\n", text);

  const bankName = extractBankName(text);
  const statementPeriod = extractStatementPeriod(text);
  const accountNumber = extractAccountNumber(text);
  const summary = extractSummary(text);
  const transactions = extractTransactions(text);

  const result: ExtractedData = {
    accountNumber,
    accountHolder: undefined,
    bankName,
    statementPeriod,
    cardNumber: null,
    expiryDate: null,
    transactions,
    summary,
  };

  console.log("\nExtracted Data:\n", JSON.stringify(result, null, 2));
  return result;
};
const extractBankName = (text: string): string | undefined => {
  // Try different patterns
  const patterns = [
    /\b([A-Z][\w&\s]+Bank)\b/i,
    /Your\s+Bank/i,
    /^\s*([A-Z][A-Za-z\s&]+)\s*$/m
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const name = match[1].trim();
      if (name.length > 2 && name.length < 50) {
        return name;
      }
    }
  }
  
  return undefined;
};

const extractAccountNumber = (text: string): string | undefined => {
  const patterns = [
    /Primary Account\s*[:#]?\s*(\d{6,20})/i,
    /Account\s*(?:Number|No\.?|#)\s*[:#]?\s*(\d{6,20})/i,
    /\b(\d{8,20})\b/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  
  return undefined;
};

const extractStatementPeriod = (text: string): string | undefined => {
  // Try format: "Balance at 1 February" to "Balance at 1 March"
  const balanceMatch = text.match(/Balance at\s+(\d{1,2}\s+\w+).*Balance at\s+(\d{1,2}\s+\w+)/is);
  if (balanceMatch) {
    const start = formatDateAlt(balanceMatch[1]);
    const end = formatDateAlt(balanceMatch[2]);
    return `${start} - ${end}`;
  }
  
  // Try traditional format
  const match = text.match(/(\w+\s\d{1,2},\s?\d{4})\s+(?:through|-|to)\s+(\w+\s\d{1,2},\s?\d{4})/i);
  if (match) {
    const start = formatDate(match[1]);
    const end = formatDate(match[2]);
    return `${start} - ${end}`;
  }
  
  return undefined;
};

const formatDateAlt = (str: string): string => {
  const dt = parse(str + ' 2024', 'd MMMM yyyy', new Date());
  return isValid(dt) ? format(dt, 'yyyy-MM-dd') : str;
};

const formatDate = (str: string): string => {
  const dt = parse(str, "MMMM d, yyyy", new Date());
  return isValid(dt) ? format(dt, "yyyy-MM-dd") : str;
};

const extractSummary = (text: string) => {
  // Try pattern 1: "Balance at [date]: £/$ amount" - get all matches
  const balanceMatches = [...text.matchAll(/Balance at\s+\d+\s+\w+[:\s]+[£$]\s*([\d,]+\.?\d*)/gi)];
  const openingMatch1 = balanceMatches.length > 0 ? balanceMatches[0] : null;
  const closingMatch1 = balanceMatches.length > 1 ? balanceMatches[1] : null;
  
  // Try pattern 2: Traditional "Opening Balance" / "Closing Balance"
  const openingMatch2 = text.match(/Opening Balance[^\d]*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i);
  const closingMatch2 = text.match(/Closing Balance(?:\s+\w+)*[^\d$£]*[£$]?([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i);
  
  // Try pattern 3: "Total money in/out"
  const moneyInMatch = text.match(/Total money in[:\s]+[£$]\s*([\d,]+\.?\d*)/i);
  const moneyOutMatch = text.match(/Total money out[:\s]+[£$]\s*([\d,]+\.?\d*)/i);
  
  // Try pattern 4: Traditional "Withdrawals" / "Deposits"
  const withdrawalsMatch = text.match(/Withdrawals[^\d]*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i);
  const depositsMatch = text.match(/Deposits[^\d]*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i);

  const opening = openingMatch1 ? parseAmountFixed(openingMatch1[1]) : 
                  openingMatch2 ? parseAmount(openingMatch2[1]) : 0;
  
  const closing = closingMatch1 ? parseAmountFixed(closingMatch1[1]) : 
                  closingMatch2 ? parseAmount(closingMatch2[1]) : 0;
  
  const deposits = moneyInMatch ? parseAmount(moneyInMatch[1]) :
                   depositsMatch ? parseAmount(depositsMatch[1]) : 0;
  
  const withdrawals = moneyOutMatch ? parseAmount(moneyOutMatch[1]) :
                      withdrawalsMatch ? parseAmount(withdrawalsMatch[1]) : 0;

  return {
    totalCredits: deposits,
    totalDebits: withdrawals,
    openingBalance: opening,
    closingBalance: closing,
  };
};

const extractTransactions = (text: string): Transaction[] => {
  const lines = text.split(/\r?\n/);
  const txns: Transaction[] = [];

  // Find header line (Date Description Money out Money in Balance)
  // Header might be split across two lines
  let headerIndex = lines.findIndex(l => /Date.*Description.*Money.*Balance/i.test(l));
  if (headerIndex === -1) {
    headerIndex = lines.findIndex(l => /Date.*Description/i.test(l));
  }
  if (headerIndex === -1) return [];

  // Estimate column positions from header (may span 2 lines)
  const headerLine = lines[headerIndex];
  const nextLine = lines[headerIndex + 1] || '';
  
  // Find column positions from the second header line ("out   In")
  let moneyOutCol = nextLine.indexOf('out');
  let moneyInCol = nextLine.indexOf('In');
  let balanceCol = headerLine.indexOf('Balance');
  
  // If not found, use typical positions based on the format
  if (moneyOutCol === -1) moneyOutCol = 73;
  if (moneyInCol === -1) moneyInCol = 87;
  if (balanceCol === -1) balanceCol = 101;

  let currentDate = '';

  // Start from headerIndex + 2 to skip the second header line
  const startIndex = /Money.*out.*In/i.test(lines[headerIndex + 1]) ? headerIndex + 2 : headerIndex + 1;
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.length < 10 || /signature|bank$/i.test(line) || /balance brought forward/i.test(line)) continue;

    // Extract date if present
    const dateMatch = line.match(/^\s*(\d{1,2}\s+\w+)/);
    
    // Update current date if found
    if (dateMatch) {
      currentDate = dateMatch[1];
    }
    
    // Skip if we haven't seen any date yet
    if (!currentDate) continue;

    // Extract all amounts with positions (skip the date number)
    const amounts: Array<{value: number, position: number}> = [];
    const dateEndPos = dateMatch ? (dateMatch.index || 0) + dateMatch[0].length : 0;
    
    // Find all numbers after the date (or from start if no date)
    const numberPattern = /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
    let match;
    while ((match = numberPattern.exec(line)) !== null) {
      if ((match.index || 0) > dateEndPos) {
        amounts.push({
          value: parseAmount(match[1]),
          position: match.index || 0
        });
      }
    }

    // If no date and no amounts, it's a continuation line
    if (!dateMatch && amounts.length === 0) {
      if (txns.length > 0) {
        const cleanedLine = line.trim();
        if (cleanedLine) {
          txns[txns.length - 1].description += ' ' + cleanedLine;
        }
      }
      continue;
    }

    // If no amounts at all, skip (or it's just description continuation)
    if (amounts.length === 0) continue;

    // Classify amounts based on column positions
    let moneyOut = null, moneyIn = null, balance = null;
    
    // Sort amounts by position to process left to right
    amounts.sort((a, b) => a.position - b.position);
    
    for (const amt of amounts) {
      const pos = amt.position;
      
      // Determine which column this amount belongs to
      // Use midpoints between columns as boundaries
      const outInBoundary = moneyOutCol + (moneyInCol - moneyOutCol) / 2;
      const inBalanceBoundary = moneyInCol + (balanceCol - moneyInCol) / 2;
      
      if (pos < outInBoundary && !moneyOut) {
        moneyOut = amt.value;
      } else if (pos < inBalanceBoundary && !moneyIn) {
        moneyIn = amt.value;
      } else if (!balance) {
        balance = amt.value;
      }
    }

    // Extract description (between date and first amount, or from start if no date)
    let desc = line.substring(dateEndPos, amounts.length > 0 ? amounts[0].position : line.length).trim();

    // If no description but we have amounts, check next line for description
    if (!desc && (moneyOut || moneyIn) && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      if (nextLine && !/^\s*\d{1,2}\s+\w+/.test(nextLine)) {
        // Next line doesn't start with a date, so it's the description
        // Extract description and check for balance amount
        const nextAmounts: Array<{value: number, position: number}> = [];
        const nextNumberPattern = /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
        let nextMatch;
        while ((nextMatch = nextNumberPattern.exec(nextLine)) !== null) {
          nextAmounts.push({
            value: parseAmount(nextMatch[1]),
            position: nextMatch.index || 0
          });
        }
        
        // Extract description from next line (everything before first amount)
        if (nextAmounts.length > 0) {
          desc = nextLine.substring(0, nextAmounts[0].position).trim();
          // If we don't have a balance yet, use the last amount from next line
          if (!balance && nextAmounts.length > 0) {
            balance = nextAmounts[nextAmounts.length - 1].value;
          }
        } else {
          desc = nextLine.trim();
        }
        i++; // Skip the next line since we consumed it
      }
    }

    // Only add if we have a description and either moneyOut or moneyIn
    if (desc && (moneyOut || moneyIn)) {
      txns.push({
        date: parseTransactionDate(currentDate),
        description: desc,
        amount: moneyOut || moneyIn || 0,
        type: moneyOut ? 'debit' : 'credit',
        balance
      });
    }
  }

  return txns;
};

const parseTransactionLine = (line: string, currentDate: string): Transaction | null => {
  // Skip "Balance brought forward" lines
  if (/balance brought forward/i.test(line)) return null;
  
  // Try to parse different transaction formats
  
  // Format 1: "Date Description MoneyOut MoneyIn Balance"
  // Example: "1 February Card payment-High St Petrol Station 24.50 39,975.50"
  const format1Match = line.match(/^(\d{1,2}\s+\w+|\w{3,9}\s+\d{1,2})/);
  if (format1Match) {
    const [, date, desc, col1, col2] = format1Match;
    const dateStr = date || currentDate;
    const description = desc.trim();
    
    // Determine if col1 is money out or money in based on which has a value
    const val1 = parseAmount(col1);
    const val2 = parseAmount(col2);
    
    if (val1 > 0 && val2 > val1) {
      // col1 is money out (debit), col2 is balance
      return {
        date: parseTransactionDate(dateStr),
        description,
        amount: val1,
        type: 'debit',
        balance: val2
      };
    } else if (val2 > val1) {
      // col1 is money in (credit), col2 is balance
      return {
        date: parseTransactionDate(dateStr),
        description,
        amount: val1,
        type: 'credit',
        balance: val2
      };
    }
  }
  
  // Format 2: "Date Description Amount Balance" (3 columns of numbers)
  const format2Match = line.match(/^(\d{1,2}\s+\w+|\w{3,9}\s+\d{1,2})?\s*(.+?)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s*$/);
  if (format2Match) {
    const [, date, desc, col1, col2, col3] = format2Match;
    const dateStr = date || currentDate;
    const description = desc.trim();
    
    const w = parseAmount(col1);
    const d = parseAmount(col2);
    const bal = parseAmount(col3);
    
    if (d > 0) {
      return {
        date: parseTransactionDate(dateStr),
        description,
        amount: d,
        type: 'credit',
        balance: bal
      };
    } else if (w > 0) {
      return {
        date: parseTransactionDate(dateStr),
        description,
        amount: w,
        type: 'debit',
        balance: bal
      };
    }
  }
  
  // Format 3: Traditional format with 2 numbers
  const format3Match = line.match(/^(\w{3,9}\s+\d{1,2})?\s*(.+?)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s*$/);
  if (format3Match) {
    const [, date, desc, col1, col2] = format3Match;
    const dateStr = date || currentDate;
    const description = desc.trim();
    
    const val1 = parseAmount(col1);
    const val2 = parseAmount(col2);
    
    // Determine type based on keywords or value comparison
    const isCredit = /deposit|payroll|insurance|transfer|payment|salary|job|income/i.test(description);
    const type: 'credit' | 'debit' = isCredit ? 'credit' : 'debit';
    
    return {
      date: parseTransactionDate(dateStr),
      description,
      amount: val1,
      type,
      balance: val2
    };
  }
  
  return null;
};

const extractTransactionsAlternative = (lines: string[]): Transaction[] => {
  const txns: Transaction[] = [];
  let currentDate = '';
  
  for (const line of lines) {
    if (!line || line.length < 5) continue;
    
    const dateMatch = line.match(/^(\d{1,2}\s+\w+|\w{3,9}\s+\d{1,2})/);
    if (dateMatch) {
      currentDate = dateMatch[1];
    }
    
    const transaction = parseTransactionLine(line, currentDate);
    if (transaction) {
      txns.push(transaction);
    }
  }
  
  return txns;
};

const parseTransactionDate = (str: string): string => {
  // Try format: "1 February", "3 February", etc.
  let parsed = parse(str + ' 2024', 'd MMMM yyyy', new Date());
  if (isValid(parsed)) return format(parsed, 'yyyy-MM-dd');
  
  // Try format: "Feb 1", "Mar 3", etc.
  parsed = parse(str + ' 2024', 'MMM d yyyy', new Date());
  if (isValid(parsed)) return format(parsed, 'yyyy-MM-dd');
  
  // Try format: "February 1", "March 3", etc.
  parsed = parse(str + ' 2024', 'MMMM d yyyy', new Date());
  if (isValid(parsed)) return format(parsed, 'yyyy-MM-dd');
  
  return str;
};

const parseAmount = (s: string): number => {
  if (!s) return 0;
  // Remove currency symbols (£, $), spaces, and handle comma/dot separators
  const cleaned = s.replace(/[£$\s]/g, '')
                   .replace(/,/g, '');  // Remove commas used as thousand separators
  return parseFloat(cleaned) || 0;
};

const parseAmountFixed = (s: string): number => {
  if (!s) return 0;
  // Handle cases like "40,000,00" which should be "40,000.00"
  // Also handle "44.079.83" which should be "44,079.83"
  const cleaned = s.replace(/[£$\s]/g, '');
  
  // Pattern 1: "40,000,00" (comma before last 2 digits)
  const malformedComma = /^([\d,]+),([\d]{2})$/;
  if (malformedComma.test(cleaned)) {
    const withoutCommas = cleaned.replace(/,/g, '');
    return parseFloat(withoutCommas.slice(0, -2) + '.' + withoutCommas.slice(-2));
  }
  
  // Pattern 2: "44.079.83" (dots used as both thousand separator and decimal)
  const malformedDot = /^([\d]+)\.([\d]{3})\.([\d]{2})$/;
  if (malformedDot.test(cleaned)) {
    return parseFloat(cleaned.replace(/\./g, '').slice(0, -2) + '.' + cleaned.slice(-2));
  }
  
  // Pattern 3: "44.079" should be "44079" (no decimals)
  const shortDot = /^([\d]+)\.([\d]{3})$/;
  if (shortDot.test(cleaned)) {
    return parseFloat(cleaned.replace(/\./g, ''));
  }
  
  // Otherwise, treat commas as thousand separators and dots as decimal
  return parseFloat(cleaned.replace(/,/g, '')) || 0;
};
