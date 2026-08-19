<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // create permissions
        $permissions = [
            'vehicles.view', 'vehicles.create', 'vehicles.edit', 'vehicles.delete',
            'job_cards.view', 'job_cards.create', 'job_cards.edit', 'job_cards.delete', 'job_cards.assign', 'job_cards.sign_mechanic', 'job_cards.sign_supervisor',
            'parts.view', 'parts.request', 'parts.approve', 'parts.reject', 'parts.issue',
            'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete',
            'po.view', 'po.create', 'po.approve_manager', 'po.approve_finance', 'po.reject',
            'qc.view', 'qc.create', 'qc.review', 'qc.sign',
            'scan.view', 'scan.create',
            'reports.view', 'reports.export',
            'users.view', 'users.create', 'users.edit', 'users.deactivate', 'users.assign_role',
            'settings.view', 'settings.edit',
            'audit.view'
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // create roles and assign created permissions
        $roleAdmin = Role::firstOrCreate(['name' => 'admin']);
        $roleAdmin->givePermissionTo(Permission::all());

        $roleSupervisor = Role::firstOrCreate(['name' => 'supervisor']);
        $roleSupervisor->givePermissionTo([
            'vehicles.view', 'vehicles.create', 'vehicles.edit',
            'job_cards.view', 'job_cards.create', 'job_cards.edit', 'job_cards.assign', 'job_cards.sign_supervisor',
            'parts.view', 'parts.approve', 'parts.reject',
            'inventory.view',
            'po.view', 'po.create',
            'qc.view',
            'scan.view', 'scan.create',
            'reports.view', 'reports.export',
            'users.view'
        ]);

        $roleMechanic = Role::firstOrCreate(['name' => 'mechanic']);
        $roleMechanic->givePermissionTo([
            'vehicles.view',
            'job_cards.view', 'job_cards.edit', 'job_cards.sign_mechanic',
            'parts.view', 'parts.request',
            'inventory.view',
            'scan.view', 'scan.create'
        ]);

        $roleStoreClerk = Role::firstOrCreate(['name' => 'store_clerk']);
        $roleStoreClerk->givePermissionTo([
            'parts.view', 'parts.issue',
            'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete',
            'po.view', 'po.create',
            'reports.view'
        ]);

        $roleQcInspector = Role::firstOrCreate(['name' => 'qc_inspector']);
        $roleQcInspector->givePermissionTo([
            'vehicles.view',
            'job_cards.view',
            'qc.view', 'qc.create', 'qc.review', 'qc.sign',
            'reports.view'
        ]);
    }
}
