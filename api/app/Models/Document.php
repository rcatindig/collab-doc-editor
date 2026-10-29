<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Document extends Model
{
    protected $fillable = ['owner_id', 'title', 'content'];
    protected $hidden = ['collaboration_state'];
    protected function casts(): array { return ['content' => 'array']; }
    public function owner() { return $this->belongsTo(User::class, 'owner_id'); }
    public function collaborators() { return $this->belongsToMany(User::class, 'document_shares')->withTimestamps(); }
}
