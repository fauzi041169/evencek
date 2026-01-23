<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;

class RegenerateUids extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:regenerate-uids {--force}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Regenerate all IDs to 3-letter 3-number format for models using HasCustomUid';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        if (! $this->option('force') && ! $this->confirm('PERINGATAN: Perintah ini akan mengubah ID pada database secara massal. Pastikan Anda sudah melakukan BACKUP database sebelum melanjutkan. Lanjutkan?')) {
            return;
        }

        $models = $this->getModelsWithTrait();
        $this->info('Ditemukan '.count($models).' model yang menggunakan HasCustomUid.');

        // Nonaktifkan pemeriksaan foreign key sementara
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        foreach ($models as $modelClass) {
            try {
                // Cek apakah class ada
                if (! class_exists($modelClass)) {
                    $this->warn("Class tidak ditemukan: $modelClass");

                    continue;
                }

                $model = new $modelClass;

                // Cek apakah instance dari Eloquent Model
                if (! ($model instanceof \Illuminate\Database\Eloquent\Model)) {
                    $this->warn("Melewati $modelClass: Bukan instance Illuminate\Database\Eloquent\Model.");

                    continue;
                }

                $table = $model->getTable();

                // Lewati jika tabel atau kolom id tidak ada
                if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'id')) {
                    $this->warn("Melewati $modelClass: Tabel '$table' atau kolom 'id' tidak ditemukan.");

                    continue;
                }

                $this->info("Memproses tabel: $table ($modelClass)");

                // 1. Tambahkan kolom temp untuk menyimpan ID lama
                if (! Schema::hasColumn($table, 'old_temp_id')) {
                    Schema::table($table, function ($t) {
                        $t->string('old_temp_id', 64)->nullable()->index();
                    });
                }

                // 2. Backup ID lama ke kolom temp
                // Hanya update jika old_temp_id belum terisi (untuk menghindari overwrite jika run sebelumnya crash)
                // NAMUN, karena kita ingin regenerasi total, kita overwrite saja.
                // Tapi user minta "ganti semua id". Jadi kita overwrite.
                DB::table($table)->update(['old_temp_id' => DB::raw('id')]);

                // 3. Update ID baris per baris
                $rows = DB::table($table)->get();
                $bar = $this->output->createProgressBar($rows->count());

                foreach ($rows as $row) {
                    $newId = $this->generateUniqueId($table);
                    DB::table($table)->where('old_temp_id', $row->old_temp_id)->update(['id' => $newId]);
                    $bar->advance();
                }
                $bar->finish();
                $this->newLine();

                // 4. Update tabel-tabel relasi (Foreign Keys)
                $this->fixForeignKeys($table);

                // 5. Hapus kolom temp
                Schema::table($table, function ($t) {
                    $t->dropColumn('old_temp_id');
                });

            } catch (\Exception $e) {
                $this->error("Error memproses $modelClass: ".$e->getMessage());
            }
        }

        // Aktifkan kembali pemeriksaan foreign key
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');
        $this->info('Sukses! Semua ID telah diperbarui ke format baru.');
    }

    /**
     * Mencari semua Model yang menggunakan trait HasCustomUid
     */
    protected function getModelsWithTrait()
    {
        $models = [];
        $files = File::allFiles(app_path('Models'));

        foreach ($files as $file) {
            $namespace = 'App\\Models\\';
            $class = $namespace.str_replace(['/', '.php'], ['\\', ''], $file->getRelativePathname());

            if (class_exists($class)) {
                $reflection = new \ReflectionClass($class);
                // Cek apakah class menggunakan trait HasCustomUid
                if (in_array('App\Traits\HasCustomUid', $reflection->getTraitNames())) {
                    $models[] = $class;
                }
            }
        }

        return $models;
    }

    /**
     * Generate ID unik format 3 angka 3 huruf
     */
    protected function generateUniqueId($table)
    {
        do {
            $uid = $this->generateRandomString();
        } while (DB::table($table)->where('id', $uid)->exists());

        return $uid;
    }

    protected function generateRandomString()
    {
        $letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $numbers = '0123456789';

        $randomLetters = '';
        for ($i = 0; $i < 3; $i++) {
            $randomLetters .= $letters[rand(0, strlen($letters) - 1)];
        }

        $randomNumbers = '';
        for ($i = 0; $i < 3; $i++) {
            $randomNumbers .= $numbers[rand(0, strlen($numbers) - 1)];
        }

        $combined = str_split($randomLetters.$randomNumbers);
        shuffle($combined);

        return implode('', $combined);
    }

    /**
     * Memperbaiki Foreign Key di tabel lain yang merujuk ke tabel ini
     */
    protected function fixForeignKeys($parentTable)
    {
        $dbName = DB::connection()->getDatabaseName();

        // Cari tabel mana saja yang punya Foreign Key ke tabel ini
        $references = DB::select("
            SELECT TABLE_NAME, COLUMN_NAME 
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE REFERENCED_TABLE_SCHEMA = ? 
            AND REFERENCED_TABLE_NAME = ?
            AND REFERENCED_COLUMN_NAME = 'id'
        ", [$dbName, $parentTable]);

        foreach ($references as $ref) {
            $childTable = $ref->TABLE_NAME;
            $fkCol = $ref->COLUMN_NAME;

            $this->line("  -> Memperbarui relasi di tabel: $childTable.$fkCol");

            // Update Foreign Key menggunakan mapping dari old_temp_id
            DB::statement("
                UPDATE `{$childTable}` c
                JOIN `{$parentTable}` p ON c.`{$fkCol}` = p.`old_temp_id`
                SET c.`{$fkCol}` = p.`id`
            ");
        }
    }
}
