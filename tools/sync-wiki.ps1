# tools/sync-wiki.ps1
# Mirrors docs/*.md into the repository GitHub Wiki (digibuddy.wiki.git).
# Idempotent: re-run after any docs/ change.
#
# Usage:  pwsh tools/sync-wiki.ps1   (or .\tools\sync-wiki.ps1 in PowerShell)
#
# Notes:
# - Strips Jekyll front matter and just-the-docs class annotations.
# - Rewrites {{ site.baseurl }}/page/ -> page (relative wiki links).
# - Generates Home.md (from index.md) and _Sidebar.md.
# - The wiki repo must exist: create its first page once in the GitHub web UI
#   (Wiki tab -> Create the first page) if the clone fails.

param()

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$docsDir  = Join-Path $repoRoot 'docs'
$wikiUrl  = 'https://github.com/FabianGallardo-coder/digibuddy.wiki.git'
$pagesUrl = 'https://fabiangallardo-coder.github.io/digibuddy'
$cloneDir = Join-Path ([System.IO.Path]::GetTempPath()) 'digibuddy-wiki-sync'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

if (-not (Test-Path $docsDir)) { throw "docs/ not found at $docsDir" }

# --- clone (fresh) ---
if (Test-Path $cloneDir) { Remove-Item -Recurse -Force $cloneDir }
git clone $wikiUrl $cloneDir
if ($LASTEXITCODE -ne 0) {
    throw "Wiki clone failed. Create the first page in the web UI (Wiki tab -> Create the first page) and re-run."
}

# --- convert one file ---
function Convert-Page {
    param([string]$Path, [string]$Title)

    $text = [System.IO.File]::ReadAllText($Path)

    # drop YAML front matter (--- ... ---)
    if ($text -match '\A---\r?\n.*?\r?\n---\r?\n') {
        $text = $text -replace '\A---\r?\n.*?\r?\n---\r?\n', ''
    }

    # Liquid baseurl -> plain relative link (wiki resolves [x](page))
    $text = $text -replace '\{\{\s*site\.baseurl\s*\}\}/([A-Za-z0-9\-_/]+?)/', '$1'
    # any leftover Liquid -> absolute Pages URL
    $text = $text -replace '\{\{\s*site\.baseurl\s*\}\}', $pagesUrl
    # just-the-docs button/class annotations are meaningless on the wiki
    $text = $text -replace '\{:\s*\.[^}]+\}', ''
    # ensure a single H1 title at the top
    if ($text -notmatch '(?m)^# ') {
        $text = "# $Title`n`n" + $text
    }
    return $text.Trim() + "`n"
}

# --- map docs pages -> wiki pages ---
$pages = [ordered]@{
    'index.md'           = 'Home.md'
    'installation.md'    = 'Installation.md'
    'user-guide.md'      = 'User-Guide.md'
    'chat-and-ollama.md' = 'Chat-and-Ollama.md'
    'save-watch.md'      = 'Save-Watcher.md'
    'architecture.md'    = 'Architecture.md'
    'development.md'     = 'Development.md'
    'faq.md'             = 'FAQ.md'
    'credits.md'         = 'Credits.md'
}

foreach ($src in $pages.Keys) {
    $srcPath = Join-Path $docsDir $src
    if (-not (Test-Path $srcPath)) { Write-Warning "missing $src"; continue }
    $title  = [IO.Path]::GetFileNameWithoutExtension($src).Replace('-', ' ')
    $out    = Convert-Page -Path $srcPath -Title $title
    $dest   = Join-Path $cloneDir $pages[$src]
    [System.IO.File]::WriteAllText($dest, $out, $utf8NoBom)
    Write-Host "  ~ $($pages[$src])"
}

# --- sidebar ---
$sb = @"
* [Home](Home)
* [Installation](Installation)
* [User Guide](User-Guide)
* [Chat & Ollama](Chat-and-Ollama)
* [Save Watcher](Save-Watcher)
* [Architecture](Architecture)
* [Development](Development)
* [FAQ](FAQ)
* [Credits](Credits)
---
[Documentation site]($pagesUrl) · [Releases](https://github.com/FabianGallardo-coder/digibuddy/releases/latest) · [Report issue](https://github.com/FabianGallardo-coder/digibuddy/issues)
"@
[System.IO.File]::WriteAllText((Join-Path $cloneDir '_Sidebar.md'), $sb + "`n", $utf8NoBom)

# --- commit + push (HEAD keeps the remote's default branch name) ---
git -C $cloneDir add -A
git -C $cloneDir -c user.name="Fabian Gallardo" -c user.email="reactjsvcpz@gmail.com" `
    commit -m "docs: sync from docs/ source of truth"
# exit 1 here just means "nothing to commit" (idempotent re-run)
git -C $cloneDir push origin HEAD
if ($LASTEXITCODE -ne 0) { throw "wiki push failed" }

Write-Host "Wiki synced -> https://github.com/FabianGallardo-coder/digibuddy/wiki"
