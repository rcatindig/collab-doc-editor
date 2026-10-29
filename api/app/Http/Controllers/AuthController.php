<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate(['name' => 'required|string|max:120', 'email' => 'required|email|max:255|unique:users,email', 'password' => 'required|string|min:8|confirmed']);
        $user = User::create(['name' => $data['name'], 'email' => strtolower($data['email']), 'password' => Hash::make($data['password'])]);
        Auth::login($user); $request->session()->regenerate();
        return response()->json(['user' => $user], 201);
    }
    public function login(Request $request)
    {
        $data = $request->validate(['email' => 'required|email', 'password' => 'required|string']);
        $user = User::where('email', strtolower($data['email']))->first();
        if (!$user || !Hash::check($data['password'], $user->password)) throw ValidationException::withMessages(['email' => ['The provided credentials are incorrect.']]);
        Auth::login($user); $request->session()->regenerate();
        return response()->json(['user' => $user]);
    }
    public function logout(Request $request) { Auth::guard('web')->logout(); $request->session()->invalidate(); $request->session()->regenerateToken(); return response()->noContent(); }
    public function me(Request $request) { return response()->json(['user' => $request->user()]); }
}
