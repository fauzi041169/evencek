<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EditableContent extends Model
{
    use HasCustomUid;
    use HasFactory;

    protected $fillable = [
        'page_path',
        'selector',
        'content_html',
        'styles_json',
        'updated_by',
    ];
}
