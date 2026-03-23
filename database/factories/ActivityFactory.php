<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Activity>
 */
class ActivityFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $category = Category::query()->first();
        if (! $category) {
            $category = Category::create([
                'name' => 'Default',
                'description' => null,
            ]);
        }

        return [
            'name' => fake()->sentence(3),
            'description' => fake()->paragraph(),
            'date' => now()->addDays(7),
            'end_date' => now()->addDays(8),
            'start_time' => now()->addDays(7)->setTime(9, 0),
            'end_time' => now()->addDays(7)->setTime(17, 0),
            'location' => fake()->address(),
            'price' => 0,
            'pendaftaran' => 1, // Opened
            'payment_method_type' => 'manual',
            'status' => 'published',
            'user_id' => User::factory(),
            'category_id' => $category->id,
        ];
    }
}
