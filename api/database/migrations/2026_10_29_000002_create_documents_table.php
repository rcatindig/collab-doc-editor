<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('documents', function (Blueprint $table) { $table->id(); $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete(); $table->string('title')->default('Untitled document'); $table->jsonb('content'); $table->timestamps(); $table->index(['owner_id', 'updated_at']); });
        Schema::create('document_shares', function (Blueprint $table) { $table->foreignId('document_id')->constrained()->cascadeOnDelete(); $table->foreignId('user_id')->constrained('users')->cascadeOnDelete(); $table->timestamps(); $table->primary(['document_id', 'user_id']); $table->index(['user_id', 'document_id']); });
    }
    public function down(): void { Schema::dropIfExists('document_shares'); Schema::dropIfExists('documents'); }
};
