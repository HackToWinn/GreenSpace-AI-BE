
import Time "mo:base/Time";
import Principal "mo:base/Principal";
module {
public type UserId = Principal;
public type Location = {
  latitude: Float;
  longitude: Float;
};
public type Report = {
  id: Text;
    user: ?UserId;
     category: Text;
  description: Text;
  confidence: Text;
  presentage_confidence: Text;
  location: Text;
  coordinates: Location;
  imageCid: Text;
  timestamp: Time.Time;
  status: Text;
  rewardGiven: ?Float;
};
};