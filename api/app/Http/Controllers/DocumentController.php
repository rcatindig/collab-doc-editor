<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\User;
use Illuminate\Http\Request;

class DocumentController extends Controller
{
    private function authorizeDocument(Request $request, Document $document, string $ability): void
    {
        if (!$request->user()->can($ability, $document)) abort(404);
    }
    public function owned(Request $request) { return ['documents' => $request->user()->documents()->latest('updated_at')->get()]; }
    public function shared(Request $request) { return ['documents' => $request->user()->sharedDocuments()->with('owner:id,name,email')->latest('updated_at')->get()]; }
    public function store(Request $request)
    {
        $data = $request->validate(['title' => 'required|string|max:255', 'content' => 'required|array']);
        return response()->json(['document' => $request->user()->documents()->create($data)], 201);
    }
    public function show(Request $request, Document $document) { $this->authorizeDocument($request, $document, 'view'); return ['document' => $document->load('owner:id,name,email')]; }
    public function collaborationAccess(Request $request, Document $document)
    {
        $this->authorizeDocument($request, $document, 'view');
        return response()->json(['user' => $request->user()->only(['id', 'name'])]);
    }
    public function update(Request $request, Document $document)
    {
        $this->authorizeDocument($request, $document, 'update');
        $data = $request->validate(['title' => 'sometimes|required|string|max:255', 'content' => 'sometimes|required|array']);
        $document->update($data); return ['document' => $document->fresh()];
    }
    public function destroy(Request $request, Document $document) { $this->authorizeDocument($request, $document, 'delete'); $document->delete(); return response()->noContent(); }
    public function share(Request $request, Document $document)
    {
        $this->authorizeDocument($request, $document, 'share');
        $data = $request->validate(['email' => 'required|email|exists:users,email']);
        $recipient = User::where('email', strtolower($data['email']))->firstOrFail();
        if ($recipient->id === $request->user()->id) return response()->json(['message' => 'You cannot share a document with yourself.'], 422);
        $document->collaborators()->syncWithoutDetaching([$recipient->id]);
        return response()->json(['message' => 'Document shared.'], 201);
    }
    public function unshare(Request $request, Document $document, User $user)
    {
        $this->authorizeDocument($request, $document, 'share');
        $document->collaborators()->detach($user->id); return response()->noContent();
    }
}
