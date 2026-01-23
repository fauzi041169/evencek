<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class StorageLogsCommand extends Command
{
    protected $signature = 'storage:logs {lines=50}';

    protected $description = 'Show the latest lines from the Laravel log file';

    public function handle()
    {
        $logPath = storage_path('logs/laravel.log');

        if (! file_exists($logPath)) {
            $this->error('Log file not found!');

            return 1;
        }

        $lines = $this->argument('lines');
        $contents = array_slice(file($logPath), -$lines);

        foreach ($contents as $line) {
            $this->line($line);
        }

        return 0;
    }
}
