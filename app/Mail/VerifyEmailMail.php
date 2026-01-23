<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\URL;

class VerifyEmailMail extends Mailable
{
    use Queueable, SerializesModels;

    public $user;

    public $token;

    /**
     * Create a new message instance.
     */
    public function __construct($user, $token)
    {
        $this->user = $user;
        $this->token = $token;
    }

    /**
     * Build the message.
     */
    public function build()
    {
        // Generate signed verification URL with 24 hours expiry
        $verificationUrl = URL::temporarySignedRoute(
            'auth.email.verify.signed',
            now()->addHours(24),
            [
                'email' => $this->user->email,
                'token' => $this->token,
            ]
        );

        return $this->subject('Verifikasi Email - IVEN-HUB')
            ->view('emails.verify-email')
            ->with([
                'user' => $this->user,
                'token' => $this->token,
                'verificationUrl' => $verificationUrl,
            ]);
    }
}
