import React from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { colors } from "../theme";

// react-native-chart-kit can't render null/undefined points (a day with 0
// readings) -- filter those out rather than passing NaN through, same
// end result as the web dashboard's Chart.js `spanGaps: true`.
function cleanSeries(history, metricKey) {
  const labels = [];
  const values = [];
  history.forEach((day) => {
    const v = day[metricKey];
    if (v === null || v === undefined || Number.isNaN(v)) return;
    labels.push(day.date.slice(5)); // "MM-DD"
    values.push(v);
  });
  return { labels, values };
}

export default function TrendChart({ history, metricKey, metricLabel, metricUnit }) {
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = Math.max(280, windowWidth - 64);
  const { labels, values } = cleanSeries(history, metricKey);

  if (values.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Not enough data yet to chart {metricLabel}.</Text>
      </View>
    );
  }

  // Thin out x-axis labels when there are many points so they don't overlap
  // -- react-native-chart-kit has no built-in auto-skip like Chart.js.
  const labelEvery = Math.ceil(labels.length / 8);
  const thinnedLabels = labels.map((l, i) => (i % labelEvery === 0 ? l : ""));

  return (
    <View>
      <LineChart
        data={{
          labels: thinnedLabels,
          datasets: [{ data: values }],
        }}
        width={chartWidth}
        height={200}
        withInnerLines={true}
        withOuterLines={false}
        withShadow={false}
        yAxisSuffix={metricUnit === "%" ? "%" : ""}
        chartConfig={{
          backgroundColor: colors.surface,
          backgroundGradientFrom: colors.surface,
          backgroundGradientTo: colors.surface,
          decimalPlaces: 1,
          color: (opacity = 1) => `rgba(42, 120, 214, ${opacity})`,
          labelColor: (opacity = 1) => colors.textMuted,
          propsForDots: { r: "3", strokeWidth: "2", stroke: colors.series1 },
          propsForBackgroundLines: { stroke: colors.gridline },
        }}
        bezier
        style={styles.chart}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    borderRadius: 8,
    marginLeft: -16, // react-native-chart-kit pads its own y-axis labels
  },
  empty: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 12.5,
  },
});
