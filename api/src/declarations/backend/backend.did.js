export const idlFactory = ({ IDL }) => {
  const UserId = IDL.Principal;
  const Time = IDL.Int;
  const Location = IDL.Record({
    'latitude' : IDL.Float64,
    'longitude' : IDL.Float64,
  });
  const Report = IDL.Record({
    'id' : IDL.Text,
    'status' : IDL.Text,
    'user' : IDL.Opt(UserId),
    'description' : IDL.Text,
    'imageCid' : IDL.Text,
    'rewardGiven' : IDL.Opt(IDL.Float64),
    'timestamp' : Time,
    'category' : IDL.Text,
    'presentage_confidence' : IDL.Text,
    'confidence' : IDL.Text,
    'location' : IDL.Text,
    'coordinates' : Location,
  });
  return IDL.Service({
    'addReport' : IDL.Func([IDL.Text, Report], [], []),
    'fetchAllValidReport' : IDL.Func([], [IDL.Vec(Report)], []),
    'getReport' : IDL.Func([IDL.Text], [IDL.Opt(Report)], []),
    'getReportsThisWeek' : IDL.Func([], [IDL.Vec(Report)], []),
    'getTotalReports' : IDL.Func([], [IDL.Nat], []),
    'getTotalReportsThisWeek' : IDL.Func([], [IDL.Nat], []),
  });
};
export const init = ({ IDL }) => { return []; };
