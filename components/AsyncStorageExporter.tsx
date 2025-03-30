import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Share,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import tw from "twrnc";

interface AsyncStorageDataManagerProps {
  description?: string;
  exportButtonText?: string;
  importButtonText?: string;
  placeholder?: string;
}

const AsyncStorageDataManager: React.FC<AsyncStorageDataManagerProps> = ({
  description,
  exportButtonText = "Export All Data",
  importButtonText = "Import All Data",
  placeholder = "Paste your complete AsyncStorage data here...",
}) => {
  const [importData, setImportData] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Export ALL data from AsyncStorage
  const handleExportAll = async () => {
    try {
      setIsLoading(true);
      const allKeys = await AsyncStorage.getAllKeys();
      const storedData = await AsyncStorage.multiGet(allKeys);

      if (!storedData || storedData.length === 0) {
        Alert.alert("No Data", "No data found in AsyncStorage");
        return;
      }

      // Convert to a single JSON object
      const exportObject = storedData.reduce((acc, [key, value]) => {
        try {
          acc[key] = value ? JSON.parse(value) : null;
        } catch {
          acc[key] = value; // Fallback to raw value if not JSON
        }
        return acc;
      }, {} as Record<string, any>);

      const message = JSON.stringify(exportObject, null, 2);

      // Share the data
      await Share.share({
        title: "Full AsyncStorage Export",
        message,
      });
    } catch (error) {
      console.error("Export failed:", error);
      Alert.alert("Error", "Failed to export data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Import ALL data to AsyncStorage
  const handleImportAll = async () => {
    if (!importData.trim()) {
      Alert.alert("Error", "Please enter data to import");
      return;
    }

    setIsLoading(true);

    try {
      let parsedData;
      try {
        parsedData = JSON.parse(importData);
      } catch (e) {
        throw new Error("Invalid JSON format");
      }

      if (typeof parsedData !== "object" || parsedData === null) {
        throw new Error("Data must be a JSON object");
      }

      // Prepare data for AsyncStorage
      const entries = Object.entries(parsedData).map(([key, value]) => [
        key,
        typeof value === "string" ? value : JSON.stringify(value),
      ]);

      // Clear existing data first
      await AsyncStorage.clear();

      // Store new data
      await AsyncStorage.multiSet(entries as [string, string][]);

      setImportData("");
      Alert.alert("Success", "All data imported successfully");
    } catch (error) {
      console.error("Import failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to import data";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={tw`p-2 bg-amber-300 rounded-lg mb-4`}>
      <View style={[tw`bg-amber-200 p-2 rounded-lg`]}>
        {description && (
          <Text style={[styles.text, tw`text-amber-700 mb-3`]}>
            {description}
          </Text>
        )}

        {/* Export Section */}
        <Text style={[styles.text, tw`font-bold mb-2 text-amber-700`]}>
          Export All AsyncStorage Data
        </Text>
        <Pressable
          onPress={handleExportAll}
          style={[
            tw`bg-amber-500 py-3 px-6 rounded-md items-center justify-center mb-4`,
            isLoading && tw`opacity-70`,
          ]}
          disabled={isLoading}
        >
          <Text style={[styles.text, tw`text-amber-700`]}>
            {isLoading ? "Exporting..." : exportButtonText}
          </Text>
        </Pressable>

        {/* Import Section */}
        <Text style={[styles.text, tw`font-bold mb-2 text-amber-700`]}>
          Import All AsyncStorage Data
        </Text>
        <Text style={[styles.text, tw`text-amber-700 text-sm mb-2`]}>
          Warning: This will overwrite all existing data
        </Text>
        <TextInput
          style={[
            styles.text,
            tw`border border-amber-600 rounded-md p-3 mb-2 h-32 text-amber-700`,
          ]}
          multiline
          placeholder={placeholder}
          placeholderTextColor="orange"
          value={importData}
          onChangeText={setImportData}
          editable={!isLoading}
        />
        <Pressable
          onPress={handleImportAll}
          style={[
            tw`bg-amber-500 py-3 px-6 rounded-md items-center justify-center`,
            isLoading && tw`opacity-70`,
          ]}
          disabled={isLoading}
        >
          <Text style={[styles.text, tw`text-amber-700`]}>
            {isLoading ? "Importing..." : importButtonText}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  text: {
    fontFamily: "VarelaRound-Regular",
  },
});

export default AsyncStorageDataManager;
