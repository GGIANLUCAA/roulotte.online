param(
  [switch]$Once
)

$ErrorActionPreference = 'Stop'

$port = 4173
$ip = '127.0.0.1'
$maxPortTries = 20
$root = (Get-Location).Path

function Get-ContentType([string]$path) {
  $ext = [System.IO.Path]::GetExtension($path).ToLowerInvariant()
  switch ($ext) {
    '.html' { 'text/html; charset=utf-8' }
    '.js' { 'text/javascript; charset=utf-8' }
    '.css' { 'text/css; charset=utf-8' }
    '.json' { 'application/json; charset=utf-8' }
    '.png' { 'image/png' }
    '.jpg' { 'image/jpeg' }
    '.jpeg' { 'image/jpeg' }
    '.svg' { 'image/svg+xml' }
    default { 'application/octet-stream' }
  }
}

function Send-Response($stream, [int]$statusCode, [string]$statusText, [string]$contentType, [byte[]]$bodyBytes, [hashtable]$extraHeaders = $null) {
  if ($null -eq $bodyBytes) { $bodyBytes = [byte[]]@() }
  $header = "HTTP/1.1 $statusCode $statusText`r`nContent-Type: $contentType`r`nContent-Length: $($bodyBytes.Length)`r`nConnection: close`r`n"
  if ($null -ne $extraHeaders) {
    foreach ($k in $extraHeaders.Keys) {
      $header += ("{0}: {1}`r`n" -f $k, $extraHeaders[$k])
    }
  }
  $header += "`r`n"
  $h = [System.Text.Encoding]::ASCII.GetBytes($header)
  $stream.Write($h, 0, $h.Length)
  if ($bodyBytes.Length -gt 0) { $stream.Write($bodyBytes, 0, $bodyBytes.Length) }
}

function Send-TextResponse($stream, [int]$statusCode, [string]$statusText, [string]$body, [hashtable]$extraHeaders = $null) {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
  Send-Response $stream $statusCode $statusText 'text/plain; charset=utf-8' $bytes $extraHeaders
}

function Send-JsonResponse($stream, [int]$statusCode, [string]$statusText, [string]$json, [hashtable]$extraHeaders = $null) {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  Send-Response $stream $statusCode $statusText 'application/json; charset=utf-8' $bytes $extraHeaders
}

function Decode-RequestBody([byte[]]$bytes, [int]$count) {
  if ($count -le 0 -or $null -eq $bytes) { return '' }
  $b0 = $bytes[0]
  $b1 = if ($count -gt 1) { $bytes[1] } else { 0 }
  if ($count -ge 2 -and $b0 -eq 255 -and $b1 -eq 254) {
    return [System.Text.Encoding]::Unicode.GetString($bytes, 2, $count - 2)
  }
  if ($count -ge 2 -and $b0 -eq 254 -and $b1 -eq 255) {
    return [System.Text.Encoding]::BigEndianUnicode.GetString($bytes, 2, $count - 2)
  }
  if ($count -ge 3 -and $b0 -eq 239 -and $b1 -eq 187 -and $bytes[2] -eq 191) {
    return [System.Text.Encoding]::UTF8.GetString($bytes, 3, $count - 3)
  }
  $zeroCount = 0
  for ($i = 1; $i -lt $count; $i += 2) {
    if ($bytes[$i] -eq 0) { $zeroCount++ }
  }
  if ($zeroCount -gt ($count / 10)) {
    return [System.Text.Encoding]::Unicode.GetString($bytes, 0, $count)
  }
  return [System.Text.Encoding]::UTF8.GetString($bytes, 0, $count)
}

