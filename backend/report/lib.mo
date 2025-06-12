import Types "../types";
import Text "mo:base/Text";
import BTree "mo:stableheapbtreemap/BTree";
import Buffer "mo:base/Buffer";

module {
    public func getAllValidReports(reports : BTree.BTree<Text, Types.Report>) : async [Types.Report] {
        let resultBuffer = Buffer.Buffer<Types.Report>(0);
        for ((key, report) in BTree.entries(reports)) {
            if (isValidReport(report)) {
                resultBuffer.add(report);
            }
        };
        return Buffer.toArray(resultBuffer);
    };
    func isValidReport(report : Types.Report) : Bool {
        return report.status == "valid";
    };

};