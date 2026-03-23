<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Inertia\Inertia;

class AboutController extends Controller
{
    public function index()
    {
        $heroAnim = Setting::get('hero_animation_style', 'circles');

        return Inertia::render('About', [
            'heroAnim' => $heroAnim,
        ]);
    }
}
