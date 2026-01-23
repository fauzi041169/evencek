<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
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

        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        $file = new SplFileObject($path);
        $statement = '';
        $executed = 0;
        $truncated = [];

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
                continue;
            }

            if (stripos($trimmed, 'DELIMITER ') === 0) {
                continue;
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

            $prefix = strtoupper(substr(ltrim($sql), 0, 20));

            if (strpos($prefix, 'SET ') === 0) {
                continue;
            }

            if (strpos($prefix, 'START TRANSACTION') === 0) {
                continue;
            }

            if (strpos($prefix, 'COMMIT') === 0) {
                continue;
            }

            if (strpos($prefix, 'LOCK TABLES') === 0 || strpos($prefix, 'UNLOCK TABLES') === 0) {
                continue;
            }

            if (strpos($prefix, 'CREATE TABLE') === 0 || strpos($prefix, 'DROP TABLE') === 0 || strpos($prefix, 'ALTER TABLE') === 0) {
                continue;
            }

            if (stripos($sql, 'INSERT INTO') === 0) {
                if (preg_match('/^INSERT INTO\s+`?([A-Za-z0-9_]+)`?/i', $sql, $matches)) {
                    $table = $matches[1];
                    $logicalTable = $table === 'activity_users' ? 'activity_users' : $table;
                    if ($table === 'activity_users') {
                        $sql = preg_replace('/^INSERT INTO\s+`?activity_users`?/i', 'INSERT INTO `activity_users`', $sql, 1);
                    }
                    if (! isset($truncated[$logicalTable])) {
                        if (Schema::hasTable($logicalTable)) {
                            DB::statement('TRUNCATE TABLE `'.$logicalTable.'`');
                            $this->info('Truncated table '.$logicalTable);
                        } else {
                            $this->warn('Table '.$logicalTable.' does not exist, skipping truncate.');
                        }
                        $truncated[$logicalTable] = true;
                    }
                }
            }

            try {
                DB::unprepared($sql);
                $executed++;
            } catch (QueryException $e) {
                $errorInfo = $e->errorInfo ?? [];
                $sqlState = $errorInfo[0] ?? null;
                $driverCode = $errorInfo[1] ?? null;

                if ($sqlState === '01000' && (int) $driverCode === 1265) {
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

                    return self::FAILURE;
                }
            }

            if ($executed % $chunk === 0) {
                $this->info('Executed '.$executed.' statements...');
            }
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        $this->info('Finished importing. Total statements executed: '.$executed);

        return self::SUCCESS;
    }
}


