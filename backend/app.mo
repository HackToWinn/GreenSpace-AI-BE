import Types "types";
import Utils "utils";
import Report "./report";
import User "./user";
import BTree "mo:stableheapbtreemap/BTree";
import Text "mo:base/Text";
import Iter "mo:base/Iter";
import Time "mo:base/Time";
import Array "mo:base/Array";


actor {
    var users = BTree.init<Text, Types.UserId>(?24);
    var reports = BTree.init<Text, Types.Report>(?24);
    var feedBacks = BTree.init<Text, ?Nat>(?24);
     
    public func addReport(id: Text, report: Types.Report) : async () {
    ignore BTree.insert<Text, Types.Report>(
      reports,
      Text.compare,
      id,
      report
    );
  };

    public func getReport(id: Text) : async ?Types.Report {
        return BTree.get(reports, Text.compare, id);
    };

    public func fetchAllValidReport(): async[Types.Report] {
       return await Report.getAllValidReports(reports);
    };
    public func getTotalReportsThisWeek(): async Nat {
      let currentTime = Time.now();
      let oneWeekInNanos = 7 * 24 * 60 * 60 * 1_000_000_000; 
      let weekStartTime = currentTime - oneWeekInNanos;
      
      var weeklyCount = 0;
      for ((id, report) in BTree.entries(reports)) {
        if (report.timestamp >= weekStartTime) {
          weeklyCount += 1;
        };
      };
      
      return weeklyCount;
    };
    public func getReportsThisWeek(): async [Types.Report] {
      let currentTime = Time.now();
      let oneWeekInNanos = 7 * 24 * 60 * 60 * 1_000_000_000; 
      let weekStartTime = currentTime - oneWeekInNanos;
      
      var weeklyReports: [Types.Report] = [];
      for ((id, report) in BTree.entries(reports)) {
        if (report.timestamp >= weekStartTime) {
          weeklyReports := Array.append(weeklyReports, [report]);
        };
      };
      
      return weeklyReports;
    };
    public func getTotalReports(): async Nat {
      return BTree.size(reports);
    };

  
}
