<?php

namespace App\Console\Commands;

use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class PerformanceReport extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'audit:performance-report {--hours=24} {--limit=20} {--route=}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate a performance report (avg duration, queries) grouped by route within the given timeframe.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $hours = (int) $this->option('hours');
        $limit = (int) $this->option('limit');
        $routeFilter = $this->option('route');

        $since = Carbon::now()->subHours(max($hours, 1));

        $query = DB::table('performance_logs')
            ->selectRaw('route_name, method, COUNT(*) as hits, AVG(duration_ms) as avg_dur_ms, MAX(duration_ms) as max_dur_ms, AVG(query_time_ms) as avg_q_ms, AVG(query_count) as avg_q_count')
            ->where('created_at', '>=', $since)
            ->groupBy('route_name', 'method')
            ->orderByDesc('avg_dur_ms')
            ->limit($limit);

        if (! empty($routeFilter)) {
            $query->where(function ($q) use ($routeFilter) {
                $q->where('route_name', $routeFilter)
                    ->orWhere('uri', 'like', '%'.$routeFilter.'%');
            });
        }

        $rows = $query->get();

        if ($rows->isEmpty()) {
            $this->info('No performance data found for the selected window. Generate some traffic and try again.');

            return self::SUCCESS;
        }

        $this->table(
            ['Route', 'Method', 'Hits', 'Avg Dur (ms)', 'Max Dur (ms)', 'Avg Query (ms)', 'Avg Query Count'],
            $rows->map(function ($r) {
                return [
                    $r->route_name ?? '(unnamed)',
                    $r->method,
                    (int) $r->hits,
                    (int) round($r->avg_dur_ms),
                    (int) round($r->max_dur_ms),
                    (int) round($r->avg_q_ms),
                    (int) round($r->avg_q_count),
                ];
            })->toArray()
        );

        return self::SUCCESS;
    }
}
