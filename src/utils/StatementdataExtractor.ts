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
  const bankPattern = /^([A-Z][\w\s]+BANK)/im;
  const match = text.match(bankPattern);
  return match?.[1]?.trim();
};

const extractAccountNumber = (text: string): string | undefined => {
  const match = text.match(/Primary Account\s*[:#]?\s*(\d{6,20})/i);
  return match?.[1];
};

const extractStatementPeriod = (text: string): string | undefined => {
  const match = text.match(/(\w+\s\d{1,2},\s?\d{4})\s+(?:through|-|to)\s+(\w+\s\d{1,2},\s?\d{4})/i);
  if (match) {
    const start = formatDate(match[1]);
    const end = formatDate(match[2]);
    return `${start} - ${end}`;
  }
  return undefined;
};

const formatDate = (str: string): string => {
  const dt = parse(str, "MMMM d, yyyy", new Date());
  return isValid(dt) ? format(dt, "yyyy-MM-dd") : str;
};

const extractSummary = (text: string) => {
  const openingMatch = text.match(/Opening Balance[^\d]*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i);
  const closingMatch = text.match(/Closing Balance(?:\s+\w+)*[^\d$]*\$([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i);
  const withdrawalsMatch = text.match(/Withdrawals[^\d]*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i);
  const depositsMatch = text.match(/Deposits[^\d]*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i);

  const opening = openingMatch ? parseAmount(openingMatch[1]) : 0;
  const closing = closingMatch ? parseAmount(closingMatch[1]) : 0;
  const withdrawals = withdrawalsMatch ? parseAmount(withdrawalsMatch[1]) : 0;
  const deposits = depositsMatch ? parseAmount(depositsMatch[1]) : 0;

  return {
    totalCredits: deposits,
    totalDebits: withdrawals,
    openingBalance: opening,
    closingBalance: closing,
  };
};

const extractTransactions = (text: string): Transaction[] => {
  const lines = text.split(/\r?\n/).map(l => l.trim());
  const txns: Transaction[] = [];

  const headerIndex = lines.findIndex(l => /Your Transaction Details/i.test(l));
  if (headerIndex === -1) return [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!/^\w{3,9}\s\d{1,2}/.test(line)) continue; // skip non-transaction lines

    const parts = line.split(/\s{2,}/); // split by 2 or more spaces
    if (parts.length < 2) continue;

    const [dateStr, desc, col3, col4, col5] = parts;
    const formattedDate = parseTransactionDate(dateStr);
    const description = desc.trim();

    let type: 'credit' | 'debit' | null = null;
    let amount: number | null = null;
    let balance: number | undefined;

    // Logic to detect where amount is
    if (col3 && !col4 && !col5) {
      // Only one column → can't determine type
      continue;
    } else if (col3 && col4 && !col5) {
      // Either withdrawal + balance or deposit + balance
      const val1 = parseAmount(col3);
      const val2 = parseAmount(col4);

      if (description.toLowerCase().includes('deposit') || description.toLowerCase().includes('payroll') || description.toLowerCase().includes('insurance') || description.toLowerCase().includes('transfer')) {
        type = 'credit';
        amount = val1;
        balance = val2;
      } else {
        type = 'debit';
        amount = val1;
        balance = val2;
      }
    } else if (col3 && col4 && col5) {
      const w = parseAmount(col3);
      const d = parseAmount(col4);
      amount = d || w;
      type = d ? 'credit' : 'debit';
      balance = parseAmount(col5);
    }

    if (type && amount !== null) {
      txns.push({
        date: formattedDate,
        description,
        amount,
        type,
        balance,
      });
    }
  }

  return txns;
};


const parseTransactionDate = (str: string): string => {
  const parsed = parse(str + ' 2018', 'MMM d yyyy', new Date());
  return isValid(parsed) ? format(parsed, 'yyyy-MM-dd') : str;
};

const parseAmount = (s: string): number => {
  if (!s) return 0;
  const cleaned = s.replace(/[,.](?=\d{3})/g, '').replace(/,/g, '').replace(/\$/g, '');
  return parseFloat(cleaned);
};
