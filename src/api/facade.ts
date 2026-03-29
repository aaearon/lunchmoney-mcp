/**
 * API Facade — centralizes all Lunch Money API operations.
 *
 * Each domain method routes to v1 or v2 and applies any necessary
 * mapping so that callers always receive MCP-compatible types.
 *
 * v2 domains: user, tags, plaid, assets (manual_accounts), categories,
 *             transactions
 * Mixed v1+v2: budgets (PUT on v2, GET/POST/DELETE on v1),
 *              recurring (GET on v2, create/update/delete on v1)
 */
import type { HttpClient } from "./http-client.js";
import { LunchMoneyAPIError } from "../utils/errors.js";
import type { V2User, V2Tag, V2TagsResponse, V2Transaction, V2TransactionsResponse, ManualAccount, ManualAccountsResponse, V2Category, V2CategoriesResponse, V2RecurringItemsResponse, V2PlaidAccountsResponse } from "../types/v2.js";
import { mapManualAccountToAsset, mapAssetRequestToManualAccountRequest } from "./mappers/assets.js";
import { mapV2CategoryToCategory, extractCategoryGroups, mapCategoryRequestToV2, mapCategoryGroupRequestToV2, mapAddToGroupRequestToV2Update } from "./mappers/categories.js";
import { mapV2TransactionToMCP, mapMCPRequestToV2, mapV1FilterParamsToV2, mapV1StatusToV2 } from "./mappers/transactions.js";
import { mapV2RecurringItemToV1 } from "./mappers/recurring.js";
import { mapV2TagToTag } from "./mappers/tags.js";
import { mapV2PlaidAccountToMCP } from "./mappers/plaid.js";
import type {
  User,
  Category,
  CategoryGroup,
  CategoriesResponse,
  Tag,
  TagsResponse,
  Transaction,
  TransactionsResponse,
  RecurringItem,
  RecurringItemsResponse,
  Budget,
  BudgetsResponse,
  Asset,
  AssetsResponse,
  PlaidAccountsResponse,
} from "../types/index.js";

export interface LunchMoneyApi {
  user: {
    get(): Promise<User>;
  };
  categories: {
    list(): Promise<CategoriesResponse>;
    get(id: number): Promise<Category>;
    create(data: Record<string, unknown>): Promise<{ category: Category }>;
    update(id: number, data: Record<string, unknown>): Promise<{ category: Category }>;
    delete(id: number): Promise<void>;
    createGroup(data: Record<string, unknown>): Promise<{ category_group: CategoryGroup }>;
    addToGroup(groupId: number, data: Record<string, unknown>): Promise<unknown>;
  };
  tags: {
    list(): Promise<TagsResponse>;
    create(data: Record<string, unknown>): Promise<{ tag: Tag }>;
    update(id: number, data: Record<string, unknown>): Promise<{ tag: Tag }>;
    delete(id: number): Promise<void>;
  };
  transactions: {
    list(params?: Record<string, unknown>): Promise<TransactionsResponse>;
    get(id: number): Promise<Transaction>;
    create(data: Record<string, unknown>): Promise<{ transaction: Transaction }>;
    update(id: number, data: Record<string, unknown>): Promise<{ transaction: Transaction }>;
    delete(id: number): Promise<void>;
    bulkUpdate(data: Record<string, unknown>): Promise<{ updated: number }>;
    getGroup(transactionId: number): Promise<Transaction>;
    createGroup(data: Record<string, unknown>): Promise<Transaction>;
    deleteGroup(id: number): Promise<void>;
    unsplit(data: Record<string, unknown>): Promise<unknown>;
  };
  recurring: {
    list(): Promise<RecurringItemsResponse>;
    create(data: Record<string, unknown>): Promise<{ recurring_expense: RecurringItem }>;
    update(id: number, data: Record<string, unknown>): Promise<{ recurring_expense: RecurringItem }>;
    delete(id: number): Promise<void>;
  };
  budgets: {
    list(): Promise<BudgetsResponse>;
    create(data: Record<string, unknown>): Promise<{ budget: Budget }>;
    update(id: number, data: Record<string, unknown>): Promise<{ budget: Budget }>;
    delete(id: number): Promise<void>;
  };
  assets: {
    list(): Promise<AssetsResponse>;
    create(data: Record<string, unknown>): Promise<{ asset: Asset }>;
    update(id: number, data: Record<string, unknown>): Promise<{ asset: Asset }>;
    delete(id: number): Promise<void>;
  };
  plaid: {
    list(): Promise<PlaidAccountsResponse>;
    fetch(): Promise<boolean>;
  };
}

/**
 * Create the API facade. Initially all methods use the v1 client.
 * During migration, individual methods are switched to v2.
 */
