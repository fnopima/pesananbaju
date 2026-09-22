import { Order, ShopProfile } from '../types';
import { DEFAULT_SHOP_PROFILE, INITIAL_ORDERS } from '../data/initialData';

const ORDERS_KEY = 'byuzmaa_orders_v1';
const SHOP_KEY = 'byuzmaa_shop_profile_v1';
const SPREADSHEET_KEY = 'byuzmaa_spreadsheet_id_v1';

export function getStoredOrders(): Order[] {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (!raw) {
      localStorage.setItem(ORDERS_KEY, JSON.stringify(INITIAL_ORDERS));
      return INITIAL_ORDERS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read orders from storage', err);
    return INITIAL_ORDERS;
  }
}

export function saveStoredOrders(orders: Order[]): void {
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  } catch (err) {
    console.error('Failed to save orders to storage', err);
  }
}

export function getStoredShopProfile(): ShopProfile {
  try {
    const raw = localStorage.getItem(SHOP_KEY);
    if (!raw) {
      localStorage.setItem(SHOP_KEY, JSON.stringify(DEFAULT_SHOP_PROFILE));
      return DEFAULT_SHOP_PROFILE;
    }
    return JSON.parse(raw);
  } catch (err) {
    return DEFAULT_SHOP_PROFILE;
  }
}

export function saveStoredShopProfile(profile: ShopProfile): void {
  try {
    localStorage.setItem(SHOP_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error('Failed to save shop profile', err);
  }
}

export function getStoredSpreadsheetId(): string | null {
  return localStorage.getItem(SPREADSHEET_KEY);
}

export function saveStoredSpreadsheetId(id: string): void {
  localStorage.setItem(SPREADSHEET_KEY, id);
}
