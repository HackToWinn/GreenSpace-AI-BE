import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Location { 'latitude' : number, 'longitude' : number }
export interface Report {
  'id' : string,
  'status' : string,
  'user' : [] | [UserId],
  'description' : string,
  'imageCid' : string,
  'rewardGiven' : [] | [number],
  'timestamp' : Time,
  'category' : string,
  'presentage_confidence' : string,
  'confidence' : string,
  'location' : string,
  'coordinates' : Location,
}
export type Time = bigint;
export interface User {
  'id' : UserId,
  'username' : string,
  'pictureCid' : string,
  'joinedAt' : Time,
  'email' : string,
}
export type UserId = Principal;
export interface _SERVICE {
  'addReport' : ActorMethod<[string, Report], undefined>,
  'addUser' : ActorMethod<
    [string, string, string],
    { 'error' : [] | [string], 'success' : boolean }
  >,
  'getLatestReport' : ActorMethod<[], [] | [Report]>,
  'getMostReportedCategory' : ActorMethod<[], [] | [string]>,
  'getReport' : ActorMethod<[string], [] | [Report]>,
  'getReportByUser' : ActorMethod<[], Array<Report>>,
  'getReportsThisWeek' : ActorMethod<[], Array<Report>>,
  'getUserById' : ActorMethod<[], [] | [User]>,
  'getUsers' : ActorMethod<[], Array<User>>,
  'getValidReportCount' : ActorMethod<[], bigint>,
  'getValidReports' : ActorMethod<[], Array<Report>>,
  'getValidWeeklyReportCount' : ActorMethod<[], bigint>,
  'updateUser' : ActorMethod<
    [[] | [string], [] | [string], [] | [string]],
    { 'error' : [] | [string], 'success' : boolean }
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
