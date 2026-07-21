Add-Type -AssemblyName System.IO.Compression.FileSystem

$docxPath = "C:\TCLS Projects\CoachCore\Reference PDF's\New PDF's\Chapter 4 - Ground Balls.docx"
$outputPath = "C:\Users\travi\.gemini\antigravity\brain\12eef90f-48b2-4612-872d-00c9ff24dbba\scratch\extracted_ch4.txt"

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
Write-Host "Done. Extracted $($lines.Count) paragraphs, total characters: $($text.Length)"
