import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  Platform,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { request, PERMISSIONS } from "react-native-permissions";
import SmsAndroid from "react-native-get-sms-android";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { Account, ExtendedTransaction } from "../types/types"; // Import unified type
import CustomAlert from "./CustomeAlert";
import tw from "twrnc";
import ReviewTransactions from "./ReviewTransactions";

interface TransactionManagerProps {
  accounts: Account[];
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
  onTransactionSubmit: () => void;
}

const TransactionManager: React.FC<TransactionManagerProps> = ({
  accounts,
  setAccounts,
  onTransactionSubmit,
}) => {
  const [messages, setMessages] = useState<ExtendedTransaction[]>([]);
  const [unappliedCount, setUnappliedCount] = useState<number>(0);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [savedRecipients, setSavedRecipients] = useState<string[]>([]);
  const [savedCategories, setSavedCategories] = useState<string[]>([]);
  const textInputRef = useRef<TextInput>(null);

  const [selectedAccount, setSelectedAccount] = useState("");

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  const expenseType = [
    "Food",
    "Entertainment",
    "Clothing",
    "Transport",
    "Utilities",
    "Healthcare",
    "Education",
    "Groceries",
    "Travel",
    "Other",
  ];

  useEffect(() => {
    const loadAndUpdateMessages = async () => {
      const savedMessages = await AsyncStorage.getItem("transactions");
      const savedRecent = await AsyncStorage.getItem("recentTransactions");
      let currentMessages: ExtendedTransaction[] = [];
      if (savedMessages) {
        currentMessages = JSON.parse(savedMessages);
        setMessages(currentMessages);
        setUnappliedCount(
          currentMessages.filter((msg) => !msg.isApplied).length
        );
      }
      if (savedRecent) {
        const recentTransactions = JSON.parse(savedRecent);
        const recipients = [
          ...new Set(recentTransactions.map((t: any) => t.recipient)),
        ].filter(Boolean) as string[];
        setSavedRecipients(recipients);

        const categories = [
          ...new Set(recentTransactions.map((t: any) => t.category)),
        ].filter(Boolean) as string[];
        setSavedCategories(categories);
      }
      requestSmsPermission();
    };
    loadAndUpdateMessages();
  }, [accounts]);

  useEffect(() => {
    setUnappliedCount(messages.filter((msg) => !msg.isApplied).length);
  }, [messages]);

  useEffect(() => {
    setSelectedAccount(
      accounts.length > 0
        ? accounts.find((acc) => acc.manualTransaction)?.lastFourDigits || ""
        : ""
    );
  }, [accounts]);

  const requestSmsPermission = async () => {
    if (Platform.OS === "android") {
      const result = await request(PERMISSIONS.ANDROID.READ_SMS);
      if (result === "granted") {
        fetchSmsMessages();
      } else {
        setAlertTitle("Permission Denied");
        setAlertMessage("SMS permission required.");
        setAlertVisible(true);
      }
    } else {
      Alert.alert("Error", "SMS reading not supported on iOS.");
    }
  };

  const regexFilters = {
    accountNumber: (accountNumbers: string[]) =>
      new RegExp(accountNumbers.join("|"), "i"),
    accountAddress: (accountAddress: string[]) =>
      new RegExp(accountAddress.join("|"), "i"),
    creditType: /credit|receive/i,
    debitType: /spent|deduct|debit|sent|txn/i,
    amount: /(Rs|INR)\.?\s?(\d+(?:,\d+)*(?:\.\d{2})?)/,
    recipient: /(?:At|To):?\s*([A-Za-z0-9\s]+)/i,
  };

  const fetchSmsMessages = () => {
    if (Platform.OS === "android") {
      const filter = { box: "inbox" };
      SmsAndroid.list(
        JSON.stringify(filter),
        (fail: string) => {
          setAlertTitle("Error");
          setAlertMessage("Failed to fetch SMS: " + fail);
          setAlertVisible(true);
        },
        (_count: string, smsList: string) => {
          const messagesArray = JSON.parse(smsList);
          const accountAddresses = accounts.map((acc) => acc.bankAddress);
          const processedMessages: ExtendedTransaction[] = messagesArray
            .filter((msg: any): boolean => {
              return msg.address
                .toUpperCase()
                .match(regexFilters.accountAddress(accountAddresses));
            })
            .map((msg: any): ExtendedTransaction => {
              const body: string = msg.body;
              const accountNumbers = accounts.map((acc) => acc.lastFourDigits);

              const lastFourDigitsMatch: RegExpMatchArray | null = body.match(
                regexFilters.accountNumber(accountNumbers)
              );
              const lastFourDigits: string = lastFourDigitsMatch
                ? lastFourDigitsMatch[0]
                : "";
              const type: "credit" | "debit" = body.match(
                regexFilters.creditType
              )
                ? "credit"
                : body.match(regexFilters.debitType)
                ? "debit"
                : "debit";
              const amountMatch: RegExpMatchArray | null = body.match(
                regexFilters.amount
              );

              const amount: number = amountMatch
                ? parseFloat(amountMatch[2].replace(",", ""))
                : 0;
              const recipientMatch: RegExpMatchArray | null = body.match(
                regexFilters.recipient
              );
              const recipient: string = recipientMatch
                ? recipientMatch[1].trim()
                : ""; // Default to empty string
              return {
                id: msg._id,
                message: body,
                lastFourDigits,
                type,
                amount,
                isRead: false,
                isApplied: false,
                editableAmount: amount.toFixed(2), // Always a string
                recipient,
                date: msg.date,
                category: undefined,
                categoryIcon: "",
              };
            })
            .filter((msg: ExtendedTransaction): boolean =>
              accounts.some((acc) => acc.lastFourDigits === msg.lastFourDigits)
            );

          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMessages = processedMessages.filter(
              (m) => !existingIds.has(m.id)
            );
            const updatedMessages = [...prev, ...newMessages];
            if (newMessages.length > 0) {
              setAlertTitle("Success");
              setAlertMessage(
                `${newMessages.length} new transactions fetched.`
              );
              setAlertVisible(true);
              setCurrentIndex(0);
            }
            return updatedMessages;
          });
        }
      );
    }
  };

  const markAsRead = (id: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, isRead: true } : msg))
    );
  };

  const markAsApplied = async (id: string) => {
    const updatedMessages = messages.map((msg) =>
      msg.id === id ? { ...msg, isApplied: true } : msg
    );
    setMessages(updatedMessages);
    await AsyncStorage.setItem("transactions", JSON.stringify(updatedMessages));
  };

  const skipCurrentTransaction = async () => {
    const unappliedMessages = messages.filter((msg) => !msg.isApplied);
    if (unappliedMessages.length === 0) {
      setIsModalVisible(false);
      setCurrentIndex(0);
      return;
    }

    const currentId = unappliedMessages[currentIndex].id;
    await markAsApplied(currentId);

    const remainingUnapplied = messages.filter((msg) => !msg.isApplied);

    if (remainingUnapplied.length > 0) {
      const newIndex =
        currentIndex < remainingUnapplied.length ? currentIndex : 0;
      setCurrentIndex(newIndex);
    } else {
      setIsModalVisible(false);
      setCurrentIndex(0);
    }

    setAlertTitle("Success");
    setAlertMessage("Transaction skipped.");
    setAlertVisible(true);
  };

  const updateTransactionAmount = (id: string, newAmount: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === id ? { ...msg, editableAmount: newAmount } : msg
      )
    );
  };

  const updateRecipient = (id: string, newRecipient: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === id ? { ...msg, recipient: newRecipient } : msg
      )
    );
  };

  const updateCategory = (id: string, newCategory: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === id ? { ...msg, category: newCategory.trim() } : msg
      )
    );
  };

  const updateTransactionType = (id: string, newType: "credit" | "debit") => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, type: newType } : msg))
    );
  };

  const updateCategoryIcon = (id: string, iconName: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === id ? { ...msg, categoryIcon: iconName } : msg
      )
    );
  };

  const applyTransaction = async (id: string) => {
    const transaction = messages.find((msg) => msg.id === id);
    if (transaction) {
      if (transaction.message === "Manual Entry") {
        const amount = parseFloat(transaction.editableAmount);
        const message = `Manual ${transaction.type}: Rs.${amount.toFixed(
          2
        )} to ${transaction.recipient} for ${transaction.category}`;

        transaction.message = message;
        transaction.amount = amount;
      }

      if (!transaction.recipient.trim()) {
        setAlertTitle("Error");
        setAlertMessage("Recipient is required.");
        setAlertVisible(true);
        return;
      }
      if (!transaction.category?.trim()) {
        setAlertTitle("Error");
        setAlertMessage("Category is required.");
        setAlertVisible(true);
        return;
      }
      const amount = parseFloat(transaction.editableAmount);
      if (!transaction.editableAmount.trim() || isNaN(amount) || amount <= 0) {
        setAlertTitle("Error");
        setAlertMessage("A valid amount is required.");
        setAlertVisible(true);
        return;
      }

      const account = accounts.find(
        (acc) => acc.lastFourDigits === transaction.lastFourDigits
      );
      if (!account) return;

      const primaryAccount = account.linkedTo
        ? accounts.find((acc) => acc.lastFourDigits === account.linkedTo)
        : account;
      const primaryAccountIndex = accounts.findIndex(
        (acc) => acc.lastFourDigits === primaryAccount!.lastFourDigits
      );

      if (primaryAccountIndex !== -1) {
        const updatedAccounts = [...accounts];
        updatedAccounts[primaryAccountIndex].initialBalance = (
          parseFloat(updatedAccounts[primaryAccountIndex].initialBalance) +
          (transaction.type === "credit" ? amount : -amount)
        ).toFixed(2);

        updatedAccounts.forEach((acc) => {
          if (acc.linkedTo === primaryAccount!.lastFourDigits) {
            acc.initialBalance =
              updatedAccounts[primaryAccountIndex].initialBalance;
          }
        });

        setAccounts(updatedAccounts);
        markAsRead(id);
        await markAsApplied(id);

        const recentTransaction = {
          id: transaction.id,
          recipient: handleRecipient(transaction.recipient),
          category: transaction.category,
          categoryIcon: transaction.categoryIcon,
          amount: transaction.editableAmount,
          accountName: primaryAccount!.name,
          lastFourDigits: primaryAccount!.lastFourDigits,
          type: transaction.type,
          date: transaction.date,
        };
        const savedRecent = await AsyncStorage.getItem("recentTransactions");
        const recentTransactions = savedRecent ? JSON.parse(savedRecent) : [];
        recentTransactions.push(recentTransaction);
        await AsyncStorage.setItem(
          "recentTransactions",
          JSON.stringify(recentTransactions)
        );

        if (transaction.category) {
          const updatedCategories = [
            ...new Set([...savedCategories, transaction.category]),
          ].filter(Boolean);
          setSavedCategories(updatedCategories);
        }

        const updatedRecipients = [
          ...new Set([...savedRecipients, transaction.recipient]),
        ].filter(Boolean);
        setSavedRecipients(updatedRecipients);

        onTransactionSubmit();

        setAlertTitle("Success");
        setAlertMessage("Transaction Applied");
        setAlertVisible(true);

        const remainingUnapplied = messages.filter((msg) => !msg.isApplied);
        if (remainingUnapplied.length > 0) {
          const newIndex =
            currentIndex < remainingUnapplied.length - 1 ? currentIndex : 0;
          setCurrentIndex(newIndex);
        } else {
          setIsModalVisible(false);
          setCurrentIndex(0);
        }
      }
    }
  };

  const goToNext = () => {
    const unappliedMessages = messages.filter((msg) => !msg.isApplied);
    if (currentIndex < unappliedMessages.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const openModal = () => {
    const unappliedMessages = messages.filter((msg) => !msg.isApplied);
    if (unappliedMessages.length > 0) {
      setCurrentIndex(0);
      setIsModalVisible(true);
    } else {
      setAlertTitle("Info");
      setAlertMessage("No Transactions");
      setAlertVisible(true);
    }
  };

  const handleFetchNewMessages = () => {
    requestSmsPermission();
  };

  useEffect(() => {
    if (accounts.length > 0) {
      handleFetchNewMessages();
    }
  }, [accounts]);

  const handleRecipient = (val: string) => {
    return val
      .replace(/\d/g, "")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const clearRecipient = () => {
    const unappliedMessages = messages.filter((msg) => !msg.isApplied);
    if (unappliedMessages.length > 0) {
      updateRecipient(unappliedMessages[currentIndex].id, "");
      textInputRef.current?.focus();
    }
  };

  const unappliedMessages = messages.filter((msg) => !msg.isApplied);

  // Update your handleManualEntry function
  const handleManualEntry = () => {
    if (accounts.length === 0) {
      Alert.alert("No Accounts", "Please add accounts first");
      return;
    }

    const newTransaction: ExtendedTransaction = {
      id: `manual-${Date.now()}`,
      message: "Manual Entry",
      lastFourDigits: selectedAccount,
      type: "debit",
      amount: 0,
      isRead: true,
      isApplied: false,
      editableAmount: "",
      recipient: "",
      date: new Date().toISOString(),
      category: undefined,
      categoryIcon: "",
    };

    setMessages((prev) => [...prev, newTransaction]);
    setCurrentIndex(messages.filter((msg) => !msg.isApplied).length);
    setIsModalVisible(true);
  };

  return (
    <View style={tw`rounded-xl p-1`}>
      <Text style={[tw`text-2xl text-amber-900 mb-2 text-center`, styles.text]}>
        Transaction Manager
      </Text>
      <View style={tw`bg-amber-200 p-2 rounded-xl elevation-2`}>
        <Text
          style={[tw`text-lg text-amber-900 mb-5 text-center`, styles.text]}
        >
          {unappliedCount} New Transactions Found.
        </Text>
        <TouchableOpacity
          style={tw`bg-amber-500 p-3 rounded-md`}
          onPress={openModal}
        >
          <Text style={[tw`text-center text-amber-900`, styles.text]}>
            Review Transactions
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            tw`bg-amber-500 p-3 rounded-md mt-2`,
            accounts.length === 0 && tw`opacity-50`,
          ]}
          onPress={handleManualEntry}
          disabled={accounts.length === 0}
        >
          <Text style={[tw`text-center text-amber-900`, styles.text]}>
            <MaterialIcons name="add" /> Manual Transaction
          </Text>
        </TouchableOpacity>
      </View>

      <ReviewTransactions
        isVisible={isModalVisible}
        onClose={() => {
          setIsModalVisible(false);
          setCurrentIndex(0);
        }}
        currentIndex={currentIndex}
        unappliedMessages={unappliedMessages}
        savedRecipients={savedRecipients}
        savedCategories={savedCategories}
        expenseType={expenseType}
        updateRecipient={updateRecipient}
        updateCategory={updateCategory}
        updateCategoryIcon={updateCategoryIcon}
        updateTransactionType={updateTransactionType}
        updateTransactionAmount={updateTransactionAmount}
        applyTransaction={applyTransaction}
        skipCurrentTransaction={skipCurrentTransaction}
        goToPrev={goToPrev}
        goToNext={goToNext}
        clearRecipient={clearRecipient}
        textInputRef={textInputRef}
        handleRecipient={handleRecipient}
      />
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onConfirm={() => setAlertVisible(false)}
        singleButton={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  text: {
    fontFamily: "VarelaRound-Regular",
  },
});

export default TransactionManager;
