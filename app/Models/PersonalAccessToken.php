<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Laravel\Sanctum\PersonalAccessToken as SanctumPersonalAccessToken;

class PersonalAccessToken extends SanctumPersonalAccessToken
{
    use HasCustomUid;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'personal_access_tokens';

    /**
     * Find the token instance matching the given token.
     *
     * @param  string  $token
     * @return static|null
     */
    public static function findToken($token)
    {
        if (strpos($token, '|') === false) {
            return static::where('token', hash('sha256', $token))->first();
        }

        [$id, $plainTextToken] = explode('|', $token, 2);

        $instance = static::where('id', $id)->first();

        if (! $instance) {
            \Log::warning('Token ID not found', ['token_id' => $id]);

            return null;
        }

        $hashedToken = hash('sha256', $plainTextToken);

        if (hash_equals($instance->token, $hashedToken)) {
            return $instance;
        }

        // Debug: log mismatch
        \Log::warning('Token hash mismatch', [
            'token_id' => $id,
            'stored_hash' => substr($instance->token, 0, 20).'...',
            'computed_hash' => substr($hashedToken, 0, 20).'...',
            'plain_text_length' => strlen($plainTextToken),
        ]);

        return null;
    }

    /**
     * Determine if the token has a given ability.
     *
     * @param  string  $ability
     * @return bool
     */
    public function can($ability)
    {
        return in_array('*', $this->abilities) ||
               array_key_exists($ability, array_flip($this->abilities));
    }

    /**
     * Determine if the token is missing a given ability.
     *
     * @param  string  $ability
     * @return bool
     */
    public function cant($ability)
    {
        return ! $this->can($ability);
    }
}
