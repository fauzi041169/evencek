<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use SplFileObject;

class ImportSqlDump extends Command
{
    protected $signature = 'db:import-dump {path : Path to SQL dump file} {--chunk=100 : Number of statements per progress update}';

    protected $description = 'Import an SQL dump file into the current database connection';

    public function handle(): int
    {
        $path = $this->argument('path');

        if (! is_string($path) || $path === '') {
            $this->error('Path to SQL file is required.');

            return self::FAILURE;
        }

        if (! is_file($path) || ! is_readable($path)) {
            $this->error('File not found or not readable: '.$path);

            return self::FAILURE;
        }

        $this->info('Importing SQL dump from: '.$path);

        $chunk = (int) $this->option('chunk');
        if ($chunk <= 0) {
            $chunk = 100;
        }

        // Use PDO directly to ensure session state persists
        $pdo = DB::connection()->getPdo();
        $pdo->exec('SET FOREIGN_KEY_CHECKS=0');

        $file = new SplFileObject($path);
        $statement = '';
        $executed = 0;

        while (! $file->eof()) {
            $line = $file->fgets();
            if ($line === false) {
                break;
            }

            $trimmed = trim($line);

            if ($trimmed === '' || strpos($trimmed, '--') === 0) {
                continue;
            }

            if (strpos($trimmed, '/*') === 0 || strpos($trimmed, '*/') === 0 || strpos($trimmed, '/*!') === 0) {
                // checking for mysql directives
            }

            $statement .= $line;

            if (substr(rtrim($trimmed), -1) !== ';') {
                continue;
            }

            $sql = trim($statement);
            $statement = '';

            if ($sql === '') {
                continue;
            }

            // Debug logging for activities
            if (str_contains($sql, 'INSERT INTO `activities`')) {
                $this->info('Attempting to insert into activities table...');
                Log::info('ImportSqlDump: Attempting to insert into activities table.');
            }

            try {
                DB::unprepared($sql);
                $executed++;

                if (str_contains($sql, 'INSERT INTO `activities`')) {
                    $this->info('Successfully inserted into activities table.');
                    Log::info('ImportSqlDump: Successfully inserted into activities table.');
                }
            } catch (QueryException $e) {
                $errorInfo = $e->errorInfo ?? [];
                $sqlState = $errorInfo[0] ?? null;
                $driverCode = $errorInfo[1] ?? null;

                // 1061: Duplicate key name
                // 1050: Table already exists
                // 1091: Can't drop x
                // 1068: Multiple primary key defined
                // 1826: Duplicate foreign key constraint name
                if (in_array($driverCode, [1061, 1050, 1091, 1068, 1826])) {
                    $this->warn('Notice: '.$e->getMessage());
                } elseif ($sqlState === '01000' && (int) $driverCode === 1265) {
                    $this->warn('Warning while executing statement: '.$e->getMessage());
                    $executed++;
                } else {
                    Log::error('ImportSqlDump error', [
                        'message' => $e->getMessage(),
                        'sql_state' => $sqlState,
                        'driver_code' => $driverCode,
                        'statement_preview' => mb_substr(preg_replace('/\s+/', ' ', $sql), 0, 1000),
                        'executed' => $executed,
                    ]);
                    $this->error('Error while executing statement: '.$e->getMessage());
                }
            }

            if ($executed % $chunk === 0) {
                $this->info('Executed '.$executed.' statements...');
            }
        }

        $pdo->exec('SET FOREIGN_KEY_CHECKS=1');

        $this->info('Finished importing. Total statements executed: '.$executed);

        return self::SUCCESS;
    }
}