function Read-ChunkedBody($stream, [System.Collections.Generic.List[byte]]$acc, [int]$bodyStart) {
  $pending = New-Object System.Collections.Generic.List[byte]
  if ($acc.Count -gt $bodyStart) {
    $tail = $acc.GetRange($bodyStart, $acc.Count - $bodyStart)
    foreach ($b in $tail) { [void]$pending.Add($b) }
  }
  $body = New-Object System.Collections.Generic.List[byte]
  $idx = 0
  $tmp = New-Object byte[] 8192
  while ($true) {
    while ($true) {
      $found = $false
      for ($i = $idx; $i -le ($pending.Count - 2); $i++) {
        if ($pending[$i] -eq 13 -and $pending[$i + 1] -eq 10) { $found = $true; break }
      }
      if ($found) { break }
      $n = $stream.Read($tmp, 0, $tmp.Length)
      if ($n -le 0) { throw }
      for ($j = 0; $j -lt $n; $j++) { [void]$pending.Add($tmp[$j]) }
    }
    $lineEnd = -1
    for ($i = $idx; $i -le ($pending.Count - 2); $i++) {
      if ($pending[$i] -eq 13 -and $pending[$i + 1] -eq 10) { $lineEnd = $i; break }
    }
    if ($lineEnd -lt 0) { throw }
    $lineBytes = $pending.GetRange($idx, $lineEnd - $idx).ToArray()
    $line = [System.Text.Encoding]::ASCII.GetString($lineBytes).Trim()
    $semi = $line.IndexOf(';')
    if ($semi -ge 0) { $line = $line.Substring(0, $semi).Trim() }
    $size = 0
    try { $size = [Convert]::ToInt32($line, 16) } catch { throw }
    $idx = $lineEnd + 2
    if ($size -eq 0) { break }
    while ($pending.Count -lt ($idx + $size + 2)) {
      $n = $stream.Read($tmp, 0, $tmp.Length)
      if ($n -le 0) { throw }
      for ($j = 0; $j -lt $n; $j++) { [void]$pending.Add($tmp[$j]) }
    }
    for ($k = 0; $k -lt $size; $k++) { [void]$body.Add($pending[$idx + $k]) }
    $idx = $idx + $size + 2
  }
  return $body.ToArray()
}

function Try-ParseDbJson([byte[]]$bytes, [int]$count) {
  if ($null -eq $bytes -or $count -le 0) { return $null }
  $primary = Decode-RequestBody $bytes $count
  $candidates = New-Object System.Collections.Generic.List[string]
  if (-not [string]::IsNullOrWhiteSpace($primary)) { [void]$candidates.Add($primary) }
  $encs = @(
    [System.Text.Encoding]::UTF8,
    [System.Text.Encoding]::Unicode,
    [System.Text.Encoding]::BigEndianUnicode,
    [System.Text.Encoding]::ASCII
  )
  foreach ($enc in $encs) {
    try {
      $s = $enc.GetString($bytes, 0, $count)
      if (-not [string]::IsNullOrWhiteSpace($s)) { [void]$candidates.Add($s) }
    } catch {}
  }
  foreach ($s0 in ($candidates | Select-Object -Unique)) {
    $s = $s0.Trim([char]0xFEFF, [char]0)
    try {
      $obj = $s | ConvertFrom-Json
      if ($null -ne $obj) { return @{ obj = $obj } }
    } catch {}
  }
  return $null
}

