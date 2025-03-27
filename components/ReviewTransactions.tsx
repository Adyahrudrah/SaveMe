import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import Icon from "react-native-vector-icons/Feather";
import { Transaction } from "../types/types";
import tw from "twrnc";

interface ExtendedTransaction extends Transaction {
  isApplied?: boolean;
  category?: string;
}

interface TransactionModalProps {
  isVisible: boolean;
  onClose: () => void;
  currentIndex: number;
  unappliedMessages: ExtendedTransaction[];
  savedRecipients: string[];
  savedCategories: string[];
  expenseType: string[];
  updateRecipient: (id: string, newRecipient: string) => void;
  updateCategory: (id: string, newCategory: string) => void;
  updateTransactionType: (id: string, newType: "credit" | "debit") => void;
  updateTransactionAmount: (id: string, newAmount: string) => void;
  applyTransaction: (id: string) => void;
  skipCurrentTransaction: () => void;
  goToPrev: () => void;
  goToNext: () => void;
  clearRecipient: () => void;
  textInputRef: React.RefObject<TextInput | null>;
  handleRecipient: (val: string) => string;
}

const TransactionModal: React.FC<TransactionModalProps> = ({
  isVisible,
  onClose,
  currentIndex,
  unappliedMessages,
  savedRecipients,
  savedCategories,
  expenseType,
  updateRecipient,
  updateCategory,
  updateTransactionType,
  updateTransactionAmount,
  applyTransaction,
  skipCurrentTransaction,
  goToPrev,
  goToNext,
  clearRecipient,
  textInputRef,
  handleRecipient,
}) => {
  const [activeInput, setActiveInput] = useState<
    "recipient" | "category" | "amount" | null
  >(null);
  const [isKeyboardRequested, setIsKeyboardRequested] = useState(false);
  const recipientInputRef = useRef<TextInput>(null);
  const categoryInputRef = useRef<TextInput>(null);
  const amountInputRef = useRef<TextInput>(null);

  if (!isVisible || !unappliedMessages[currentIndex]) return null;

  const handleInputAction = (type: "recipient" | "category" | "amount") => {
    const currentId = unappliedMessages[currentIndex].id;

    // Helper function to delete last word
    const deleteLastWord = (str: string) => {
      if (!str) return "";
      // Trim any trailing whitespace first
      const trimmedStr = str.trimEnd();
      // Find last space or return empty string
      const lastSpaceIndex = trimmedStr.lastIndexOf(" ");
      return lastSpaceIndex === -1
        ? ""
        : trimmedStr.substring(0, lastSpaceIndex);
    };

    if (type === "recipient") {
      const currentValue = unappliedMessages[currentIndex].recipient;
      if (currentValue) {
        const newValue = deleteLastWord(currentValue);
        updateRecipient(currentId, newValue);
        if (newValue === "") {
          setActiveInput(null);
          setIsKeyboardRequested(false);
          Keyboard.dismiss();
        }
      } else {
        setActiveInput("recipient");
        setIsKeyboardRequested(true);
        setTimeout(() => recipientInputRef.current?.focus(), 100);
      }
    } else if (type === "category") {
      const currentValue = unappliedMessages[currentIndex].category || "";
      if (currentValue) {
        const newValue = deleteLastWord(currentValue);
        updateCategory(currentId, newValue);
        if (newValue === "") {
          setActiveInput(null);
          setIsKeyboardRequested(false);
          Keyboard.dismiss();
        }
      } else {
        setActiveInput("category");
        setIsKeyboardRequested(true);
        setTimeout(() => categoryInputRef.current?.focus(), 100);
      }
    } else {
      // amount - keep character-by-character deletion for numbers
      const currentValue = unappliedMessages[currentIndex].editableAmount || "";
      if (currentValue) {
        const newValue = currentValue.slice(0, -1);
        updateTransactionAmount(currentId, newValue);
        if (newValue === "") {
          setActiveInput(null);
          setIsKeyboardRequested(false);
          Keyboard.dismiss();
        }
      } else {
        setActiveInput("amount");
        setIsKeyboardRequested(true);
        setTimeout(() => amountInputRef.current?.focus(), 100);
      }
    }
  };

  const handleInputFocus = (type: "recipient" | "category" | "amount") => {
    setActiveInput(type);
    if (!isKeyboardRequested) {
      Keyboard.dismiss();
    }
  };

  const handleOutsideClick = () => {
    setActiveInput(null);
    setIsKeyboardRequested(false);
    Keyboard.dismiss();
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent={true}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={tw`flex-1`}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <TouchableWithoutFeedback onPress={handleOutsideClick}>
          <View style={tw`flex-1 bg-amber-100`}>
            {/* Modal Content */}
            <View style={tw`flex-1 p-4 pt-0 gap-2 my-2`}>
              {/* Transaction Type */}
              <View style={tw`flex-row justify-between w-full mb-2`}>
                <TouchableOpacity
                  style={[
                    tw`p-2 rounded-md`,
                    unappliedMessages[currentIndex].type === "credit"
                      ? tw`bg-amber-500`
                      : tw`bg-amber-300`,
                  ]}
                  onPress={() =>
                    updateTransactionType(
                      unappliedMessages[currentIndex].id,
                      "credit"
                    )
                  }
                >
                  <Text style={[tw`text-amber-900`, styles.text]}>Credit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    tw`p-2 rounded-md`,
                    unappliedMessages[currentIndex].type === "debit"
                      ? tw`bg-amber-500`
                      : tw`bg-amber-300`,
                  ]}
                  onPress={() =>
                    updateTransactionType(
                      unappliedMessages[currentIndex].id,
                      "debit"
                    )
                  }
                >
                  <Text style={[tw`text-amber-900`, styles.text]}>Debit</Text>
                </TouchableOpacity>
              </View>
              <View style={tw`flex-row relative h-14 mb-2`}>
                <TextInput
                  ref={recipientInputRef}
                  style={[
                    tw`border border-amber-500 rounded-md p-2 text-amber-900 w-full h-[90%]`,
                    styles.text,
                  ]}
                  value={handleRecipient(
                    unappliedMessages[currentIndex].recipient.trim()
                  )}
                  onChangeText={(text) =>
                    updateRecipient(
                      unappliedMessages[currentIndex].id,
                      text.trim()
                    )
                  }
                  onFocus={() => handleInputFocus("recipient")}
                  showSoftInputOnFocus={isKeyboardRequested}
                  placeholder="Enter recipient"
                  placeholderTextColor="#92400e"
                />
                <TouchableOpacity
                  style={tw`absolute right-1 top-1 px-2 bg-amber-100 h-[75%] rounded-md justify-center`}
                  onPress={() => handleInputAction("recipient")}
                >
                  <Icon
                    name={
                      unappliedMessages[currentIndex].recipient ? "x" : "edit-2"
                    }
                    size={24}
                    color="#92400e"
                  />
                </TouchableOpacity>
              </View>

              {/* Category Input */}
              <View style={tw`flex-row relative h-14 mb-2`}>
                <TextInput
                  ref={categoryInputRef}
                  style={[
                    tw`border border-amber-500 rounded-md p-2 text-amber-900 w-full h-[90%]`,
                    styles.text,
                  ]}
                  value={unappliedMessages[currentIndex].category || ""}
                  onChangeText={(text) =>
                    updateCategory(unappliedMessages[currentIndex].id, text)
                  }
                  onFocus={() => handleInputFocus("category")}
                  showSoftInputOnFocus={isKeyboardRequested}
                  placeholder="Enter category"
                  placeholderTextColor="#92400e"
                />
                <TouchableOpacity
                  style={tw`absolute right-1 top-1 px-2 h-[75%] rounded-md justify-center`}
                  onPress={() => handleInputAction("category")}
                >
                  <Icon
                    name={
                      unappliedMessages[currentIndex].category ? "x" : "edit-2"
                    }
                    size={24}
                    color="#92400e"
                  />
                </TouchableOpacity>
              </View>

              {/* Amount Input */}
              <View style={tw`flex-row relative h-12 mb-3`}>
                <TextInput
                  ref={amountInputRef}
                  style={[
                    tw`border border-amber-500 rounded-md p-2 text-amber-900 w-full h-full`,
                    styles.text,
                  ]}
                  value={unappliedMessages[currentIndex].editableAmount}
                  onChangeText={(text) =>
                    updateTransactionAmount(
                      unappliedMessages[currentIndex].id,
                      text
                    )
                  }
                  keyboardType="numeric"
                  placeholder="Edit amount"
                  placeholderTextColor="#92400e"
                  onFocus={() => handleInputFocus("amount")}
                  showSoftInputOnFocus={isKeyboardRequested}
                />
                <TouchableOpacity
                  style={tw`absolute right-1 top-1 px-2 h-[75%] rounded-md justify-center`}
                  onPress={() => handleInputAction("amount")}
                >
                  <Icon
                    name={
                      unappliedMessages[currentIndex].editableAmount
                        ? "x"
                        : "edit-2"
                    }
                    size={24}
                    color="#92400e"
                  />
                </TouchableOpacity>
              </View>

              {/* Navigation Buttons */}
              <View style={tw`flex-row justify-between w-full mb-2 gap-2`}>
                <TouchableOpacity
                  style={[
                    tw`bg-amber-500 p-2 rounded-md flex-grow border-b-4 border-amber-600 flex items-center justify-center`,
                    currentIndex === 0 && tw`opacity-50`,
                  ]}
                  onPress={goToPrev}
                  disabled={currentIndex === 0}
                >
                  <Icon name="arrow-left" size={20} color="#92400e" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={tw`bg-amber-500 p-2 rounded-md flex-grow border-b-4 border-amber-600 flex items-center justify-center`}
                  onPress={() =>
                    applyTransaction(unappliedMessages[currentIndex].id)
                  }
                >
                  <Text style={[tw`text-amber-900 text-center`, styles.text]}>
                    SUBMIT
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={tw`bg-amber-500 p-2 rounded-md flex-grow border-b-4 border-amber-600 flex items-center justify-center`}
                  onPress={skipCurrentTransaction}
                >
                  <Text style={[tw`text-amber-900 text-center`, styles.text]}>
                    SKIP
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    tw`bg-amber-500 p-2 rounded-md flex-grow border-b-4 border-amber-600 flex items-center justify-center`,
                    currentIndex === unappliedMessages.length - 1 &&
                      tw`opacity-50`,
                  ]}
                  onPress={goToNext}
                  disabled={currentIndex === unappliedMessages.length - 1}
                >
                  <Icon name="arrow-right" size={20} color="#92400e" />
                </TouchableOpacity>
              </View>

              <Text
                style={[
                  tw`text-2xl text-amber-900 mb-2 text-center`,
                  styles.text,
                ]}
              >
                Transaction Details
              </Text>
              <Text
                style={[tw`text-xs text-amber-900 mb-3 flex-1`, styles.text]}
              >
                {unappliedMessages[currentIndex].message}
              </Text>
            </View>

            {/* Close Button / Suggestions Area */}
            <View
              style={tw`${
                !isKeyboardRequested && activeInput ? "h-20" : "h-10"
              } bg-amber-600 flex-row`}
            >
              {activeInput && !isKeyboardRequested ? (
                <ScrollView horizontal={true} style={tw`flex-1 p-1`}>
                  <View style={tw`flex-row items-center`}>
                    {activeInput === "recipient" &&
                      savedRecipients.length > 0 &&
                      savedRecipients
                        .filter((recipient) =>
                          recipient
                            .toLowerCase()
                            .includes(
                              unappliedMessages[
                                currentIndex
                              ].recipient.toLowerCase()
                            )
                        )
                        .map((recipient, index) => (
                          <TouchableOpacity
                            key={index}
                            style={tw`bg-amber-300/50 rounded-lg border-amber-600 border mr-2 p-2 flex items-center justify-center flex-nowrap`}
                            onPress={() => {
                              updateRecipient(
                                unappliedMessages[currentIndex].id,
                                recipient
                              );
                              setActiveInput(null);
                            }}
                          >
                            <Text
                              style={[tw`text-amber-800 text-sm`, styles.text]}
                            >
                              {recipient}
                            </Text>
                          </TouchableOpacity>
                        ))}
                    {activeInput === "category" &&
                      [...expenseType, ...savedCategories]
                        .filter(
                          (category, index, self) =>
                            category &&
                            self.indexOf(category) === index &&
                            (!unappliedMessages[currentIndex].category ||
                              category
                                .toLowerCase()
                                .includes(
                                  unappliedMessages[
                                    currentIndex
                                  ].category?.toLowerCase() || ""
                                ))
                        )
                        .map((category, index) => (
                          <TouchableOpacity
                            key={index}
                            style={tw`bg-amber-300/50 rounded-lg border-amber-600 border mr-2 p-2 flex items-center justify-center`}
                            onPress={() => {
                              updateCategory(
                                unappliedMessages[currentIndex].id,
                                category
                              );
                              setActiveInput(null);
                            }}
                          >
                            <Text
                              style={[tw`text-amber-800 text-sm`, styles.text]}
                            >
                              {category}
                            </Text>
                          </TouchableOpacity>
                        ))}
                    {activeInput === "amount" && (
                      <Text
                        style={[tw`text-amber-800 text-sm p-2`, styles.text]}
                      >
                        Click edit to enter amount manually
                      </Text>
                    )}
                  </View>
                </ScrollView>
              ) : (
                <TouchableOpacity
                  style={tw`flex-1 flex items-center justify-center`}
                  onPress={onClose}
                >
                  <Icon name="x" size={20} color="#92400e" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  text: {
    fontFamily: "VarelaRound-Regular",
  },
});

export default TransactionModal;
