<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
// use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Gate;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        //
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerPolicies();

        // Definisikan gate untuk admin
        Gate::define('admin', function ($user) {
            return $user->role === 'admin';
        });

        // Definisikan gate untuk creator
        Gate::define('creator', function ($user) {
            return $user->role === 'creator';
        });

        // Gate untuk admin atau creator
        Gate::define('admin-or-creator', function ($user) {
            return in_array($user->role, ['admin', 'creator', 'superadmin']);
        });

        Gate::define('manage-news', function (User $user) {
            return in_array($user->role, ['admin', 'creator', 'superadmin']);
        });

        Gate::define('verify-payments', function ($user) {
            return in_array($user->role, ['admin', 'superadmin']);
        });

        // Gate untuk create activities
        Gate::define('create-activities', function ($user) {
            return in_array($user->role, ['admin', 'creator', 'superadmin']);
        });
    }
}
