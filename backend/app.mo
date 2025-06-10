import Types "types";
import Utils "utils";
import Report "./report";
import User "./user";
import BTree "mo:stableheapbtreemap/BTree";
import Text "mo:base/Text";
import Iter "mo:base/Iter";


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
    }
}
