import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Share,
  Platform,
  Alert,
} from "react-native";
import tw from "twrnc";
import { RecentTransaction } from "../types/types";

interface ForecastData {
  category: string;
  totalSpentSoFar: number;
  remainingDaysAmount: number;
  nextMonthProjection: number;
  trend: "up" | "down" | "stable";
  overspendingRisk: boolean;
  budgetLimit?: number;
  confidenceScore: number;
}

interface SpendingForecastProps {
  transactions: RecentTransaction[];
  budgets?: { category: string; limit: number }[];
}

const SpendingForecast: React.FC<SpendingForecastProps> = ({
  transactions,
  budgets = [],
}) => {
  const [timeFrame, setTimeFrame] = useState<"weekly" | "monthly" | "yearly">(
    "monthly"
  );

  const calculateForecast = (): ForecastData[] => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Current month calculations
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = endOfMonth.getDate();
    const daysUsed = Math.min(now.getDate(), daysInMonth);
    const remainingDays = daysInMonth - daysUsed;

    const currentMonthTransactions = transactions.filter((tx) => {
      const txDate = new Date(tx.date);
      return tx.type === "debit" && txDate >= startOfMonth && txDate <= now;
    });

    if (currentMonthTransactions.length === 0) return [];

    // Group by category
    const categoryData = currentMonthTransactions.reduce((acc, tx) => {
      const category = tx.category || "Uncategorized";
      const amount = parseFloat(tx.amount);

      if (!acc[category]) {
        acc[category] = {
          totalSpent: 0,
          transactionCount: 0,
          latestDate: startOfMonth,
          budget: budgets.find((b) => b.category === category)?.limit,
        };
      }

      acc[category].totalSpent += amount;
      acc[category].transactionCount++;
      acc[category].latestDate =
        new Date(tx.date) > acc[category].latestDate
          ? new Date(tx.date)
          : acc[category].latestDate;

      return acc;
    }, {} as Record<string, any>);

    return Object.entries(categoryData)
      .map(([category, data]) => {
        // Days with transactions in current month
        const activeDays =
          Math.floor(
            (data.latestDate.getTime() - startOfMonth.getTime()) /
              (1000 * 60 * 60 * 24)
          ) + 1;

        // Average daily spending
        const avgDailySpending = data.totalSpent / activeDays;

        // Calculate projections based on time frame
        let projection = 0;
        switch (timeFrame) {
          case "weekly":
            projection = avgDailySpending * 7;
            break;
          case "yearly":
            projection = avgDailySpending * 365;
            break;
          default: // monthly
            const daysInNextMonth = new Date(
              currentYear,
              currentMonth + 2,
              0
            ).getDate();
            projection = avgDailySpending * daysInNextMonth;
        }

        // Simple trend calculation (could be enhanced)
        const trend: "up" | "down" | "stable" = "stable";

        // Confidence score (0-100)
        const confidenceScore = Math.min(
          100,
          Math.floor(
            (activeDays / daysInMonth) * 100 * 0.7 +
              (data.transactionCount > 5 ? 30 : data.transactionCount * 6)
          )
        );

        return {
          category,
          totalSpentSoFar: Number(data.totalSpent.toFixed(2)),
          remainingDaysAmount: Number(
            (avgDailySpending * remainingDays).toFixed(2)
          ),
          nextMonthProjection: Number(projection.toFixed(2)),
          trend,
          overspendingRisk: data.budget ? projection > data.budget : false,
          budgetLimit: data.budget,
          confidenceScore,
        };
      })
      .sort((a, b) => b.nextMonthProjection - a.nextMonthProjection);
  };

  const forecastData = calculateForecast();
  const nextMonthName = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    1
  ).toLocaleString("default", { month: "long" });

  const exportReport = async () => {
    try {
      // Create detailed report message
      let message = `📊 Spending Forecast Report\n`;
      message += `📅 Generated: ${new Date().toLocaleDateString()}\n`;
      message += `⏳ Time Frame: ${timeFrame}\n\n`;

      // Add projections for each category
      message += `🔷 Category Projections\n`;
      forecastData.forEach((f) => {
        message += `\n🔸 ${f.category}\n`;
        message += `   - Spent: Rs.${f.totalSpentSoFar}\n`;
        message += `   - Projected: Rs.${f.nextMonthProjection}\n`;

        if (f.budgetLimit) {
          const percentage = (f.totalSpentSoFar / f.budgetLimit) * 100;
          message += `   - Budget: Rs.${f.budgetLimit} (${percentage.toFixed(
            0
          )}% used)\n`;
          message += `   - Status: ${
            f.overspendingRisk ? "❌ Over budget risk" : "✅ Within budget"
          }\n`;
        }

        message += `   - Confidence: ${f.confidenceScore}%\n`;
      });

      // Add summary
      const totalProjected = forecastData.reduce(
        (sum, f) => sum + f.nextMonthProjection,
        0
      );
      message += `\n💰 Total Projected: Rs.${totalProjected.toFixed(2)}\n\n`;
      message += `📝 Notes:\n`;
      message += `- Projections based on current spending patterns\n`;
      message += `- Confidence indicates reliability of each projection`;

      // Platform-specific sharing
      if (Platform.OS !== "web") {
        await Share.share({
          title: "My Spending Forecast",
          message,
        });
      } else {
      }
    } catch (error) {
      console.error("Export failed:", error);
      Alert.alert("Error", "Couldn't share the report. Please try again.");
    }
  };

  return (
    <View style={tw`bg-amber-100 p-4 rounded-lg mb-4 elevation-2`}>
      {/* Time Frame Selector */}
      <View style={tw`flex-row justify-around mb-4`}>
        {["weekly", "monthly", "yearly"].map((frame) => (
          <Pressable
            key={frame}
            onPress={() => setTimeFrame(frame as any)}
            style={tw`px-4 py-2 rounded-full ${
              timeFrame === frame ? "bg-amber-200" : "bg-amber-50"
            }`}
          >
            <Text style={[styles.text, tw`text-amber-900`]}>
              {frame.charAt(0).toUpperCase() + frame.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Projections List */}
      {forecastData.length === 0 ? (
        <Text style={[styles.text, tw`text-amber-900 text-center`]}>
          No spending data available for analysis
        </Text>
      ) : (
        <>
          <Text style={[styles.text, tw`text-amber-900 font-bold mb-2`]}>
            {timeFrame === "weekly"
              ? "Weekly Spending Projections"
              : timeFrame === "yearly"
              ? "Annual Spending Projections"
              : `${nextMonthName} Projections`}
          </Text>

          {forecastData.map((forecast) => (
            <View
              key={forecast.category}
              style={tw`mb-3 bg-amber-50 p-3 rounded-lg elevation-2`}
            >
              <View style={tw`flex-row justify-between items-center mb-1`}>
                <Text style={[styles.text, tw`text-amber-900 font-bold`]}>
                  {forecast.category}
                </Text>
                <Text style={[styles.text, tw`text-amber-900 font-bold`]}>
                  Rs. {forecast.nextMonthProjection}
                </Text>
              </View>

              <View style={tw`mb-1`}>
                <Text style={[styles.text, tw`text-amber-800 text-sm`]}>
                  Spent: Rs. {forecast.totalSpentSoFar}
                  {forecast.budgetLimit && (
                    <Text
                      style={tw`${
                        forecast.totalSpentSoFar > forecast.budgetLimit
                          ? "text-red-500"
                          : "text-green-500"
                      }`}
                    >
                      {" "}
                      (
                      {(
                        (forecast.totalSpentSoFar / forecast.budgetLimit) *
                        100
                      ).toFixed(0)}
                      %)
                    </Text>
                  )}
                </Text>
              </View>

              {forecast.budgetLimit && (
                <View style={tw`mb-1`}>
                  <Text style={[styles.text, tw`text-amber-800 text-sm`]}>
                    Budget: Rs. {forecast.budgetLimit}
                    {forecast.overspendingRisk && (
                      <Text style={tw`text-red-500`}> (⚠️ May exceed)</Text>
                    )}
                  </Text>
                </View>
              )}

              <View style={tw`mt-1`}>
                <Text style={[styles.text, tw`text-xs text-amber-800`]}>
                  Confidence: {forecast.confidenceScore}%{" "}
                  {forecast.confidenceScore < 50 && "(Low data)"}
                </Text>
                <View style={tw`h-1 w-full bg-amber-200 mt-1 rounded-full`}>
                  <View
                    style={[
                      tw`h-1 rounded-full ${
                        forecast.confidenceScore > 70
                          ? "bg-green-500"
                          : forecast.confidenceScore > 40
                          ? "bg-amber-500"
                          : "bg-red-500"
                      }`,
                      { width: `${forecast.confidenceScore}%` },
                    ]}
                  />
                </View>
              </View>
            </View>
          ))}

          {/* Total Projection */}
          <View style={tw`mt-4 bg-amber-200 p-3 rounded-lg`}>
            <Text style={[styles.text, tw`text-amber-900 font-bold`]}>
              Total Projected{" "}
              {timeFrame === "weekly"
                ? "This Week"
                : timeFrame === "yearly"
                ? "This Year"
                : `for ${nextMonthName}`}
              : Rs.{" "}
              {forecastData
                .reduce((sum, f) => sum + f.nextMonthProjection, 0)
                .toFixed(2)}
            </Text>
          </View>
        </>
      )}

      {/* Export Button */}
      <Pressable
        onPress={exportReport}
        style={tw`mt-4 bg-amber-800 py-2 px-4 rounded-full self-center`}
      >
        <Text style={[styles.text, tw`text-white`]}>
          Export Forecast Report
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  text: {
    fontFamily: "VarelaRound-Regular",
  },
});

export default SpendingForecast;
