import { useCallback, useEffect, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import { HocuspocusProvider } from '@hocuspocus/provider'
import * as Y from 'yjs'
import { api, Doc, User } from './api'

const blank = { type: 'doc', content: [{ type: 'paragraph' }] }
const cursorColors = ['#b65045', '#4b7895', '#8a6caa', '#b27b35', '#3d8970', '#bf5b88']
type CollaborationSession = { documentId: number; ydoc: Y.Doc; provider: HocuspocusProvider }
type Collaborator = { id: number; name: string; color?: string }

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [docs, setDocs] = useState<Doc[]>([])
  const [shared, setShared] = useState<Doc[]>([])
  const [doc, setDoc] = useState<Doc | null>(null)
  const [title, setTitle] = useState('')
  const [authError, setAuthError] = useState('')
  const [busy, setBusy] = useState(false)
  const [saveState, setSaveState] = useState('Saved')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [register, setRegister] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [collaboration, setCollaboration] = useState<CollaborationSession | null>(null)
  const [collaborationStatus, setCollaborationStatus] = useState('Disconnected')
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])

  const refresh = useCallback(async () => {
    const [a, b] = await Promise.all([api.owned(), api.shared()]); setDocs(a.documents); setShared(b.documents)
  }, [])
  useEffect(() => { api.me().then(r => setUser(r.user)).catch(() => setUser(null)) }, [])
  useEffect(() => { if (user) refresh().catch(e => setAuthError(e.message)) }, [user, refresh])

  useEffect(() => {
    if (!doc || !user) {
      setCollaboration(null)
      return
    }

    setCollaboration(null)
    setCollaborationStatus('Connecting…')
    setCollaborators([])
    const ydoc = new Y.Doc()
    const provider = new HocuspocusProvider({
      url: import.meta.env.VITE_COLLAB_URL || `ws://${window.location.hostname}:1234`,
      name: String(doc.id),
      document: ydoc,
    })
    provider.on('status', ({ status }: { status: string }) => setCollaborationStatus(status === 'connected' ? 'Connected' : 'Reconnecting…'))
    provider.on('synced', () => setCollaborationStatus('Live'))
    provider.on('authenticationFailed', () => setCollaborationStatus('Access denied'))
    provider.on('disconnect', () => setCollaborationStatus('Reconnecting…'))
    const updateCollaborators = () => {
      const awareness = provider.awareness
      if (!awareness) return
      const online = Array.from(awareness.getStates().values())
        .map(state => state.user as Collaborator | undefined)
        .filter((item): item is Collaborator => Boolean(item?.id && item?.name))
      setCollaborators(Array.from(new Map(online.map(item => [item.id, item])).values()))
    }
    provider.on('awarenessUpdate', updateCollaborators)
    const color = cursorColors[user.id % cursorColors.length]
    provider.setAwarenessField('user', { id: user.id, name: user.name, color })
    setCollaboration({ documentId: doc.id, ydoc, provider })

    return () => {
      provider.destroy()
      ydoc.destroy()
    }
  }, [doc?.id, user?.id])

  const activeCollaboration = collaboration?.documentId === doc?.id ? collaboration : null
  const editor = useEditor(activeCollaboration && user ? {
    extensions: [
      StarterKit.configure({ history: false }),
      Underline,
      Collaboration.configure({ document: activeCollaboration.ydoc }),
      CollaborationCursor.configure({
        provider: activeCollaboration.provider,
        user: { name: user.name, color: cursorColors[user.id % cursorColors.length] },
      }),
    ],
    editable: true,
  } : { extensions: [StarterKit, Underline], editable: false }, [doc?.id, activeCollaboration?.documentId, user?.id])

  async function openDocument(item: Doc) {
    try { const result = await api.get(item.id); setDoc(result.document); setTitle(result.document.title); setAuthError('') }
    catch (e) { setAuthError((e as Error).message) }
  }
  async function createDocument(initialTitle = 'Untitled document', content = blank) {
    try { const result = await api.create(initialTitle, content); setDoc(result.document); setTitle(result.document.title); await refresh() }
    catch (e) { setAuthError((e as Error).message) }
  }
  const save = useCallback(async () => {
    if (!doc) return
    setSaveState('Saving…')
    try { const result = await api.update(doc.id, { title }); setDoc(result.document); setSaveState('Saved'); await refresh() }
    catch (e) { setSaveState(`Save failed: ${(e as Error).message}`) }
  }, [doc, title, refresh])
  useEffect(() => {
    if (!doc || saveState !== 'Unsaved') return
    const timer = window.setTimeout(() => void save(), 700)
    return () => window.clearTimeout(timer)
  }, [doc, title, saveState, save])

  async function submitAuth(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setAuthError('')
    try { register ? await api.register(name, email, password) : await api.login(email, password); const r = await api.me(); setUser(r.user) }
    catch (e) { setAuthError((e as Error).message) } finally { setBusy(false) }
  }
  async function importFile(file?: File) {
    if (!file) return
    const text = await file.text()
    const paragraphs = text.split(/\r?\n/).map(line => ({ type: 'paragraph', content: line ? [{ type: 'text', text: line.replace(/^#{1,6}\s+/, '') }] : [] }))
    await createDocument(file.name.replace(/\.(txt|md)$/i, '') || 'Imported document', { type: 'doc', content: paragraphs.length ? paragraphs : blank.content })
  }
  async function share() {
    if (!doc) return
    try { await api.share(doc.id, email); setEmail(''); setShowShare(false); await refresh(); setAuthError('Document shared.') }
    catch (e) { setAuthError((e as Error).message) }
  }
  const choose = (item: Doc) => <button className={`doc-row ${doc?.id === item.id ? 'selected' : ''}`} key={item.id} onClick={() => void openDocument(item)}><span className="doc-icon">▤</span><span className="doc-name">{item.title || 'Untitled document'}<small>{new Date(item.updated_at).toLocaleDateString()}</small></span></button>

  if (!user) return <main className="auth"><div className="brand">ajaia<span>docs</span></div><section className="auth-card"><div className="eyebrow">YOUR SPACE TO THINK</div><h1>{register ? 'Create your account' : 'Welcome back'}</h1><p>Write together, one thought at a time.</p><form onSubmit={submitAuth}>{register && <label>Name<input required value={name} onChange={e => setName(e.target.value)} /></label>}<label>Email<input required type="email" value={email} onChange={e => setEmail(e.target.value)} /></label><label>Password<input required type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} /></label>{authError && <div className="error">{authError}</div>}<button className="primary full" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}</button></form><button className="link" onClick={() => { setRegister(!register); setAuthError('') }}>{register ? 'Already have an account? Sign in' : 'New to Ajaia? Create an account'}</button></section><div className="auth-note">A calm place for your ideas.</div></main>

  return <div className="app-shell"><aside className="sidebar"><div className="brand">ajaia<span>docs</span></div><div className="workspace-label">WORKSPACE</div><div className="user-chip"><div className="avatar">{user.name[0]?.toUpperCase()}</div><span>{user.name}</span><button title="Sign out" onClick={() => api.logout().finally(() => { setUser(null); setDoc(null) })}><span aria-hidden="true">↗</span><span className="signout-label">Sign out</span></button></div><button className="new-doc" onClick={() => void createDocument()}>＋ <span>New document</span><kbd>⌘ N</kbd></button><div className="list-heading">YOUR DOCUMENTS <span>{docs.length}</span></div><div className="doc-list">{docs.map(choose)}{!docs.length && <div className="empty-list">Your writing starts here.</div>}</div><div className="list-heading shared-heading">SHARED WITH YOU <span>{shared.length}</span></div><div className="doc-list">{shared.map(choose)}{!shared.length && <div className="empty-list">Documents shared with you appear here.</div>}</div><div className="sidebar-bottom"><span className="status-dot"/> All changes sync automatically</div></aside>
    <main className="main"><header className="topbar"><div className="breadcrumb">My workspace <span>/</span> <b>{doc?.title || 'Select a document'}</b></div>{doc && <div className="top-actions"><label className="import-button">↑ Import .txt / .md<input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={e => void importFile(e.target.files?.[0])}/></label><span className="save-state">{saveState}</span><span className={`collaboration-status ${collaborationStatus === 'Live' ? 'online' : ''}`}><i />{collaborationStatus}</span>{collaborators.length > 1 && <span className="collaborator-count">{collaborators.length} here</span>}<button className="share-button" onClick={() => setShowShare(true)}>Share</button></div>}</header>
    {authError && <div className="toast" onClick={() => setAuthError('')}>{authError} <span>×</span></div>}
    {doc ? <div className="document"><div className="paper"><input className="title-input" value={title} onChange={e => { setTitle(e.target.value); setSaveState('Unsaved') }} placeholder="Untitled document"/><div className="editor-toolbar">{[['bold','B'],['italic','I'],['underline','U'],['heading','H1'],['bulletList','• List'],['orderedList','1. List']].map(([type,label])=><button key={type} className={editor?.isActive(type === 'heading' ? 'heading' : type) ? 'active' : ''} title={label} onClick={() => { if (!editor) return; if (type === 'bold') editor.chain().focus().toggleBold().run(); if(type==='italic') editor.chain().focus().toggleItalic().run(); if(type==='underline') editor.chain().focus().toggleUnderline().run(); if(type==='heading') editor.chain().focus().toggleHeading({level:1}).run(); if(type==='bulletList') editor.chain().focus().toggleBulletList().run(); if(type==='orderedList') editor.chain().focus().toggleOrderedList().run() }}>{label}</button>)}</div>{activeCollaboration ? <EditorContent editor={editor} /> : <div className="editor-loading">Connecting to the shared document…</div>}</div></div> : <div className="welcome"><div className="welcome-mark">✳</div><div className="eyebrow">A LITTLE SPACE TO THINK</div><h1>Good ideas start<br/>with a blank page.</h1><p>Create a document or open one from your workspace.</p><button className="primary" onClick={() => void createDocument()}>＋ Create a document</button></div>}
    </main>{showShare && <div className="modal-backdrop" onMouseDown={e => {if(e.target===e.currentTarget)setShowShare(false)}}><section className="share-modal"><button className="close" onClick={() => setShowShare(false)}>×</button><div className="eyebrow">COLLABORATE</div><h2>Share this document</h2><p>Invite someone with an Ajaia Docs account.</p><label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" autoFocus/></label><button className="primary full" onClick={() => void share()}>Share document</button></section></div>}</div>
}
