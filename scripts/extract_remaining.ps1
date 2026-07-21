Add-Type -AssemblyName System.IO.Compression.FileSystem

$chapters = @(
    @{ num=5; prefix="TK"; file="Chapter 5 - Tackling and Pressure.docx" },
    @{ num=6; prefix="SP"; file="Chapter 6 - Spoiling and Aerial Defence.docx" },
    @{ num=7; prefix="RK"; file="Chapter 7 - Ruck and Stoppage Craft.docx" },
    @{ num=8; prefix="EA"; file="Chapter 8 - Evasion, Agility and Movement.docx" },
    @{ num=9; prefix="DM"; file="Chapter 9 - Decision Making.docx" },
    @{ num=10; prefix="TO"; file="Chapter 10 - Team Offence.docx" },
    @{ num=11; prefix="TD"; file="Chapter 11 - Team Defence.docx" },
    @{ num=12; prefix="TR"; file="Chapter 12 - Transition.docx" },
    @{ num=13; prefix="CF"; file="Chapter 13 - Conditioning with Football.docx" },
    @{ num=14; prefix="SG"; file="Chapter 14 - Small-Sided Games.docx" },
    @{ num=15; prefix="MS"; file="Chapter 15 - Match Simulation.docx" },
    @{ num=16; prefix="TA"; file="Chapter 16 - Testing and Assessment.docx" }
)

$basePath = "C:\TCLS Projects\CoachCore\Reference PDF's\New PDF's"
$scratchPath = "C:\Users\travi\.gemini\antigravity\brain\12eef90f-48b2-4612-872d-00c9ff24dbba\scratch"

foreach ($c in $chapters) {
    $docxPath = Join-Path $basePath $c.file
    $outputPath = Join-Path $scratchPath ("extracted_ch" + $c.num + ".txt")
    
    if (Test-Path $docxPath) {
        $zip = [System.IO.Compression.ZipFile]::OpenRead($docxPath)
        $entry = $zip.Entries | Where-Object { $_.FullName -eq 'word/document.xml' }
        $stream = $entry.Open()
        $reader = New-Object System.IO.StreamReader($stream)
        $xmlText = $reader.ReadToEnd()
        $reader.Close()
        $stream.Close()
        $zip.Dispose()

        $xml = [xml]$xmlText
        $nsManager = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
        $nsManager.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")

        $paragraphs = $xml.SelectNodes("//w:p", $nsManager)
        $lines = foreach ($p in $paragraphs) {
            $p.InnerText
        }

        $text = $lines -join [Environment]::NewLine
        [System.IO.File]::WriteAllText($outputPath, $text)
        Write-Host "Extracted Chapter $($c.num) ($($c.prefix)): $($lines.Count) paragraphs, $($text.Length) characters."
    } else {
        Write-Error "File not found: $docxPath"
    }
}
