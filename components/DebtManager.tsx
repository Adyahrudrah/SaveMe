import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/Feather";
import tw from "twrnc";
import DateTimePicker from "@react-native-community/datetimepicker";
import { DebtAccount } from "../types/types";

interface DebtManagerData {
  debtAccounts: DebtAccount[];
  monthlyIncome: number;
}

const DebtManager: React.FC = () => {
  const [data, setData] = useState<DebtManagerData>({
    debtAccounts: [],
    monthlyIncome: 0,
  });
  const [accountName, setAccountName] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  const [durationMonths, setDurationMonths] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const savedData = await AsyncStorage.getItem("DebtManagerData");
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          const updatedAccounts = parsedData.debtAccounts.map(
            (account: DebtAccount) => ({
              ...account,
              remainingMonths: calculateRemainingMonths(
                account.startDate,
                account.durationMonths
              ),
              totalAmount:
                account.debtAmount *
                calculateRemainingMonths(
                  account.startDate,
                  account.durationMonths
                ),
            })
          );
          setData({
            ...parsedData,
            debtAccounts: updatedAccounts,
          });
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const saveData = async () => {
      try {
        await AsyncStorage.setItem("DebtManagerData", JSON.stringify(data));
      } catch (error) {
        console.error("Error saving data:", error);
      }
    };
    saveData();
  }, [data]);

  const calculateRemainingMonths = (
    startDateString: string,
    durationMonths: number
  ) => {
    const startDate = new Date(startDateString);
    const currentDate = new Date();

    if (currentDate < startDate) {
      return durationMonths;
    }

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + durationMonths);

    if (currentDate >= endDate) {
      return 0;
    }

    let months = (endDate.getFullYear() - currentDate.getFullYear()) * 12;
    months += endDate.getMonth() - currentDate.getMonth();

    if (endDate.getDate() < currentDate.getDate()) {
      months--;
    }

    return months > 0 ? months : 0;
  };

  const calculateTotalMonthlyDebt = () => {
    return data.debtAccounts.reduce(
      (sum, account) => sum + account.debtAmount,
      0
    );
  };

  const calculateTotalDebt = () => {
    return data.debtAccounts.reduce(
      (sum, account) => sum + account.debtAmount * account.remainingMonths,
      0
    );
  };

  const calculateRemainingIncome = () => {
    return data.monthlyIncome - calculateTotalMonthlyDebt();
  };

  const handleAddDebt = () => {
    if (!accountName.trim()) {
      Alert.alert("Error", "Enter account name");
      return;
    }
    if (!debtAmount || isNaN(Number(debtAmount))) {
      Alert.alert("Error", "Enter valid Debt amount");
      return;
    }
    if (!durationMonths || isNaN(Number(durationMonths))) {
      Alert.alert("Error", "Enter valid duration in months");
      return;
    }

    const duration = Number(durationMonths);
    const remainingMonths = calculateRemainingMonths(
      startDate.toISOString(),
      duration
    );
    const newDebt: DebtAccount = {
      id: Date.now().toString(),
      accountName: accountName.trim(),
      debtAmount: Number(debtAmount),
      durationMonths: duration,
      startDate: startDate.toISOString(),
      remainingMonths: remainingMonths,
      totalAmount: Number(debtAmount) * remainingMonths,
    };

    setData((prev) => ({
      ...prev,
      debtAccounts: [...prev.debtAccounts, newDebt],
    }));
    resetForm();
  };

  const handleDeleteDebt = (id: string) => {
    setData((prev) => ({
      ...prev,
      debtAccounts: prev.debtAccounts.filter((account) => account.id !== id),
    }));
  };

  const handleIncomeChange = (value: string) => {
    setData((prev) => ({
      ...prev,
      monthlyIncome: value ? Number(value) : 0,
    }));
  };

  const resetForm = () => {
    setAccountName("");
    setDebtAmount("");
    setDurationMonths("");
    setStartDate(new Date());
    setIsFormVisible(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || startDate;
    setShowDatePicker(Platform.OS === "ios");
    setStartDate(currentDate);
  };

  return (
    <View style={tw`bg-amber-300 rounded-xl p-2 mb-2`}>
      <View style={tw`flex-row justify-between items-center mb-2`}>
        <Text style={[tw`text-xl text-amber-900`, styles.text]}>
          Debt Manager
        </Text>
        <TouchableOpacity onPress={() => setIsFormVisible(!isFormVisible)}>
          <Icon
            name={isFormVisible ? "minus" : "plus"}
            size={20}
            color="#92400e"
          />
        </TouchableOpacity>
      </View>

      {isFormVisible && (
        <View style={tw`bg-amber-200 p-3 rounded-lg mb-3`}>
          <TextInput
            style={[
              tw`border-b border-amber-500 rounded-md p-2 mb-3 text-amber-900`,
              styles.text,
            ]}
            placeholder="Account Name"
            value={accountName}
            onChangeText={setAccountName}
            placeholderTextColor="#92400e"
          />
          <TextInput
            style={[
              tw`border-b border-amber-500 rounded-md p-2 mb-3 text-amber-900`,
              styles.text,
            ]}
            placeholder="Debt Amount"
            value={debtAmount}
            onChangeText={setDebtAmount}
            keyboardType="numeric"
            placeholderTextColor="#92400e"
          />
          <TextInput
            style={[
              tw`border-b border-amber-500 rounded-md p-2 mb-3 text-amber-900`,
              styles.text,
            ]}
            placeholder="Duration (months)"
            value={durationMonths}
            onChangeText={setDurationMonths}
            keyboardType="numeric"
            placeholderTextColor="#92400e"
          />

          <TouchableOpacity
            style={[tw`border-b border-amber-500 rounded-md p-2 mb-3`]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={[tw`text-amber-900`, styles.text]}>
              Next Due date: {formatDate(startDate.toISOString())}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}

          <View style={tw`flex-row justify-between`}>
            <TouchableOpacity
              style={tw`bg-amber-500 p-2 rounded-md`}
              onPress={resetForm}
            >
              <Text style={[tw`text-amber-900`, styles.text]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={tw`bg-amber-500 p-2 rounded-md`}
              onPress={handleAddDebt}
            >
              <Text style={[tw`text-amber-900`, styles.text]}>Add Debt</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={tw`bg-amber-200 p-3 rounded-lg mb-3 elevation-2`}>
        <TextInput
          style={[
            tw`border-b border-amber-500 rounded-md p-2 text-amber-900`,
            styles.text,
          ]}
          placeholder="Monthly Income"
          onChangeText={handleIncomeChange}
          keyboardType="numeric"
          placeholderTextColor="#92400e"
        />
      </View>

      <View style={tw`bg-amber-500 p-3 rounded-lg mb-3`}>
        <View style={tw`flex-row justify-between`}>
          <Text style={[tw`text-amber-900 font-bold`, styles.text]}>
            Total Monthly Debt:
          </Text>
          <Text style={[tw`text-amber-900 font-bold`, styles.text]}>
            Rs. {calculateTotalMonthlyDebt().toFixed(2)}
          </Text>
        </View>
        <View style={tw`flex-row justify-between`}>
          <Text style={[tw`text-amber-900 font-bold`, styles.text]}>
            Total Debt:
          </Text>
          <Text style={[tw`text-amber-900 font-bold`, styles.text]}>
            Rs. {calculateTotalDebt().toFixed(2)}
          </Text>
        </View>
        {data.monthlyIncome > 0 && (
          <>
            <View style={tw`flex-row justify-between`}>
              <Text style={[tw`text-amber-900 font-bold`, styles.text]}>
                Remaining Income:
              </Text>
              <Text style={[tw`text-amber-900 font-bold`, styles.text]}>
                Rs. {calculateRemainingIncome().toFixed(2)}
              </Text>
            </View>
            <View style={tw`flex-row justify-between`}>
              <Text style={[tw`text-amber-900 font-bold`, styles.text]}>
                Monthly Income:
              </Text>
              <Text style={[tw`text-amber-900 font-bold`, styles.text]}>
                Rs. {data.monthlyIncome}
              </Text>
            </View>
          </>
        )}
      </View>

      {data.debtAccounts.length > 0 && (
        <TouchableOpacity
          style={tw`bg-amber-500 p-3 rounded-lg mb-2 flex-row justify-between items-center`}
          onPress={() => setIsExpanded(!isExpanded)}
        >
          <Text style={[tw`text-amber-900 font-bold`, styles.text]}>
            Debt Accounts ({data.debtAccounts.length})
          </Text>
          <Icon
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#92400e"
          />
        </TouchableOpacity>
      )}

      {isExpanded && data.debtAccounts.length > 0 && (
        <View style={tw`bg-amber-200 rounded-lg p-2 pb-0`}>
          {data.debtAccounts.map((debt) => (
            <View key={debt.id} style={tw`mb-2`}>
              <View style={tw`bg-amber-300 p-3 rounded-lg elevation-2`}>
                <View style={tw`flex-row justify-between items-center`}>
                  <Text style={[tw`text-amber-900 font-bold`, styles.text]}>
                    {debt.accountName}
                  </Text>
                  <Text style={[tw`text-amber-900`, styles.text]}>
                    Rs. {debt.debtAmount.toFixed(2)}/mo
                  </Text>
                </View>

                <View style={tw`mt-2`}>
                  <View style={tw`flex-row justify-between mb-1`}>
                    <Text style={[tw`text-amber-900`, styles.text]}>
                      Total Amount:
                    </Text>
                    <Text style={[tw`text-amber-900`, styles.text]}>
                      Rs. {(debt.debtAmount * debt.remainingMonths).toFixed(2)}
                    </Text>
                  </View>
                  <View style={tw`flex-row justify-between mb-1`}>
                    <Text style={[tw`text-amber-900`, styles.text]}>
                      Started:
                    </Text>
                    <Text style={[tw`text-amber-900`, styles.text]}>
                      {formatDate(debt.startDate)}
                    </Text>
                  </View>
                  <View style={tw`flex-row justify-between`}>
                    <Text style={[tw`text-amber-900`, styles.text]}>
                      Remaining:
                    </Text>
                    <Text style={[tw`text-amber-900`, styles.text]}>
                      {calculateRemainingMonths(
                        debt.startDate,
                        debt.durationMonths
                      )}{" "}
                      months
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={tw`mt-2 bg-amber-500 p-2 rounded-md self-end`}
                  onPress={() => handleDeleteDebt(debt.id)}
                >
                  <Icon name="trash" size={16} color="#92400e" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {data.debtAccounts.length === 0 && (
        <Text style={[tw`text-amber-900 text-center`, styles.text]}>
          No debt accounts added yet
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  text: {
    fontFamily: "VarelaRound-Regular",
  },
});

export default DebtManager;
