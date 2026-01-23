<?php

namespace App\Traits;

trait HasCustomUid
{
    /**
     * Boot the trait.
     */
    protected static function bootHasCustomUid()
    {
        static::creating(function ($model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = static::generateCustomUid();
            }
        });
    }

    /**
     * Get the value indicating whether the IDs are incrementing.
     *
     * @return bool
     */
    public function getIncrementing()
    {
        return false;
    }

    /**
     * Get the auto-incrementing key type.
     *
     * @return string
     */
    public function getKeyType()
    {
        return 'string';
    }

    /**
     * Generate a unique custom UID.
     *
     * @return string
     */
    protected static function generateCustomUid()
    {
        do {
            $uid = static::generateRandomString();
        } while (static::where('id', $uid)->exists());

        return $uid;
    }

    /**
     * Generate a random string with 3 letters and 3 numbers.
     *
     * @return string
     */
    protected static function generateRandomString()
    {
        $letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $numbers = '0123456789';

        $randomLetters = '';
        for ($i = 0; $i < 3; $i++) {
            $randomLetters .= $letters[rand(0, strlen($letters) - 1)];
        }

        $randomNumbers = '';
        for ($i = 0; $i < 3; $i++) {
            $randomNumbers .= $numbers[rand(0, strlen($numbers) - 1)];
        }

        $combined = str_split($randomLetters.$randomNumbers);
        shuffle($combined);

        return implode('', $combined);
    }
}
