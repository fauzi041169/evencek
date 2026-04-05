<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use SplFileObject;

class ImportSqlDump extends Command
{
    protected $signature = 'db:import-dump
        {path : Path to SQL dump file}
        {--chunk=100 : Number of statements per progress update}
        {--activity-users-for= : Only import/update participants (activity_users) for a specific activity id from the dump file}';

    protected $description = 'Import an SQL dump file into the current database connection';

    public function handle(): int
    {
        $path = $this->argument('path');
        $activityUsersFor = $this->option('activity-users-for');

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

        if (is_string($activityUsersFor) && trim($activityUsersFor) !== '') {
            return $this->importActivityUsersFor($path, trim($activityUsersFor), $chunk);
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

    private function importActivityUsersFor(string $path, string $activityId, int $chunk): int
    {
        if (! Schema::hasTable('activity_users')) {
            $this->error('Table activity_users not found. Run migrations first.');

            return self::FAILURE;
        }

        $this->info('Importing participants for activity_id='.$activityId.' from dump...');

        $tableColumns = Schema::getColumnListing('activity_users');
        $tableColumnSet = array_fill_keys($tableColumns, true);

        $pdo = DB::connection()->getPdo();
        $pdo->exec('SET FOREIGN_KEY_CHECKS=0');

        $file = new SplFileObject($path);
        $statement = '';
        $executed = 0;
        $rowsSeen = 0;
        $inserted = 0;
        $updated = 0;
        $skipped = 0;
        $duplicates = 0;

        DB::beginTransaction();
        try {
            while (! $file->eof()) {
                $line = $file->fgets();
                if ($line === false) {
                    break;
                }

                $trimmed = trim($line);
                if ($trimmed === '' || strpos($trimmed, '--') === 0) {
                    continue;
                }

                $statement .= $line;

                if (substr(rtrim($trimmed), -1) !== ';') {
                    continue;
                }

                $sql = trim($statement);
                $statement = '';

                if ($sql === '' || ! str_contains($sql, 'INSERT INTO `activity_users`')) {
                    continue;
                }

                try {
                    $parsed = $this->parseInsertStatement($sql, 'activity_users');
                } catch (\Throwable $e) {
                    $this->warn('Skipped an INSERT statement due to parsing error: '.$e->getMessage());
                    $skipped++;

                    continue;
                }

                $columns = $parsed['columns'];
                $rows = $parsed['rows'];

                $allowedColumns = [];
                foreach ($columns as $col) {
                    if (isset($tableColumnSet[$col])) {
                        $allowedColumns[] = $col;
                    }
                }

                foreach ($rows as $row) {
                    $rowsSeen++;
                    $rowActivityId = $row['activity_id'] ?? null;
                    if ($rowActivityId !== $activityId) {
                        continue;
                    }

                    $userId = $row['user_id'] ?? null;
                    if (! is_string($userId) || $userId === '') {
                        $skipped++;

                        continue;
                    }

                    $existingRows = DB::table('activity_users')
                        ->where('user_id', $userId)
                        ->where('activity_id', $activityId)
                        ->orderByDesc('updated_at')
                        ->get(['id']);

                    if ($existingRows->count() > 1) {
                        $duplicates += ($existingRows->count() - 1);
                    }

                    $existing = $existingRows->first();

                    $data = [];
                    foreach ($allowedColumns as $col) {
                        if (! array_key_exists($col, $row)) {
                            continue;
                        }
                        $data[$col] = $row[$col];
                    }

                    if ($existing) {
                        unset($data['id']);
                        unset($data['created_at']);
                        if (empty($data)) {
                            $skipped++;

                            continue;
                        }

                        DB::table('activity_users')->where('id', $existing->id)->update($data);
                        $updated++;
                    } else {
                        if (! isset($data['id']) || ! is_string($data['id']) || $data['id'] === '') {
                            $skipped++;

                            continue;
                        }
                        DB::table('activity_users')->insert($data);
                        $inserted++;
                    }

                    $executed++;
                    if ($executed % $chunk === 0) {
                        $this->info('Processed '.$executed.' rows (inserted '.$inserted.', updated '.$updated.', skipped '.$skipped.')...');
                    }
                }
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
            $this->error('Import failed: '.$e->getMessage());
            Log::error('ImportSqlDump activity_users import failed', [
                'activity_id' => $activityId,
                'path' => $path,
                'rows_seen' => $rowsSeen,
                'inserted' => $inserted,
                'updated' => $updated,
                'skipped' => $skipped,
            ]);

            return self::FAILURE;
        }

        $pdo->exec('SET FOREIGN_KEY_CHECKS=1');

        $this->info('Finished importing participants for '.$activityId.'. Inserted '.$inserted.', updated '.$updated.', skipped '.$skipped.'. Duplicate rows detected: '.$duplicates);

        return self::SUCCESS;
    }

    private function parseInsertStatement(string $sql, string $table): array
    {
        $pattern = '/INSERT\s+INTO\s+`'.preg_quote($table, '/').'`\s*\(([^)]+)\)\s*VALUES\s*(.+)\s*;\s*$/si';
        if (! preg_match($pattern, $sql, $matches)) {
            throw new \RuntimeException('Unsupported INSERT format for table '.$table);
        }

        $columnsRaw = $matches[1];
        $valuesRaw = trim($matches[2]);

        $columns = array_map(function (string $c): string {
            $c = trim($c);
            $c = trim($c, '`');

            return $c;
        }, explode(',', $columnsRaw));

        $tupleStrings = $this->splitTuples($valuesRaw);

        $rows = [];
        foreach ($tupleStrings as $tuple) {
            $values = $this->splitValues($tuple);
            if (count($values) !== count($columns)) {
                continue;
            }
            $row = [];
            foreach ($columns as $idx => $col) {
                $row[$col] = $this->decodeSqlValue($values[$idx]);
            }
            $rows[] = $row;
        }

        return [
            'columns' => $columns,
            'rows' => $rows,
        ];
    }

    private function splitTuples(string $valuesRaw): array
    {
        $tuples = [];
        $len = strlen($valuesRaw);
        $inString = false;
        $escape = false;
        $depth = 0;
        $start = null;

        for ($i = 0; $i < $len; $i++) {
            $ch = $valuesRaw[$i];

            if ($inString) {
                if ($escape) {
                    $escape = false;

                    continue;
                }
                if ($ch === '\\') {
                    $escape = true;

                    continue;
                }
                if ($ch === "'") {
                    $inString = false;
                }

                continue;
            }

            if ($ch === "'") {
                $inString = true;

                continue;
            }

            if ($ch === '(') {
                if ($depth === 0) {
                    $start = $i + 1;
                }
                $depth++;

                continue;
            }

            if ($ch === ')') {
                $depth--;
                if ($depth === 0 && $start !== null) {
                    $tuples[] = substr($valuesRaw, $start, $i - $start);
                    $start = null;
                }

                continue;
            }
        }

        return $tuples;
    }

    private function splitValues(string $tuple): array
    {
        $values = [];
        $len = strlen($tuple);
        $inString = false;
        $escape = false;
        $buf = '';

        for ($i = 0; $i < $len; $i++) {
            $ch = $tuple[$i];

            if ($inString) {
                $buf .= $ch;
                if ($escape) {
                    $escape = false;

                    continue;
                }
                if ($ch === '\\') {
                    $escape = true;

                    continue;
                }
                if ($ch === "'") {
                    $inString = false;
                }

                continue;
            }

            if ($ch === "'") {
                $inString = true;
                $buf .= $ch;

                continue;
            }

            if ($ch === ',') {
                $values[] = trim($buf);
                $buf = '';

                continue;
            }

            $buf .= $ch;
        }

        if (trim($buf) !== '' || $tuple !== '') {
            $values[] = trim($buf);
        }

        return $values;
    }

    private function decodeSqlValue(string $raw)
    {
        $raw = trim($raw);
        if ($raw === '' || strtoupper($raw) === 'NULL') {
            return null;
        }

        $len = strlen($raw);
        if ($len >= 2 && $raw[0] === "'" && $raw[$len - 1] === "'") {
            $str = substr($raw, 1, -1);
            $str = str_replace(
                ['\\\\', "\\'", '\\"', '\\n', '\\r', '\\t', '\\0', '\\Z'],
                ['\\', "'", '"', "\n", "\r", "\t", "\0", "\x1a"],
                $str
            );

            return $str;
        }

        if (is_numeric($raw)) {
            if (str_contains($raw, '.')) {
                return (float) $raw;
            }

            return (int) $raw;
        }

        return $raw;
    }
}
