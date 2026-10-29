<?php

namespace App\Policies;

use App\Models\Document;
use App\Models\User;

class DocumentPolicy
{
    public function view(User $user, Document $document): bool { return $document->owner_id === $user->id || $document->collaborators()->whereKey($user->id)->exists(); }
    public function update(User $user, Document $document): bool { return $this->view($user, $document); }
    public function delete(User $user, Document $document): bool { return $document->owner_id === $user->id; }
    public function share(User $user, Document $document): bool { return $document->owner_id === $user->id; }
}
