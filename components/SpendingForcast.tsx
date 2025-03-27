import React from "react";
import { View, Text, StyleSheet } from "react-native";
import tw from "twrnc";

interface RecentTransaction {
  id: string;
  recipient: string;
  category?: string;
  amount: string;
  accountName: string;
  lastFourDigits: string;
  type: "credit" | "debit";
  date: string;
}

interface ForecastData {
  category: string;
  monthlyProjection: number;
  frequency: number;
  calculationDetails: {
    totalSpent: number;
    dailyAvg: number;
    daysSpanned: number;
    dailyFrequency: number;
    remainingDays: number;
  };
}

interface SpendingForecastProps {
  transactions: RecentTransaction[];
}

const SpendingForecast: React.FC<SpendingForecastProps> = ({
  transactions,
}) => {
  const calculateForecast = (): ForecastData[] => {
    const now = new Date(); // March 26, 2025
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    ).getDate();
    const remainingDays = daysInMonth - now.getDate();

    const currentMonthTransactions = transactions.filter((tx) => {
      const txDate = new Date(tx.date);
      return tx.type === "debit" && txDate >= startOfMonth && txDate <= now;
    });

    if (currentMonthTransactions.length === 0) {
      return [];
    }

    const categoryTotals = currentMonthTransactions.reduce((acc, tx) => {
      const category = tx.category || "Uncategorized";
      const amount = parseFloat(tx.amount);
      const txDate = new Date(tx.date);
      if (!acc[category]) {
        acc[category] = {
          total: 0,
          count: 0,
          earliestDate: txDate,
          latestDate: txDate,
        };
      }
      acc[category].total += amount;
      acc[category].count += 1;
      acc[category].earliestDate =
        txDate < acc[category].earliestDate
          ? txDate
          : acc[category].earliestDate;
      acc[category].latestDate =
        txDate > acc[category].latestDate ? txDate : acc[category].latestDate;
      return acc;
    }, {} as Record<string, { total: number; count: number; earliestDate: Date; latestDate: Date }>);

    return Object.entries(categoryTotals)
      .map(([category, data]) => {
        const timeDiff =
          data.latestDate.getTime() - data.earliestDate.getTime();
        const daysSpanned = Math.max(
          1,
          Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1
        );
        const dailyAvg = data.total / daysSpanned;
        const dailyFrequency = data.count / daysSpanned;
        const monthlyProjection =
          data.count > 1 ? data.total + dailyAvg * remainingDays : data.total;
        const frequency = data.count > 1 ? dailyFrequency * remainingDays : 0;

        return {
          category,
          monthlyProjection: Number(monthlyProjection.toFixed(2)),
          frequency: Number(frequency.toFixed(2)),
          calculationDetails: {
            totalSpent: Number(data.total.toFixed(2)),
            dailyAvg: Number(dailyAvg.toFixed(2)),
            daysSpanned,
            dailyFrequency: Number(dailyFrequency.toFixed(2)),
            remainingDays,
          },
        };
      })
      .sort((a, b) => b.monthlyProjection - a.monthlyProjection);
  };

  const forecastData = calculateForecast();
  const daysUsed =
    forecastData.length > 0
      ? new Set(
          transactions
            .filter(
              (tx) =>
                tx.type === "debit" &&
                new Date(tx.date) >=
                  new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            )
            .map((tx) => new Date(tx.date).toLocaleDateString())
        ).size
      : 0;
  const now = new Date();
  const remainingDays =
    new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() -
    now.getDate();

  return (
    <View style={tw`bg-amber-100 p-3 rounded-md`}>
      <Text style={[tw`text-amber-900 text-lg mb-2`, styles.text]}>
        Monthly Spending Forecast (Based on {daysUsed} day
        {daysUsed !== 1 ? "s" : ""} of data, {remainingDays} days remaining)
      </Text>
      {forecastData.length === 0 ? (
        <Text style={[tw`text-amber-900 text-center`, styles.text]}>
          No spending data available for this month
        </Text>
      ) : (
        forecastData.map((forecast) => (
          <View
            key={forecast.category}
            style={tw`mb-2 border-b border-amber-300 pb-2`}
          >
            <Text style={[tw`text-amber-900 font-bold`, styles.text]}>
              {forecast.category}
            </Text>
            <Text style={[tw`text-amber-900`, styles.text]}>
              Monthly Projection: Rs. {forecast.monthlyProjection}
            </Text>
            <Text style={[tw`text-amber-900 text-xs`, styles.text]}>
              Calculation: {forecast.calculationDetails.totalSpent} spent + (
              {forecast.calculationDetails.dailyAvg} avg/day ×{" "}
              {forecast.calculationDetails.remainingDays} days remaining)
              {forecast.calculationDetails.dailyAvg === 0
                ? " (One-time expense, no projection)"
                : ""}
            </Text>
            <Text style={[tw`text-amber-900`, styles.text]}>
              Remaining Frequency: {forecast.frequency} transactions
            </Text>
            <Text style={[tw`text-amber-900 text-xs`, styles.text]}>
              Frequency Calc: {forecast.calculationDetails.dailyFrequency}{" "}
              transactions/day × {forecast.calculationDetails.remainingDays}{" "}
              days
              {forecast.calculationDetails.dailyFrequency === 0
                ? " (One-time expense, no further transactions)"
                : ""}
            </Text>
          </View>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  text: {
    fontFamily: "VarelaRound-Regular",
  },
});

export default SpendingForecast;
