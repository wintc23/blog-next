'use client'
import { Button, Tooltip } from 'antd'
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons'
import styles from './PhotoVisibilityButton.module.css'
export default function PhotoVisibilityButton({ isPublic = true, disabled, onChange }: { isPublic?: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  const label = isPublic ? '公开，点击对访客隐藏' : '隐藏，点击对访客公开'
  return <Tooltip title={label}><Button type="text" className={styles.button} disabled={disabled} aria-label={label} aria-pressed={!isPublic} onClick={() => onChange(!isPublic)}><span className={styles.symbol}>{isPublic ? <EyeOutlined /> : <EyeInvisibleOutlined />}</span></Button></Tooltip>
}
