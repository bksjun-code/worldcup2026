import { useState, useEffect, useCallback } from 'react'
import api from '../api'
import useStore from '../store/useStore'
import { withCountry } from '../utils/flags'

function formatKST(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── 확인 팝업 ─────────────────────────────────────────────────────────────────
function ConfirmModal({ message, confirmLabel = '확인', cancelLabel = '취소', onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => { e.stopPropagation(); onCancel() }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-5 space-y-4"
        style={{ background: '#0c0e1a', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}
      >
        <p className="text-sm text-gray-200 text-center leading-relaxed">{message}</p>
        <div className="flex justify-center gap-2">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className="btn-gold px-5 py-2 text-sm">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 글쓰기 팝업 ───────────────────────────────────────────────────────────────
function PostFormModal({ onClose, onCreated }) {
  const { user } = useStore()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 모두 입력해주세요')
      return
    }
    setLoading(true)
    try {
      await api.post('/board', { title, content })
      onCreated?.()
      onClose?.()
    } catch (err) {
      setError(err.response?.data?.detail || '글 작성에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col p-5 space-y-3"
        style={{ background: '#0c0e1a', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm text-gray-400">
            <span className="text-wc-gold font-bold">{withCountry(user.nickname, user.national)}</span> 님, 우리나라 응원의 한마디를 남겨주세요!
          </div>
          <button type="button" onClick={onClose} className="text-white/30 hover:text-white text-xl leading-none flex-shrink-0">✕</button>
        </div>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="제목"
          maxLength={200}
          autoFocus
          className="glass-input w-full px-3 py-2 text-sm"
        />
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="응원 메시지를 남겨주세요..."
          rows={4}
          className="glass-input w-full px-3 py-2 text-sm resize-none"
        />
        {error && <div className="text-xs text-red-400">{error}</div>}
        <div className="flex justify-end">
          <button type="submit" disabled={loading} className="btn-gold px-5 py-2 text-sm disabled:opacity-50">
            {loading ? '작성 중...' : '응원글 등록'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── 게시글 목록 행 ────────────────────────────────────────────────────────────
function PostRow({ post, onSelect }) {
  return (
    <button
      onClick={() => onSelect(post.id)}
      className="w-full text-left wc-card p-4 mb-2.5 hover:border-wc-gold/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-white truncate">{post.title}</div>
          <div className="text-xs text-gray-500 mt-1">
            {withCountry(post.author.nickname, post.author.national)} · {formatKST(post.created_at)}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400 flex-shrink-0">
          <span>👁 {post.view_count}</span>
          <span>💬 {post.comment_count}</span>
          <span className="text-green-400">👍 {post.like_count}</span>
          <span className="text-red-400">👎 {post.dislike_count}</span>
        </div>
      </div>
    </button>
  )
}

// ── 게시글 상세 모달 ──────────────────────────────────────────────────────────
function PostDetailModal({ postId, onClose, onChanged }) {
  const { user } = useStore()
  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reacting, setReacting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editError, setEditError] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.get(`/board/${postId}`),
      api.get(`/board/${postId}/comments`),
    ]).then(([p, c]) => {
      setPost(p.data)
      setComments(c.data)
    }).finally(() => setLoading(false))
  }, [postId])

  useEffect(() => { load() }, [load])

  const handleReaction = async (type) => {
    if (!user || reacting) return
    setReacting(true)
    try {
      const r = await api.put(`/board/${postId}/reaction`, { type })
      setPost(prev => prev ? { ...prev, ...r.data } : prev)
      onChanged?.()
    } finally {
      setReacting(false)
    }
  }

  const startEdit = () => {
    setEditTitle(post.title)
    setEditContent(post.content)
    setEditError('')
    setEditing(true)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setEditError('')
    if (!editTitle.trim() || !editContent.trim()) {
      setEditError('제목과 내용을 모두 입력해주세요')
      return
    }
    setEditLoading(true)
    try {
      const r = await api.put(`/board/${postId}`, { title: editTitle, content: editContent })
      setPost(r.data)
      setEditing(false)
      onChanged?.()
    } catch (err) {
      setEditError(err.response?.data?.detail || '수정에 실패했습니다')
    } finally {
      setEditLoading(false)
    }
  }

  const handleDelete = async () => {
    if (deleting) return
    setDeleting(true)
    try {
      await api.delete(`/board/${postId}`)
      onChanged?.()
      onClose?.()
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim() || submitting) return
    setSubmitting(true)
    try {
      await api.post(`/board/${postId}/comments`, { content: commentText })
      setCommentText('')
      load()
      onChanged?.()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
        style={{ background: '#0c0e1a', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        {loading || !post ? (
          <div className="text-center text-gray-500 py-20">로딩 중...</div>
        ) : (
          <>
            <div className="flex-shrink-0 px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bebas text-xl text-white tracking-wide truncate">{post.title}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {withCountry(post.author.nickname, post.author.national)} · {formatKST(post.created_at)} · 👁 조회 {post.view_count}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {user && user.id === post.author.id && !editing && (
                    <>
                      <button onClick={startEdit} className="text-xs text-gray-400 hover:text-wc-gold transition-colors">수정</button>
                      <button onClick={() => setConfirmDelete(true)} disabled={deleting} className="text-xs text-gray-400 hover:text-red-400 transition-colors disabled:opacity-40">삭제</button>
                    </>
                  )}
                  <button onClick={onClose} className="text-white/30 hover:text-white text-xl leading-none">✕</button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {editing ? (
                <form onSubmit={handleEditSubmit} className="space-y-2.5">
                  <input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    placeholder="제목"
                    maxLength={200}
                    className="glass-input w-full px-3 py-2 text-sm"
                  />
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    placeholder="내용을 입력하세요..."
                    rows={4}
                    className="glass-input w-full px-3 py-2 text-sm resize-none"
                  />
                  {editError && <div className="text-xs text-red-400">{editError}</div>}
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setEditing(false)} className="px-4 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>취소</button>
                    <button type="submit" disabled={editLoading} className="btn-gold px-4 py-1.5 text-xs disabled:opacity-50">
                      {editLoading ? '저장 중...' : '저장'}
                    </button>
                  </div>
                </form>
              ) : (
                <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{post.content}</p>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleReaction('like')}
                  disabled={!user || reacting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-40"
                  style={{
                    background: post.my_reaction === 'like' ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${post.my_reaction === 'like' ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    color: post.my_reaction === 'like' ? '#4ade80' : 'rgba(255,255,255,0.6)',
                  }}
                >
                  👍 좋아요 <span className="font-bold">{post.like_count}</span>
                </button>
                <button
                  onClick={() => handleReaction('dislike')}
                  disabled={!user || reacting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-40"
                  style={{
                    background: post.my_reaction === 'dislike' ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${post.my_reaction === 'dislike' ? 'rgba(248,113,113,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    color: post.my_reaction === 'dislike' ? '#f87171' : 'rgba(255,255,255,0.6)',
                  }}
                >
                  👎 싫어요 <span className="font-bold">{post.dislike_count}</span>
                </button>
                {!user && <span className="text-xs text-gray-600">로그인 후 반응을 남길 수 있습니다</span>}
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-2">댓글 {comments.length}개</div>
                <div className="space-y-2.5">
                  {comments.length === 0 && (
                    <div className="text-xs text-gray-600 py-3 text-center">첫 댓글을 남겨보세요!</div>
                  )}
                  {comments.map(c => (
                    <div key={c.id} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-wc-gold">{withCountry(c.author.nickname, c.author.national)}</span>
                        <span className="text-[10px] text-gray-600">{formatKST(c.created_at)}</span>
                      </div>
                      <div className="text-sm text-gray-200 whitespace-pre-wrap">{c.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 px-5 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              {!user ? (
                <div className="text-xs text-gray-600 text-center">로그인 후 댓글을 작성할 수 있습니다</div>
              ) : user.is_admin ? (
                <div className="text-xs text-gray-600 text-center">관리자 계정은 댓글을 작성할 수 없습니다</div>
              ) : (
                <form onSubmit={handleComment} className="flex gap-2">
                  <input
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="댓글을 입력하세요..."
                    className="glass-input flex-1 px-3 py-2 text-sm"
                  />
                  <button type="submit" disabled={submitting} className="btn-gold px-4 py-2 text-sm disabled:opacity-50">
                    등록
                  </button>
                </form>
              )}
            </div>
          </>
        )}
      </div>

      {confirmDelete && (
        <ConfirmModal
          message="이 게시글을 삭제하시겠습니까?"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}

const PAGE_SIZE = 5

// ── 메인 페이지 ───────────────────────────────────────────────────────────────
export default function BoardPage() {
  const { user } = useStore()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [page, setPage] = useState(1)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/board').then(r => setPosts(r.data)).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const totalPages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE))
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [totalPages, page])

  const pagePosts = posts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
    <div className="max-w-2xl mx-auto pt-8">

      {loading ? (
        <div className="text-center text-gray-500 py-16">로딩 중...</div>
      ) : posts.length === 0 ? (
        <div className="wc-card p-10 text-center text-sm text-gray-500">아직 작성된 응원글이 없습니다. 첫 글을 남겨보세요!</div>
      ) : (
        <>
          {pagePosts.map(post => <PostRow key={post.id} post={post} onSelect={setSelectedId} />)}

          <div className="flex items-center mt-6">
            <div className="flex-1" />
            <div className="flex-1 flex items-center justify-center gap-1.5">
              {totalPages > 1 && (() => {
                const btnCls = "px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
                const btnStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }

                const pageNums = []
                const delta = 2
                const left = Math.max(2, page - delta)
                const right = Math.min(totalPages - 1, page + delta)
                pageNums.push(1)
                if (left > 2) pageNums.push('...')
                for (let p = left; p <= right; p++) pageNums.push(p)
                if (right < totalPages - 1) pageNums.push('...')
                if (totalPages > 1) pageNums.push(totalPages)

                return (
                  <>
                    <button onClick={() => setPage(1)} disabled={page === 1} className={btnCls} style={btnStyle}>«</button>
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className={btnCls} style={btnStyle}>‹</button>
                    {pageNums.map((p, i) =>
                      p === '...'
                        ? <span key={`ellipsis-${i}`} className="px-1 text-gray-600 text-xs">…</span>
                        : <button
                            key={p}
                            onClick={() => setPage(p)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${p === page ? 'bg-wc-gold text-black' : 'text-gray-400 hover:text-white'}`}
                            style={p !== page ? btnStyle : {}}
                          >{p}</button>
                    )}
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className={btnCls} style={btnStyle}>›</button>
                    <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className={btnCls} style={btnStyle}>»</button>
                  </>
                )
              })()}
            </div>
            <div className="flex-1 flex justify-end">
              {!user ? (
                <span className="text-xs text-gray-500">로그인 후 작성 가능</span>
              ) : user.is_admin ? (
                <span className="text-xs text-gray-500">관리자는 작성 불가</span>
              ) : (
                <button onClick={() => setShowForm(true)} className="btn-gold px-5 py-2 text-sm">
                  ✍️ 글 작성
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {showForm && (
        <PostFormModal
          onClose={() => setShowForm(false)}
          onCreated={() => { setPage(1); load() }}
        />
      )}

      {selectedId && (
        <PostDetailModal
          postId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={load}
        />
      )}
    </div>
    </div>
  )
}
