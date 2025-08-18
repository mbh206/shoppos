// Role-Based Access Control utilities
import { UserRole } from '@prisma/client'

// Define role hierarchy (higher number = more permissions)
const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 100,
  manager: 75,
  host: 50,
  server: 50,
  kitchen: 50,
  employee: 25,
}

/**
 * Check if a user role has at least the required role level
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

/**
 * Check if user can access admin features
 */
export function isAdmin(role: UserRole): boolean {
  return role === 'admin'
}

/**
 * Check if user can access manager features
 */
export function isManager(role: UserRole): boolean {
  return hasRole(role, 'manager')
}

/**
 * Check if user can access employee features
 */
export function isEmployee(role: UserRole): boolean {
  // All authenticated users are at least employees
  return true
}

/**
 * Check if user can edit inventory
 */
export function canEditInventory(role: UserRole): boolean {
  return hasRole(role, 'manager')
}

/**
 * Check if user can view reports
 */
export function canViewReports(role: UserRole): boolean {
  return hasRole(role, 'manager')
}

/**
 * Check if user can manage employees
 */
export function canManageEmployees(role: UserRole): boolean {
  return hasRole(role, 'manager')
}

/**
 * Check if user can edit time records
 */
export function canEditTimeRecords(role: UserRole): boolean {
  return isAdmin(role)
}

/**
 * Check if user can process payroll
 */
export function canProcessPayroll(role: UserRole): boolean {
  return isAdmin(role)
}

/**
 * Check if user can access floor operations
 */
export function canAccessFloor(role: UserRole): boolean {
  // All authenticated users can access floor operations
  return true
}

/**
 * Check if user can manage orders
 */
export function canManageOrders(role: UserRole): boolean {
  // All authenticated users can manage orders
  return true
}

/**
 * Get accessible routes for a given role
 */
export function getAccessibleRoutes(role: UserRole): string[] {
  const routes: string[] = [
    '/dashboard',
    '/floor',
    '/orders',
    '/games',
    '/customers',
  ]

  if (hasRole(role, 'manager')) {
    routes.push(
      '/manager',
      '/admin/inventory',
      '/admin/employees',
      '/admin/menu',
      '/admin/reports',
      '/inventory',
      '/reports',
      '/employees'
    )
  }

  if (isAdmin(role)) {
    routes.push(
      '/admin',
      '/admin/payroll',
      '/admin/settings',
      '/admin/floor-layout',
      '/admin/time-billing'
    )
  }

  return routes
}

/**
 * Check if a route requires a specific role
 */
export function getRequiredRole(pathname: string): UserRole | null {
  // Manager+ routes (even if under /admin path)
  if (pathname.startsWith('/admin/inventory') || 
      pathname.startsWith('/admin/employees') ||
      pathname.startsWith('/admin/menu') ||
      pathname.startsWith('/admin/reports')) {
    return 'manager'
  }
  
  // Admin-only routes
  if (pathname.startsWith('/admin')) {
    return 'admin'
  }
  
  // Manager+ routes
  if (pathname.startsWith('/inventory') || 
      pathname.startsWith('/reports') ||
      pathname.startsWith('/manager')) {
    return 'manager'
  }
  
  // All authenticated users
  if (pathname.startsWith('/floor') || 
      pathname.startsWith('/orders') ||
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/employee')) {
    return 'employee'
  }
  
  return null
}