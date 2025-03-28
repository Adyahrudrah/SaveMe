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
  const [linkedTo, setLinkedTo] = useState<string | null>(null);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  const handleTransactionSubmit = () => {
    setRefreshTransactions((prev) => !prev);
  };

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const savedAccounts = await AsyncStorage.getItem("accounts");
        if (savedAccounts) {
          setAccounts(JSON.parse(savedAccounts));
        }
      } catch (error) {
        console.error("Error loading accounts:", error);
      }
    };
    loadAccounts();
  }, []);

  useEffect(() => {
    const saveAccounts = async () => {
      try {
        await AsyncStorage.setItem("accounts", JSON.stringify(accounts));
      } catch (error) {
        console.error("Error saving accounts:", error);
      }
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
    if (!linkedTo && (!initialBalance || isNaN(Number(initialBalance)))) {
      return Alert.alert("Error", "Enter valid balance.");
    }

    const lastFourDigits = accountNumber.slice(-4);
    const primaryAccount = linkedTo
      ? accounts.find((acc) => acc.lastFourDigits === linkedTo)
      : null;

    if (accounts.some((acc) => acc.lastFourDigits === lastFourDigits)) {
      return Alert.alert(
        "Error",
        "Account with these last four digits already exists."
      );
    }

    const newAccount: Account = {
      type: accountType,
      name: accountName.trim(),
      lastFourDigits,
      initialBalance: linkedTo
        ? primaryAccount!.initialBalance
        : initialBalance,
      linkedTo: linkedTo || undefined,
    };
    setAccounts([...accounts, newAccount]);
    setAccountName("");
    setAccountNumber("");
    setInitialBalance("");
    setLinkedTo(null);
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
    updatedAccounts.forEach((acc) => {
      if (acc.linkedTo === updatedAccounts[index].lastFourDigits) {
        acc.initialBalance = newBalance;
      }
    });
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
            setAccounts={setAccounts}
            refreshTransactions={refreshTransactions}
            onTransactionSubmit={handleTransactionSubmit} // Pass callback
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
                accounts={accounts}
                setLinkedTo={setLinkedTo}
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
