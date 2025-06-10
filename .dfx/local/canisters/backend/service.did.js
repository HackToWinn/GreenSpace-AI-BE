export const idlFactory = ({ IDL }) => {
  const UserId = IDL.Principal;
  const Time = IDL.Int;
  const Location = IDL.Record({
    'latitude' : IDL.Float64,
    'longitude' : IDL.Float64,
  });
  const Report = IDL.Record({
    'id' : IDL.Nat,
    'status' : IDL.Text,
    'user' : UserId,
    'description' : IDL.Text,
    'imageCid' : IDL.Text,
    'rewardGiven' : IDL.Opt(IDL.Nat),
    'timestamp' : Time,
    'category' : IDL.Text,
    'location' : IDL.Text,
    'coordinates' : Location,
  });
  return IDL.Service({
    'addReport' : IDL.Func([IDL.Text, Report], [], []),
    'fetchAllValidReport' : IDL.Func([], [IDL.Vec(Report)], []),
    'getReport' : IDL.Func([IDL.Text], [IDL.Opt(Report)], []),
  });
};
export const init = ({ IDL }) => { return []; };
