export type Branch = {
  id: string;
  name: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Account = {
  id: string;
  branch_id: string;
  name: string;
  bank: string | null;
  alias_cbu: string | null;
  color: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Staff = {
  id: string;
  branch_id: string;
  name: string;
  pin_hash: string;
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Receipt = {
  id: string;
  branch_id: string;
  account_id: string;
  staff_id: string;
  photo_path: string;
  photo_size: number | null;
  photo_mime: string | null;
  captured_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
  edited_at: string | null;
  edited_by: string | null;
  admin_note: string | null;
  created_at: string;
};

// Vista enriquecida (joins comunes)
export type ReceiptWithRefs = Receipt & {
  branch: Pick<Branch, "id" | "name">;
  account: Pick<Account, "id" | "name" | "color" | "icon">;
  staff: Pick<Staff, "id" | "name" | "avatar_url">;
};

export type StaffPublic = Pick<Staff, "id" | "name" | "avatar_url" | "branch_id">;

export type AccountPublic = Pick<
  Account,
  "id" | "name" | "bank" | "color" | "icon" | "sort_order" | "branch_id"
>;
