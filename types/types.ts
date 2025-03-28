// types/types.ts
export type AccountType = 'Bank Account' | 'Credit Card' | 'Other';

export interface Account {
  type: AccountType;
  name: string;
  lastFourDigits: string;
  initialBalance: string;
  linkedTo?: string;
}

export interface Transaction {
  id: string;
  message: string;
  lastFourDigits: string;
  type: 'credit' | 'debit';
  amount: number;
  isRead: boolean;
  editableAmount: string; // Required, matches your current definition
  recipient: string; // Required, matches your current definition
  date: string;
}

export interface ExtendedTransaction extends Transaction {
  isApplied: boolean; // Required, default false
  category?: string; // Optional
}

export interface RecentTransaction {
  id: string;
  recipient: string;
  amount: string;
  accountName: string;
  lastFourDigits: string;
  type: "credit" | "debit";
  date: string;
  category?: string; // Optional, added to match TransactionManager
}