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
  // Try pattern 1: "Balance at [date]: £/$ amount" - get all matches with improved number pattern
  const balanceMatches = [...text.matchAll(/Balance at\s+\d+\s+\w+[:\s]+[£$]?\s*([\d,\.]+)/gi)];
  const openingMatch1 = balanceMatches.length > 0 ? balanceMatches[0] : null;
  const closingMatch1 = balanceMatches.length > 1 ? balanceMatches[1] : null;
  
  // Try pattern 2: Traditional "Opening Balance" / "Closing Balance"
  const openingMatch2 = text.match(/Opening Balance[^\d]*([\d,\.]+)/i);
  const closingMatch2 = text.match(/Closing Balance(?:\s+\w+)*[^\d$£]*[£$]?\s*([\d,\.]+)/i);
  
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

    // Extract all amounts with positions (skip the date number if present)
    const amounts: Array<{value: number, position: number}> = [];
    const dateEndPos = dateMatch ? (dateMatch.index || 0) + dateMatch[0].length : 0;
    
    // Find all numbers after the date - support various formats with commas and dots
    // Matches: 123.45, 1,234.56, 1.234,56, 44.079.83, 40,000,00, etc.
    // Exclude time patterns (HH:MM)
    const numberPattern = /([\d]{1,3}(?:[,\.][\d]{3})*(?:[,\.][\d]{1,2})?)/g;
    let match;
    while ((match = numberPattern.exec(line)) !== null) {
      const matchPos = match.index || 0;
      const matchStr = match[1];
      
      // Skip if this looks like a time (preceded by digits and colon)
      const beforeMatch = line.substring(Math.max(0, matchPos - 3), matchPos);
      if (/\d+:$/.test(beforeMatch)) continue; // Skip minutes in HH:MM
      
      // Skip if this is followed by a colon (hours in HH:MM)
      const afterMatch = line.substring(matchPos + matchStr.length, matchPos + matchStr.length + 1);
      if (afterMatch === ':') continue;
      
      if (matchPos > dateEndPos) {
        amounts.push({
          value: parseAmount(matchStr),
          position: matchPos
        });
      }
    }

    // Check if amounts exist and classify them first
    if (amounts.length === 0) {
      // No amounts found - check if this line has a new date
      if (!dateMatch) {
        // No date, no amounts → continuation line
        if (txns.length > 0) {
          const cleanedLine = line.trim();
          if (cleanedLine) {
            txns[txns.length - 1].description += ' ' + cleanedLine;
          }
        }
        continue;
      }
      // Has a date but no amounts → might be a transaction where description/balance is on next line
      // Continue processing to check next line
    }

    // Classify amounts based on column positions
    let moneyOut = null, moneyIn = null, balance = null;
    
    // Sort amounts by position to process left to right
    amounts.sort((a, b) => a.position - b.position);
    
    // Balance must be in the rightmost position and reasonably close to the balance column
    // Use a threshold: balance should be at least 80% of the way to the expected balance column
    const minBalancePosition = balanceCol * 0.8;
    
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
      } else if (pos >= minBalancePosition && !balance) {
        // Only accept as balance if it's far enough to the right
        balance = amt.value;
      }
    }

    // Extract description (between date and first amount, or from start if no date)
    let desc = line.substring(dateEndPos, amounts.length > 0 ? amounts[0].position : line.length).trim();

    // KEY RULE: If there's no balance AND no new date, this is a continuation line
    // But if there's a NEW date (dateMatch), it's the start of a new transaction even without balance yet
    if (!balance && !dateMatch) {
      if (txns.length > 0) {
        // Append the description and any visible amounts to the previous transaction
        const cleanedLine = line.trim();
        if (cleanedLine) {
          txns[txns.length - 1].description += ' ' + cleanedLine;
        }
      }
      continue;
    }

    // If no description or no balance, check next line
    if (((!desc && (moneyOut || moneyIn)) || !balance) && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      // Only check next line if it doesn't start with a new date
      if (nextLine && !/^\s*\d{1,2}\s+\w+/.test(nextLine)) {
        // Next line doesn't start with a date, so it contains description and/or balance
        const nextAmounts: Array<{value: number, position: number}> = [];
        const nextNumberPattern = /([\d]{1,3}(?:[,\.][\d]{3})*(?:[,\.][\d]{1,2})?)/g;
        let nextMatch;
        while ((nextMatch = nextNumberPattern.exec(nextLine)) !== null) {
          const matchPos = nextMatch.index || 0;
          const matchStr = nextMatch[1];
          
          // Skip time patterns
          const beforeMatch = nextLine.substring(Math.max(0, matchPos - 3), matchPos);
          if (/\d+:$/.test(beforeMatch)) continue;
          const afterMatch = nextLine.substring(matchPos + matchStr.length, matchPos + matchStr.length + 1);
          if (afterMatch === ':') continue;
          
          nextAmounts.push({
            value: parseAmount(matchStr),
            position: matchPos
          });
        }
        
        // Extract description from next line if we don't have one
        if (!desc && nextAmounts.length > 0) {
          desc = nextLine.substring(0, nextAmounts[0].position).trim();
        } else if (!desc) {
          desc = nextLine.trim();
        }
        
        // Look for balance on next line if we don't have one
        if (!balance && nextAmounts.length > 0) {
          // Check for balance in rightmost position
          const rightmostAmt = nextAmounts[nextAmounts.length - 1];
          if (rightmostAmt.position >= minBalancePosition) {
            balance = rightmostAmt.value;
          }
          
          // Also check for money in/out if we don't have them yet
          if (!moneyOut && !moneyIn && nextAmounts.length > 1) {
            // First amount might be money out/in, last is balance
            const firstAmt = nextAmounts[0];
            if (firstAmt.position < minBalancePosition) {
              if (firstAmt.position < (moneyOutCol + moneyInCol) / 2) {
                moneyOut = firstAmt.value;
              } else {
                moneyIn = firstAmt.value;
              }
            }
          }
        }
        
        i++; // Skip the next line since we consumed it
      }
    }

    // Only add transaction if we have a valid transaction:
    // Must have: balance, description, and (moneyOut or moneyIn)
    if (balance && desc && (moneyOut || moneyIn)) {
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
  const format2Match = line.match(/^(\d{1,2}\s+\w+|\w{3,9}\s+\d{1,2})?\s*(.+?)\s+([\d,\.]+)\s+([\d,\.]+)\s+([\d,\.]+)\s*$/);
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
  const format3Match = line.match(/^(\w{3,9}\s+\d{1,2})?\s*(.+?)\s+([\d,\.]+)\s+([\d,\.]+)\s*$/);
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
  // Remove currency symbols (£, $), spaces
  let cleaned = s.replace(/[£$\s]/g, '');
  
  // Handle various formats:
  // UK/US: 42,500.50 (comma=thousand, dot=decimal)
  // European: 42.500,50 (dot=thousand, comma=decimal)
  
  const dotCount = (cleaned.match(/\./g) || []).length;
  const commaCount = (cleaned.match(/,/g) || []).length;
  
  // If both separators present, the one that appears LAST is typically the decimal
  if (dotCount >= 1 && commaCount >= 1) {
    const lastDotPos = cleaned.lastIndexOf('.');
    const lastCommaPos = cleaned.lastIndexOf(',');
    
    if (lastDotPos > lastCommaPos) {
      // Dot comes after comma → UK/US format (42,500.50)
      // Remove commas, keep dots
      cleaned = cleaned.replace(/,/g, '');
    } else {
      // Comma comes after dot → European format (42.500,50)
      // Remove dots, replace comma with dot
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    }
  } else if (dotCount > 1) {
    // Multiple dots, no commas → dots are thousand separators (European style)
    // E.g., 44.079.83 → 44079.83
    cleaned = cleaned.replace(/\./g, '');
  } else if (commaCount > 1) {
    // Multiple commas, no dots → commas are thousand separators
    cleaned = cleaned.replace(/,/g, '');
  } else if (commaCount === 1 && dotCount === 0) {
    // Single comma, no dot → check if decimal or thousand
    // If 2 digits after comma, it's decimal; otherwise thousand
    const parts = cleaned.split(',');
    if (parts[1] && parts[1].length === 2) {
      cleaned = cleaned.replace(',', '.'); // Decimal (European)
    } else {
      cleaned = cleaned.replace(',', ''); // Thousand separator
    }
  }
  // else: single dot or no separators → already in correct format
  
  return parseFloat(cleaned) || 0;
};

