// components/ManageAccounts.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import Icon from "react-native-vector-icons/Feather";
import { AccountType } from "../types/types";
import tw from "twrnc";

interface ManageAccountsProps {
  accountType: AccountType;
  setAccountType: (type: AccountType) => void;
  accountName: string;
  setAccountName: (name: string) => void;
  accountNumber: string;
  setAccountNumber: (number: string) => void;
  initialBalance: string;
  setInitialBalance: (balance: string) => void;
  onAddAccount: () => void;
}

const ManageAccounts: React.FC<ManageAccountsProps> = ({
  accountType,
  setAccountType,
  accountName,
  setAccountName,
  accountNumber,
  setAccountNumber,
  initialBalance,
  setInitialBalance,
  onAddAccount,
}) => {
  const [isTypeAccordionOpen, setIsTypeAccordionOpen] = useState(false);
  const accountTypes: AccountType[] = ["Bank Account", "Credit Card", "Other"];

  return (
    <View style={tw`bg-amber-300 rounded-xl p-2 mb-8`}>
      <Text style={[tw`text-2xl text-amber-900 mb-2 text-center`, styles.text]}>
        Add New Account
      </Text>
      <View style={tw`bg-amber-200 p-2 rounded-xl`}>
        {/* Account Type Selection */}
        <TouchableOpacity
          style={[
            tw`bg-amber-500 p-3 flex-row justify-between`,
            isTypeAccordionOpen
              ? tw`rounded-tl-md rounded-tr-md mb-0`
              : tw`rounded-md mb-2`,
          ]}
          onPress={() => setIsTypeAccordionOpen(!isTypeAccordionOpen)}
        >
          <Text style={[tw`text-amber-900`, styles.text]}>{accountType} </Text>
          <Text style={tw`text-amber-900`}>
            {isTypeAccordionOpen ? (
              <Icon name="chevron-up" size={20} color="#92400e" />
            ) : (
              <Icon name="chevron-down" size={20} color="#92400e" />
            )}
          </Text>
        </TouchableOpacity>

        {isTypeAccordionOpen && (
          <View style={tw`bg-amber-100 rounded-bl-md rounded-br-md p-2 mb-2`}>
            {accountTypes.map((type, index) => (
              <TouchableOpacity
                key={type}
                style={[
                  tw`p-2`,
                  index !== accountTypes.length - 1 &&
                    tw`border-b border-dashed border-amber-500`,
                ]}
                onPress={() => {
                  setAccountType(type);
                  setIsTypeAccordionOpen(false);
                }}
              >
                <Text
                  style={[
                    tw`text-amber-900`,
                    accountType === type && tw`font-bold`,
                    styles.text,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Input Fields */}
        <TextInput
          style={[
            tw`border-b border-amber-600 rounded-md p-2 mb-3 text-amber-900`,
            styles.text,
          ]}
          placeholder="Enter account name"
          placeholderTextColor="#92400e"
          value={accountName}
          onChangeText={setAccountName}
        />
        <TextInput
          style={[
            tw`border-b border-amber-600 rounded-md p-2 mb-3 text-amber-900`,
            styles.text,
          ]}
          placeholder="Enter account number"
          placeholderTextColor="#92400e"
          keyboardType="numeric"
          value={accountNumber}
          onChangeText={setAccountNumber}
          maxLength={20}
        />
        <TextInput
          style={[
            tw`border-b border-amber-600 rounded-md p-2 mb-3 text-amber-900`,
            styles.text,
          ]}
          placeholder="Enter initial balance"
          placeholderTextColor="#92400e"
          keyboardType="numeric"
          value={initialBalance}
          onChangeText={setInitialBalance}
        />
        <TouchableOpacity
          style={tw`bg-amber-500 p-3 rounded-md mb-5`}
          onPress={onAddAccount}
        >
          <Text style={[tw`text-center text-amber-900`, styles.text]}>
            Add Account
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  text: {
    fontFamily: "VarelaRound-Regular",
  },
});

export default ManageAccounts;
