// frontend/src/utils/permissions.ts
/**
 * Permission checking utilities for frontend
 * Handles role normalization to match backend RBAC system
 */

/**
 * Normalize role string to uppercase format (matches backend RBAC constants)
 */
export const normalizeRole = (role?: string): string => {
  if (!role) return "VIEWER";
  
  const roleUpper = role.toUpperCase().trim();
  
  // Map common variations to standard roles
  const roleMapping: Record<string, string> = {
    "ADMIN": "TENANT_ADMIN",
    "TENANT_ADMIN": "TENANT_ADMIN",
    "SUPER_ADMIN": "SUPER_ADMIN",
    "MANAGER": "MANAGER",
    "SALES_REP": "SALES_REP",
    "SALESREP": "SALES_REP",
    "SUPPORT": "SUPPORT",
    "SUPPORT_AGENT": "SUPPORT",
    "VIEWER": "VIEWER",
  };
  
  // Try direct match first
  if (roleUpper in roleMapping) {
    return roleMapping[roleUpper];
  }
  
  // Try to match by prefix or common patterns
  if (roleUpper.includes("ADMIN")) {
    if (roleUpper.includes("SUPER")) {
      return "SUPER_ADMIN";
    }
    return "TENANT_ADMIN";
  }
  if (roleUpper.includes("SUPPORT")) {
    return "SUPPORT";
  }
  if (roleUpper.includes("SALES")) {
    return "SALES_REP";
  }
  
  // Default to VIEWER if no match
  return "VIEWER";
};

/**
 * Check if user can create customers
 */
export const canCreateCustomer = (role?: string): boolean => {
  const normalized = normalizeRole(role);
  return ["SUPER_ADMIN", "TENANT_ADMIN", "MANAGER", "SALES_REP"].includes(normalized);
};

/**
 * Check if user can update customers
 */
export const canUpdateCustomer = (role?: string): boolean => {
  const normalized = normalizeRole(role);
  return ["SUPER_ADMIN", "TENANT_ADMIN", "MANAGER", "SALES_REP"].includes(normalized);
};

/**
 * Check if user can delete customers
 */
export const canDeleteCustomer = (role?: string): boolean => {
  const normalized = normalizeRole(role);
  return ["SUPER_ADMIN", "TENANT_ADMIN", "MANAGER"].includes(normalized);
};

/**
 * Check if user can create logs
 */
export const canCreateLog = (role?: string): boolean => {
  const normalized = normalizeRole(role);
  return ["SUPER_ADMIN", "TENANT_ADMIN", "MANAGER", "SALES_REP", "SUPPORT"].includes(normalized);
};

/**
 * Check if user can delete logs
 */
export const canDeleteLog = (role?: string): boolean => {
  const normalized = normalizeRole(role);
  return ["SUPER_ADMIN", "TENANT_ADMIN", "MANAGER"].includes(normalized);
};

/**
 * Check if user can create complaints
 */
export const canCreateComplaint = (role?: string): boolean => {
  const normalized = normalizeRole(role);
  return ["SUPER_ADMIN", "TENANT_ADMIN", "MANAGER", "SALES_REP", "SUPPORT"].includes(normalized);
};

/**
 * Check if user can update complaints
 */
export const canUpdateComplaint = (role?: string): boolean => {
  const normalized = normalizeRole(role);
  return ["SUPER_ADMIN", "TENANT_ADMIN", "MANAGER", "SALES_REP", "SUPPORT"].includes(normalized);
};

/**
 * Check if user can delete complaints
 */
export const canDeleteComplaint = (role?: string): boolean => {
  const normalized = normalizeRole(role);
  return ["SUPER_ADMIN", "TENANT_ADMIN", "MANAGER"].includes(normalized);
};

