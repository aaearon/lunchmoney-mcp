/**
 * API Facade — centralizes all Lunch Money API operations.
 *
 * Each domain method routes to v1 or v2 and applies any necessary
 * mapping so that callers always receive MCP-compatible types.
 * Initially all methods delegate to v1; they are switched to v2
 * domain-by-domain during the migration.
 */
import type { HttpClient } from "./http-client.js";
import type { V2User, ManualAccount, ManualAccountsResponse, V2Category, V2CategoriesResponse, V2RecurringItem, V2RecurringItemsResponse } from "../types/v2.js";
import { mapManualAccountToAsset, mapAssetRequestToManualAccountRequest } from "./mappers/assets.js";
import { mapV2CategoryToCategory, mapCategoryGroupRequestToV2, mapAddToGroupRequestToV2Update } from "./mappers/categories.js";
import { mapV2StatusToV1, mapV1StatusToV2, mapV1FilterParamsToV2 } from "./mappers/transactions.js";
import { mapV2RecurringItemToV1 } from "./mappers/recurring.js";
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
  PlaidAccount,
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
        return { categories: response.categories.map(mapV2CategoryToCategory) };
      },
      get: async (id) => {
        const v2Cat = await v2.get<V2Category>(`/categories/${id}`);
        return mapV2CategoryToCategory(v2Cat);
      },
      create: async (data) => {
        const v2Cat = await v2.post<V2Category>("/categories", data);
        return { category: mapV2CategoryToCategory(v2Cat) };
      },
      update: async (id, data) => {
        const v2Cat = await v2.put<V2Category>(`/categories/${id}`, data);
        return { category: mapV2CategoryToCategory(v2Cat) };
      },
      delete: (id) => v2.delete(`/categories/${id}`),
      createGroup: async (data) => {
        const body = mapCategoryGroupRequestToV2(data);
        const v2Cat = await v2.post<V2Category>("/categories", body);
        return { category_group: { id: v2Cat.id, name: v2Cat.name, created_at: v2Cat.created_at } };
      },
      addToGroup: async (groupId, data) => {
        const body = mapAddToGroupRequestToV2Update(data);
        return v2.put(`/categories/${groupId}`, body);
      },
    },
    tags: {
      list: () => v2.get<TagsResponse>("/tags"),
      create: (data) => v2.post<{ tag: Tag }>("/tags", data),
      update: (id, data) => v2.put<{ tag: Tag }>(`/tags/${id}`, data),
      delete: (id) => v2.delete(`/tags/${id}`),
    },
    transactions: {
      list: async (params) => {
        const v2Params = params ? mapV1FilterParamsToV2(params) : undefined;
        const response = await v2.get<TransactionsResponse>("/transactions", v2Params);
        // Map status values back to v1 for MCP compat
        response.transactions = response.transactions.map((t) => ({
          ...t,
          status: t.status ? mapV2StatusToV1(t.status) as Transaction["status"] : t.status,
        }));
        return response;
      },
      get: async (id) => {
        const t = await v2.get<Transaction>(`/transactions/${id}`);
        return { ...t, status: t.status ? mapV2StatusToV1(t.status) as Transaction["status"] : t.status };
      },
      create: async (data) => {
        // Map status in request if present
        const body = { ...data };
        if (typeof body.status === "string") {
          body.status = mapV1StatusToV2(body.status as string) ?? body.status;
        }
        const result = await v2.post<{ transaction: Transaction }>("/transactions", body);
        if (result.transaction?.status) {
          result.transaction.status = mapV2StatusToV1(result.transaction.status) as Transaction["status"];
        }
        return result;
      },
      update: async (id, data) => {
        const body = { ...data };
        if (typeof body.status === "string") {
          body.status = mapV1StatusToV2(body.status as string) ?? body.status;
        }
        const result = await v2.put<{ transaction: Transaction }>(`/transactions/${id}`, body);
        if (result.transaction?.status) {
          result.transaction.status = mapV2StatusToV1(result.transaction.status) as Transaction["status"];
        }
        return result;
      },
      delete: (id) => v2.delete(`/transactions/${id}`),
      bulkUpdate: (data) => v2.put<{ updated: number }>("/transactions", data),
      getGroup: async (transactionId) => {
        const t = await v2.get<Transaction>(`/transactions/group/${transactionId}`);
        return { ...t, status: t.status ? mapV2StatusToV1(t.status) as Transaction["status"] : t.status };
      },
      createGroup: (data) => v2.post<Transaction>("/transactions/group", data),
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
      list: () => v2.get<BudgetsResponse>("/budgets"),
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
      list: () => v2.get<PlaidAccountsResponse>("/plaid_accounts"),
      fetch: async () => {
        await v2.post("/plaid_accounts/fetch");
        return true;
      },
    },
  };
}
