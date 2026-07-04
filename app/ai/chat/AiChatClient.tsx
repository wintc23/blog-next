'use client'

import {
  App,
  Button,
  Empty,
  Drawer,
  Image,
  Input,
  Dropdown,
  MenuProps,
  Modal,
  Spin,
  Upload,
  type UploadFile,
} from 'antd'
import {
  CloseOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  MessageOutlined,
  MoreOutlined,
  PushpinFilled,
  PushpinOutlined,
  PlusOutlined,
  SendOutlined,
  StopOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  aiLogin,
  clearAiToken,
  createAiSession,
  deleteAiSession,
  listAiMessages,
  listAiSessions,
  renameAiSession,
  sendAiMessage,
  setAiSessionPinned,
  setAiToken,
  stopAiSession,
  uploadAiAttachment,
  resolveAiFileUrl,
  type AiAttachment,
  type AiMessage,
  type AiSession,
} from '@/lib/api/ai-chat'
import { formatTime } from '@/lib/utils'

const { TextArea } = Input

function hasToken() {
  return typeof window !== 'undefined' && Boolean(localStorage.getItem('ai_chat_token'))
}

function friendlySendError(error: unknown) {
  if (error instanceof DOMException && error.name === 'AbortError') return '已停止回复'
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return '请求已断开，请稍后重试。'
  }
  return error instanceof Error ? error.message : '发送失败'
}

function isImageAttachment(att: AiAttachment) {
  return (att.mimeType || '').startsWith('image/')
}

function generatedAttachmentName(item: AiMessage, att: AiAttachment) {
  const files = item.metadata?.generated_files
  if (Array.isArray(files)) {
    const matched = files.find((file) => {
      if (!file || typeof file !== 'object') return false
      return (file as { file_key?: string }).file_key === att.fileKey
    })
    const name = matched && (matched as { name?: unknown }).name
    if (typeof name === 'string' && name.trim()) return name
  }
  return att.name || att.fileKey.split('/').pop() || '下载文件'
}

function attachmentDownloadUrl(src: string, name: string) {
  try {
    const url = new URL(src)
    url.searchParams.set('attname', name)
    return url.toString()
  } catch {
    return src
  }
}

