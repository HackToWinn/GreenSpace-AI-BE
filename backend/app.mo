import Types "types";
import Utils "utils";
import Report "./report";
import User "./user";
import BTree "mo:stableheapbtreemap/BTree";
import Text "mo:base/Text";
import Iter "mo:base/Iter";
import Time "mo:base/Time";
import Array "mo:base/Array";
import Principal "mo:base/Principal";


actor {
    var users = BTree.init<Text, Types.User>(?24);
    var reports = BTree.init<Text, Types.Report>(?24);
     
    public shared(msg) func addReport(id: Text, report: Types.Report) : async () {
      return await Report.addReport(id, report, reports, msg.caller);
    };
    public func getValidReports(): async[Types.Report] {
       return await Report.getAllValidReports(reports);
    };
    public func getReportsThisWeek(): async [Types.Report]{
      return await Report.getReportsThisWeek(reports);
    };
    public func getReport(id: Text) : async ?Types.Report {
        return await Report.getReportById(id, reports);
    };
    public shared(msg) func getReportByUser() : async [Types.Report] {
        return await Report.getReportByUser(msg.caller, reports);
    };
    public func getLatestReport() : async ?Types.Report {
        return await Report.getLatestReport(reports);
    };
    public func getValidReportCount() : async Nat {
        return await Report.getValidReportCount(reports);
    };
    public func getValidWeeklyReportCount() : async Nat {
        return await Report.getValidWeeklyReportCount(reports);
    };
    public func getMostReportedCategory() : async ?Text {
        return await Report.getMostReportedCategory(reports);
    };
    public shared(msg) func addUser(email: Text, username: Text, pictureCid : Text
    ) : async { success: Bool; error: ?Text } {
        return await User.addUser(users, msg.caller, {email = email; username = username; pictureCid = pictureCid});
    };

    public shared(msg) func getUserById() : async ?Types.User {
        return await User.getUserById(users, msg.caller);
    };

    public shared(msg) func getUsers() : async [Types.User] {
        return await User.getUsers(users);
    };
    public shared(msg) func updateUser(email: ?Text, username: ?Text, pictureCid: ?Text) : async { success: Bool; error: ?Text } {
        return await User.updateUser(users, msg.caller, {
            email = email;
            username = username;
            pictureCid = pictureCid;
        });
    };



  
}
