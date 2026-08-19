<?php

use App\Models\ScanSession;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function (User $user, string $id) {
    return (string) $user->id === $id;
});

Broadcast::channel('bay.{bayNumber}', function (User $user, string $bayNumber) {
    return auth()->check();
});

Broadcast::channel('scan.{pairCode}', function (User $user, string $pairCode) {
    $session = ScanSession::where('pair_code', $pairCode)->first();
    return $session && ($session->created_by === (string)$user->id || auth()->check());
});

Broadcast::channel('job-cards', function (User $user) {
    return auth()->check();
});

Broadcast::channel('parts-requests', function (User $user) {
    return auth()->check();
});
