/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as helpers from "../helpers.js";
import type * as http from "../http.js";
import type * as migrations_migrateRoles from "../migrations/migrateRoles.js";
import type * as organizations from "../organizations.js";
import type * as passwordReset from "../passwordReset.js";
import type * as passwordResetActions from "../passwordResetActions.js";
import type * as products from "../products.js";
import type * as stockRequests from "../stockRequests.js";
import type * as transactions from "../transactions.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  analytics: typeof analytics;
  auth: typeof auth;
  helpers: typeof helpers;
  http: typeof http;
  "migrations/migrateRoles": typeof migrations_migrateRoles;
  organizations: typeof organizations;
  passwordReset: typeof passwordReset;
  passwordResetActions: typeof passwordResetActions;
  products: typeof products;
  stockRequests: typeof stockRequests;
  transactions: typeof transactions;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
