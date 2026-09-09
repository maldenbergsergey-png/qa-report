$ErrorActionPreference = 'Stop'
$version = (Get-Content (Join-Path $PSScriptRoot '../package.json') -Raw | ConvertFrom-Json).version
$installer = Join-Path $PSScriptRoot "../dist/qa-report-agent-$version-windows-x64.exe"
$installDir = Join-Path $env:RUNNER_TEMP ('QA Agent Install ' + [guid]::NewGuid().ToString('N'))
$process = Start-Process -FilePath $installer -ArgumentList "/S /D=$installDir" -Wait -PassThru
if ($process.ExitCode -ne 0) { throw "Installer failed: $($process.ExitCode)" }
foreach ($file in @('QA Report Agent.exe', 'ffmpeg.dll', 'd3dcompiler_47.dll', 'vk_swiftshader.dll', 'resources/app.asar')) {
  $target = Join-Path $installDir $file
  if (!(Test-Path $target) -or (Get-Item $target).Length -eq 0) { throw "Missing installed file: $file" }
}
Write-Host 'PASS: native Windows installation contains the application and its DLLs'
