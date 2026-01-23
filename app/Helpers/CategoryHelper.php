<?php

if (! function_exists('getCategoryIcon')) {
    function getCategoryIcon($categoryName)
    {
        $icons = [
            'Berita' => 'fa-newspaper',
            'Pengumuman' => 'fa-bullhorn',
            'Event' => 'fa-calendar-alt',
            'Artikel' => 'fa-file-alt',
            'Tutorial' => 'fa-graduation-cap',
            'Tips' => 'fa-lightbulb',
            'Review' => 'fa-star',
            'Teknologi' => 'fa-microchip',
            'Kesehatan' => 'fa-heartbeat',
            'Pendidikan' => 'fa-book',
            'Olahraga' => 'fa-running',
            'Hiburan' => 'fa-film',
            'Bisnis' => 'fa-briefcase',
            'Politik' => 'fa-landmark',
            'Sosial' => 'fa-users',
            'Budaya' => 'fa-theater-masks',
            // Tambahkan kategori lain sesuai kebutuhan
        ];

        return $icons[$categoryName] ?? 'fa-tag'; // Default icon jika kategori tidak ditemukan
    }
}