export function createApiFacade(v1: HttpClient, v2: HttpClient): LunchMoneyApi {
  return {
    user: {
      get: async () => {
        const v2User = await v2.get<V2User>("/me");
        return {
          id: v2User.user_id,
          email: v2User.user_email,
          name: v2User.user_name,
          currency: v2User.primary_currency,
        };
      },
    },
    categories: {
      list: async () => {
        const response = await v2.get<V2CategoriesResponse>("/categories");
        return {
          categories: response.categories.map(mapV2CategoryToCategory),
          category_groups: extractCategoryGroups(response.categories),
        };
      },
      get: async (id) => {
        const v2Cat = await v2.get<V2Category>(`/categories/${id}`);
        return mapV2CategoryToCategory(v2Cat);
      },
      create: async (data) => {
        const body = mapCategoryRequestToV2(data);
        const v2Cat = await v2.post<V2Category>("/categories", body);
        return { category: mapV2CategoryToCategory(v2Cat) };
      },
      update: async (id, data) => {
        const body = mapCategoryRequestToV2(data);
        const v2Cat = await v2.put<V2Category>(`/categories/${id}`, body);
        return { category: mapV2CategoryToCategory(v2Cat) };
      },
      delete: (id) => v2.delete(`/categories/${id}`),
      createGroup: async (data) => {
        const body = mapCategoryGroupRequestToV2(data);
        const v2Cat = await v2.post<V2Category>("/categories", body);
        return { category_group: { id: v2Cat.id, name: v2Cat.name, created_at: v2Cat.created_at } };
      },
      addToGroup: async (groupId, data) => {
        // v2 PUT replaces children, so fetch existing first to merge
        const existing = await v2.get<V2Category>(`/categories/${groupId}`);
        const existingChildIds = existing.children?.map((c) => c.id) ?? [];
        const body = mapAddToGroupRequestToV2Update(data, existingChildIds);
        return v2.put(`/categories/${groupId}`, body);
      },
    },
    tags: {
      list: async () => {
        const response = await v2.get<V2TagsResponse>("/tags");
        return { tags: response.tags.map(mapV2TagToTag) };
      },
      create: async (data) => {
        const v2Tag = await v2.post<V2Tag>("/tags", data);
        return { tag: mapV2TagToTag(v2Tag) };
      },
      update: async (id, data) => {
        const v2Tag = await v2.put<V2Tag>(`/tags/${id}`, data);
        return { tag: mapV2TagToTag(v2Tag) };
      },
      delete: (id) => v2.delete(`/tags/${id}`),
    },
    transactions: {
      list: async (params) => {
        const v2Params = params ? mapV1FilterParamsToV2(params) : undefined;
        const response = await v2.get<V2TransactionsResponse>("/transactions", v2Params);
        return { transactions: response.transactions.map(mapV2TransactionToMCP) };
      },
      get: async (id) => {
        const t = await v2.get<V2Transaction>(`/transactions/${id}`);
        return mapV2TransactionToMCP(t);
      },
      create: async (data) => {
        const body = mapMCPRequestToV2(data);
        const result = await v2.post<{ transactions: V2Transaction[] }>("/transactions", { transactions: [body] });
        const v2Tx = result.transactions?.[0];
        if (!v2Tx) {
          throw new LunchMoneyAPIError("Transaction creation succeeded but no transaction was returned");
        }
        return { transaction: mapV2TransactionToMCP(v2Tx) };
      },
      update: async (id, data) => {
        const body = mapMCPRequestToV2(data);
        const v2Tx = await v2.put<V2Transaction>(`/transactions/${id}`, body);
        return { transaction: mapV2TransactionToMCP(v2Tx) };
      },
      delete: (id) => v2.delete(`/transactions/${id}`),
      bulkUpdate: (data) => {
        const body = { ...data };
        if (typeof body.status === "string") {
          const mapped = mapV1StatusToV2(body.status as string);
          if (mapped) {
            body.status = mapped;
          } else {
            delete body.status;
          }
        }
        return v2.put<{ updated: number }>("/transactions", body);
      },
      getGroup: async (transactionId) => {
        const t = await v2.get<V2Transaction>(`/transactions/group/${transactionId}`);
        return mapV2TransactionToMCP(t);
      },
      createGroup: async (data) => {
        const t = await v2.post<V2Transaction>("/transactions/group", data);
        return mapV2TransactionToMCP(t);
      },
      deleteGroup: (id) => v2.delete(`/transactions/group/${id}`),
      unsplit: (data) => v2.post("/transactions/unsplit", data),
    },
    recurring: {
      list: async () => {
        const response = await v2.get<V2RecurringItemsResponse>("/recurring_items");
        return { recurring_items: response.recurring_items.map(mapV2RecurringItemToV1) };
      },
      create: (data) => v1.post<{ recurring_expense: RecurringItem }>("/recurring_expenses", data),     // v1: no POST in v2
      update: (id, data) => v1.put<{ recurring_expense: RecurringItem }>(`/recurring_expenses/${id}`, data), // v1: no PUT in v2
      delete: (id) => v1.delete(`/recurring_expenses/${id}`),                                             // v1: no DELETE in v2
    },
    budgets: {
      list: () => v1.get<BudgetsResponse>("/budgets"),
      create: (data) => v1.post<{ budget: Budget }>("/budgets", data),        // v1: no POST in v2
      update: (id, data) => v2.put<{ budget: Budget }>(`/budgets/${id}`, data),
      delete: (id) => v1.delete(`/budgets/${id}`),                             // v1: no DELETE in v2
    },
    assets: {
      list: async () => {
        const response = await v2.get<ManualAccountsResponse>("/manual_accounts");
        return { assets: response.manual_accounts.map(mapManualAccountToAsset) };
      },
      create: async (data) => {
        const body = mapAssetRequestToManualAccountRequest(data);
        const account = await v2.post<ManualAccount>("/manual_accounts", body);
        return { asset: mapManualAccountToAsset(account) };
      },
      update: async (id, data) => {
        const body = mapAssetRequestToManualAccountRequest(data);
        const account = await v2.put<ManualAccount>(`/manual_accounts/${id}`, body);
        return { asset: mapManualAccountToAsset(account) };
      },
      delete: (id) => v2.delete(`/manual_accounts/${id}`),
    },
    plaid: {
      list: async () => {
        const response = await v2.get<V2PlaidAccountsResponse>("/plaid_accounts");
        return { plaid_accounts: response.plaid_accounts.map(mapV2PlaidAccountToMCP) };
      },
      fetch: async () => {
        await v2.post("/plaid_accounts/fetch");
        return true;
      },
    },
  };
}
