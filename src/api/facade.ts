/**
 * API Facade — centralizes all Lunch Money API operations.
 *
 * Each domain method routes to v1 or v2 and applies any necessary
 * mapping so that callers always receive MCP-compatible types.
 * Initially all methods delegate to v1; they are switched to v2
 * domain-by-domain during the migration.
 */
import type { HttpClient } from "./http-client.js";
import type { V2User } from "../types/v2.js";
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
      list: () => v1.get<CategoriesResponse>("/categories"),
      get: (id) => v1.get<Category>(`/categories/${id}`),
      create: (data) => v1.post<{ category: Category }>("/categories", data),
      update: (id, data) => v1.put<{ category: Category }>(`/categories/${id}`, data),
      delete: (id) => v1.delete(`/categories/${id}`),
      createGroup: (data) => v1.post<{ category_group: CategoryGroup }>("/categories/group", data),
      addToGroup: (groupId, data) => v1.post(`/categories/group/${groupId}/add`, data),
    },
    tags: {
      list: () => v2.get<TagsResponse>("/tags"),
      create: (data) => v2.post<{ tag: Tag }>("/tags", data),
      update: (id, data) => v2.put<{ tag: Tag }>(`/tags/${id}`, data),
      delete: (id) => v2.delete(`/tags/${id}`),
    },
    transactions: {
      list: (params) => v1.get<TransactionsResponse>("/transactions", params),
      get: (id) => v1.get<Transaction>(`/transactions/${id}`),
      create: (data) => v1.post<{ transaction: Transaction }>("/transactions", data),
      update: (id, data) => v1.put<{ transaction: Transaction }>(`/transactions/${id}`, data),
      delete: (id) => v1.delete(`/transactions/${id}`),
      bulkUpdate: (data) => v1.post<{ updated: number }>("/transactions/bulk", data),
      getGroup: (transactionId) => v1.get<Transaction>("/transactions/group", { transaction_id: transactionId }),
      createGroup: (data) => v1.post<Transaction>("/transactions/group", data),
      deleteGroup: (id) => v1.delete(`/transactions/group/${id}`),
      unsplit: (data) => v1.post("/transactions/unsplit", data),
    },
    recurring: {
      list: () => v1.get<RecurringItemsResponse>("/recurring_expenses"),
      create: (data) => v1.post<{ recurring_expense: RecurringItem }>("/recurring_expenses", data),
      update: (id, data) => v1.put<{ recurring_expense: RecurringItem }>(`/recurring_expenses/${id}`, data),
      delete: (id) => v1.delete(`/recurring_expenses/${id}`),
    },
    budgets: {
      list: () => v1.get<BudgetsResponse>("/budgets"),
      create: (data) => v1.post<{ budget: Budget }>("/budgets", data),
      update: (id, data) => v1.put<{ budget: Budget }>(`/budgets/${id}`, data),
      delete: (id) => v1.delete(`/budgets/${id}`),
    },
    assets: {
      list: () => v1.get<AssetsResponse>("/assets"),
      create: (data) => v1.post<{ asset: Asset }>("/assets", data),
      update: (id, data) => v1.put<{ asset: Asset }>(`/assets/${id}`, data),
      delete: (id) => v1.delete(`/assets/${id}`),
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
