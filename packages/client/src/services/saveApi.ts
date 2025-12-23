/**
 * Save/Vault API Client
 */

import {
  GetSaveResponse,
  UpdateSaveRequest,
  UpdateSaveResponse,
  AddVaultItemRequest,
  AddVaultItemResponse
} from '@survival-game/shared';
import { getToken } from './authApi';

const API_BASE = '/api/save';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Make authenticated request
 */
async function authenticatedFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();

  if (!token) {
    return {
      success: false,
      error: 'Not authenticated'
    };
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...options.headers
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`
      };
    }

    return data;
  } catch (error) {
    console.error('[SaveAPI] Request failed:', error);
    return {
      success: false,
      error: 'Network error'
    };
  }
}

/**
 * Get user's save data
 */
export async function getSave(): Promise<ApiResponse<GetSaveResponse>> {
  return await authenticatedFetch<GetSaveResponse>(API_BASE, {
    method: 'GET'
  });
}

/**
 * Update save slot
 */
export async function updateSave(
  request: UpdateSaveRequest
): Promise<ApiResponse<UpdateSaveResponse>> {
  return await authenticatedFetch<UpdateSaveResponse>(API_BASE, {
    method: 'PUT',
    body: JSON.stringify(request)
  });
}

/**
 * Add item to vault
 */
export async function addVaultItem(
  request: AddVaultItemRequest
): Promise<ApiResponse<AddVaultItemResponse>> {
  return await authenticatedFetch<AddVaultItemResponse>(
    `${API_BASE}/vault/add`,
    {
      method: 'POST',
      body: JSON.stringify(request)
    }
  );
}

/**
 * Remove item from vault
 */
export async function removeVaultItem(itemId: string): Promise<ApiResponse<any>> {
  return await authenticatedFetch(`${API_BASE}/vault/${itemId}`, {
    method: 'DELETE'
  });
}

/**
 * Set active save slot
 */
export async function setActiveSlot(slotId: string): Promise<ApiResponse<any>> {
  return await authenticatedFetch(`${API_BASE}/active-slot`, {
    method: 'PUT',
    body: JSON.stringify({ slotId })
  });
}
