import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { Account } from "../types/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/Feather";
import SpendingForecast from "./SpendingForcast";
import tw from "twrnc";
import CustomAlert from "./CustomeAlert";

interface RecentTransaction {
  id: string;
  recipient: string;
  category?: string;
  amount: string;
  accountName: string;
  lastFourDigits: string;
  type: "credit" | "debit";
  date: string;
}

interface RecentTransactionsProps {
  accounts: Account[];
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
  refreshTransactions?: boolean;
  onTransactionSubmit?: () => void; // Add callback to trigger refresh
}

const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  accounts,
  setAccounts,
  refreshTransactions,
  onTransactionSubmit, // Destructure callback
}) => {
  const [recentTransactions, setRecentTransactions] = useState<
    RecentTransaction[]
  >([]);
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<
    "all" | "daily" | "monthly" | "yearly"
  >("all");
  const [recipientFilter, setRecipientFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [showForecast, setShowForecast] = useState<boolean>(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  useEffect(() => {
    const loadRecentTransactions = async () => {
      const savedRecent = await AsyncStorage.getItem("recentTransactions");
      if (savedRecent) {
        setRecentTransactions(JSON.parse(savedRecent));
      }
    };
    loadRecentTransactions();
  }, [accounts, refreshTransactions]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const filterTransactions = (transactions: RecentTransaction[]) => {
    const now = new Date();
    let filtered = transactions.filter((tx) => {
      const txDate = new Date(tx.date);
      if (timeFilter === "all") return true;
      if (timeFilter === "daily") {
        return (
          txDate.getDate() === now.getDate() &&
          txDate.getMonth() === now.getMonth() &&
          txDate.getFullYear() === now.getFullYear()
        );
      }
      if (timeFilter === "monthly") {
        return (
          txDate.getMonth() === now.getMonth() &&
          txDate.getFullYear() === now.getFullYear()
        );
      }
      if (timeFilter === "yearly") {
        return txDate.getFullYear() === now.getFullYear();
      }
      return true;
    });

    if (recipientFilter) {
      filtered = filtered.filter((tx) =>
        tx.recipient.toLowerCase().includes(recipientFilter.toLowerCase())
      );
    }
    if (categoryFilter) {
      filtered = filtered.filter(
        (tx) => tx.category?.toLowerCase() === categoryFilter.toLowerCase()
      );
    }
    return filtered;
  };

  const calculateTotals = (transactions: RecentTransaction[]) => {
    return transactions.reduce(
      (acc, tx) => {
        const amount = parseFloat(tx.amount);
        if (tx.type === "credit") {
          acc.credit += amount;
          acc.creditCount += 1;
        } else {
          acc.debit += amount;
          acc.debitCount += 1;
        }
        return acc;
      },
      { credit: 0, debit: 0, creditCount: 0, debitCount: 0 }
    );
  };

  const uniqueCategories = Array.from(
    new Set(recentTransactions.map((tx) => tx.category).filter(Boolean))
  ) as string[];

  const transactionsByAccount = accounts.reduce((acc, account) => {
    const accountKey = `${account.name} ${account.type} - ${account.lastFourDigits}`;
    acc[accountKey] = filterTransactions(
      recentTransactions.filter(
        (tx) => tx.lastFourDigits === account.lastFourDigits
      )
    );
    return acc;
  }, {} as Record<string, RecentTransaction[]>);

  const toggleAccordion = (accountKey: string) => {
    setExpandedAccount(expandedAccount === accountKey ? null : accountKey);
  };

  const deleteTransaction = async (id: string) => {
    try {
      const transaction = recentTransactions.find((tx) => tx.id === id);
      if (!transaction) throw new Error("Transaction not found");

      const updatedRecentTransactions = recentTransactions.filter(
        (tx) => tx.id !== id
      );
      setRecentTransactions(updatedRecentTransactions);
      await AsyncStorage.setItem(
        "recentTransactions",
        JSON.stringify(updatedRecentTransactions)
      );

      const savedMessages = await AsyncStorage.getItem("transactions");
      if (savedMessages) {
        const transactions = JSON.parse(savedMessages);
        const updatedTransactions = transactions.map((tx: any) =>
          tx.id === id ? { ...tx, isRead: false, isApplied: false } : tx
        );
        await AsyncStorage.setItem(
          "transactions",
          JSON.stringify(updatedTransactions)
        );
      }

      const account = accounts.find(
        (acc) => acc.lastFourDigits === transaction.lastFourDigits
      );
      if (account) {
        const primaryAccount = account.linkedTo
          ? accounts.find((acc) => acc.lastFourDigits === account.linkedTo)
          : account;
        const primaryAccountIndex = accounts.findIndex(
          (acc) => acc.lastFourDigits === primaryAccount!.lastFourDigits
        );

        if (primaryAccountIndex !== -1) {
          const amount = parseFloat(transaction.amount);
          const updatedAccounts = [...accounts];
          updatedAccounts[primaryAccountIndex].initialBalance = (
            parseFloat(updatedAccounts[primaryAccountIndex].initialBalance) +
            (transaction.type === "credit" ? -amount : amount)
          ).toFixed(2);

          updatedAccounts.forEach((acc) => {
            if (acc.linkedTo === primaryAccount!.lastFourDigits) {
              acc.initialBalance =
                updatedAccounts[primaryAccountIndex].initialBalance;
            }
          });

          setAccounts(updatedAccounts);
        }
      }

      if (onTransactionSubmit) onTransactionSubmit(); // Trigger refresh in TransactionManager

      setAlertTitle("Success");
      setAlertMessage("Transaction deleted and balance updated");
      setAlertVisible(true);
    } catch (error) {
      setAlertTitle("Error");
      setAlertMessage("Failed to delete transaction: " + error);
      setAlertVisible(true);
    }
  };

  return (
    <ScrollView style={tw`p-1 rounded-xl`}>
      <Text style={[tw`text-2xl text-amber-900 mb-2 text-center`, styles.text]}>
        Recent Transactions
      </Text>

      <View style={tw`flex-row justify-around mb-3`}>
        {["all", "daily", "monthly", "yearly"].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              tw`px-3 py-1 rounded-lg`,
              timeFilter === filter ? tw`bg-amber-500` : tw`bg-amber-300`,
            ]}
            onPress={() =>
              setTimeFilter(filter as "all" | "daily" | "monthly" | "yearly")
            }
          >
            <Text style={[tw`text-amber-900`, styles.text]}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={[
          tw`bg-amber-100 p-2 rounded-lg mb-3 text-amber-900`,
          styles.text,
        ]}
        placeholder="Filter by recipient..."
        value={recipientFilter}
        placeholderTextColor="#92400e"
        onChangeText={setRecipientFilter}
      />

      <View style={tw`mb-2`}>
        <View style={tw`flex-row justify-between flex-wrap mb-2`}>
          <TouchableOpacity
            style={[
              tw`px-3 py-1 rounded-lg m-1`,
              categoryFilter === "" ? tw`bg-amber-500` : tw`bg-amber-300`,
            ]}
            onPress={() => setCategoryFilter("")}
          >
            <Text style={[tw`text-amber-900`, styles.text]}>All</Text>
          </TouchableOpacity>
          {uniqueCategories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                tw`px-3 py-1 rounded-lg m-1`,
                categoryFilter === category
                  ? tw`bg-amber-500`
                  : tw`bg-amber-300`,
              ]}
              onPress={() => setCategoryFilter(category)}
            >
              <Text style={[tw`text-amber-900`, styles.text]}>{category}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={tw`bg-amber-200 p-2 rounded-xl flex-1 gap-2 mb-2`}>
        <TouchableOpacity
          style={tw`bg-amber-500 p-3 rounded-lg flex-row justify-between`}
          onPress={() => setShowForecast(!showForecast)}
        >
          <Icon name="trello" size={20} color="#92400e" />
          <Text style={[tw`text-amber-900`, styles.text]}>
            Spending Forecast
          </Text>
          <Icon
            name={showForecast ? "chevron-up" : "chevron-down"}
            size={20}
            color="#92400e"
          />
        </TouchableOpacity>

        {showForecast && <SpendingForecast transactions={recentTransactions} />}
      </View>

      <View style={tw`bg-amber-200 p-2 rounded-xl flex-1 gap-2`}>
        {accounts.length === 0 ? (
          <Text style={[tw`text-amber-900 text-center`, styles.text]}>
            No accounts available.
          </Text>
        ) : Object.keys(transactionsByAccount).length === 0 ? (
          <Text style={[tw`text-amber-900 text-center`, styles.text]}>
            No transactions for this period.
          </Text>
        ) : (
          Object.entries(transactionsByAccount).map(
            ([accountKey, transactions]) => {
              const totals = calculateTotals(transactions);
              return (
                <View key={accountKey}>
                  <TouchableOpacity
                    style={tw`bg-amber-500 p-3 rounded-lg flex-row justify-between`}
                    onPress={() => toggleAccordion(accountKey)}
                  >
                    <Icon name="credit-card" size={20} color="#92400e" />
                    <Text style={[tw`text-amber-900`, styles.text]}>
                      {accountKey}
                    </Text>
                    <Icon
                      name={
                        expandedAccount === accountKey
                          ? "chevron-up"
                          : "chevron-down"
                      }
                      size={20}
                      color="#92400e"
                    />
                  </TouchableOpacity>
                  {expandedAccount === accountKey && (
                    <View style={tw`bg-amber-100 p-3 rounded-lg mt-2`}>
                      <View style={tw`mb-2 flex-row justify-between`}>
                        <Text style={[tw`text-green-500`, styles.text]}>
                          + Rs.{" "}
                          {totals.credit.toFixed(2) +
                            ` (${totals.creditCount})`}
                        </Text>
                        <Text style={[tw`text-red-500`, styles.text]}>
                          - Rs.{" "}
                          {totals.debit.toFixed(2) + ` (${totals.debitCount})`}
                        </Text>
                      </View>
                      {transactions.map((tx) => (
                        <View
                          key={tx.id}
                          style={tw`border-b border-dashed border-amber-500 py-2 pt-6`}
                        >
                          <View
                            style={tw`flex-row justify-between items-center`}
                          >
                            <Text
                              style={[
                                tw`text-sm`,
                                tx.type === "credit"
                                  ? tw`text-green-500`
                                  : tw`text-red-500`,
                                styles.text,
                              ]}
                            >
                              {tx.type === "credit" ? "+" : "-"} Rs.{" "}
                              {tx.amount.split(".").map((a, _) =>
                                _ === 0 ? (
                                  <Text key={_} style={[tw`text-xl`]}>
                                    {a}
                                  </Text>
                                ) : (
                                  <Text key={_} style={[tw`text-xs`]}>
                                    .{a}
                                  </Text>
                                )
                              )}
                            </Text>
                            <Text
                              style={[tw`text-amber-900 text-xs`, styles.date]}
                            >
                              {formatDate(tx.date)}
                            </Text>
                          </View>
                          <View
                            style={tw`flex-row justify-between items-center`}
                          >
                            <Text
                              style={[tw`text-amber-900 text-xs`, styles.text]}
                            >
                              {tx.recipient}
                            </Text>
                            {tx.category && (
                              <View
                                style={tw`bg-amber-500/20 px-2 py-1 rounded-full`}
                              >
                                <Text
                                  style={[
                                    tw`text-amber-900 text-xs`,
                                    styles.text,
                                  ]}
                                >
                                  {tx.category}
                                </Text>
                              </View>
                            )}
                          </View>

                          {tx.id && (
                            <TouchableOpacity
                              onPress={() => deleteTransaction(tx.id)}
                              style={tw`absolute top-1 right-1`}
                            >
                              <Icon name="trash-2" size={16} color="#92400e" />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            }
          )
        )}
      </View>
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onConfirm={() => setAlertVisible(false)}
        singleButton={true}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  text: {
    fontFamily: "VarelaRound-Regular",
  },
  date: {
    fontSize: 9,
    fontFamily: "VarelaRound-Regular",
  },
});

export default RecentTransactions;
