$ErrorActionPreference = 'Stop'

function Show-InstallerMessage {
    param(
        [string]$Message,
        [string]$Title,
        [ValidateSet('Information', 'Error')]
        [string]$Icon = 'Information'
    )

    if ($env:SHIFTLINES_SILENT -eq '1') {
        return
    }

    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show(
        $Message,
        $Title,
        [System.Windows.MessageBoxButton]::OK,
        [System.Windows.MessageBoxImage]::$Icon
    ) | Out-Null
}

$temporaryRoot = Join-Path ([IO.Path]::GetTempPath()) "ShiftLinesSetup-$([guid]::NewGuid())"

try {
    $archive = Join-Path $PSScriptRoot 'ShiftLines-Payload.zip'
    if (-not (Test-Path -LiteralPath $archive)) {
        throw 'The installer payload is missing.'
    }

    New-Item -ItemType Directory -Path $temporaryRoot -Force | Out-Null
    Expand-Archive -LiteralPath $archive -DestinationPath $temporaryRoot -Force

    $customAppsRoot = if ($env:SHIFTLINES_INSTALL_ROOT) {
        [IO.Path]::GetFullPath($env:SHIFTLINES_INSTALL_ROOT)
    } else {
        Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'iRacing\CustomApps'
    }
    $destinationRoot = Join-Path $customAppsRoot 'ShiftLines'
    New-Item -ItemType Directory -Path $destinationRoot -Force | Out-Null

    $runtimeItems = @('index.html', 'styles.css', 'src', 'data', 'THIRD_PARTY_NOTICES.md')
    foreach ($item in $runtimeItems) {
        $source = Join-Path $temporaryRoot $item
        $destination = Join-Path $destinationRoot $item

        if (-not (Test-Path -LiteralPath $source)) {
            throw "Installer payload item is missing: $item"
        }

        if ((Get-Item -LiteralPath $source).PSIsContainer) {
            if (Test-Path -LiteralPath $destination) {
                Remove-Item -LiteralPath $destination -Recurse -Force
            }
            Copy-Item -LiteralPath $source -Destination $destination -Recurse -Force
        } else {
            Copy-Item -LiteralPath $source -Destination $destination -Force
        }
    }

    $message = @"
ShiftLines was installed successfully.

Kapps App Folder:
$customAppsRoot

Overlay URL:
http://127.0.0.1:8182/ShiftLines/

If this is your first installation, select the App Folder above in Kapps settings once.
"@
    Show-InstallerMessage -Message $message -Title 'ShiftLines for Kapps'
    Write-Output "ShiftLines installed to: $destinationRoot"
} catch {
    Show-InstallerMessage -Message $_.Exception.Message -Title 'ShiftLines installation failed' -Icon Error
    Write-Error $_
    exit 1
} finally {
    if (Test-Path -LiteralPath $temporaryRoot) {
        Remove-Item -LiteralPath $temporaryRoot -Recurse -Force
    }
}
