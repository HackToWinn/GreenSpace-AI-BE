export const idlFactory = ({ IDL }) => {
  return IDL.Service({ 'hello' : IDL.Func([], [IDL.Text], []) });
};
export const init = ({ IDL }) => { return []; };
