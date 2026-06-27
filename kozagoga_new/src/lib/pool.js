// Shared database pool singleton
// Импортируется server.js и всеми модулями роутов
import pkg from 'pg'
import dotenv from 'dotenv'
dotenv.config()

const { Pool } = pkg

let _pool = null
let _readPool = null

export function getPool() {
  if (!_pool) {
    _pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'kozagogo',
      user: process.env.DB_USER || 'kozagogo',
      password: process.env.DB_PASS || 'kozagogo_pass_2024',
      max: parseInt(process.env.DB_POOL_MAX || '30'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT || '5000'),
    })
  }
  return _pool
}

export function getReadPool() {
  if (!_readPool) {
    _readPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'kozagogo',
      user: process.env.DB_USER || 'kozagogo',
      password: process.env.DB_PASS || 'kozagogo_pass_2024',
      max: parseInt(process.env.DB_POOL_MAX_READ || '20'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  }
  return _readPool
}