const parseAmountFixed = (s: string): number => {
  if (!s) return 0;
  // Handle cases like "40,000,00" which should be "40,000.00"
  // Also handle "44.079.83" which should be "44,079.83"
  let cleaned = s.replace(/[£$\s]/g, '');
  
  // Pattern 1: "40,000,00" (commas as thousand sep, comma before last 2 digits as decimal)
  // Example: 40,000,00 -> 40000.00
  if (/^[\d,]+,[\d]{2}$/.test(cleaned)) {
    const allDigits = cleaned.replace(/,/g, '');
    return parseFloat(allDigits.slice(0, -2) + '.' + allDigits.slice(-2));
  }
  
  // Pattern 2: "44.079.83" (dots as thousand sep and decimal)
  // Last 2 digits after final separator are decimals
  if (/^[\d\.]+\.[\d]{2}$/.test(cleaned) && (cleaned.match(/\./g) || []).length > 1) {
    const allDigits = cleaned.replace(/\./g, '');
    return parseFloat(allDigits.slice(0, -2) + '.' + allDigits.slice(-2));
  }
  
  // Pattern 3: Mixed separators - use the last one as decimal point
  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');
  
  if (lastDot > lastComma && lastDot > 0) {
    // Dot is decimal point
    const beforeDot = cleaned.substring(0, lastDot).replace(/[,\.]/g, '');
    const afterDot = cleaned.substring(lastDot + 1);
    return parseFloat(beforeDot + '.' + afterDot);
  } else if (lastComma > lastDot && lastComma > 0) {
    // Comma is decimal point
    const beforeComma = cleaned.substring(0, lastComma).replace(/[,\.]/g, '');
    const afterComma = cleaned.substring(lastComma + 1);
    return parseFloat(beforeComma + '.' + afterComma);
  }
  
  // Default: remove all separators
  return parseFloat(cleaned.replace(/[,\.]/g, '')) || 0;
};
