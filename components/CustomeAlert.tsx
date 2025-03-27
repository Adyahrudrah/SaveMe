import React from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";
import tw from "twrnc";

interface CustomAlertProps {
  visible: boolean;
  title?: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  singleButton?: boolean;
}

const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "OK",
  cancelText = "Cancel",
  singleButton = false,
}) => {
  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={tw`flex-1 bg-black/50 justify-center items-center`}>
        <View style={tw`w-4/5 bg-white rounded-lg p-5 items-center shadow-lg`}>
          {title && (
            <Text style={tw`text-lg font-bold text-gray-800 mb-2`}>
              {title}
            </Text>
          )}
          <Text style={tw`text-base text-gray-600 text-center mb-5`}>
            {message}
          </Text>
          <View style={tw`flex-row justify-between w-full`}>
            {!singleButton && (
              <TouchableOpacity
                style={tw`flex-1 bg-gray-400 py-2 mx-1 rounded-md`}
                onPress={onCancel}
              >
                <Text style={tw`text-white text-base font-bold text-center`}>
                  {cancelText}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={tw`flex-1 bg-amber-500 py-2 mx-1 rounded-md`}
              onPress={onConfirm}
            >
              <Text style={tw`text-white text-base font-bold text-center`}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CustomAlert;
