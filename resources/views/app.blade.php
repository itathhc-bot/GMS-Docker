<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="ltr">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <!-- SEO -->
        <title>{{ config('app.name', 'Garage Guardian') }}</title>
        <meta name="description" content="Enterprise fleet and garage management system — track vehicles, job cards, parts requests, and maintenance workflows.">
        <meta name="robots" content="noindex, nofollow">

        <!-- Favicon -->
        <link rel="icon" type="image/svg+xml" href="/favicon.svg">
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">

        <!-- Preconnect (speed optimization) -->
        <link rel="preconnect" href="{{ config('app.url') }}">

        <!-- Inject Laravel config for frontend -->
        <script>
            window.Laravel = {
                csrfToken: "{{ csrf_token() }}",
                userId: {{ auth()->id() ? '"' . auth()->id() . '"' : 'null' }},
                appEnv: "{{ config('app.env') }}",
                echo: {
                    broadcaster: "reverb",
                    key: "{{ config('reverb.apps.apps.0.key', env('VITE_REVERB_APP_KEY', '')) }}",
                    wsHost: window.location.hostname,
                    wsPort: {{ env('VITE_REVERB_PORT', 8080) }},
                    wssPort: {{ env('VITE_REVERB_PORT', 8080) }},
                    forceTLS: "{{ env('VITE_REVERB_SCHEME', 'http') }}" === "https",
                    enabledTransports: ["ws", "wss"]
                }
            };
        </script>

        <!-- Vite assets -->
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/main.tsx'])
    </head>
    <body class="antialiased">
        <div id="root"></div>
    </body>
</html>
