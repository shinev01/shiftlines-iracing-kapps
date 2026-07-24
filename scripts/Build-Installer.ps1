param(
    [string]$Version = '1.1.0'
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$distRoot = Join-Path $projectRoot 'dist'
$targetName = Join-Path $distRoot "ShiftLines-Setup-v$Version.exe"
$workRoot = Join-Path ([IO.Path]::GetTempPath()) "ShiftLinesInstallerBuild-$([guid]::NewGuid())"
$payloadRoot = Join-Path $workRoot 'payload'
$packageRoot = Join-Path $workRoot 'package'

try {
    New-Item -ItemType Directory -Path $distRoot, $payloadRoot, $packageRoot -Force | Out-Null

    $runtimeItems = @('index.html', 'styles.css', 'src', 'data', 'THIRD_PARTY_NOTICES.md')
    foreach ($item in $runtimeItems) {
        $source = Join-Path $projectRoot $item
        Copy-Item -LiteralPath $source -Destination $payloadRoot -Recurse -Force
    }

    $payloadArchive = Join-Path $packageRoot 'ShiftLines-Payload.zip'
    Compress-Archive -Path (Join-Path $payloadRoot '*') -DestinationPath $payloadArchive -CompressionLevel Optimal
    Copy-Item -LiteralPath (Join-Path $projectRoot 'installer\Setup.ps1') -Destination $packageRoot
    Copy-Item -LiteralPath (Join-Path $projectRoot 'installer\Launch.cmd') -Destination $packageRoot

    if (Test-Path -LiteralPath $targetName) {
        Remove-Item -LiteralPath $targetName -Force
    }

    $iexpressConfig = @"
[Version]
Class=IEXPRESS
SEDVersion=3

[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=0
HideExtractAnimation=1
UseLongFileName=1
InsideCompressed=0
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=
DisplayLicense=
FinishMessage=
TargetName=$targetName
FriendlyName=ShiftLines for Kapps Setup v$Version
AppLaunched=Launch.cmd
PostInstallCmd=<None>
AdminQuietInstCmd=
UserQuietInstCmd=
SourceFiles=SourceFiles

[SourceFiles]
SourceFiles0=$packageRoot\

[SourceFiles0]
%FILE0%=
%FILE1%=
%FILE2%=

[Strings]
FILE0="ShiftLines-Payload.zip"
FILE1="Setup.ps1"
FILE2="Launch.cmd"
"@

    $sedPath = Join-Path $workRoot 'ShiftLines.sed'
    Set-Content -LiteralPath $sedPath -Value $iexpressConfig -Encoding ASCII

    $process = Start-Process -FilePath (Join-Path $env:SystemRoot 'System32\iexpress.exe') `
        -ArgumentList @('/N', '/Q', $sedPath) -Wait -PassThru -WindowStyle Hidden
    if ($process.ExitCode -ne 0 -or -not (Test-Path -LiteralPath $targetName)) {
        throw "IExpress failed to build the installer (exit code $($process.ExitCode))."
    }

    $hash = (Get-FileHash -LiteralPath $targetName -Algorithm SHA256).Hash
    Write-Output "Installer: $targetName"
    Write-Output "SHA256:    $hash"
} finally {
    if (Test-Path -LiteralPath $workRoot) {
        Remove-Item -LiteralPath $workRoot -Recurse -Force
    }
}
