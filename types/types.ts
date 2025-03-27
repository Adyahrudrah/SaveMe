export type AccountType = 'Bank Account' | 'Credit Card' | 'Other';

export interface Account {
  type: AccountType;
  name: string;
  lastFourDigits: string;
  initialBalance: string;
}

export interface Transaction {
  id: string;
  message: string;
  lastFourDigits: string;
  type: 'credit' | 'debit';
  amount: number;
  isRead: boolean;
  editableAmount: string;
  recipient: string;
  date: string;
}


export interface RecentTransaction {
  id: string;
  recipient: string;
  amount: string;
  accountName: string;
  lastFourDigits: string;
  type: "credit" | "debit";
  date: string;
}