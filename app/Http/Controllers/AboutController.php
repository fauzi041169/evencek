<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Setting;

class AboutController extends Controller
{
    public function index()
    {
        $heroAnim = Setting::get('hero_animation_style', 'circles');
        
        return Inertia::render('About', [
            'heroAnim' => $heroAnim
        ]);
    }
}
