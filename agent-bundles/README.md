# QA Report Agent 0.4.0

Готовые установщики macOS Apple Silicon и Windows x64 хранятся здесь частями до
48 МиБ. Они восстанавливаются автоматически при `docker compose up -d --build`.
Без Docker: `npm run agent:assemble` из корня проекта.

Результат: `qa-report-agent-0.4.0-mac-arm64.dmg` и
`qa-report-agent-0.4.0-windows-x64.exe`. `bundle.json` содержит порядок частей,
размеры и SHA-256; повреждённая сборка не проходит проверку.

Также включены подписанный пакет обновления и публичные метаданные. Закрытый ключ
подписания сюда не входит. Команды следующего выпуска — в `agent/README.md`.
