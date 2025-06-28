export const idlFactory = ({ IDL }) => {
  const UserId = IDL.Principal;
  const Time = IDL.Int;
  const Location = IDL.Record({
    'latitude': IDL.Float64,
    'longitude': IDL.Float64,
  });
  const Report = IDL.Record({
    'id': IDL.Text,
    'status': IDL.Text,
    'user': UserId,
    'description': IDL.Text,
    'imageCid': IDL.Text,
    'rewardGiven': IDL.Opt(IDL.Float64),
    'timestamp': Time,
    'category': IDL.Text,
    'presentage_confidence': IDL.Text,
    'confidence': IDL.Text,
    'location': IDL.Text,
    'coordinates': Location,
  });
  const User = IDL.Record({
    'id': UserId,
    'username': IDL.Text,
    'pictureCid': IDL.Text,
    'joinedAt': Time,
    'email': IDL.Text,
  });
  const Trend = IDL.Record({
    'category': IDL.Text,
    'value': IDL.Nat,
    'timestamp': Time,
  });
  return IDL.Service({
    'addReport': IDL.Func([IDL.Text, Report], [], []),
    'addUser': IDL.Func(
      [IDL.Text, IDL.Text, IDL.Text],
      [IDL.Record({ 'error': IDL.Opt(IDL.Text), 'success': IDL.Bool })],
      [],
    ),
    'getLatestReport': IDL.Func([], [IDL.Opt(Report)], []),
    'getMostReportedCategory': IDL.Func([], [IDL.Opt(IDL.Text)], []),
    'getReport': IDL.Func([IDL.Text], [IDL.Opt(Report)], []),
    'getReportByUser': IDL.Func([], [IDL.Vec(Report)], []),
    'getReportsThisWeek': IDL.Func([], [IDL.Vec(Report)], []),
    'getUserById': IDL.Func([], [IDL.Opt(User)], []),
    'getUsers': IDL.Func([], [IDL.Vec(User)], []),
    'getValidReportCount': IDL.Func([], [IDL.Nat], []),
    'getValidReports': IDL.Func([], [IDL.Vec(Report)], []),
    'getValidWeeklyReportCount': IDL.Func([], [IDL.Nat], []),
    'getDailyTrends': IDL.Func([], [IDL.Vec(Trend)], []),
    'getWeeklyTrends': IDL.Func([], [IDL.Vec(Trend)], []),
    'getMonthlyTrends': IDL.Func([], [IDL.Vec(Trend)], []),
    'getTrendsByCategory': IDL.Func([IDL.Text], [IDL.Vec(Trend)], []),
    'getCategoryByYear': IDL.Func([IDL.Int], [IDL.Vec(Trend)], []),
    'updateUser': IDL.Func(
      [IDL.Opt(IDL.Text), IDL.Opt(IDL.Text), IDL.Opt(IDL.Text)],
      [IDL.Record({ 'error': IDL.Opt(IDL.Text), 'success': IDL.Bool })],
      [],
    ),
  });
};
export const init = ({ IDL }) => { return []; };
