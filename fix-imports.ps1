# Script to fix import paths in UI components
$components = Get-ChildItem -Path "components/ui" -Filter "*.tsx"

foreach ($component in $components) {
    $content = Get-Content -Path $component.FullName
    $updated = $content -replace '@/lib/utils', '../../lib/utils' -replace '@/components/ui', './'
    Set-Content -Path $component.FullName -Value $updated
}

Write-Host "Fixed imports in $($components.Count) files" 