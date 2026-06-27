#!/usr/bin/env node
/**
 * Migration Runner — выполняет SQL-миграции в порядке нумерации
 * Использование: node db/migrate.js [up|down|status]
 *
 * Принцип: flyway-style
 * - Таблица _migrations отслеживает выполненные миграции
 * - Каждый файл выполняется в транзакции
 * - Неудачная миграция откатывается и останавливает процесс
 */

import pkg from 'pg'
import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import crypto from 'node:crypto'
import dotenv from 'dotenv'

dotenv.config()
const __dirname = dirname(fileURLToPath(import.meta.url))

const { Pool } = pkg

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'kozagogo',
  user: process.env.DB_USER || 'kozagogo',
  password: process.env.DB_PASS || 'kozagogo_pass_2024',
  max: 5,
})

const MIGRATIONS_DIR = join(__dirname, 'migrations')

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id          SERIAL PRIMARY KEY,
      filename    VARCHAR(255) UNIQUE NOT NULL,
      hash        VARCHAR(64) NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
}

function getMigrationFiles() {
  return readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort()
}

function hashFile(content) {
  return crypto.createHash('sha256').update(content).digest('hex')
}

async function getExecutedMigrations() {
  const { rows } = await pool.query('SELECT filename, hash FROM _migrations ORDER BY filename')
  return rows
}

async function status() {
  await ensureMigrationsTable()
  const files = getMigrationFiles()
  const executed = await getExecutedMigrations()
  const executedMap = new Map(executed.map(r => [r.filename, r.hash]))

  console.log('\n📋 Миграции:\n')
  for (const file of files) {
    const content = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8')
    const hash = await hashFile(content)
    const done = executedMap.get(file)
    const status = done
      ? (done === hash ? '✅' : '⚠️  (hash changed!)')
      : '⬜'
    console.log(` ${status} ${file}`)
  }

  // Проверка на удалённые файлы
  for (const { filename } of executed) {
    if (!files.includes(filename)) {
      console.log(` ❓ ${filename} — файл удалён, но зарегистрирован в БД`)
    }
  }

  console.log(`\nВсего: ${files.length} файлов, ${executed.length} выполнено\n`)
  await pool.end()
}

async function up(targetFilename = null) {
  await ensureMigrationsTable()
  const files = getMigrationFiles()
  const executed = await getExecutedMigrations()
  const executedSet = new Set(executed.map(r => r.filename))

  const pending = targetFilename
    ? files.filter(f => f <= targetFilename && !executedSet.has(f))
    : files.filter(f => !executedSet.has(f))

  if (pending.length === 0) {
    console.log('✅ Все миграции уже выполнены.')
    await pool.end()
    return
  }

  console.log(`\n🚀 Выполняется ${pending.length} миграций...\n`)

  for (const file of pending) {
    const content = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8')
    const hash = await hashFile(content)

    console.log(`   → ${file}...`)

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(content)
      await client.query(
        'INSERT INTO _migrations (filename, hash) VALUES ($1, $2) ON CONFLICT (filename) DO UPDATE SET hash = $2',
        [file, hash]
      )
      await client.query('COMMIT')
      console.log(`   ✅ ${file} — OK`)
    } catch (err) {
      await client.query('ROLLBACK')
      console.error(`   ❌ ${file} — ОШИБКА:`, err.message)
      console.error('   Миграция остановлена.')
      client.release()
      await pool.end()
      process.exit(1)
    }
    client.release()
  }

  console.log(`\n✅ Выполнено ${pending.length} миграций.`)
  await pool.end()
}

async function down(filename) {
  if (!filename) {
    console.error('❌ Укажите файл для отката: node db/migrate.js down <filename>')
    await pool.end()
    process.exit(1)
  }

  await ensureMigrationsTable()

  const { rowCount } = await pool.query('DELETE FROM _migrations WHERE filename = $1', [filename])
  if (rowCount > 0) {
    console.log(`⬇️  ${filename} — откат зарегистрирован (требуется ручное выполнение обратного SQL)`)
  } else {
    console.log(`❓ ${filename} — не найден в _migrations`)
  }

  await pool.end()
}

// CLI
const command = process.argv[2] || 'status'
const arg = process.argv[3]

switch (command) {
  case 'up':
    await up(arg || null)
    break
  case 'down':
    await down(arg)
    break
  case 'status':
  default:
    await status()
    break
}
