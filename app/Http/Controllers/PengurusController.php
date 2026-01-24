<?php

namespace App\Http\Controllers;

use App\Models\Pengurus;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class PengurusController extends Controller
{
    public function index()
    {
        $pengurus = Pengurus::all();

        return Inertia::render('Pengurus/Index', [
            'pengurus' => $pengurus,
        ]);
    }

    public function create()
    {
        return Inertia::render('Pengurus/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nama' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'kode' => 'required|in:SLCC,DPLP,LAINNYA',
            'gelar' => 'nullable|string|max:255',
            'jabatan' => 'required|string|max:255',
            'foto' => 'required|image|mimes:jpeg,png,jpg|max:2048',
            'deskripsi' => 'nullable|string',
            'periode' => 'required|string|max:255',
            'linkedin_url' => 'nullable|url|max:255',
            'twitter_url' => 'nullable|url|max:255',
            'telepon' => 'nullable|string|max:255',
            'is_active' => 'nullable',
        ]);

        // Set is_active ke 1 jika checkbox dicentang, 0 jika tidak
        $validated['is_active'] = $request->has('is_active') ? 1 : 0;

        if ($request->hasFile('foto')) {
            $foto = $request->file('foto');
            $filename = time().'_'.$foto->getClientOriginalName();

            // Pastikan direktori ada
            $uploadPath = public_path('storage/pengurus');
            if (! file_exists($uploadPath)) {
                mkdir($uploadPath, 0777, true);
            }

            // Simpan file ke direktori yang ditentukan
            $foto->move($uploadPath, $filename);
            $validated['foto'] = 'pengurus/'.$filename;
        }

        try {
            // Simpan semua data ke database
            Pengurus::create($validated);

            return redirect($request->redirect_to ?? route('pengurus.index'))
                ->with('success', 'Pengurus berhasil ditambahkan');
        } catch (\Exception $e) {
            // Log error
            Log::error('Error saat menyimpan data pengurus: '.$e->getMessage());

            return redirect()->back()
                ->withInput()
                ->with('error', 'Terjadi kesalahan saat menyimpan data: '.$e->getMessage());
        }
    }

    public function edit(Pengurus $pengurus)
    {
        return Inertia::render('Pengurus/Edit', [
            'pengurus' => $pengurus,
        ]);
    }

    public function update(Request $request, Pengurus $pengurus)
    {
        try {
            $validated = $request->validate([
                'nama' => 'required|string|max:255',
                'email' => 'nullable|email|max:255',
                'kode' => 'required|in:SLCC,DPLP,LAINNYA',
                'gelar' => 'nullable|string|max:255',
                'jabatan' => 'required|string|max:255',
                'foto' => 'nullable|image|mimes:jpeg,png,jpg|max:2048',
                'deskripsi' => 'nullable|string',
                'periode' => 'required|string|max:255',
                'linkedin_url' => 'nullable|url|max:255',
                'twitter_url' => 'nullable|url|max:255',
                'telepon' => 'nullable|string|max:255',
                'is_active' => 'boolean',
            ]);

            if ($request->hasFile('foto')) {
                // Hapus foto lama jika ada
                if ($pengurus->foto) {
                    $oldFilePath = public_path('storage/'.$pengurus->foto);
                    if (file_exists($oldFilePath)) {
                        unlink($oldFilePath);
                    }
                }

                $foto = $request->file('foto');
                $filename = time().'_'.$foto->getClientOriginalName();

                // Pastikan direktori ada
                $uploadPath = public_path('storage/pengurus');
                if (! file_exists($uploadPath)) {
                    mkdir($uploadPath, 0777, true);
                }

                // Simpan file ke direktori yang ditentukan
                $foto->move($uploadPath, $filename);
                $validated['foto'] = 'pengurus/'.$filename;
            }

            $pengurus->update($validated);

            return redirect($request->redirect_to ?? route('pengurus.index'))
                ->with('success', 'Pengurus berhasil diperbarui');

        } catch (\Exception $e) {
            Log::error('Error saat update pengurus: '.$e->getMessage());

            return redirect()->back()
                ->with('error', 'Gagal memperbarui pengurus: '.$e->getMessage())
                ->withInput();
        }
    }

    public function destroy(Pengurus $pengurus)
    {
        try {
            // Debug info
            Log::info('Request masuk ke destroy method', [
                'request_method' => request()->method(),
                'pengurus_id' => $pengurus->id,
                'pengurus_data' => $pengurus->toArray(),
            ]);

            DB::beginTransaction(); // Mulai transaction

            try {
                // Hapus foto dari storage jika ada
                if ($pengurus->foto) {
                    $deleted = false;
                    if (Storage::disk('public')->exists($pengurus->foto)) {
                        $deleted = Storage::disk('public')->delete($pengurus->foto);
                    } elseif (file_exists(public_path('storage/'.$pengurus->foto))) {
                        $deleted = @unlink(public_path('storage/'.$pengurus->foto));
                    }
                    
                    if ($deleted) {
                        Log::info('Foto berhasil dihapus', ['path' => $pengurus->foto]);
                    }
                }

                // Hapus data dari database
                $deleted = DB::table('pengurus')->where('id', $pengurus->id)->delete();

                Log::info('Status penghapusan', ['success' => $deleted]);

                if (! $deleted) {
                    throw new \Exception('Gagal menghapus data pengurus dari database');
                }

                DB::commit(); // Commit transaction jika berhasil

                return redirect()->back()
                    ->with('success', 'Pengurus berhasil dihapus');

            } catch (\Exception $e) {
                DB::rollBack(); // Rollback jika ada error
                throw $e;
            }

        } catch (\Exception $e) {
            Log::error('Error saat menghapus pengurus', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return redirect()->back()
                ->with('error', 'Gagal menghapus pengurus: '.$e->getMessage());
        }
    }
}
