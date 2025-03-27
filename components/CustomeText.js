import React from "react";
import { Text as RNText } from "react-native";

const CustomText = (props) => {
  return (
    <RNText
      {...props}
      style={[{ fontFamily: "VarelaRound-Regular" }, props.style]}
    >
      {props.children}
    </RNText>
  );
};

export default CustomText;
