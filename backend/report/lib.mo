import Types "../types";
import Text "mo:base/Text";
import BTree "mo:stableheapbtreemap/BTree";
import Buffer "mo:base/Buffer";
import Time "mo:base/Time";
import Array "mo:base/Array";

module {
  public func addReport(id : Text, report : Types.Report, reports : BTree.BTree<Text, Types.Report>) : async () {
    let currentTime = Time.now();

    let newReport : Types.Report = {
      id = report.id;
      user = report.user;
      category = report.category;
      description = report.description;
      confidence = report.confidence;
      presentage_confidence = report.presentage_confidence;
      location = report.location;
      coordinates = report.coordinates;
      imageCid = report.imageCid;
      timestamp = currentTime;
      status = report.status;
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

};