$listener = $null
for ($i = 0; $i -lt $maxPortTries; $i++) {
  $tryPort = $port + $i
  try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse($ip), $tryPort)
    $listener.Start()
    $port = $tryPort
    break
  } catch {
    try { if ($null -ne $listener) { $listener.Stop() } } catch {}
    if ($i -eq ($maxPortTries - 1)) { throw }
  }
}
Write-Output ("Serving {0} at http://{1}:{2}/" -f $root, $ip, $port)
$dbFile = Join-Path $root 'server-db.json'

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $client.ReceiveTimeout = 5000
      $client.SendTimeout = 5000
      $stream = $client.GetStream()
      $buf = New-Object byte[] 8192
      $acc = New-Object System.Collections.Generic.List[byte]
      $headerEnd = -1
      while ($true) {
        $n = $stream.Read($buf, 0, $buf.Length)
        if ($n -le 0) { break }
        for ($j = 0; $j -lt $n; $j++) { [void]$acc.Add($buf[$j]) }
        if ($acc.Count -ge 4) {
          for ($i = [Math]::Max(0, $acc.Count - $n - 4); $i -le ($acc.Count - 4); $i++) {
            if ($acc[$i] -eq 13 -and $acc[$i + 1] -eq 10 -and $acc[$i + 2] -eq 13 -and $acc[$i + 3] -eq 10) {
              $headerEnd = $i
              break
            }
          }
        }
        if ($headerEnd -ge 0) { break }
        if ($acc.Count -gt 65536) { break }
      }

      if ($headerEnd -lt 0) {
        Send-TextResponse $stream 400 'Bad Request' '400'
        $client.Close()
        continue
      }

      $headerBytes = $acc.GetRange(0, $headerEnd).ToArray()
      $headerText = [System.Text.Encoding]::ASCII.GetString($headerBytes)
      $lines = $headerText.Split("`r`n")
      $requestLine = $lines[0]
      if ([string]::IsNullOrWhiteSpace($requestLine)) {
        $client.Close()
        continue
      }

      $headers = @{}
      for ($li = 1; $li -lt $lines.Length; $li++) {
        $line = $lines[$li]
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        $idx = $line.IndexOf(':')
        if ($idx -gt 0) {
          $name = $line.Substring(0, $idx).Trim().ToLowerInvariant()
          $value = $line.Substring($idx + 1).Trim()
          $headers[$name] = $value
        }
      }

      $parts = $requestLine.Split(' ')
      if ($parts.Length -lt 2) {
        Send-TextResponse $stream 400 'Bad Request' '400'
        $client.Close()
        continue
      }

      $method = $parts[0].ToUpperInvariant()
      $urlPath = $parts[1]
      if ($urlPath -match '^(https?)://') {
        try { $urlPath = ([System.Uri]::new($urlPath)).PathAndQuery } catch {}
      }

      $path = $urlPath.Split('?')[0].TrimStart('/')
      if ([string]::IsNullOrWhiteSpace($path)) { $path = 'index.html' }
      $path = [System.Uri]::UnescapeDataString($path)

      if ($path.StartsWith('api/', [System.StringComparison]::OrdinalIgnoreCase)) {
        $cors = @{
          'Access-Control-Allow-Origin' = '*'
          'Access-Control-Allow-Methods' = 'GET,HEAD,POST,PUT,OPTIONS'
          'Access-Control-Allow-Headers' = 'Content-Type'
          'Cache-Control' = 'no-store'
        }
        if ($method -eq 'OPTIONS') {
          Send-Response $stream 204 'No Content' 'text/plain; charset=utf-8' ([byte[]]@()) $cors
          $client.Close()
          continue
        }

        if ($path -eq 'api/health') {
          if ($method -ne 'GET' -and $method -ne 'HEAD') {
            Send-JsonResponse $stream 405 'Method Not Allowed' '{"error":"METHOD_NOT_ALLOWED"}' $cors
            $client.Close()
            continue
          }
          if ($method -eq 'HEAD') {
            Send-Response $stream 200 'OK' 'application/json; charset=utf-8' ([byte[]]@()) $cors
            $client.Close()
            continue
          }
          Send-JsonResponse $stream 200 'OK' '{"ok":true}' $cors
          $client.Close()
          continue
        }

        if ($path -eq 'api/db') {
          if ($method -eq 'GET' -or $method -eq 'HEAD') {
            if (-not (Test-Path -LiteralPath $dbFile -PathType Leaf)) {
              Send-JsonResponse $stream 404 'Not Found' '{"error":"DB_NOT_FOUND"}' $cors
              $client.Close()
              continue
            }
            $raw = [System.IO.File]::ReadAllText($dbFile, [System.Text.Encoding]::UTF8)
            if ($method -eq 'HEAD') {
              Send-Response $stream 200 'OK' 'application/json; charset=utf-8' ([byte[]]@()) $cors
              $client.Close()
              continue
            }
            Send-JsonResponse $stream 200 'OK' $raw $cors
            $client.Close()
            continue
          }

          if ($method -eq 'POST' -or $method -eq 'PUT') {
            $len = 0
            if ($headers.ContainsKey('content-length')) {
              try { $len = [int]$headers['content-length'] } catch { $len = 0 }
            }
            $isChunked = $false
            if ($headers.ContainsKey('transfer-encoding')) {
              $te = [string]$headers['transfer-encoding']
              if ($null -eq $te) { $te = '' }
              $te = $te.ToLowerInvariant()
              if ($te.Contains('chunked')) { $isChunked = $true }
            }
            $bodyStart = $headerEnd + 4
            $bodyBytes = $null
            $copied = 0
            if ($isChunked) {
              try {
                $bodyBytes = Read-ChunkedBody $stream $acc $bodyStart
                $copied = $bodyBytes.Length
              } catch {
                $bodyBytes = [byte[]]@()
                $copied = 0
              }
            } else {
              $already = $acc.Count - $bodyStart
              $bodyBytes = New-Object byte[] $len
              $copied = 0
              if ($len -gt 0 -and $already -gt 0) {
                $take = [Math]::Min($len, $already)
                $acc.CopyTo($bodyStart, $bodyBytes, 0, $take)
                $copied = $take
              }
              while ($copied -lt $len) {
                $n = $stream.Read($bodyBytes, $copied, $len - $copied)
                if ($n -le 0) { break }
                $copied += $n
              }
            }
            $bodyText = ''
            if ($copied -gt 0) {
              $bodyText = Decode-RequestBody $bodyBytes $copied
            }

            if ([string]::IsNullOrWhiteSpace($bodyText)) {
              Send-JsonResponse $stream 400 'Bad Request' '{"error":"EMPTY_BODY"}' $cors
              $client.Close()
              continue
            }

            $parsed = $null
            try {
              $res = Try-ParseDbJson $bodyBytes $copied
              if ($null -ne $res) { $parsed = $res.obj }
            } catch { $parsed = $null }
            if ($null -eq $parsed) {
              $t = $bodyText.TrimStart()
              $looks = ($t.StartsWith('{') -or $t.StartsWith('['))
              $err = ('{"error":"INVALID_JSON","bytes":' + $copied + ',"looksJson":' + ($(if ($looks) { 'true' } else { 'false' })) + '}')
              Send-JsonResponse $stream 400 'Bad Request' $err $cors
              $client.Close()
              continue
            }

            $invalid = $false
            if ($parsed -is [array]) { $invalid = $true }
            if (-not $invalid) {
              $verOk = $false
              try {
                if ([int]$parsed.version -eq 2) { $verOk = $true }
              } catch { $verOk = $false }
              if (-not $verOk) { $invalid = $true }
              if ($null -eq $parsed.roulottes -or -not ($parsed.roulottes -is [array])) { $invalid = $true }
              if ($null -eq $parsed.categories -or -not ($parsed.categories -is [array])) { $invalid = $true }
            }
            if ($invalid) {
              Send-JsonResponse $stream 400 'Bad Request' '{"error":"INVALID_SCHEMA"}' $cors
              $client.Close()
              continue
            }

            $normalized = $parsed | ConvertTo-Json -Depth 100
            [System.IO.File]::WriteAllText($dbFile, $normalized, [System.Text.UTF8Encoding]::new($false))
            Send-JsonResponse $stream 200 'OK' '{"ok":true}' $cors
            $client.Close()
            continue
          }

          Send-JsonResponse $stream 405 'Method Not Allowed' '{"error":"METHOD_NOT_ALLOWED"}' $cors
          $client.Close()
          continue
        }

        Send-JsonResponse $stream 404 'Not Found' '{"error":"NOT_FOUND"}' $cors
        $client.Close()
        continue
      }

      if ($method -ne 'GET' -and $method -ne 'HEAD') {
        Send-TextResponse $stream 405 'Method Not Allowed' '405'
        $client.Close()
        continue
      }

      $candidate = [System.IO.Path]::GetFullPath((Join-Path $root $path))
      if (-not $candidate.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
        Send-TextResponse $stream 403 'Forbidden' '403'
        $client.Close()
        continue
      }

      if ($candidate -eq $dbFile) {
        Send-TextResponse $stream 404 'Not Found' '404'
        $client.Close()
        continue
      }

      if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
        Send-TextResponse $stream 404 'Not Found' '404'
        $client.Close()
        continue
      }

      $fileBytes = [System.IO.File]::ReadAllBytes($candidate)
      $ctype = Get-ContentType $candidate
      if ($method -eq 'HEAD') { Send-Response $stream 200 'OK' $ctype ([byte[]]@()) $null }
      else { Send-Response $stream 200 'OK' $ctype $fileBytes $null }
      $client.Close()
    } catch {
      try {
        if ($null -ne $stream) { Send-TextResponse $stream 500 'Internal Server Error' '500' }
      } catch {}
      try { $client.Close() } catch {}
    }
    if ($Once) { break }
  }
} finally {
  try { $listener.Stop() } catch {}
}
