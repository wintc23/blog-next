import Link from 'next/link'
import ContactPopover from '@/components/ContactPopover'
import type { PersonalProfile, ProfileLink, ProfileMoment } from '@/lib/schemas/personal-profile'
import CommunityIcon from './CommunityIcon'
import LifeMoments from './LifeMoments'
import styles from './Home.module.css'

function ProfileAnchor({ link, community = false }: { link: ProfileLink; community?: boolean }) {
  const content = <>{community && <CommunityIcon icon={link.icon} />}<span>{link.label}</span></>
  const className = community ? styles.communityLink : undefined
  return link.url.startsWith('/') ? (
    <Link href={link.url} className={className}>{content}</Link>
  ) : (
    <a href={link.url} className={className}
      target={link.url.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer">
      {content}
    </a>
  )
}

export default function HomeProfile({ profile, moments = [] }: { profile: PersonalProfile; moments?: ProfileMoment[] }) {
  const name = profile.displayName || '个人主页'
  const paragraphs = profile.bio.split(/\n\s*\n/).filter((paragraph) => paragraph.trim())
  const communities = profile.links.filter((link) => link.group === 'community')
  const navigation = profile.links.filter((link) => link.group === 'navigation')
  const affiliations = profile.links.filter((link) => link.group === 'education' || link.group === 'work')
  const hasContact = !!(profile.contactEmail || profile.wechatId || profile.wechatQrUrl)

  return (
    <div className={styles.profile}>
      <section className={styles.profileMain} aria-labelledby="profile-name">
        <div className={styles.profileIdentity}>
          {profile.avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt={`${name}的头像`}
              width={88}
              height={88}
              className={styles.avatar}
            />
          )}
          <div className={styles.profileContent}>
            <h1 id="profile-name">{name}</h1>
            {profile.tagline && <p className={styles.bio}>{profile.tagline}</p>}
          </div>
        </div>
        {affiliations.length > 0 && (
          <ul className={styles.affiliations} aria-label="学校与公司">
            {affiliations.map((link, index) => (
              <li key={`${link.group}-${index}`}>
                <div className={styles.affiliation}>
                  <span className={styles.affiliationLogo} aria-hidden="true">
                    <CommunityIcon icon={link.icon} />
                  </span>
                  <span>
                    <span className={styles.affiliationLabel}>{link.group === 'education' ? '学校' : '公司'}</span>
                    <span className={styles.affiliationName}>{link.label}</span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        {(profile.introduction || paragraphs.length > 0) && (
          <div className={styles.profileIntroduction}>
            {profile.introduction && <p className={styles.introductionLead}>{profile.introduction}</p>}
            {paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          </div>
        )}
        {(communities.length > 0 || navigation.length > 0 || hasContact) && (
          <div className={styles.profileLinks}>
            {communities.length > 0 && (
              <nav aria-label="社区链接" className={styles.communityLinks}>
                {communities.map((link, index) => <ProfileAnchor key={index} link={link} community />)}
              </nav>
            )}
            {(navigation.length > 0 || hasContact) && (
              <nav aria-label="个人主页链接" className={styles.navigationLinks}>
                {navigation.map((link, index) => <ProfileAnchor key={index} link={link} />)}
                <ContactPopover profile={profile} />
              </nav>
            )}
          </div>
        )}
      </section>
      <LifeMoments moments={moments} />
    </div>
  )
}
