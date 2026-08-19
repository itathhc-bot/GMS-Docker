<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| The SPA is served from this single catch-all route. All actual
| data is fetched via the /api routes. NGINX handles static assets
| (public/build/*) directly. This route only serves the initial HTML.
|
*/

Route::get('/{any?}', function () {
    return view('app');
})->where('any', '.*')->name('spa');
