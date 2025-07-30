import React from 'react'
import { Widget } from './Widget'
import './SaveWidget.css'

interface SaveWidgetProps {
  changeCount?: number
  onSave?: () => void
  disabled?: boolean
}

export const SaveWidget: React.FC<SaveWidgetProps> = ({
  changeCount = 0,
  onSave,
  disabled = false
}) => {
  const hasChanges = changeCount > 0
  
  return (
    <Widget className="save-widget">
      <button 
        className="save-button" 
        onClick={onSave}
        disabled={!hasChanges || disabled}
      >
        💾 {hasChanges ? `Save (${changeCount})` : 'No Changes'}
      </button>
    </Widget>
  )
}