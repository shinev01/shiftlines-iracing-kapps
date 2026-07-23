$ErrorActionPreference = 'Stop'

$sourceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$customAppsRoot = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'iRacing\CustomApps'
$destinationRoot = Join-Path $customAppsRoot 'ShiftLines'

New-Item -ItemType Directory -Path $destinationRoot -Force | Out-Null

$runtimeItems = @('index.html', 'styles.css', 'src', 'data', 'THIRD_PARTY_NOTICES.md')
foreach ($item in $runtimeItems) {
    $source = Join-Path $sourceRoot $item
    $destination = Join-Path $destinationRoot $item

    if ((Resolve-Path -LiteralPath $sourceRoot).Path -eq [IO.Path]::GetFullPath($destinationRoot)) {
        continue
    }

    if ((Get-Item -LiteralPath $source).PSIsContainer) {
        New-Item -ItemType Directory -Path $destination -Force | Out-Null
        Get-ChildItem -LiteralPath $source -Force | Copy-Item -Destination $destination -Recurse -Force
    } else {
        Copy-Item -LiteralPath $source -Destination $destination -Force
    }
}

# Clean up nested directories created by installers older than v1.1.
foreach ($legacyPath in @('src\src', 'data\data')) {
    $legacyDestination = Join-Path $destinationRoot $legacyPath
    if (Test-Path -LiteralPath $legacyDestination) {
        Remove-Item -LiteralPath $legacyDestination -Recurse -Force
    }
}

Write-Host ''
Write-Host 'ShiftLines installed to:' -ForegroundColor Green
Write-Host $destinationRoot
Write-Host ''
Write-Host 'Kapps App Folder:' $customAppsRoot
Write-Host 'Custom Overlay URL: http://127.0.0.1:8182/ShiftLines/'
Write-Host 'Demo URL:          http://127.0.0.1:8182/ShiftLines/?demo=1&debug=1'
Write-Host ''
Write-Host 'Run Kapps as administrator once after setting App Folder so it can create its apps symlink.' -ForegroundColor Yellow
