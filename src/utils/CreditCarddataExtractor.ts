import { parse, format, isValid, isAfter } from 'date-fns';

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

  const extractedFields = extractSpecificFields(text);
  const accountNumber = extractedFields.cardNumber || extractAccountNumber(text);
  const accountHolder = extractedFields.name || extractAccountHolder(text);
  const bankName = extractBankName(text);
  const statementPeriod = extractStatementPeriod(text);
  const transactions = extractTransactions(text);
  const summary = calculateSummary(transactions);

  const result = {
    accountNumber,
    accountHolder,
    bankName,
    statementPeriod,
    cardNumber: extractedFields.cardNumber,
    expiryDate: extractedFields.expiry,
    transactions,
    summary,
  };

  console.log("\nExtracted Data:\n", JSON.stringify(result, null, 2));
  return result;
};

export const extractCreditCardStatementData = (text: string): ExtractedData => {
  console.log("Full OCR text:\n", text);

  const extractedFields = extractSpecificFields(text);
  const accountHolder = extractedFields.name || extractAccountHolder(text);
  const bankName = extractBankName(text);
  const statementPeriod = extractStatementPeriod(text);
  const transactions = extractTransactions(text);
  const summary = calculateSummary(transactions);

  const result = {
    accountNumber: undefined,
    accountHolder,
    bankName,
    statementPeriod,
    cardNumber: extractedFields.cardNumber,
    expiryDate: extractedFields.expiry,
    transactions,
    summary,
  };

  console.log("\nExtracted Data (Credit Card):\n", JSON.stringify(result, null, 2));
  return result;
};

// Shared helpers below
const extractSpecificFields = (text: string) => {
  const cardNumberMatch = text.match(/\b(?:\d[ -]*?){13,16}\b/);
  const expiryMatch = text.match(/(0[1-9]|1[0-2])\/?([0-9]{2,4})/);
  const nameMatch = text.match(/[A-Z]{2,}(?:\s+[A-Z]{2,})+/);
  const amountMatch = text.match(/\$?\d{1,5}\.\d{2}/);
  const dateMatch = text.match(/\d{2}\/\d{2}\/\d{4}/);

  return {
    cardNumber: cardNumberMatch ? cardNumberMatch[0].replace(/[ -]/g, '') : null,
    expiry: expiryMatch ? expiryMatch[0] : null,
    name: nameMatch ? nameMatch[0] : null,
    amount: amountMatch ? amountMatch[0] : null,
    date: dateMatch ? dateMatch[0] : null
  };
};

const extractAccountNumber = (text: string): string | undefined => {
  const patterns = [
    /account\s*(?:number|no\.?|#)\s*:?\s*([0-9-\s]+)/i,
    /a\/c\s*(?:no\.?|#)\s*:?\s*([0-9-\s]+)/i,
    /account\s*:?\s*([0-9-\s]{8,20})/i,
    /\b([0-9]{8,16})\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].replace(/\s+/g, '').replace(/-+/g, '-');
    }
  }

  return undefined;
};

const extractAccountHolder = (text: string): string | undefined => {
  const patterns = [
    /account\s*holder\s*:?\s*([A-Z][a-zA-Z\s]+)/i,
    /name\s*:?\s*([A-Z][a-zA-Z\s]+)/i,
    /customer\s*:?\s*([A-Z][a-zA-Z\s]+)/i,
    /\b([A-Z]{2,}\s+[A-Z]{2,}(?:\s+[A-Z]{2,})*)\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return undefined;
};

const extractBankName = (text: string): string | undefined => {
  const bankNames = [
    'Chase Bank', 'JPMorgan Chase', 'Bank of America', 'Wells Fargo',
    'Citibank', 'US Bank', 'PNC Bank', 'Capital One', 'TD Bank',
    'Bank of New York Mellon', 'State Street Corporation', 'American Express',
    'Goldman Sachs', 'Morgan Stanley', 'Charles Schwab', 'Ally Bank',
    'HSBC', 'Barclays', 'Deutsche Bank', 'Credit Suisse'
  ];

  const textLower = text.toLowerCase();
  for (const bank of bankNames) {
    if (textLower.includes(bank.toLowerCase())) {
      return bank;
    }
  }

  const bankPatterns = [
    /([A-Z][a-zA-Z\s]+)\s+bank/i,
    /([A-Z][a-zA-Z\s]+)\s+credit\s+union/i,
  ];

  for (const pattern of bankPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim() + ' Bank';
    }
  }

  return undefined;
};

