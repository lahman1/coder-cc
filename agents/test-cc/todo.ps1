# Simple Todo CLI Application
# Usage: .\todo.ps1 [add|list|complete|delete] [args...]

$dataFile = Join-Path -Path $PSScriptRoot -ChildPath "todos.json"

function Load-Todos {
    if (Test-Path $dataFile) {
        return Get-Content $dataFile | ConvertFrom-Json
    }
    return @()
}

function Save-Todos {
    param($todos)
    $todos | ConvertTo-Json -Depth 3 | Set-Content $dataFile
}

function Add-Todo {
    param($text)
    $todos = Load-Todos
    $newId = if ($todos) { ($todos[-1].id + 1) } else { 1 }
    $todos += [PSCustomObject]@{
        id = $newId
        text = $text
        completed = $false
    }
    Save-Todos $todos
}

function List-Todos {
    $todos = Load-Todos
    if ($todos.Count -eq 0) {
        Write-Host "No todos found."
        return
    }
    foreach ($todo in $todos) {
        $status = if ($todo.completed) { "[x]" } else { "[ ]" }
        Write-Host "${todo.id} $status ${todo.text}"
    }
}

function Complete-Todo {
    param($id)
    $todos = Load-Todos
    $todo = $todos | Where-Object { $_.id -eq $id }
    if (-not $todo) {
        Write-Host "Todo with ID $id not found"
        return
    }
    $todo.completed = $true
    Save-Todos $todos
}

function Delete-Todo {
    param($id)
    $todos = Load-Todos
    $todos = $todos | Where-Object { $_.id -ne $id }
    Save-Todos $todos
}

# Main logic
if ($args.Count -eq 0) {
    Write-Host "No command provided"
    Write-Host "Available commands: add, list, complete, delete"
    exit
}

$command = $args[0]

switch ($command) {
    "add" {
        if ($args.Count -lt 2) {
            Write-Host "Usage: todo.ps1 add <text>"
            exit
        }
        Add-Todo $args[1]
    }
    "list" {
        List-Todos
    }
    "complete" {
        if ($args.Count -lt 2) {
            Write-Host "Usage: todo.ps1 complete <id>"
            exit
        }
        Complete-Todo $args[1]
    }
    "delete" {
        if ($args.Count -lt 2) {
            Write-Host "Usage: todo.ps1 delete <id>"
            exit
        }
        Delete-Todo $args[1]
    }
    default {
        Write-Host "Unknown command: $command"
        Write-Host "Available commands: add, list, complete, delete"
    }
}