// components/AccountsList.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  Alert,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from "react-native";
import { Account } from "../types/types";
import Icon from "react-native-vector-icons/Feather";

import tw from "twrnc";

interface AccountsListProps {
  accounts: Account[];
  onDeleteAccount: (index: number) => void;
  onUpdateBalance: (index: number, newBalance: string) => void;
  onTogglePrimary: (index: number) => void; // Add this
}

const AccountsList: React.FC<AccountsListProps> = ({
  accounts,
  onDeleteAccount,
  onUpdateBalance,
  onTogglePrimary,
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedBalance, setEditedBalance] = useState<string>("");

  const togglePrimaryAccount = (index: number) => {
    onTogglePrimary(index);
  };

  const startEditingBalance = (index: number, balance: string) => {
    setEditingIndex(index);
    setEditedBalance(balance);
  };

  const saveEditedBalance = (index: number) => {
    if (!editedBalance || isNaN(Number(editedBalance))) {
      return Alert.alert("Error", "Enter valid balance.");
    }
    onUpdateBalance(index, editedBalance);
    setEditingIndex(null);
    setEditedBalance("");
    Alert.alert("Success", "Balance updated!");
  };

  return (
    <View style={tw`bg-amber-300 rounded-xl p-2 mb-2`}>
      <Text style={[tw`text-2xl text-amber-900 mb-3 text-center`, styles.text]}>
        Accounts
      </Text>
      {accounts.map((account, index) => (
        <View
          key={index}
          style={tw`bg-amber-200 p-3 rounded-xl mb-3 flex-col gap-4 elevation-2`}
        >
          <Text style={[tw`text-amber-900 flex-1`, styles.text]}>
            {account.name} ({account.type}): **** **** ****{" "}
            {account.lastFourDigits}
          </Text>
          <Text style={[tw`text-amber-900 text-2xl flex-1`, styles.text]}>
            Rs. {account.initialBalance}
          </Text>
          <TouchableOpacity onPress={() => togglePrimaryAccount(index)}>
            <View style={[tw`flex-row`]}>
              <Icon
                name={account.manualTransaction ? "check-circle" : "circle"}
                size={20}
                color="#92400e"
              />
              <Text style={[tw`ml-2`]}>Manual Transaction</Text>
            </View>
          </TouchableOpacity>
          {editingIndex === index ? (
            <View style={tw`flex-row items-center`}>
              <TextInput
                style={[
                  tw`border border-amber-300 rounded-md p-2 w-20 mr-2 text-amber-900`,
                  styles.text,
                ]}
                value={editedBalance}
                onChangeText={setEditedBalance}
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={tw`bg-amber-500 p-2 rounded-md mr-2`}
                onPress={() => saveEditedBalance(index)}
              >
                <Icon name="save" size={20} color="#92400e" />
              </TouchableOpacity>
              <TouchableOpacity
                style={tw`bg-amber-500 p-2 rounded-md`}
                onPress={() => setEditingIndex(null)}
              >
                <Icon name="x" size={20} color="#92400e" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={tw`flex-row`}>
              <TouchableOpacity
                style={tw`bg-amber-500 p-2 rounded-md mr-2`}
                onPress={() =>
                  startEditingBalance(index, account.initialBalance)
                }
              >
                <Icon name="edit" size={20} color="#92400e" />
              </TouchableOpacity>
              <TouchableOpacity
                style={tw`bg-amber-500 p-2 rounded-md`}
                onPress={() => onDeleteAccount(index)}
              >
                <Icon name="trash" size={20} color="#92400e" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  text: {
    fontFamily: "VarelaRound-Regular",
  },
});

export default AccountsList;
