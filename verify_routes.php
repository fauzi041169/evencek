<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\File;

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$routes = collect(Route::getRoutes())->map(function ($route) {
    return $route->getName();
})->filter()->values()->all();

$bladeFiles = File::allFiles(__DIR__ . '/resources/views');

$undefinedRoutes = [];

foreach ($bladeFiles as $file) {
    $content = File::get($file->getPathname());
    // Match route('name', ...) or route('name')
    // Exclude $request->route('name') by checking for -> before route
    preg_match_all("/(?<!->)route\(\s*['\"]([^'\"]+)['\"]/", $content, $matches);
    
    foreach ($matches[1] as $route) {
        if (!in_array($route, $routes)) {
            $undefinedRoutes[] = [
                'file' => $file->getRelativePathname(),
                'route' => $route
            ];
        }
    }
}

$grouped = [];
foreach ($undefinedRoutes as $item) {
    $grouped[$item['file']][] = $item['route'];
}

foreach ($grouped as $file => $routes) {
    echo "File: $file\n";
    foreach (array_unique($routes) as $route) {
        echo "  - $route\n";
    }
    echo "\n";
}

if (empty($undefinedRoutes)) {
    echo "No undefined routes found!\n";
}
