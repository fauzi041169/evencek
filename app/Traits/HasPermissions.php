<?php

namespace App\Traits;

trait HasPermissions
{
    /**
     * Check if user has a specific permission
     */
    public function hasPermission(string $permissionKey): bool
    {
        return \App\Models\RolePermission::hasPermission($this->role, $permissionKey);
    }

    /**
     * Check if user has any of the given permissions
     */
    public function hasAnyPermission(array $permissionKeys): bool
    {
        foreach ($permissionKeys as $permissionKey) {
            if ($this->hasPermission($permissionKey)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if user has all of the given permissions
     */
    public function hasAllPermissions(array $permissionKeys): bool
    {
        foreach ($permissionKeys as $permissionKey) {
            if (! $this->hasPermission($permissionKey)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Check if user can access based on permission or role
     */
    public function canAccess(string $permissionKey, array $allowedRoles = []): bool
    {
        // Check role first if provided
        if (! empty($allowedRoles) && $this->hasAnyRole($allowedRoles)) {
            return true;
        }

        // Check permission
        return $this->hasPermission($permissionKey);
    }
}
