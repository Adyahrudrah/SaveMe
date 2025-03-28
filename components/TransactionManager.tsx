import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  Platform,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { request, PERMISSIONS } from "react-native-permissions";
import SmsAndroid from "react-native-get-sms-android";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Account, Transaction } from "../types/types";
import CustomAlert from "./CustomeAlert";
import tw from "twrnc";
import TransactionModal from "./ReviewTransactions";

interface TransactionManagerProps {
  accounts: Account[];
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
  onTransactionSubmit: () => void;
}

interface ExtendedTransaction extends Transaction {
  isApplied?: boolean;
  category?: string;
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
  }, []);

  // useEffect(() => {
  //   const saveMessages = async () => {
  //     await AsyncStorage.setItem("transactions", JSON.stringify(messages));
  //   };
  //   saveMessages();
  // }, [messages]);

  useEffect(() => {
    setUnappliedCount(messages.filter((msg) => !msg.isApplied).length);
  }, [messages]);

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

  const fetchSmsMessages = () => {
    if (Platform.OS === "android") {
      const filter = { box: "inbox" };
      SmsAndroid.list(
        JSON.stringify(filter),
        (fail: string) => {
          setAlertTitle("Error");
          setAlertMessage("Failed to fetch SMS." + fail);
          setAlertVisible(true);
        },
        (_count: string, smsList: string) => {
          const messagesArray = JSON.parse(smsList);
          const processedMessages: ExtendedTransaction[] = messagesArray
            .filter((msg: any): boolean => {
              return msg.address.toUpperCase().includes("HDFC");
            })
            .map((msg: any): ExtendedTransaction => {
              const body: string = msg.body;
              const accountNumbers = accounts.map((acc) => acc.lastFourDigits);
              const lastFourDigitsMatch: RegExpMatchArray | null = body.match(
                new RegExp(accountNumbers.join("|"), "i")
              );
              const lastFourDigits: string = lastFourDigitsMatch
                ? lastFourDigitsMatch[0]
                : "";
              const type: "credit" | "debit" = body.match(/credit|receive/i)
                ? "credit"
                : body.match(/spent|deduct|debit|sent|txn/i)
                ? "debit"
                : "debit";
              const amountMatch: RegExpMatchArray | null =
                body.match(/Rs\.(\d+(\.\d+)?)/);
              const amount: number = amountMatch
                ? parseFloat(amountMatch[1])
                : 0;
              const recipientMatch: RegExpMatchArray | null = body.match(
                /(?:At|To):?\s*([A-Za-z0-9\s]+)/i
              );
              const recipient: string = recipientMatch
                ? recipientMatch[1].trim()
                : "";
              return {
                id: msg._id,
                message: body,
                lastFourDigits,
                type,
                amount,
                isRead: false,
                isApplied: false,
                editableAmount: amount.toFixed(2),
                recipient,
                date: msg.date,
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

  const markAsApplied = (id: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, isApplied: true } : msg))
    );
  };

  const skipCurrentTransaction = async () => {
    const unappliedMessages = messages.filter((msg) => !msg.isApplied);

    if (unappliedMessages.length === 0) {
      setIsModalVisible(false);
      setCurrentIndex(0);
      return;
    }

    const currentId = unappliedMessages[currentIndex].id;

    // Create updated messages first
    const updatedMessages = messages.map((msg) =>
      msg.id === currentId ? { ...msg, isApplied: true } : msg
    );

    // Calculate remaining unapplied messages
    const remainingUnapplied = updatedMessages.filter((msg) => !msg.isApplied);

    // Update state
    setMessages(updatedMessages);

    // Update AsyncStorage
    await AsyncStorage.setItem("transactions", JSON.stringify(updatedMessages));

    // Handle index and modal state
    if (remainingUnapplied.length > 0) {
      // Stay on current index if possible, otherwise reset to 0
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
        msg.id === id ? { ...msg, category: newCategory } : msg
      )
    );
  };

  const updateTransactionType = (id: string, newType: "credit" | "debit") => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, type: newType } : msg))
    );
  };

  const applyTransaction = async (id: string) => {
    const transaction = messages.find((msg) => msg.id === id);
    if (transaction) {
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

      const accountIndex = accounts.findIndex(
        (acc) => acc.lastFourDigits === transaction.lastFourDigits
      );
      if (accountIndex !== -1) {
        const amount = parseFloat(transaction.editableAmount);
        if (!isNaN(amount)) {
          const updatedAccounts = [...accounts];
          updatedAccounts[accountIndex].initialBalance = (
            parseFloat(updatedAccounts[accountIndex].initialBalance) +
            (transaction.type === "credit" ? amount : -amount)
          ).toFixed(2);
          setAccounts(updatedAccounts);
          markAsRead(id);
          markAsApplied(id);

          const recentTransaction = {
            id: transaction.id,
            recipient: handleRecipient(transaction.recipient),
            category: transaction.category,
            amount: transaction.editableAmount,
            accountName: updatedAccounts[accountIndex].name,
            lastFourDigits: transaction.lastFourDigits,
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

          // Save the category if it exists
          if (transaction.category) {
            const updatedCategories = [
              ...new Set([...savedCategories, transaction.category]),
            ].filter(Boolean);
            setSavedCategories(updatedCategories);
          }

          // Save the recipient
          const updatedRecipients = [
            ...new Set([...savedRecipients, transaction.recipient]),
          ].filter(Boolean);
          setSavedRecipients(updatedRecipients);

          onTransactionSubmit();

          setAlertTitle("Success");
          setAlertMessage("Transaction Applied");
          setAlertVisible(true);
          const unappliedMessages = messages.filter((msg) => !msg.isApplied);
          if (unappliedMessages.length > 1) {
            const newIndex =
              currentIndex < unappliedMessages.length - 1 ? currentIndex : 0;
            setCurrentIndex(newIndex);
          } else {
            setIsModalVisible(false);
            setCurrentIndex(0);
          }
        } else {
          setAlertTitle("Error");
          setAlertMessage("Invalid Amount");
          setAlertVisible(true);
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
    updateRecipient(unappliedMessages[currentIndex].id, "");
    textInputRef.current?.focus();
  };

  const unappliedMessages = messages.filter((msg) => !msg.isApplied);

  return (
    <View style={tw`rounded-xl p-1`}>
      <Text style={[tw`text-2xl text-amber-900 mb-2 text-center`, styles.text]}>
        Transaction Manager
      </Text>
      <View style={tw`bg-amber-200 p-2 rounded-xl`}>
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
      </View>

      <TransactionModal
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