export default function AiChatClient({ initialSessionId }: { initialSessionId?: number }) {
  const [authed, setAuthed] = useState(false)
  const [loginKey, setLoginKey] = useState('')
  const [sessions, setSessions] = useState<AiSession[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [messages, setMessages] = useState<AiMessage[]>([])
  const [messageCache, setMessageCache] = useState<Record<number, AiMessage[]>>({})
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [content, setContent] = useState('')
  const [inputHistory, setInputHistory] = useState<string[]>([])
  const [inputHistoryIndex, setInputHistoryIndex] = useState<number | null>(null)
  const [attachments, setAttachments] = useState<AiAttachment[]>([])
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [loading, setLoading] = useState(false)
  const [sendingSessionIds, setSendingSessionIds] = useState<number[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null)
  const [sidebarEditingSessionId, setSidebarEditingSessionId] = useState<number | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const { message, modal } = App.useApp()
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<Record<number, AbortController>>({})
  const inputDraftRef = useRef('')
  const didLoadSessionsRef = useRef(false)

  const activeSession = useMemo(
    () => sessions.find((item) => item.id === activeId) || null,
    [sessions, activeId],
  )
  const activeSending = activeId !== null && sendingSessionIds.includes(activeId)

  const updateSessionMessages = useCallback((sessionId: number, updater: (prev: AiMessage[]) => AiMessage[]) => {
    setMessageCache((prev) => {
      const base = prev[sessionId] || (activeId === sessionId ? messages : [])
      const next = updater(base)
      return { ...prev, [sessionId]: next }
    })
    if (activeId === sessionId) {
      setMessages((prev) => updater(prev))
    }
  }, [activeId, messages])

  const goSession = useCallback(
    (sessionId: number | null, options?: { replaceUrl?: boolean }) => {
      setActiveId(sessionId)
      if (options?.replaceUrl !== false) {
        window.history.replaceState(null, '', sessionId ? `/ai/chat/${sessionId}` : '/ai/chat')
      }
    },
    [],
  )

  const loadSessions = useCallback(async () => {
    if (!didLoadSessionsRef.current) setLoading(true)
    try {
      const res = await listAiSessions()
      const nextSessions = res.list || []
      setSessions(nextSessions)
      if (!didLoadSessionsRef.current && initialSessionId) {
        if (nextSessions.some((item) => item.id === initialSessionId)) {
          setActiveId(initialSessionId)
        } else {
          setActiveId(null)
          window.history.replaceState(null, '', '/ai/chat')
          message.error('会话不存在或无权访问')
        }
        return
      }
      if (!didLoadSessionsRef.current && nextSessions.length) goSession(nextSessions[0].id)
    } catch (error) {
      clearAiToken()
      setAuthed(false)
      message.error(error instanceof Error ? error.message : '访问凭证失效')
    } finally {
      didLoadSessionsRef.current = true
      setLoading(false)
    }
  }, [goSession, initialSessionId, message])

  useEffect(() => {
    if (hasToken()) {
      setAuthed(true)
      loadSessions()
    }
  }, [loadSessions])

  useEffect(() => {
    if (!activeId) {
      setMessages([])
      return
    }
    const cachedMessages = messageCache[activeId]
    if (cachedMessages) setMessages(cachedMessages)
    setMessagesLoading(true)
    let cancelled = false
    listAiMessages(activeId)
      .then((res) => {
        if (cancelled) return
        const serverMessages = res.list || []
        const localOnlyMessages = (cachedMessages || []).filter(
          (item) => item.id < 0 || item.status === 'pending',
        )
        const nextMessages = [
          ...serverMessages,
          ...localOnlyMessages.filter(
            (local) => !serverMessages.some((server) => server.id === local.id),
          ),
        ]
        setMessages(nextMessages)
        setMessageCache((prev) => ({ ...prev, [activeId]: nextMessages }))
      })
      .catch(() => message.error('加载消息失败'))
      .finally(() => {
        if (!cancelled) setMessagesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeId, message])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, activeSending])

  const login = async () => {
    if (!loginKey.trim()) {
      message.warning('请输入访问 key')
      return
    }
    setLoading(true)
    try {
      const res = await aiLogin(loginKey.trim())
      setAiToken(res.token)
      setLoginKey('')
      setAuthed(true)
      await loadSessions()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  const createSession = async () => {
    const session = await createAiSession()
    setSessions((prev) => [session, ...prev])
    goSession(session.id)
    setSidebarOpen(false)
  }

  const removeSession = (session: AiSession) => {
    modal.confirm({
      title: '删除该会话？',
      content: session.title,
      onOk: async () => {
        await deleteAiSession(session.id)
        setSessions((prev) => prev.filter((item) => item.id !== session.id))
        if (activeId === session.id) goSession(null)
      },
    })
  }

  const startEditTitle = (session: AiSession) => {
    setEditingSessionId(session.id)
    setSidebarEditingSessionId(null)
    setEditingTitle(session.title)
  }

  const startSidebarEditTitle = (session: AiSession) => {
    setSidebarEditingSessionId(session.id)
    setEditingSessionId(null)
    setEditingTitle(session.title)
  }

  const menuItems = (session: AiSession): MenuProps['items'] => [
    {
      key: 'rename',
      label: '重命名',
      icon: <EditOutlined />,
      onClick: (info) => {
        info.domEvent.preventDefault()
        info.domEvent.stopPropagation()
        startSidebarEditTitle(session)
      },
    },
    {
      key: 'pin',
      label: session.pinned ? '取消置顶' : '置顶',
      icon: session.pinned ? <PushpinFilled /> : <PushpinOutlined />,
      onClick: (info) => {
        info.domEvent.preventDefault()
        info.domEvent.stopPropagation()
        togglePinned(session)
      },
    },
    {
      key: 'delete',
      label: '删除',
      danger: true,
      icon: <DeleteOutlined />,
      onClick: (info) => {
        info.domEvent.preventDefault()
        info.domEvent.stopPropagation()
        removeSession(session)
      },
    },
  ]

  const saveEditingTitle = async () => {
    const sessionId = editingSessionId
    const title = editingTitle.trim()
    if (!sessionId) return
    setEditingSessionId(null)
    if (!title) return
    const next = await renameAiSession(sessionId, title)
    setSessions((prev) => prev.map((item) => (item.id === next.id ? next : item)))
  }

  const saveSidebarEditingTitle = async () => {
    const sessionId = sidebarEditingSessionId
    const title = editingTitle.trim()
    if (!sessionId) return
    setSidebarEditingSessionId(null)
    if (!title) return
    const next = await renameAiSession(sessionId, title)
    setSessions((prev) => prev.map((item) => (item.id === next.id ? next : item)))
  }

  const togglePinned = async (session: AiSession) => {
    const next = await setAiSessionPinned(session.id, !session.pinned)
    setSessions((prev) =>
      prev
        .map((item) => (item.id === next.id ? next : item))
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (b.updatedAt || 0) - (a.updatedAt || 0)),
    )
  }

  const setTextareaCursorToEnd = (target: HTMLTextAreaElement, value: string) => {
    requestAnimationFrame(() => {
      const end = value.length
      target.setSelectionRange(end, end)
    })
  }

  const navigateInputHistory = (direction: 'prev' | 'next', target: HTMLTextAreaElement) => {
    if (!inputHistory.length) return
    const cursor = target.selectionStart ?? 0
    const atFirstLine = !target.value.slice(0, cursor).includes('\n')
    const atLastLine = !target.value.slice(cursor).includes('\n')

    if (direction === 'prev') {
      if (!atFirstLine) return
      const nextIndex = inputHistoryIndex === null ? inputHistory.length - 1 : Math.max(0, inputHistoryIndex - 1)
      if (inputHistoryIndex === null) inputDraftRef.current = target.value
      setInputHistoryIndex(nextIndex)
      setContent(inputHistory[nextIndex])
      setTextareaCursorToEnd(target, inputHistory[nextIndex])
      return
    }

    if (!atLastLine || inputHistoryIndex === null) return
    const nextIndex = inputHistoryIndex + 1
    if (nextIndex >= inputHistory.length) {
      setInputHistoryIndex(null)
      setContent(inputDraftRef.current)
      setTextareaCursorToEnd(target, inputDraftRef.current)
    } else {
      setInputHistoryIndex(nextIndex)
      setContent(inputHistory[nextIndex])
      setTextareaCursorToEnd(target, inputHistory[nextIndex])
    }
  }

  const submit = async () => {
    if (activeSending) return
    const text = content.trim()
    if (!activeId) {
      message.warning('请先创建会话')
      return
    }
    const sessionId = activeId
    if (!text && attachments.length === 0) {
      message.warning('请输入消息或上传图片')
      return
    }
    const optimisticUserMessage: AiMessage = {
      id: -Date.now(),
      sessionId: activeId,
      role: 'user',
      content: text,
      contentType: attachments.length ? 'mixed' : 'text',
      status: 'completed',
      createdAt: Date.now() / 1000,
      attachments,
    }
    const pendingAssistantMessage: AiMessage = {
      id: optimisticUserMessage.id - 1,
      sessionId: activeId,
      role: 'assistant',
      content: 'Codex 正在回复...',
      contentType: 'text',
      status: 'pending',
      createdAt: Date.now() / 1000,
      attachments: [],
    }
    const sentContent = text
    const sentAttachments = attachments
    const controller = new AbortController()
    abortRef.current[sessionId] = controller
    updateSessionMessages(sessionId, (prev) => [...prev, optimisticUserMessage, pendingAssistantMessage])
    if (sentContent) {
      setInputHistory((prev) => {
        const deduped = prev.filter((item) => item !== sentContent)
        return [...deduped, sentContent].slice(-50)
      })
    }
    setInputHistoryIndex(null)
    inputDraftRef.current = ''
    setContent('')
    setAttachments([])
    setFileList([])
    setSendingSessionIds((prev) => (prev.includes(sessionId) ? prev : [...prev, sessionId]))
    try {
      const res = await sendAiMessage(
        sessionId,
        { content: sentContent, attachments: sentAttachments },
        controller.signal,
      )
      const userMessage = {
        ...res.userMessage,
        attachments: res.userMessage.attachments?.length
          ? res.userMessage.attachments
          : sentAttachments,
      }
      updateSessionMessages(sessionId, (prev) => [
        ...prev.filter(
          (item) => item.id !== optimisticUserMessage.id && item.id !== pendingAssistantMessage.id,
        ),
        userMessage,
        res.assistantMessage,
      ])
      setSessions((prev) =>
        prev
          .map((item) => (item.id === res.session.id ? res.session : item))
          .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)),
      )
    } catch (error) {
      if (controller.signal.aborted) {
        updateSessionMessages(sessionId, (prev) =>
          prev.map((item) =>
            item.id === pendingAssistantMessage.id
              ? { ...item, role: 'error', content: '已停止回复', status: 'failed' }
              : item,
          ),
        )
      } else {
        const errorText = friendlySendError(error)
        updateSessionMessages(sessionId, (prev) =>
          prev.map((item) =>
            item.id === pendingAssistantMessage.id
              ? {
                  ...item,
                  role: 'error',
                  content: errorText,
                  status: 'failed',
                }
              : item,
          ),
        )
        message.error(errorText)
      }
    } finally {
      if (abortRef.current[sessionId] === controller) delete abortRef.current[sessionId]
      setSendingSessionIds((prev) => prev.filter((item) => item !== sessionId))
    }
  }

  const stopSending = () => {
    if (!activeId) return
    abortRef.current[activeId]?.abort()
    stopAiSession(activeId).catch(() => {})
  }

  const sidebar = (
    <aside className="flex h-full w-full shrink-0 flex-col border-r border-[#e4ebf4] bg-[#fbfdff] text-[#515a6e] md:w-72">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-[#e9edf3] px-3">
        <Button type="primary" icon={<PlusOutlined />} className="min-w-0 flex-1 rounded-md" onClick={createSession}>
          新建会话
        </Button>
        <Button
          type="text"
          icon={<CloseOutlined />}
          className="text-[#6b778c] hover:!text-[#409eff] md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        {sessions.map((session) => (
          <Dropdown
            key={session.id}
            trigger={['contextMenu']}
            menu={{ items: menuItems(session) }}
            getPopupContainer={(node) => node.parentElement || document.body}
          >
            <div
              className={`mb-1 flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 transition-colors ${
                activeId === session.id ? 'bg-[#edf5ff]' : 'hover:bg-[#f3f6fa]'
              }`}
              onClick={() => {
                if (!sidebarEditingSessionId) {
                  goSession(session.id)
                  setSidebarOpen(false)
                }
              }}
            >
              <MessageOutlined className="text-[#409eff]" />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1">
                  {session.pinned && <PushpinFilled className="shrink-0 text-xs text-[#409eff]" />}
                  {sidebarEditingSessionId === session.id ? (
                    <Input
                      size="small"
                      autoFocus
                      value={editingTitle}
                      className="h-8 min-w-0 flex-1"
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => setEditingTitle(event.target.value)}
                      onBlur={saveSidebarEditingTitle}
                      onPressEnter={saveSidebarEditingTitle}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') {
                          event.stopPropagation()
                          setSidebarEditingSessionId(null)
                        }
                      }}
                    />
                  ) : (
                    <div className="min-w-0 flex-1 truncate text-sm font-medium text-[#515a6e]">
                      {session.title}
                    </div>
                  )}
                </div>
                <div className="text-xs text-[#9aa4b2]">
                  {session.lastMessageAt ? formatTime(session.lastMessageAt) : '暂无消息'}
                </div>
              </div>
              <Dropdown
                trigger={['click']}
                menu={{ items: menuItems(session) }}
                getPopupContainer={(node) => node.parentElement || document.body}
              >
                <Button
                  size="small"
                  type="text"
                  className="text-[#8b98a8] hover:!text-[#409eff]"
                  icon={<MoreOutlined />}
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                  }}
                />
              </Dropdown>
            </div>
          </Dropdown>
        ))}
        {!sessions.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无会话" />}
      </div>
    </aside>
  )

  if (!authed) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f4f7fb] px-4 py-6">
        <div className="w-full max-w-sm rounded-lg border border-[#e3e8ef] bg-white p-5 shadow-sm">
          <div className="mb-4 text-lg font-semibold text-[#222]">AI 聊天访问</div>
          <Input.Password
            placeholder="请输入管理员分配的 key"
            value={loginKey}
            onChange={(event) => setLoginKey(event.target.value)}
            onPressEnter={login}
          />
          <Button type="primary" block className="mt-3" loading={loading} onClick={login}>
            进入聊天
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[100dvh] min-h-0 overflow-hidden bg-[#f4f7fb] text-[#515a6e]">
      <div className="hidden md:block">{sidebar}</div>
      <Drawer
        placement="left"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        maskClosable
        width="86vw"
        className="md:hidden"
        styles={{ body: { padding: 0 }, header: { display: 'none' } }}
      >
        {sidebar}
      </Drawer>
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[#e4ebf4] bg-white/95 px-3 text-[#515a6e] backdrop-blur">
          <Button
            className="shrink-0 !inline-flex text-[#6b778c] hover:!text-[#409eff] md:!hidden"
            icon={<MessageOutlined />}
            onClick={() => setSidebarOpen(true)}
          />
          {activeSession && editingSessionId === activeSession.id ? (
            <Input
              autoFocus
              value={editingTitle}
              className="h-9 min-w-0 flex-1 text-base font-semibold"
              onChange={(event) => setEditingTitle(event.target.value)}
              onBlur={saveEditingTitle}
              onPressEnter={saveEditingTitle}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setEditingSessionId(null)
              }}
            />
          ) : (
            <button
              className="min-w-0 flex-1 truncate bg-transparent p-0 text-left text-sm font-semibold text-[#515a6e] sm:text-base"
              disabled={!activeSession}
              onClick={() => activeSession && startEditTitle(activeSession)}
            >
              {activeSession?.title || 'AI 聊天'}
            </button>
          )}
        </header>
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto px-3 py-4 sm:px-5">
          {loading ? (
            <div className="pt-16 text-center">
              <Spin />
            </div>
          ) : !activeId ? (
            <div className="pt-20">
              <Empty description="新建一个会话开始聊天" />
            </div>
          ) : (
            <div className="mx-auto max-w-4xl space-y-4">
              {messagesLoading && (
                <div className="text-center text-[#9aa4b2]">
                  <Spin size="small" />
                </div>
              )}
              {messages.map((item) => (
                <div
                  key={item.id}
                  className={`group flex flex-col ${item.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`relative max-w-[92%] rounded-lg px-3 py-2 text-sm leading-6 shadow-sm sm:max-w-[82%] ${
                      item.role === 'user'
                        ? 'bg-[#1677ff] text-white'
                        : item.role === 'error'
                          ? 'bg-[#fff2f0] text-[#a8071a]'
                          : 'border border-[#e4ebf4] bg-white text-[#515a6e]'
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">
                      {item.status === 'pending' ? (
                        <span className="inline-flex items-center gap-2">
                          <Spin size="small" />
                          <span>{item.content}</span>
                        </span>
                      ) : (
                        item.content
                      )}
                    </div>
                    {item.attachments?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.attachments.map((att) => {
                          const src = resolveAiFileUrl(att.fileUrl)
                          const isImage = isImageAttachment(att)
                          const name = generatedAttachmentName(item, att)
                          return (
                            <div
                              key={att.id || att.fileKey}
                              className={`flex max-w-full items-center gap-2 rounded-md border px-2 py-2 ${
                                item.role === 'user'
                                  ? 'border-white/30 bg-white/12 text-white'
                                  : 'border-[#dfe6ef] bg-[#fbfdff] text-[#515a6e]'
                              }`}
                            >
                              {isImage ? (
                                <Image
                                  src={src}
                                  alt=""
                                  width={48}
                                  height={48}
                                  preview={false}
                                  className="rounded object-cover"
                                />
                              ) : (
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-[#eef3f8] text-xs text-[#8b98a8]">
                                  FILE
                                </div>
                              )}
                              <span className="max-w-44 truncate text-xs sm:max-w-56">
                                {name}
                              </span>
                              <a
                                href={attachmentDownloadUrl(src, name)}
                                target="_blank"
                                rel="noreferrer"
                                download
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-sm ${
                                  item.role === 'user'
                                    ? 'text-white/85 hover:bg-white/15 hover:text-white'
                                    : 'text-[#6b778c] hover:bg-[#edf5ff] hover:text-[#409eff]'
                                }`}
                              >
                                <DownloadOutlined />
                              </a>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <footer className="shrink-0 border-t border-[#e4ebf4] bg-white px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-3">
          <div className="mx-auto max-w-4xl">
            <Upload
              className="block max-w-full"
              fileList={fileList}
              beforeUpload={async (file) => {
                if (!activeId) {
                  message.warning('请先创建会话')
                  return false
                }
                try {
                  const uploaded = await uploadAiAttachment(activeId, file)
                  setAttachments((prev) => [...prev, uploaded])
                  setFileList((prev) => [...prev, { uid: file.uid, name: file.name, status: 'done' }])
                } catch (error) {
                  message.error(error instanceof Error ? error.message : '上传失败')
                }
                return false
              }}
              onRemove={(file) => {
                const index = fileList.findIndex((item) => item.uid === file.uid)
                setFileList((prev) => prev.filter((item) => item.uid !== file.uid))
                setAttachments((prev) => prev.filter((_, i) => i !== index))
              }}
              accept="image/png,image/jpeg,image/gif,image/webp"
            >
              <Button
                size="small"
                icon={<UploadOutlined />}
                className="!border-[#dfe6ef] !text-[#6b778c] hover:!border-[#409eff] hover:!text-[#409eff]"
              >
                图片
              </Button>
            </Upload>
            {attachments.length > 0 && (
              <div className="mt-2 flex max-w-full gap-2 overflow-x-auto">
                {attachments.map((att) => (
                  <div key={att.fileKey} className="relative h-16 w-16 shrink-0 overflow-hidden rounded border bg-[#f7f7f7]">
                    <Image
                      src={resolveAiFileUrl(att.fileUrl)}
                      alt=""
                      className="h-full w-full object-cover"
                      preview={false}
                    />
                    <a
                      href={resolveAiFileUrl(att.fileUrl)}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center bg-black/55 text-white"
                    >
                      <DownloadOutlined />
                    </a>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2 flex min-h-12 items-center gap-2 rounded-xl border border-[#dfe6ef] bg-[#fbfdff] px-2 py-1 text-[#515a6e] shadow-sm">
              <TextArea
                value={content}
                className="min-w-0 flex-1 bg-transparent py-[7px] text-sm leading-[22px]"
                variant="borderless"
                autoSize={{ minRows: 1, maxRows: 5 }}
                maxLength={12000}
                placeholder="输入消息"
                onChange={(event) => {
                  setContent(event.target.value)
                  setInputHistoryIndex(null)
                  inputDraftRef.current = event.target.value
                }}
                onKeyDown={(event) => {
                  if (event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return
                  if (event.nativeEvent.isComposing) return
                  if (event.key === 'ArrowUp') {
                    const before = content
                    navigateInputHistory('prev', event.currentTarget)
                    if (before !== event.currentTarget.value || inputHistoryIndex !== null || inputHistory.length) {
                      const cursor = event.currentTarget.selectionStart ?? 0
                      if (!event.currentTarget.value.slice(0, cursor).includes('\n')) event.preventDefault()
                    }
                  }
                  if (event.key === 'ArrowDown') {
                    const cursor = event.currentTarget.selectionStart ?? 0
                    const atLastLine = !event.currentTarget.value.slice(cursor).includes('\n')
                    if (atLastLine && inputHistoryIndex !== null) {
                      event.preventDefault()
                      navigateInputHistory('next', event.currentTarget)
                    }
                  }
                }}
                onPressEnter={(event) => {
                  if (!event.shiftKey) {
                    event.preventDefault()
                    submit()
                  }
                }}
              />
              <Button
                type="primary"
                danger={activeSending}
                icon={activeSending ? <StopOutlined /> : <SendOutlined />}
                className="h-9 shrink-0 rounded-lg"
                disabled={!activeId}
                onClick={activeSending ? stopSending : submit}
              />
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
