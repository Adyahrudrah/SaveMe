// App.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import TransactionManager from "./components/TransactionManager";
import RecentTransactions from "./components/RecentTransactions";
import ManageAccounts from "./components/ManageAccounts";
import AccountsList from "./components/AccountsList";
import { Account, AccountType } from "./types/types";
import Icon from "react-native-vector-icons/Feather";
import tw from "twrnc";
import CustomAlert from "./components/CustomeAlert";

const App: React.FC = () => {
  const [accountType, setAccountType] = useState<AccountType>("Bank Account");
  const [accountName, setAccountName] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [initialBalance, setInitialBalance] = useState<string>("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isMainAccordionOpen, setIsMainAccordionOpen] =
    useState<boolean>(false);
  const [refreshTransactions, setRefreshTransactions] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  const handleTransactionSubmit = () => {
    setRefreshTransactions((prev) => !prev);
  };

  useEffect(() => {
    const loadAccounts = async () => {
      const savedAccounts = await AsyncStorage.getItem("accounts");
      if (savedAccounts) {
        setAccounts(JSON.parse(savedAccounts));
      }
    };
    loadAccounts();
  }, []);

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        // Always create temp accounts
        const tempAccounts: Account[] = [
          {
            type: "Bank Account",
            name: "HDFC",
            lastFourDigits: "2792",
            initialBalance: "5000",
          },
          {
            type: "Bank Account",
            name: "HDFC",
            lastFourDigits: "5914",
            initialBalance: "5000",
          },
        ];

        // Get any existing accounts
        const savedAccounts = await AsyncStorage.getItem("accounts");
        let accountsToSet = tempAccounts;

        if (savedAccounts) {
          const parsedAccounts = JSON.parse(savedAccounts);

          // Only merge if there are accounts that aren't our temp accounts
          if (
            parsedAccounts.some(
              (acc: Account) => !["2792", "5914"].includes(acc.lastFourDigits)
            )
          ) {
            accountsToSet = [
              ...tempAccounts,
              ...parsedAccounts.filter(
                (acc: Account) => !["2792", "5914"].includes(acc.lastFourDigits)
              ),
            ];
          }
        }

        setAccounts(accountsToSet);
        await AsyncStorage.setItem("accounts", JSON.stringify(accountsToSet));
      } catch (error) {
        console.error("Error loading accounts:", error);
      }
    };

    loadAccounts();
  }, []);

  useEffect(() => {
    const saveAccounts = async () => {
      await AsyncStorage.setItem("accounts", JSON.stringify(accounts));
    };
    saveAccounts();
  }, [accounts]);

  const handleAddAccount = () => {
    if (!accountName.trim()) {
      return Alert.alert("Error", "Enter account name.");
    }
    if (accountNumber.length < 4) {
      return Alert.alert("Error", "Enter at least 4 digits.");
    }
    if (!initialBalance || isNaN(Number(initialBalance))) {
      return Alert.alert("Error", "Enter valid balance.");
    }

    const lastFourDigits = accountNumber.slice(-4);
    const newAccount: Account = {
      type: accountType,
      name: accountName.trim(),
      lastFourDigits,
      initialBalance,
    };
    setAccounts([...accounts, newAccount]);
    setAccountName("");
    setAccountNumber("");
    setInitialBalance("");
    setAlertTitle("Success");
    setAlertMessage("Account added!");
    setAlertVisible(true);
  };

  const handleDeleteAccount = (index: number) => {
    setAccounts(accounts.filter((_, i) => i !== index));
    setAlertTitle("Success");
    setAlertMessage("Account deleted!");
    setAlertVisible(true);
  };

  const handleUpdateBalance = (index: number, newBalance: string) => {
    const updatedAccounts = [...accounts];
    updatedAccounts[index].initialBalance = newBalance;
    setAccounts(updatedAccounts);
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#D97706" />
      <ScrollView style={tw`flex-1 bg-amber-600 p-2`}>
        <Text
          style={[tw`text-4xl text-amber-200 mb-5 text-center`, styles.text]}
        >
          SaveMe
        </Text>

        <View style={tw`rounded-2xl flex-1 gap-2 bg-amber-300 p-2 mb-2`}>
          <TransactionManager
            accounts={accounts}
            setAccounts={setAccounts}
            onTransactionSubmit={handleTransactionSubmit}
          />
          <RecentTransactions
            accounts={accounts}
            refreshTransactions={refreshTransactions}
          />
        </View>

        <View>
          <TouchableOpacity
            style={tw`bg-amber-500 p-3 mb-2 rounded-xl flex-row justify-between`}
            onPress={() => setIsMainAccordionOpen(!isMainAccordionOpen)}
          >
            <Text style={[tw`text-amber-900`, styles.text]}>
              Manage Accounts
            </Text>
            <Text style={tw`text-amber-900`}>
              {isMainAccordionOpen ? (
                <Icon name="chevron-up" size={20} color="#92400e" />
              ) : (
                <Icon name="chevron-down" size={20} color="#92400e" />
              )}
            </Text>
          </TouchableOpacity>

          {isMainAccordionOpen && (
            <>
              {accounts.length > 0 && (
                <AccountsList
                  accounts={accounts}
                  onDeleteAccount={handleDeleteAccount}
                  onUpdateBalance={handleUpdateBalance}
                />
              )}
              <ManageAccounts
                accountType={accountType}
                setAccountType={setAccountType}
                accountName={accountName}
                setAccountName={setAccountName}
                accountNumber={accountNumber}
                setAccountNumber={setAccountNumber}
                initialBalance={initialBalance}
                setInitialBalance={setInitialBalance}
                onAddAccount={handleAddAccount}
              />
            </>
          )}
        </View>
      </ScrollView>
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onConfirm={() => setAlertVisible(false)}
        singleButton={true}
      />
    </>
  );
};

const styles = StyleSheet.create({
  text: {
    fontFamily: "VarelaRound-Regular",
  },
});

export default App;
