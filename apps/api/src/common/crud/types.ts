import type { Db, Tx } from "../../config/database.js";

/**
 * The few Prisma delegate methods the generic layer needs. Prisma's generated delegates are structurally
 * compatible; arguments are loosely typed here because this layer is generic over every model.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Delegate {
  findMany(args?: any): Promise<any[]>;
  findUnique(args: any): Promise<any | null>;
  findFirst(args?: any): Promise<any | null>;
  count(args?: any): Promise<number>;
  create(args: any): Promise<any>;
  update(args: any): Promise<any>;
  delete(args: any): Promise<any>;
  aggregate(args: any): Promise<any>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export type DbLike = Db | Tx;
export type DelegateFor = (db: DbLike) => Delegate;

export interface Actor {
  userId: string;
  email: string;
}
