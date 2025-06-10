import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Location { 'latitude' : number, 'longitude' : number }
export interface Report {
  'id' : bigint,
  'status' : string,
  'user' : UserId,
  'description' : string,
  'imageCid' : string,
  'rewardGiven' : [] | [bigint],
  'timestamp' : Time,
  'category' : string,
  'location' : string,
  'coordinates' : Location,
}
export type Time = bigint;
export type UserId = Principal;
export interface _SERVICE {
  'addReport' : ActorMethod<[string, Report], undefined>,
  'fetchAllValidReport' : ActorMethod<[], Array<Report>>,
  'getReport' : ActorMethod<[string], [] | [Report]>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