const extractStatementPeriod = (text: string): string | undefined => {
  // Common date formats to try parsing
  const dateFormats = [
    'MM/dd/yyyy',
    'dd-MMM-yyyy',
    'MMMM dd, yyyy',
    'MM-dd-yyyy',
    'dd/MM/yyyy',
    'yyyy-MM-dd',
    'MMM yyyy', // For single-month statements
  ];

  // Regex patterns to find potential date ranges
  const rangePatterns = [
    /(?:statement\s*period|from|period)\s*:?\s*([\w\s,\/-]+?)\s*(?:to|-|through)\s*([\w\s,\/-]+)/i,
    /period\s*:?\s*([\w\s,\/-]+?)\s*-\s*([\w\s,\/-]+)/i,
    /statement\s*period\s*:?\s*([\w\s,\/-]+)$/i, // Single date or month
  ];

  // Try to find a date range
  for (const pattern of rangePatterns) {
    const match = text.match(pattern);
    if (match) {
      let startDateStr = match[1]?.trim();
      let endDateStr = match[2]?.trim() || startDateStr; // Handle single date/month

      // Parse start and end dates
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      for (const fmt of dateFormats) {
        try {
          const parsedStart = parse(startDateStr, fmt, new Date());
          if (isValid(parsedStart)) {
            startDate = parsedStart;
            break;
          }
        } catch {
          // Continue to next format
        }
      }

      for (const fmt of dateFormats) {
        try {
          const parsedEnd = parse(endDateStr, fmt, new Date());
          if (isValid(parsedEnd)) {
            endDate = parsedEnd;
            break;
          }
        } catch {
          // Continue to next format
        }
      }

      // Validate and format the dates
      if (startDate && isValid(startDate) && endDate && isValid(endDate)) {
        // Ensure startDate is before or equal to endDate
        if (isAfter(startDate, endDate)) {
          [startDate, endDate] = [endDate, startDate]; // Swap if out of order
        }
        return `${format(startDate, 'MM/dd/yyyy')} - ${format(endDate, 'MM/dd/yyyy')}`;
      } else if (startDate && isValid(startDate)) {
        // Handle single date/month (e.g., "January 2025")
        return format(startDate, 'MM/dd/yyyy');
      }
    }
  }

  // Fallback: Try to find any two valid dates in the text
  const datePattern = /\b(\d{1,2}\/\d{1,2}\/\d{2,4}|[A-Za-z]+\s+\d{1,2},\s+\d{4}|\d{1,2}-[A-Za-z]{3}-\d{2,4})\b/g;
  const dates = text.match(datePattern);
  if (dates && dates.length >= 2) {
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    for (const dateStr of dates) {
      for (const fmt of dateFormats) {
        try {
          const parsed = parse(dateStr, fmt, new Date());
          if (isValid(parsed)) {
            if (!startDate) {
              startDate = parsed;
            } else if (!endDate && isAfter(parsed, startDate)) {
              endDate = parsed;
            }
          }
        } catch {
          // Continue to next format
        }
      }
    }

    if (startDate && endDate) {
      return `${format(startDate, 'MM/dd/yyyy')} - ${format(endDate, 'MM/dd/yyyy')}`;
    }
  }

  return undefined;
};

const extractTransactions = (text: string): Transaction[] => {
  const transactions: Transaction[] = [];
  const lines = text.split('\n').filter(line => line.trim());

  const transactionPatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})\s*([+-]?)\s*(?:([\d,]+\.\d{2}))?/,
    /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+(debit|credit)\s+([\d,]+\.\d{2})/i,
    /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+\$?([\d,]+\.\d{2})/,
  ];

  for (const line of lines) {
    for (const pattern of transactionPatterns) {
      const match = line.match(pattern);
      if (match) {
        let date, description, amount, type, balance;

        if (pattern === transactionPatterns[1]) {
          [, date, description, type, amount] = match;
          type = type.toLowerCase() as 'credit' | 'debit';
        } else {
          [, date, description, amount, , balance] = match;
          type = determineTransactionType(description, amount);
        }

        const numericAmount = parseFloat(amount.replace(/[,$]/g, ''));
        const numericBalance = balance ? parseFloat(balance.replace(/[,$]/g, '')) : undefined;

        transactions.push({
          date,
          description: description.trim(),
          amount: numericAmount,
          type,
          balance: numericBalance,
        });
        break;
      }
    }
  }

  return transactions;
};

const determineTransactionType = (description: string, amount: string): 'credit' | 'debit' => {
  const desc = description.toLowerCase();
  const creditKeywords = ['deposit', 'credit', 'payment received', 'refund', 'interest', 'dividend'];
  const debitKeywords = ['withdrawal', 'debit', 'payment', 'fee', 'charge', 'purchase', 'atm'];

  if (creditKeywords.some(keyword => desc.includes(keyword))) {
    return 'credit';
  }
  if (debitKeywords.some(keyword => desc.includes(keyword))) {
    return 'debit';
  }
  if (amount.includes('-')) {
    return 'debit';
  }
  return 'debit';
};

const calculateSummary = (transactions: Transaction[]) => {
  const totalCredits = transactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDebits = transactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  const openingBalance = transactions.length > 0 ?
    (transactions[0].balance || 0) - (transactions[0].type === 'credit' ? transactions[0].amount : -transactions[0].amount) : 0;

  const closingBalance = transactions.length > 0 ?
    transactions[transactions.length - 1].balance || 0 : 0;

  return {
    totalCredits,
    totalDebits,
    openingBalance,
    closingBalance,
  };
};