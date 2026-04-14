'use client'

import { useState } from 'react'
import { App, Button, Modal, Input, Tag, Tooltip } from 'antd'
import {
  LinkOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
} from '@ant-design/icons'
import { saveLinkAction, deleteLinkAction } from '@/app/actions/links'
import { useUser, useShowLogin } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { SITE } from '@/lib/config'
import type { Link as LinkType } from '@/lib/types'

export default function LinkPageClient({ initial }: { initial: LinkType[] }) {
  const [list, setList] = useState<LinkType[]>(initial)
  const [editing, setEditing] = useState<Partial<LinkType> | null>(null)
  const user = useUser()
  const showLogin = useShowLogin()
  const { message, modal } = App.useApp()
  const router = useRouter()

  const siteInfoJson = JSON.stringify(
    {
      name: SITE.title,
      slogon: SITE.slogon,
      url: SITE.url,
      icon: SITE.icon,
    },
    null,
    4,
  )

  const copyInfo = async () => {
    await navigator.clipboard.writeText(siteInfoJson)
    message.success('已复制站点信息json文本')
  }

  const create = () => {
    if (!user?.id) {
      showLogin()
      return
    }
    setEditing({ title: '', link: '', motto: '', logo: '' })
  }

  const edit = (link: LinkType) => {
    setEditing({ ...link })
  }

  const save = async () => {
    if (!editing) return
    if (!editing.title || !editing.link) {
      message.warning('标题和地址必填')
      return
    }
    const r = await saveLinkAction(editing)
    if (r.ok) {
      setEditing(null)
      router.refresh()
      message.success('保存成功')
    } else {
      message.error(r.error || '保存失败')
    }
  }

  const remove = (link: LinkType) => {
    modal.confirm({
      title: `确定删除友链"${link.title}"吗`,
      onOk: async () => {
        const r = await deleteLinkAction(link.id)
        if (r.ok) {
          setList((l) => l.filter((x) => x.id !== link.id))
          router.refresh()
        } else {
          message.error(r.error || '删除失败')
        }
      },
    })
  }

  return (
    <div>
      <div className="sub-page-header ws">友情链接</div>
      <div className="relative mb-3 bg-white p-4 pl-6 text-[#333]">
        <div className="absolute inset-y-0 left-0 w-2 bg-[#19be6b]" />
        <div className="leading-relaxed">
          <span
            onClick={create}
            className="cursor-pointer select-none text-[#409eff] underline"
          >
            提交链接
          </span>
          可在本站添加友链，同时期待您将本站链接添加到您的站点。
        </div>
        <div className="my-2 flex items-center font-bold">
          本站信息
          <Tooltip title="一键复制本站信息（json格式）">
            <CopyOutlined onClick={copyInfo} className="ml-1 cursor-pointer text-[#666]" />
          </Tooltip>
        </div>
        <div className="text-sm">
          <div>名称: {SITE.title}</div>
          <div>简介: {SITE.slogon}</div>
          <div>地址: {SITE.url}</div>
          <div>图标: {SITE.icon}</div>
        </div>
      </div>

      <div className="bg-white">
        {list.map((link) => (
          <div key={link.id} className="overflow-hidden border-t border-[#ddd] p-3 first:border-0">
            <div className="float-left mr-3 h-[50px] w-[50px] shrink-0 overflow-hidden rounded-full shadow">
              {link.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={link.logo} alt="" className="h-full w-full" />
              ) : (
                <LinkOutlined className="flex h-full w-full items-center justify-center text-2xl" />
              )}
            </div>
            {(user?.admin || user?.id === link.authorId) && (
              <div className="float-right text-2xl">
                <EditOutlined
                  onClick={() => edit(link)}
                  className="cursor-pointer p-1 text-[#ff9900] hover:bg-[#eee]"
                />
                {user?.admin && (
                  <DeleteOutlined
                    onClick={() => remove(link)}
                    className="ml-2 cursor-pointer p-1 text-[#ed4014] hover:bg-[#eee]"
                  />
                )}
              </div>
            )}
            <div>
              <a
                href={link.link}
                target="_blank"
                rel="noreferrer"
                className="text-[16px] hover:underline"
              >
                {link.title}
              </a>
              {link.hide && (
                <Tag color="orange" className="ml-2">
                  待验证
                </Tag>
              )}
              {link.motto && <div className="text-sm text-[#666]">{link.motto}</div>}
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={!!editing}
        onCancel={() => setEditing(null)}
        onOk={save}
        title={editing?.id ? '友链编辑' : '创建友链'}
      >
        {editing && (
          <div className="space-y-3">
            <div>
              <div className="mb-1 font-bold text-[#3361d8]">显示名称(必填)</div>
              <Input
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </div>
            <div>
              <div className="mb-1 font-bold text-[#3361d8]">站点地址(必填)</div>
              <Input
                value={editing.link}
                onChange={(e) => setEditing({ ...editing, link: e.target.value })}
              />
            </div>
            <div>
              <div className="mb-1 font-bold text-[#3361d8]">描述</div>
              <Input
                value={editing.motto ?? ''}
                onChange={(e) => setEditing({ ...editing, motto: e.target.value })}
              />
            </div>
            <div>
              <div className="mb-1 font-bold text-[#3361d8]">Logo URL</div>
              <Input
                value={editing.logo ?? ''}
                onChange={(e) => setEditing({ ...editing, logo: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
