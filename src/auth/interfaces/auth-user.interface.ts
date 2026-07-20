export interface AuthUser {
  id: string;
  email: string;

  role:
    | 'ADMIN'
    | 'SELLER'
    | 'CUSTOMER';

  storeId?: string | null;
}