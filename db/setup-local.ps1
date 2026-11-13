# Creates the local "academy" database on PostgreSQL 18 and applies the unified schema.
# Usage (PowerShell, from D:\intern\course):  .\db\setup-local.ps1
# The password is requested at run time and is not stored in this file.

param(
  [string]$PgHost = "127.0.0.1",
  [int]$Port = 5432,
  [string]$User = "postgres",
  [string]$DbName = "academy"
)

$ErrorActionPreference = "Stop"
$psql = (Get-Command psql -ErrorAction SilentlyContinue).Source
if (-not $psql) {
  $psql = Get-ChildItem "C:\Program Files\PostgreSQL\18\bin\psql.exe" -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
}
if (-not $psql) { throw "psql not found. Add PostgreSQL 18 bin folder to PATH." }

$secure = Read-Host "Password for user $User" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)

$exists = & $psql -h $PgHost -p $Port -U $User -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DbName'"
if ($exists -ne "1") {
  & $psql -h $PgHost -p $Port -U $User -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $DbName"
  Write-Host "Created database $DbName"
} else {
  Write-Host "Database $DbName already exists; schema will be applied on top of it."
}

$schema = Join-Path $PSScriptRoot "unified_production_schema.sql"
& $psql -h $PgHost -p $Port -U $User -d $DbName -v ON_ERROR_STOP=1 -f $schema
Write-Host "Schema applied to $DbName."
Remove-Item Env:PGPASSWORD
