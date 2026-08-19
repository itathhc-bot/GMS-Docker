<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::firstOrCreate(
            ['email' => 'admin@techaura-projects.com'],
            [
                'name' => 'System Administrator',
                'password' => Hash::make('Change@Me1234!'),
                'email_verified_at' => now(),
                'remember_token' => Str::random(10),
            ]
        );

        $user->assignRole('admin');
    }
}
