<?php

namespace Tests\Feature;

use App\Models\Document;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DocumentAccessTest extends TestCase
{
    use RefreshDatabase;
    private function user(string $email): User { return User::create(['name' => 'Test User', 'email' => $email, 'password' => 'password123']); }

    public function test_owner_can_create_and_reopen_document(): void
    {
        $owner = $this->user('owner@example.test');
        $response = $this->actingAs($owner)->postJson('/api/documents', ['title' => 'Notes', 'content' => ['type' => 'doc', 'content' => []]])->assertCreated();
        $this->actingAs($owner)->getJson('/api/documents/'.$response->json('document.id'))->assertOk()->assertJsonPath('document.title', 'Notes');
        $this->actingAs($owner)->getJson('/api/documents/'.$response->json('document.id').'/collaboration-access')->assertOk()->assertJsonPath('user.id', $owner->id);
    }

    public function test_document_lists_do_not_serialize_binary_collaboration_state(): void
    {
        $owner = $this->user('owner@example.test');
        $document = Document::create(['owner_id' => $owner->id, 'title' => 'Live notes', 'content' => ['type' => 'doc']]);
        DB::table('documents')->where('id', $document->id)->update(['collaboration_state' => "\x00\xff\x10"]);

        $this->actingAs($owner)
            ->getJson('/api/documents/owned')
            ->assertOk()
            ->assertJsonMissingPath('documents.0.collaboration_state');
    }

    public function test_shared_user_can_read_and_edit_but_not_share_or_delete(): void
    {
        $owner = $this->user('owner@example.test'); $editor = $this->user('editor@example.test');
        $document = Document::create(['owner_id' => $owner->id, 'title' => 'Draft', 'content' => ['type' => 'doc']]);
        $document->collaborators()->attach($editor->id);
        $this->actingAs($editor)->getJson('/api/documents/'.$document->id)->assertOk();
        $this->actingAs($editor)->getJson('/api/documents/'.$document->id.'/collaboration-access')->assertOk();
        $this->actingAs($editor)->patchJson('/api/documents/'.$document->id, ['title' => 'Revised'])->assertOk();
        $this->actingAs($editor)->postJson('/api/documents/'.$document->id.'/shares', ['email' => 'third@example.test'])->assertNotFound();
        $this->actingAs($editor)->deleteJson('/api/documents/'.$document->id)->assertNotFound();
    }

    public function test_unrelated_user_cannot_view_document(): void
    {
        $owner = $this->user('owner@example.test'); $outsider = $this->user('outsider@example.test');
        $document = Document::create(['owner_id' => $owner->id, 'title' => 'Private', 'content' => ['type' => 'doc']]);
        $this->actingAs($outsider)->getJson('/api/documents/'.$document->id)->assertNotFound();
        $this->actingAs($outsider)->getJson('/api/documents/'.$document->id.'/collaboration-access')->assertNotFound();
        $this->actingAs($outsider)->patchJson('/api/documents/'.$document->id, ['title' => 'stolen'])->assertNotFound();
    }

    public function test_owner_can_share_with_an_existing_user(): void
    {
        $owner = $this->user('owner@example.test'); $recipient = $this->user('recipient@example.test');
        $document = Document::create(['owner_id' => $owner->id, 'title' => 'Shared', 'content' => ['type' => 'doc']]);
        $this->actingAs($owner)->postJson('/api/documents/'.$document->id.'/shares', ['email' => $recipient->email])->assertCreated();
        $this->assertDatabaseHas('document_shares', ['document_id' => $document->id, 'user_id' => $recipient->id]);
    }
}
