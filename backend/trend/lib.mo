import Types "../types";
import Time "mo:base/Time";
import Buffer "mo:base/Buffer";
import BTree "mo:stableheapbtreemap/BTree";
import Nat "mo:base/Nat";
import Int "mo:base/Int";

module {
  // Function to get daily trends
  public func getDailyTrends(trends : BTree.BTree<Text, Types.TrendData>) : async [Types.TrendData] {
    // Get the current time in nanoseconds
    let currentTime = Time.now();

    // 1 day in nanoseconds
    let oneDayInNanos = 24 * 60 * 60 * 1_000_000_000;

    // Calculate the start time for today (timestamp 24 hours ago)
    let dayStartTime = currentTime - oneDayInNanos;

    // Array to store trends from today
    let dailyTrends = Buffer.Buffer<Types.TrendData>(0);

    // Iterate through the trends and filter by timestamp
    for ((_, trend) in BTree.entries(trends)) {
      if (trend.timestamp >= dayStartTime) {
        dailyTrends.add(trend);
      };
    };

    return Buffer.toArray(dailyTrends);
  };

  // Function to get weekly trends
  public func getWeeklyTrends(trends : BTree.BTree<Text, Types.TrendData>) : async [Types.TrendData] {
    // Get the current time in nanoseconds
    let currentTime = Time.now();

    // 1 week in nanoseconds
    let oneWeekInNanos = 7 * 24 * 60 * 60 * 1_000_000_000;

    // Calculate the start time for this week (timestamp 7 days ago)
    let weekStartTime = currentTime - oneWeekInNanos;

    // Array to store trends from this week
    let weeklyTrends = Buffer.Buffer<Types.TrendData>(0);

    // Iterate through the trends and filter by timestamp
    for ((_, trend) in BTree.entries(trends)) {
      if (trend.timestamp >= weekStartTime) {
        weeklyTrends.add(trend);
      };
    };

    return Buffer.toArray(weeklyTrends);
  };
  // Function to get monthly trends
  public func getMonthlyTrends(trends : BTree.BTree<Text, Types.TrendData>) : async [Types.TrendData] {
    // Get the current time in nanoseconds
    let currentTime = Time.now();

    // 1 month in nanoseconds (approx. 30 days)
    let oneMonthInNanos = 30 * 24 * 60 * 60 * 1_000_000_000;

    // Calculate the start time for this month (timestamp 30 days ago)
    let monthStartTime = currentTime - oneMonthInNanos;

    // Array to store trends from this month
    let monthlyTrends = Buffer.Buffer<Types.TrendData>(0);

    // Iterate through the trends and filter by timestamp
    for ((_, trend) in BTree.entries(trends)) {
      if (trend.timestamp >= monthStartTime) {
        monthlyTrends.add(trend);
      };
    };

    return Buffer.toArray(monthlyTrends);
  };

  // Function to get trends by category
  public func getTrendsByCategory(trends : BTree.BTree<Text, Types.TrendData>, category : Text) : async [Types.TrendData] {
    // Array to store trends for the specified category
    let categoryTrends = Buffer.Buffer<Types.TrendData>(0);

    // Iterate through the trends and filter by category
    for ((_, trend) in BTree.entries(trends)) {
      if (trend.category == category) {
        categoryTrends.add(trend);
      };
    };

    return Buffer.toArray(categoryTrends);
  };
  // Function to get category statistics by year
  public func getCategoryByYear(category : BTree.BTree<Text, Types.TrendData>, year : Int) : async [Types.TrendData] {
    // Get the current time in nanoseconds
    let currentTime = Time.now();

    // Calculate start and end timestamps for the specified year (Unix epoch in nanoseconds)
    // Jan 1st of the year at 00:00:00 UTC, in nanoseconds
    let yearStartTime = (year - 1970) * 365 * 24 * 60 * 60 * 1_000_000_000;
    // Jan 1st of the next year
    let yearEndTime = (year - 1969) * 365 * 24 * 60 * 60 * 1_000_000_000;

    // Array to store trends for the specified year
    let yearlyTrends = Buffer.Buffer<Types.TrendData>(0);

    // Iterate through the trends and filter by timestamp
    for ((_, trend) in BTree.entries(category)) {
      if (trend.timestamp >= yearStartTime and trend.timestamp < yearEndTime) {
        yearlyTrends.add(trend);
      };
    };

    return Buffer.toArray(yearlyTrends);
  };
};
