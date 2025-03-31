import React, { useState, useRef, useEffect } from "react";
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
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { Transaction } from "../types/types";
import tw from "twrnc";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ExtendedTransaction extends Transaction {
  isApplied?: boolean;
  category?: string;
  categoryIcon?: string;
}

interface ReviewTransactionsProps {
  isVisible: boolean;
  onClose: () => void;
  currentIndex: number;
  unappliedMessages: ExtendedTransaction[];
  savedRecipients: string[];
  savedCategories: string[];
  expenseType: string[];
  updateRecipient: (id: string, newRecipient: string) => void;
  updateCategory: (id: string, newCategory: string) => void;
  updateCategoryIcon: (id: string, iconName: string) => void;
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

const ReviewTransactions: React.FC<ReviewTransactionsProps> = ({
  isVisible,
  onClose,
  currentIndex,
  unappliedMessages,
  savedRecipients,
  savedCategories,
  expenseType,
  updateRecipient,
  updateCategory,
  updateCategoryIcon,
  updateTransactionType,
  updateTransactionAmount,
  applyTransaction,
  skipCurrentTransaction,
  goToPrev,
  goToNext,
  handleRecipient,
}) => {
  const [isKeyboardRequested, setIsKeyboardRequested] = useState(false);
  const recipientInputRef = useRef<TextInput>(null);
  const categoryInputRef = useRef<TextInput>(null);
  const amountInputRef = useRef<TextInput>(null);
  const categoryIconInputRef = useRef<TextInput>(null);

  const [iconSearchText, setIconSearchText] = useState("");
  const [showIconSuggestions, setShowIconSuggestions] = useState(false);
  const [showRecipientSuggestions, setShowRecipientSuggestions] =
    useState(false);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [shouldClose, setShouldClose] = useState(false);

  useEffect(() => {
    if (shouldClose) {
      onClose();
      setShouldClose(false);
    }
  }, [shouldClose, onClose]);

  if (!isVisible) return null;

  if (!unappliedMessages[currentIndex]) {
    if (!shouldClose) setShouldClose(true);
    return null;
  }

  const allIconNames = Object.keys(MaterialIcons.getRawGlyphMap());

  const getMatchingIcons = (searchText: string) => {
    if (!searchText) return [];

    const searchLower = searchText.toLowerCase();
    return allIconNames
      .filter((iconName) => iconName.includes(searchLower))
      .slice(0, 8);
  };

  const getMatchingRecipients = () => {
    const currentRecipient =
      unappliedMessages[currentIndex].recipient.toLowerCase();
    return savedRecipients
      .filter((recipient) => recipient.toLowerCase().includes(currentRecipient))
      .slice(0, 5);
  };

  const getMatchingCategories = () => {
    const currentCategory =
      unappliedMessages[currentIndex].category?.toLowerCase() || "";
    return Array.from(new Set([...expenseType, ...savedCategories])).filter(
      (category) => category.toLowerCase().includes(currentCategory)
    );
  };

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

  const checkCategoryAndSetIcon = async (category: string) => {
    try {
      const savedRecent = await AsyncStorage.getItem("recentTransactions");
      if (!savedRecent) return false;

      const recentTransactions = JSON.parse(savedRecent);
      const foundTransaction = recentTransactions.find(
        (txn: any) => txn.category?.toLowerCase() === category.toLowerCase()
      );

      if (foundTransaction && foundTransaction.categoryIcon) {
        setIconSearchText(foundTransaction.categoryIcon);
        setShowIconSuggestions(true);
        return foundTransaction.categoryIcon;
      }
      return false;
    } catch (error) {
      console.error("Error checking recent transactions:", error);
      return false;
    }
  };

  const handleOutsideClick = () => {
    setIsKeyboardRequested(false);
    Keyboard.dismiss();
    setShowRecipientSuggestions(false);
    setShowCategorySuggestions(false);
    setShowIconSuggestions(false);
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
                      ? tw`bg-green-500`
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
                      ? tw`bg-red-500`
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

              {/* Recipient Input with Horizontal Scrollable Suggestions */}
              <View style={tw`relative h-14 mb-2`}>
                <TextInput
                  ref={recipientInputRef}
                  style={[
                    tw`border border-amber-500 rounded-md p-2 text-amber-900 w-full h-full`,
                    styles.text,
                  ]}
                  value={handleRecipient(
                    unappliedMessages[currentIndex].recipient
                  )}
                  onChangeText={(text) => {
                    updateRecipient(unappliedMessages[currentIndex].id, text);
                    setShowRecipientSuggestions(
                      getMatchingRecipients().length > 0
                    );
                  }}
                  onFocus={() => {
                    setShowRecipientSuggestions(
                      getMatchingRecipients().length > 0
                    );
                    setIsKeyboardRequested(true);
                  }}
                  placeholder="Enter recipient"
                  placeholderTextColor="#92400e"
                />

                {showRecipientSuggestions && (
                  <View style={[styles.horizontalTooltip, tw`bg-amber-100`]}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={tw`py-1`}
                    >
                      {getMatchingRecipients().length > 0 &&
                        getMatchingRecipients().map((recipient, index) => (
                          <TouchableOpacity
                            key={index}
                            style={tw`px-3 py-1 mx-1 bg-amber-200 rounded-full`}
                            onPress={() => {
                              updateRecipient(
                                unappliedMessages[currentIndex].id,
                                recipient
                              );
                              setShowRecipientSuggestions(false);
                            }}
                          >
                            <Text style={[tw`text-amber-900`, styles.text]}>
                              {recipient}
                            </Text>
                          </TouchableOpacity>
                        ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Category Input with Horizontal Scrollable Suggestions */}
              <View style={tw`relative h-14 mb-2`}>
                <View
                  style={tw`flex-row items-center border border-amber-500 rounded-md w-full h-full`}
                >
                  {unappliedMessages[currentIndex].categoryIcon && (
                    <View style={tw`pl-2`}>
                      <MaterialIcons
                        name={unappliedMessages[currentIndex].categoryIcon}
                        size={20}
                        color="#92400e"
                      />
                    </View>
                  )}
                  <TextInput
                    ref={categoryInputRef}
                    style={[tw`p-2 text-amber-900 flex-1`, styles.text]}
                    value={unappliedMessages[currentIndex].category || ""}
                    onChangeText={(text) => {
                      updateCategory(unappliedMessages[currentIndex].id, text);
                      setShowCategorySuggestions(
                        getMatchingCategories().length > 0
                      );
                    }}
                    onFocus={() => {
                      setShowCategorySuggestions(true);
                      setIsKeyboardRequested(true);
                    }}
                    placeholder="Enter category"
                    placeholderTextColor="#92400e"
                  />
                </View>

                {showCategorySuggestions && (
                  <View style={[styles.horizontalTooltip, tw`bg-amber-100`]}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={tw`py-1`}
                    >
                      {getMatchingCategories().length > 0 &&
                        getMatchingCategories().map((category, index) => (
                          <TouchableOpacity
                            key={index}
                            style={tw`px-3 py-1 mx-1 bg-amber-200 rounded-full`}
                            onPress={async () => {
                              updateCategory(
                                unappliedMessages[currentIndex].id,
                                category
                              );
                              await checkCategoryAndSetIcon(category);
                              setShowCategorySuggestions(false);
                            }}
                          >
                            <Text style={[tw`text-amber-900`, styles.text]}>
                              {category}
                            </Text>
                          </TouchableOpacity>
                        ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Icon Search Input with Horizontal Scrollable Suggestions */}
              <View style={tw`relative h-14 mb-2`}>
                <View
                  style={tw`flex-row items-center border border-amber-500 rounded-md w-full h-full`}
                >
                  <TextInput
                    ref={categoryIconInputRef}
                    style={[tw`p-2 text-amber-900 flex-1`, styles.text]}
                    value={iconSearchText}
                    onChangeText={(text) => {
                      setIconSearchText(text);
                      setShowIconSuggestions(
                        getMatchingIcons(iconSearchText.toLowerCase()).length >
                          0
                      );
                    }}
                    onFocus={() => {
                      setShowIconSuggestions(iconSearchText.length > 0);
                    }}
                    placeholder="Search for icon"
                    placeholderTextColor="#92400e"
                  />
                  {unappliedMessages[currentIndex].categoryIcon && (
                    <TouchableOpacity
                      style={tw`px-2`}
                      onPress={() => {
                        updateCategoryIcon(
                          unappliedMessages[currentIndex].id,
                          ""
                        );
                      }}
                    >
                      <Icon name="x" size={20} color="#92400e" />
                    </TouchableOpacity>
                  )}
                </View>

                {showIconSuggestions && (
                  <View style={[styles.horizontalTooltip, tw`bg-amber-100`]}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={tw`py-1`}
                    >
                      {getMatchingIcons(iconSearchText.toLowerCase()).length >
                        0 &&
                        getMatchingIcons(iconSearchText.toLowerCase()).map(
                          (iconName) => (
                            <TouchableOpacity
                              key={iconName}
                              style={tw`p-2 mx-1`}
                              onPress={() => {
                                updateCategoryIcon(
                                  unappliedMessages[currentIndex].id,
                                  iconName
                                );
                                setIconSearchText("");
                                setShowIconSuggestions(false);
                              }}
                            >
                              <MaterialIcons
                                name={iconName}
                                size={24}
                                color="#92400e"
                              />
                            </TouchableOpacity>
                          )
                        )}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Amount Input */}
              <View style={tw`relative h-12 mb-3`}>
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
                  onFocus={() => setIsKeyboardRequested(true)}
                />
              </View>

              {/* Navigation Buttons */}
              <View style={tw`flex-row justify-between w-full mb-2 gap-2`}>
                <TouchableOpacity
                  style={[
                    tw`bg-amber-500 p-2 rounded-md flex-grow  flex items-center justify-center`,
                    currentIndex === 0 && tw`opacity-50`,
                  ]}
                  onPress={goToPrev}
                  disabled={currentIndex === 0}
                >
                  <Icon name="arrow-left" size={20} color="#92400e" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={tw`bg-amber-500 p-2 rounded-md flex-grow  flex items-center justify-center`}
                  onPress={() => {
                    applyTransaction(unappliedMessages[currentIndex].id);
                    Keyboard.dismiss();
                  }}
                >
                  <Text style={[tw`text-amber-900 text-center`, styles.text]}>
                    SUBMIT
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={tw`bg-amber-500 p-2 rounded-md flex-grow  flex items-center justify-center`}
                  onPress={skipCurrentTransaction}
                >
                  <Text style={[tw`text-amber-900 text-center`, styles.text]}>
                    SKIP
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    tw`bg-amber-500 p-2 rounded-md flex-grow  flex items-center justify-center`,
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
                {unappliedMessages[currentIndex].message === "Manual Entry"
                  ? "Manual Transaction Entry"
                  : unappliedMessages[currentIndex].message}
                {"\n"}
                {formatDate(unappliedMessages[currentIndex].date)}
              </Text>
            </View>

            {/* Close Button */}
            <View style={tw`h-10 bg-amber-600 flex-row`}>
              <TouchableOpacity
                style={tw`flex-1 flex items-center justify-center`}
                onPress={onClose}
              >
                <Icon name="x" size={20} color="#92400e" />
              </TouchableOpacity>
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
  horizontalTooltip: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
    maxHeight: 100,
  },
});

export default ReviewTransactions;
