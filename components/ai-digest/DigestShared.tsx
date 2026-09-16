import styles from './DigestPreview.module.css'

const dateFormat = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
})
export const statusText = { draft: '草稿', ready: '待发布', published: '已发布', withdrawn: '已撤回' }
export const formatTime = (value: string) => dateFormat.format(new Date(value))
const issueMonth = (value: string) => `${value.slice(0, 4)} / ${value.slice(5, 7)}`
export function IssueDate({ value }: { value: string }) {
  return <div className={styles.issueDate} aria-label={value}>
    <span>{issueMonth(value)}</span><strong>{value.slice(8, 10)}</strong><span>ISSUE</span>
  </div>
}

