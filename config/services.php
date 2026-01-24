<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'mailgun' => [
        'domain' => env('MAILGUN_DOMAIN'),
        'secret' => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
        'scheme' => 'https',
    ],

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        // Redirect URI akan di-override secara dinamis di controller untuk mendukung local dan production
        // Pastikan di Google Console sudah dikonfigurasi:
        // - http://localhost:8000/auth/google/callback (untuk local)
        // - https://yourdomain.com/auth/google/callback (untuk production)
        'redirect' => env('GOOGLE_REDIRECT_URI', env('APP_URL').'/auth/google/callback'),
    ],

    'midtrans' => [
        'server_key' => env('MIDTRANS_SERVER_KEY'),
        'client_key' => env('MIDTRANS_CLIENT_KEY'),
        'merchant_id' => env('MIDTRANS_MERCHANT_ID'),
        'is_production' => env('MIDTRANS_IS_PRODUCTION', false),
        'disable_ssl' => env('MIDTRANS_DISABLE_SSL_VERIFY', false),
    ],

    'whatsapp' => [
        // WhatsApp Cloud API configuration
        // https://developers.facebook.com/docs/whatsapp/cloud-api
        'enabled' => env('WHATSAPP_ENABLED', false),
        'token' => env('WHATSAPP_TOKEN'),
        'phone_number_id' => env('WHATSAPP_PHONE_NUMBER_ID'),
        // Default sender name shown in message text (optional, for branding inside body)
        'sender_name' => env('WHATSAPP_SENDER_NAME', env('APP_NAME', 'IVEN-HUB')),
    ],

    'ai_gender' => [
        'enabled' => env('AI_GENDER_ENABLED', false),
        'key' => env('AI_GENDER_API_KEY'),
        'url' => env('AI_GENDER_API_URL', 'https://api.openai.com/v1/chat/completions'),
        'model' => env('AI_GENDER_MODEL', 'gpt-3.5-turbo'),
    ],

];
