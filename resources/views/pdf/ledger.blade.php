<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Laporan Neraca Keuangan</title>
    <style>
        body {
            font-family: sans-serif;
            font-size: 10pt;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
        }
        .header h1 {
            margin: 0;
            font-size: 18pt;
            text-transform: uppercase;
        }
        .header p {
            margin: 5px 0;
            font-size: 11pt;
            color: #666;
        }
        .meta-info {
            margin-bottom: 20px;
        }
        .meta-info table {
            width: 100%;
            border: none;
        }
        .meta-info td {
            padding: 2px 0;
        }
        .summary-box {
            margin-bottom: 20px;
            background-color: #f8f9fa;
            border: 1px solid #ddd;
            padding: 15px;
        }
        .summary-table {
            width: 100%;
            border-collapse: collapse;
        }
        .summary-table td {
            padding: 5px;
        }
        .table-container {
            width: 100%;
            margin-bottom: 30px;
        }
        table.data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9pt;
        }
        table.data-table th, table.data-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        table.data-table th {
            background-color: #f0f0f0;
            font-weight: bold;
            text-align: center;
        }
        .text-right {
            text-align: right !important;
        }
        .text-center {
            text-align: center !important;
        }
        .text-success { color: #16a34a; }
        .text-danger { color: #dc2626; }
        .footer {
            margin-top: 50px;
            width: 100%;
        }
        .signature-box {
            width: 30%;
            float: right;
            text-align: center;
        }
        .signature-line {
            border-bottom: 1px solid #333;
            margin-top: 60px;
            margin-bottom: 5px;
        }
        .page-break {
            page-break-after: always;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Laporan Neraca Keuangan</h1>
        <p>{{ config('app.name', 'EventCek') }}</p>
        <p>Periode: Per {{ \Carbon\Carbon::now()->format('d F Y') }}</p>
    </div>

    <div class="summary-box">
        <h3>Ringkasan Keuangan</h3>
        <table class="summary-table">
            <tr>
                <td width="20%"><strong>Total Pendapatan</strong></td>
                <td width="2%">:</td>
                <td class="text-success">Rp {{ number_format($summary['income'], 0, ',', '.') }}</td>
            </tr>
            <tr>
                <td><strong>Total Pengeluaran</strong></td>
                <td>:</td>
                <td class="text-danger">Rp {{ number_format($summary['expense'], 0, ',', '.') }}</td>
            </tr>
            <tr>
                <td><strong>Saldo Akhir</strong></td>
                <td>:</td>
                <td><strong>Rp {{ number_format($summary['balance'], 0, ',', '.') }}</strong></td>
            </tr>
        </table>
    </div>

    <div class="table-container">
        <table class="data-table">
            <thead>
                <tr>
                    <th width="15%">Tanggal</th>
                    <th width="35%">Keterangan</th>
                    <th width="15%">Debit (Masuk)</th>
                    <th width="15%">Kredit (Keluar)</th>
                    <th width="15%">Saldo</th>
                </tr>
            </thead>
            <tbody>
                @php $runningBalance = 0; @endphp
                {{-- We need to process in chronological order for running balance, but display logic might differ. 
                     Typically reports show chronological order. --}}
                @foreach($entries->sortBy('date') as $entry)
                    @php
                        $amount = $entry['amount'];
                        $isIncome = $entry['category'] === 'income';
                        $isExpense = $entry['category'] === 'expense';
                        
                        // Calculate valid balance contribution
                        $effectiveAmount = 0;
                        if (in_array(strtolower($entry['status']), ['approved', 'active', 'paid'])) {
                            if ($isIncome) $effectiveAmount = $amount;
                            if ($isExpense) $effectiveAmount = -$amount;
                        }
                        
                        $runningBalance += $effectiveAmount;
                    @endphp
                    <tr>
                        <td class="text-center">{{ \Carbon\Carbon::parse($entry['date'])->format('d/m/Y H:i') }}</td>
                        <td>
                            <strong>{{ $entry['title'] }}</strong><br>
                            <small>{{ Str::limit($entry['description'], 100) }}</small>
                            <div style="font-size: 8pt; margin-top: 2px;">
                                Status: <span style="text-transform: uppercase;">{{ $entry['status'] }}</span>
                            </div>
                        </td>
                        <td class="text-right">
                            @if($isIncome && in_array(strtolower($entry['status']), ['approved', 'active', 'paid']))
                                Rp {{ number_format($amount, 0, ',', '.') }}
                            @else
                                -
                            @endif
                        </td>
                        <td class="text-right">
                            @if($isExpense && in_array(strtolower($entry['status']), ['approved', 'active', 'paid']))
                                Rp {{ number_format($amount, 0, ',', '.') }}
                            @else
                                -
                            @endif
                        </td>
                        <td class="text-right">
                            <strong>Rp {{ number_format($runningBalance, 0, ',', '.') }}</strong>
                        </td>
                    </tr>
                @endforeach
                @if($entries->isEmpty())
                    <tr>
                        <td colspan="5" class="text-center">Belum ada transaksi</td>
                    </tr>
                @endif
            </tbody>
        </table>
    </div>

    <div class="footer">
        <div class="signature-box">
            <p>{{ config('app.name') }}, {{ \Carbon\Carbon::now()->format('d F Y') }}</p>
            <p>Dibuat Oleh,</p>
            <div class="signature-line"></div>
            <p><strong>{{ auth()->user()->name }}</strong></p>
        </div>
    </div>
</body>
</html>
