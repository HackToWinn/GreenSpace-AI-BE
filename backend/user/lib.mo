import BTree "mo:stableheapbtreemap/BTree";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Buffer "mo:base/Buffer";
import Principal "mo:base/Principal";
import Types "../types";

module {
  public func addUser(
    users : BTree.BTree<Principal, Types.User>,
    principal : Principal,
    user : object {
      email : Text;
      username : Text;
      pictureCid : Text;
    },
  ) : async { success : Bool; error : ?Text } {
    // Get the timestamp for the current time
    let currentTime = Time.now();

    let newUser : Types.User = {
      id = principal;
      username = user.username;
      email = user.email;
      pictureCid = user.pictureCid;
      joinedAt = currentTime;
    };

    // Check if principal is already registered
    if (BTree.has(users, Principal.compare, principal)) {
      return {
        success = false;
        error = ?"User already exists";
      };
    };

    // Check if username is already taken
    label check for ((_, existingUser) in BTree.entries(users)) {
      if (existingUser.username == newUser.username) {
        return {
          success = false;
          error = ?"Username already taken";
        };
      };
    };

    // Create a new user object
    ignore BTree.insert<Principal, Types.User>(users, Principal.compare, newUser.id, newUser);

    return {
      success = true;
      error = null;
    };
  };
  public func getUserById(
    users : BTree.BTree<Principal, Types.User>,
    userId : Principal,
  ) : async ?Types.User {
    label search for ((_, user) in BTree.entries(users)) {
      if (user.id == userId) {
        return ?user;
      };
    };
    return null;
  };

  public func getUsers(users : BTree.BTree<Principal, Types.User>) : async [Types.User] {
    let resultBuffer = Buffer.Buffer<Types.User>(0);
    for ((key, users) in BTree.entries(users)) {
      resultBuffer.add(users);
    };
    return Buffer.toArray(resultBuffer);
  };
public func updateUser(
  users : BTree.BTree<Principal, Types.User>,
  principal : Principal,
  user : {
    email : ?Text;
    username : ?Text;
    pictureCid : ?Text;
  },
) : async { success : Bool; error : ?Text } {

  label search for ((oldUsername, existingUser) in BTree.entries(users)) {
    if (existingUser.id == principal) {

      let newEmail = switch (user.email) {
        case null existingUser.email;
        case (?e) e;
      };

      let newUsername = switch (user.username) {
        case null existingUser.username;
        case (?u) u;
      };

      let newPictureCid = switch (user.pictureCid) {
        case null existingUser.pictureCid;
        case (?p) p;
      };

      if (newUsername != oldUsername) {
        // Manually check if the new username already exists
        label check for ((_, userEntry) in BTree.entries(users)) {
          if (userEntry.username == newUsername) {
            return { success = false; error = ?"Username already taken" };
          };
        };
      };

      let updatedUser : Types.User = {
        id = existingUser.id;
        email = newEmail;
        username = newUsername;
        pictureCid = newPictureCid;
        joinedAt = existingUser.joinedAt;
      };

      if (newUsername != oldUsername) {
        ignore BTree.delete(users, Principal.compare, principal);
        ignore BTree.insert(users, Principal.compare, principal, updatedUser);
      } else {
        ignore BTree.insert(users, Principal.compare, principal, updatedUser);
      };

      return { success = true; error = null };
    };
  };

  // Jika tidak ditemukan
  return { success = false; error = ?"User not found" };
}




};
