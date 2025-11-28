param(
  [int]$Port = 8000,
  [string]$Root = $PWD.Path
)

Add-Type -AssemblyName System.Net
$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"
try {
  $listener.Prefixes.Add($prefix)
  $listener.Start()
} catch {
  $msg = $_.Exception.Message
  Write-Host "Failed to start listener on $prefix : $msg" -ForegroundColor Red
  exit 1
}
Write-Host "Serving $prefix from $Root"

$mime = @{ 
  '.html'='text/html'; '.htm'='text/html';
  '.css'='text/css';
  '.js'='application/javascript';
  '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg';
  '.gif'='image/gif'; '.svg'='image/svg+xml'; '.ico'='image/x-icon';
  '.json'='application/json'
}

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response

    $path = $req.Url.AbsolutePath.TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($path)) { $path = 'index.html' }
    $full = Join-Path $Root $path
    if (-not (Test-Path $full)) {
      $res.StatusCode = 404
      $bytes = [System.Text.Encoding]::UTF8.GetBytes('Not Found')
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
      $res.Close()
      continue
    }

    $ext = [System.IO.Path]::GetExtension($full).ToLower()
    $type = $mime[$ext]
    if (-not $type) { $type = 'application/octet-stream' }
    $res.ContentType = $type

    $bytes = [System.IO.File]::ReadAllBytes($full)
    $res.ContentLength64 = $bytes.Length
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
    $res.Close()
  } catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
  }
}