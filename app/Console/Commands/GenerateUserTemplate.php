<?php

namespace App\Console\Commands;

use App\Exports\UserTemplateExport;
use Illuminate\Console\Command;
use Maatwebsite\Excel\Facades\Excel;

class GenerateUserTemplate extends Command
{
    protected $signature = 'excel:generate-template';

    protected $description = 'Generate Excel template for user import';

    public function handle()
    {
        $this->info('Generating Excel template...');

        try {
            Excel::store(
                new UserTemplateExport,
                'public/templates/template_import_user.xlsx'
            );

            $this->info('Template generated successfully at: public/templates/template_import_user.xlsx');
        } catch (\Exception $e) {
            $this->error('Failed to generate template: '.$e->getMessage());
        }
    }
}
