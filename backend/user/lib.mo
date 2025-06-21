import BTree "mo:stableheapbtreemap/BTree";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Buffer "mo:base/Buffer";
import Principal "mo:base/Principal";
import Types "../types";

module {
  public func addUser(
    users : BTree.BTree<Text, Types.User>,
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

    // Check is username is already registered
    if (BTree.has(users, Text.compare, user.username)) {
      return {
        success = false;
        error = ?"Username already exists";
      };
    };

    // Create a new user object
    ignore BTree.insert<Text, Types.User>(users, Text.compare, newUser.username, newUser);

    return {
      success = true;
      error = null;
    };
  };
  public func getUserById(
    users : BTree.BTree<Text, Types.User>,
    userId : Principal,
  ) : async ?Types.User {
    label search for ((_, user) in BTree.entries(users)) {
      if (user.id == userId) {
        return ?user;
      };
    };
    return null;
  };

  public func getUsers(users : BTree.BTree<Text, Types.User>) : async [Types.User] {
    let resultBuffer = Buffer.Buffer<Types.User>(0);
    for ((key, users) in BTree.entries(users)) {
      resultBuffer.add(users);
    };
    return Buffer.toArray(resultBuffer);
  };
public func updateUser(
  users : BTree.BTree<Text, Types.User>,
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

      if (newUsername != oldUsername and BTree.has(users, Text.compare, newUsername)) {
        return { success = false; error = ?"Username already taken" };
      };

      let updatedUser : Types.User = {
        id = existingUser.id;
        email = newEmail;
        username = newUsername;
        pictureCid = newPictureCid;
        joinedAt = existingUser.joinedAt;
      };

      if (newUsername != oldUsername) {
        ignore BTree.delete(users, Text.compare, oldUsername);
        ignore BTree.insert(users, Text.compare, newUsername, updatedUser);
      } else {
        ignore BTree.insert(users, Text.compare, oldUsername, updatedUser);
      };

      return { success = true; error = null };
    };
  };

  // Jika tidak ditemukan
  return { success = false; error = ?"User not found" };
}


};
