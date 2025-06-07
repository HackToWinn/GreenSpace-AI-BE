
import Time "mo:base/Time";
import Principal "mo:base/Principal";
module {
public type UserId = Principal;
public type Location = {
  latitude: Float;
  longitude: Float;
};
public type Report = {
    id: Nat;
    reporter: UserId;
    timestamp: Time.Time;
    location: Location;
    description: Text;
    imageUrl: Text;
    aiConfidence: ?Float; 
};
public type Reputation = {
  totalReports: Nat;
  verifiedReports: Nat;
  score: Float; 
};
public type AIValidationInput = {
  reportId: Nat;
  isValid: Bool;
  confidence: Float;
};

};