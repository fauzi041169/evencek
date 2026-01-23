<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;

class GenericArrayExport implements FromArray, WithHeadings, WithTitle
{
    protected $data;

    protected $title;

    public function __construct(array $data, $title = 'Sheet1')
    {
        $this->data = $data;
        $this->title = $title;
    }

    public function array(): array
    {
        return $this->data;
    }

    public function title(): string
    {
        return $this->title;
    }

    public function headings(): array
    {
        return isset($this->data[0]) ? array_keys($this->data[0]) : [];
    }
}
