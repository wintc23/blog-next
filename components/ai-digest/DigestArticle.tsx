import BackLink from '@/components/BackLink'
import { ArrowUpOutlined, ClockCircleOutlined, ReadOutlined, FileTextOutlined, LinkOutlined } from '@ant-design/icons'
import type { AiDigestDetail } from '@/lib/schemas/ai-digest'
import { formatTime, statusText, IssueDate } from './DigestShared'
import styles from './DigestPreview.module.css'
import DigestReadCount from './DigestReadCount'
import DigestComments from './DigestComments'
import LikeButton from '@/components/LikeButton'

const sectionAnchor = (id: string) => `digest-section-${id}`
const groupAnchor = (id: string) => `digest-group-${id}`

export default function DigestArticle({ detail, manage = false, manageArchivePath = '/manage/ai-digest' }: { detail: AiDigestDetail; manage?: boolean; manageArchivePath?: string }) {
  const archivePath = manage ? manageArchivePath : '/ai-news'
  const Container = manage ? 'main' : 'div'
  const content = detail.content
  const grouped = !!content.groups?.length
  const groups = grouped
    ? (content.groups || []).map(group => ({ ...group, sections: content.sections.filter(section => section.groupId === group.id) })).filter(group => group.sections.length)
    : [{ id: 'all', title: '', description: '', sections: content.sections }]
  const sectionNumbers = new Map(groups.flatMap(group => group.sections).map((section, index) => [section.id, index + 1]))
  const StoryHeading = grouped ? 'h3' : 'h2'
  const sourceCount = new Set(content.sections.flatMap((section) => section.sources.map((source) => source.itemId))).size
  return (
    <div className={`${styles.surface} ${manage ? '' : styles.publicArticle}`}>
      <Container className={styles.reader} id="digest-top" tabIndex={-1}>
        <nav className={styles.readerNav} aria-label="动态导航"><BackLink href={archivePath}>返回动态列表</BackLink>{manage && <span><span className={styles.status}>{statusText[detail.status]}</span> 第 {detail.contentVersion} 版</span>}</nav>
        <article>
          <header className={styles.articleHeader}>
            <div className={styles.articleHeading}>
              <p className={styles.eyebrow}><span aria-hidden="true" /> {detail.channelTitle}<span className={styles.eyebrowDivider}>/</span>{detail.issueDate.replaceAll('-', '.')}</p>
              <h1>{detail.title}</h1><p className={styles.summary}>{detail.summary}</p>
              <div className={styles.articleMeta}><span><FileTextOutlined />{content.byline}</span><span><ReadOutlined />约 {content.estimatedReadMinutes} 分钟</span><DigestReadCount key={detail.id} id={detail.id} initialCount={detail.readTimes} track={!manage} /><time dateTime={detail.scheduledPublishAt}><ClockCircleOutlined />期次 {formatTime(detail.scheduledPublishAt)} · 北京时间</time></div>
              {grouped && <nav className={styles.groupNav} aria-label="按阅读方向跳转">{groups.map(group => <a key={group.id} href={`#${groupAnchor(group.id)}`}><strong>{group.title}</strong><span>{group.sections.length} 条动态</span></a>)}</nav>}
            </div>
            <IssueDate value={detail.issueDate} />
          </header>
          <div className={styles.readingGrid}>
            <aside className={styles.contents}>
              <div className={styles.contentsInner}>
                <div className={styles.contentsHeading}><span>本期索引</span><small>CONTENTS</small></div>
                <nav aria-label="本期目录">{groups.map(group => <div className={styles.contentsGroup} key={group.id}>
                  {grouped && <a className={styles.contentsGroupTitle} href={`#${groupAnchor(group.id)}`}>{group.title}</a>}
                  <ol>{group.sections.map(section => <li key={section.id}><a href={`#${sectionAnchor(section.id)}`}><span>{String(sectionNumbers.get(section.id)).padStart(2, '0')}</span><div><small>{section.category}</small><p>{section.title}</p></div></a></li>)}</ol>
                </div>)}</nav>
                <div className={styles.readingStats}><span><strong>{content.sections.length}</strong> 条动态</span><span><strong>{sourceCount}</strong> 个来源</span></div>
                <a href="#digest-top" className={styles.backToTop}>回到顶部 <ArrowUpOutlined /></a>
              </div>
            </aside>
            <div className={styles.articleBody}>
              <figure className={styles.coverFrame}><img className={styles.cover} src={content.cover.url} alt={content.cover.alt} width={content.cover.width} height={content.cover.height} fetchPriority="high" /><figcaption><span>本期主题</span>{content.cover.credit}</figcaption></figure>
              <aside className={styles.takeaways} aria-labelledby="takeaways-title"><div className={styles.takeawaysHeading}><h2 id="takeaways-title">本期速览</h2><span>THE BRIEF</span></div><ol>{content.takeaways.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, '0')}</span><p>{item}</p></li>)}</ol></aside>
              {groups.map((group, groupIndex) => <div className={styles.sectionGroup} id={grouped ? groupAnchor(group.id) : undefined} tabIndex={grouped ? -1 : undefined} key={group.id}>
                {grouped && <header className={styles.groupHeading}><span>{String(groupIndex + 1).padStart(2, '0')}</span><div><h2>{group.title}</h2><p>{group.description}</p></div><small>{group.sections.length} 条</small></header>}
                {group.sections.map(section => <section key={section.id} id={sectionAnchor(section.id)} tabIndex={-1} className={styles.section}>
                <div className={styles.sectionHeading}><span className={styles.sectionNumber}>{String(sectionNumbers.get(section.id)).padStart(2, '0')}</span><div><div className={styles.sectionMeta}>{section.category}{section.recency === '近期补充' && <small>近期补充</small>}</div><StoryHeading>{section.title}</StoryHeading></div></div>
                {section.paragraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
                {section.image && <figure className={styles.figure}><img src={section.image.url} alt={section.image.alt} width={section.image.width} height={section.image.height} loading="lazy" /><figcaption>{section.image.caption}<span>{section.image.credit}</span></figcaption></figure>}
                {section.analysis && <div className={styles.analysis}><div className={styles.analysisLabel}><span aria-hidden="true" />AI 简评</div><p>{section.analysis}</p></div>}
                <ul className={styles.sources}>{section.sources.map((source) => <li key={source.itemId}><a href={source.url} target="_blank" rel="noopener noreferrer"><LinkOutlined /><div><span className={styles.sourcePublisher}>{source.publisher}<time dateTime={source.publishedDate}>{source.publishedDate}</time></span><span className={styles.sourceTitle}>{source.title}</span></div></a></li>)}</ul>
                </section>)}
              </div>)}
              <section className={styles.closing}><p className={styles.eyebrow}>AFTER READING</p><h2>读完之后</h2><p>{content.closing}</p>{!manage && <div className="mt-5"><LikeButton key={detail.id} target="digest" id={detail.id} /></div>}<div className="mt-5"><BackLink href={archivePath}>返回动态列表</BackLink></div></section>
              <footer className={styles.footer}><details><summary>编辑说明与生成信息</summary><p>{content.editorialNote}</p><p>{content.scopeNote}</p><p>首次生成时间：{formatTime(detail.createdAt)}（北京时间）。本版更新时间：{formatTime(detail.updatedAt)}（北京时间）。{detail.publishedAt && `实际发布时间：${formatTime(detail.publishedAt)}（北京时间）。`}{detail.status === 'draft' ? '当前为草稿，未发送订阅邮件。' : ''}</p></details></footer>
              {!manage && <DigestComments digestId={detail.id} />}
            </div>
          </div>
        </article>
      </Container>
    </div>
  )
}
