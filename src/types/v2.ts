/**
 * V2 wire-format types.
 *
 * These model the response shapes from https://api.lunchmoney.dev/v2.
 * Only types that meaningfully diverge from the MCP-facing types in
 * ./index.ts are defined here. Simple domains (User, basic Transaction
 * fields) are close enough to reuse the existing types directly.
 */

// --- Tags ---

export interface V2Tag {
  id: number;
  name: string;
  description: string;
  text_color: string;
  background_color: string;
  updated_at: string;
  created_at: string;
  archived: boolean;
  archived_at: string | null;
}

export interface V2TagsResponse {
  tags: V2Tag[];
}

// --- Manual Accounts (v1 "Assets") ---

export type ManualAccountType =
  | "cash"
  | "credit"
  | "cryptocurrency"
  | "employee compensation"
  | "investment"
  | "loan"
  | "other liability"
  | "other asset"
  | "real estate"
  | "vehicle";

export interface ManualAccount {
  id: number;
  name: string;
  institution_name: string;
  display_name: string;
  type: ManualAccountType;
  subtype: string;
  balance: string;
  currency: string;
  to_base: number;
  balance_as_of: string;
  status: "active" | "closed";
  closed_on: string | null;
  external_id: string | null;
  custom_metadata?: Record<string, unknown>;
  exclude_from_transactions: boolean;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface ManualAccountsResponse {
  manual_accounts: ManualAccount[];
}

// --- Plaid Accounts ---

export type V2PlaidAccountStatus =
  | "active"
  | "inactive"
  | "closed"
  | "deactivated"
  | "not found"
  | "not supported"
  | "relink"
  | "syncing"
  | "revoked"
  | "error";

export interface V2PlaidAccount {
  id: number;
  plaid_item_id: string;
  date_linked: string;
  linked_by_name: string;
  name: string;
  display_name: string;
  type: string;
  subtype: string;
  mask: string;
  institution_name: string;
  status: V2PlaidAccountStatus;
  allow_transaction_modifications: boolean;
  limit: number | null;
  balance: string;
  currency: string;
  to_base: number;
  balance_last_update: string;
  import_start_date: string;
  last_import: string;
  last_fetch: string;
  plaid_last_successful_update: string;
}

export interface V2PlaidAccountsResponse {
  plaid_accounts: V2PlaidAccount[];
}

// --- Categories ---

export interface V2ChildCategory {
  id: number;
  name: string;
  description: string | null;
  is_income: boolean;
  exclude_from_budget: boolean;
  exclude_from_totals: boolean;
  updated_at: string;
  created_at: string;
  group_id: number | null;
  is_group: false;
  archived: boolean;
  archived_at: string | null;
  order: number | null;
  collapsed: boolean;
}

export interface V2Category {
  id: number;
  name: string;
  description: string | null;
  is_income: boolean;
  exclude_from_budget: boolean;
  exclude_from_totals: boolean;
  updated_at: string;
  created_at: string;
  group_id: number | null;
  is_group: boolean;
  children?: V2ChildCategory[];
  archived: boolean;
  archived_at: string | null;
  order: number | null;
  collapsed: boolean;
}

export interface V2CategoriesResponse {
  categories: V2Category[];
}

// --- Transactions ---

export type V2TransactionStatus = "reviewed" | "unreviewed" | "delete_pending";

export interface V2Transaction {
  id: number;
  date: string;
  payee: string;
  amount: string;
  currency: string;
  notes: string | null;
  category_id: number | null;
  recurring_id: number | null;
  manual_account_id: number | null;
  plaid_account_id: number | null;
  status: V2TransactionStatus;
  is_group: boolean;
  group_id: number | null;
  parent_id: number | null;
  has_children: boolean;
  external_id: string | null;
  original_name: string | null;
  tags: V2Tag[] | null;
  created_at: string;
  updated_at: string;
}

export interface V2TransactionsResponse {
  transactions: V2Transaction[];
  has_more: boolean;
}

// --- Recurring Items ---

export interface V2RecurringTransactionCriteria {
  start_date: string | null;
  end_date: string | null;
  granularity: "day" | "week" | "month" | "year";
  quantity: number;
  anchor_date: string;
  payee: string | null;
  amount: string;
  to_base: number;
  currency: string;
  plaid_account_id: number | null;
  manual_account_id: number | null;
}

export interface V2RecurringOverrides {
  payee?: string;
  notes?: string;
  category_id?: number;
}

export interface V2RecurringMatches {
  request_start_date?: string;
  request_end_date?: string;
  expected_occurrence_dates?: string[];
  found_transactions?: Array<{ date: string; transaction_id: number }>;
  missing_transaction_dates?: string[];
}

export interface V2RecurringItem {
  id: number;
  description: string;
  status: "suggested" | "reviewed";
  transaction_criteria: V2RecurringTransactionCriteria;
  overrides: V2RecurringOverrides;
  matches: V2RecurringMatches | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  source: "manual" | "transaction" | "system" | null;
}

export interface V2RecurringItemsResponse {
  recurring_items: V2RecurringItem[];
}

// --- User ---

export interface V2User {
  user_name: string;
  user_email: string;
  user_id: number;
  account_id: number;
  budget_name: string;
  primary_currency: string;
  api_key_label: string | null;
}
