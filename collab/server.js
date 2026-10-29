import { Server } from '@hocuspocus/server'
import { TiptapTransformer } from '@hocuspocus/transformer'
import Underline from '@tiptap/extension-underline'
import StarterKit from '@tiptap/starter-kit'
import pg from 'pg'
import * as Y from 'yjs'

const { Pool } = pg
const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_DATABASE || 'ajaia_docs',
  user: process.env.DB_USERNAME || 'ajaia',
  password: process.env.DB_PASSWORD,
  max: 10,
})
const apiUrl = process.env.API_INTERNAL_URL || 'http://api:8000'
const allowedOrigin = process.env.WEB_ORIGIN || 'http://localhost:5173'
const blankDocument = { type: 'doc', content: [{ type: 'paragraph' }] }
const schemaExtensions = [StarterKit, Underline]

const server = new Server({
  name: 'ajaia-docs-collaboration',
  address: '0.0.0.0',
  port: Number(process.env.PORT || 1234),
  debounce: 1000,
  maxDebounce: 5000,
  websocketOptions: { maxPayload: 1024 * 1024 },

  async onAuthenticate({ documentName, requestHeaders }) {
    if (!/^\d+$/.test(documentName)) throw new Error('Invalid document')
    if (requestHeaders.get('origin') !== allowedOrigin) throw new Error('Invalid origin')
    const cookie = requestHeaders.get('cookie')
    if (!cookie) throw new Error('Sign in to collaborate')

    const response = await fetch(`${apiUrl}/api/documents/${documentName}/collaboration-access`, {
      headers: { Cookie: cookie, Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    })
    if (!response.ok) throw new Error('You do not have access to this document')
    const { user } = await response.json()
    return { user: { id: user.id, name: user.name } }
  },

  async onLoadDocument({ documentName }) {
    const { rows } = await pool.query(
      'SELECT content, collaboration_state FROM documents WHERE id = $1',
      [Number(documentName)],
    )
    const row = rows[0]
    if (!row) throw new Error('Document not found')

    if (row.collaboration_state) {
      const document = new Y.Doc()
      Y.applyUpdate(document, row.collaboration_state)
      return document
    }

    // Existing REST-created documents are seeded into Yjs only once.
    return TiptapTransformer.toYdoc(row.content || blankDocument, 'default', schemaExtensions)
  },

  async onStoreDocument({ documentName, document }) {
    const content = TiptapTransformer.fromYdoc(document, 'default')
    const state = Buffer.from(Y.encodeStateAsUpdate(document))
    await pool.query(
      'UPDATE documents SET collaboration_state = $1, content = $2::jsonb, updated_at = NOW() WHERE id = $3',
      [state, JSON.stringify(content), Number(documentName)],
    )
  },

  async onListen({ port }) {
    console.log(`Collaboration WebSocket listening on ${port}`)
  },
})

server.listen()

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await server.destroy()
    await pool.end()
    process.exit(0)
  })
}
