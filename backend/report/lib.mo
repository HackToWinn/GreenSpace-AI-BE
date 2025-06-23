import Types "../types";
import Text "mo:base/Text";
import BTree "mo:stableheapbtreemap/BTree";
import Buffer "mo:base/Buffer";
import Time "mo:base/Time";
import Array "mo:base/Array";
import Principal "mo:base/Principal";

module {
  public func addReport(id : Text, report : Types.Report, reports : BTree.BTree<Text, Types.Report>, principal: Types.UserId) : async () {
    let currentTime = Time.now();

    let newReport : Types.Report = {
      id = report.id;
      user = principal;
      category = report.category;
      description = report.description;
      confidence = report.confidence;
      presentage_confidence = report.presentage_confidence;
      location = report.location;
      coordinates = report.coordinates;
      imageCid = report.imageCid;
      timestamp = currentTime;
      status = "valid";
      rewardGiven = report.rewardGiven;
    };

    ignore BTree.insert<Text, Types.Report>(
      reports,
      Text.compare,
      id,
      newReport,
    );
  };
  public func getAllValidReports(reports : BTree.BTree<Text, Types.Report>) : async [Types.Report] {
    let resultBuffer = Buffer.Buffer<Types.Report>(0);
    for ((key, report) in BTree.entries(reports)) {
      if (isValidReport(report)) {
        resultBuffer.add(report);
      };
    };
    return Buffer.toArray(resultBuffer);
  };
  func isValidReport(report : Types.Report) : Bool {
    return report.status == "valid";
  };
  public func getReportsThisWeek(reports : BTree.BTree<Text, Types.Report>) : async [Types.Report] {
    // Get the current time in nanoseconds
    let currentTime = Time.now();

    // 1 week in nanoseconds
    let oneWeekInNanos = 7 * 24 * 60 * 60 * 1_000_000_000;

    // Calculate the start time for this week (timestamp 7 days ago)
    let weekStartTime = currentTime - oneWeekInNanos;

    // Array to store reports from this week
    var weeklyReports : [Types.Report] = [];

    // Iterate over all reports
    for ((id, report) in BTree.entries(reports)) {
      if (report.timestamp >= weekStartTime) {
        weeklyReports := Array.append(weeklyReports, [report]);
      };
    };
    return weeklyReports;
  };

  public func getReportById(id : Text, reports : BTree.BTree<Text, Types.Report>) : async ?Types.Report {
    BTree.get<Text, Types.Report>(reports, Text.compare, id);
  };
  public func getReportByUser(user : Principal, reports : BTree.BTree<Text, Types.Report>, users : BTree.BTree<Principal, Types.User>) : async [{ report : Types.Report; user : ?Types.User }] {
    let resultBuffer = Buffer.Buffer<{ report : Types.Report; user : ?Types.User }>(0);
    for ((key, report) in BTree.entries(reports)) {
      if (report.user == user) {
        let userData = BTree.get(users, Principal.compare, user);
        resultBuffer.add({ report = report; user = userData });
      };
    };
    return Buffer.toArray(resultBuffer);
  };
  public func getLatestReport(reports : BTree.BTree<Text, Types.Report>) : async ?Types.Report {
    // Find the most recently submitted report (with the highest timestamp)
    var latestReport : ?Types.Report = null;
    for ((_, report) in BTree.entries(reports)) {
      // Only consider valid reports
      if (isValidReport(report)) {
        switch (latestReport) {
          case (?currentLatest) {
            if (report.timestamp > currentLatest.timestamp) {
              latestReport := ?report;
            };
          };
          case (null) {
            latestReport := ?report;
          };
        };
      };
    };
    return latestReport;
  };
  public func getValidReportCount(reports : BTree.BTree<Text, Types.Report>) : async Nat {
    var count : Nat = 0;
    for ((_, report) in BTree.entries(reports)) {
      if (isValidReport(report)) {
        count += 1;
      };
    };
    return count;
  };

  public func getValidWeeklyReportCount(reports : BTree.BTree<Text, Types.Report>) : async Nat {
    let currentTime = Time.now();
    let oneWeekInNanos = 7 * 24 * 60 * 60 * 1_000_000_000;
    let weekStartTime = currentTime - oneWeekInNanos;

    var count : Nat = 0;
    for ((_, report) in BTree.entries(reports)) {
      if (isValidReport(report) and report.timestamp >= weekStartTime) {
        count += 1;
      };
    };
    return count;
  };
  public func getMostReportedCategory(reports : BTree.BTree<Text, Types.Report>) : async ?Text {
    let categoryCount = BTree.init<Text, Nat>(?24);
    
    // Count occurrences of each category
    for ((_, report) in BTree.entries(reports)) {
      if (isValidReport(report)) {
        let currentCount = switch(BTree.get(categoryCount, Text.compare, report.category)) {
          case null 0;
          case (?count) count;
        };
        ignore BTree.insert(
          categoryCount,
          Text.compare,
          report.category,
          currentCount + 1
        );
      };
    };

    // Find the category with the highest count
    var maxCategory : ?Text = null;
    var maxCount : Nat = 0;

    for ((category, count) in BTree.entries(categoryCount)) {
      if (count > maxCount) {
        maxCategory := ?category;
        maxCount := count;
      };
    };

    return maxCategory;
  };
};
