/**
 * @author Abhishek Pathak <abhi.pathak401@gmail.com>
 */

import { BowlingBall } from '@styled-icons/fa-solid'
import React from 'react'
import { Vector3 } from 'three'
import { MediumButton } from '../inputs/Button'
import { ReflectionProbeProperties } from './ReflectionProbeProperties'

export const enum ReflectionPropertyTypes {
  'Boolean',
  'ReflectionProbeType',
  'RefreshMode',
  'Resolution',
  'Vector'
}

const DefaultReflectionProbeSettings = [
  {
    label: 'Reflection Probe Settings',
    options: [
      {
        label: 'Position Offset',
        propertyName: 'probePositionOffset',
        type: ReflectionPropertyTypes.Vector
      },
      {
        label: 'Scale',
        propertyName: 'probeScale',
        type: ReflectionPropertyTypes.Vector
      },
      {
        label: 'Reflection Probe Type',
        propertyName: 'reflectionType',
        type: ReflectionPropertyTypes.ReflectionProbeType
      }
    ]
  },
  {
    label: 'Realtime Settings',
    options: [
      {
        label: 'Refresh Mode',
        propertyName: 'refreshMode',
        type: ReflectionPropertyTypes.RefreshMode
      }
    ]
  },

  {
    label: 'Settings',
    options: [
      {
        label: 'Box Projection',
        propertyName: 'boxProjection',
        type: ReflectionPropertyTypes.Boolean
      }
    ]
  },
  {
    label: 'Capture Settings',
    options: [
      {
        label: 'Resolution',
        propertyName: 'resolution',
        type: ReflectionPropertyTypes.Resolution
      }
    ]
  }
]

export type ReflectionProbeNodeEditorProps = {
  editor?: object
  node?: object
}

export const ReflectionProbeNodeEditor = (props: ReflectionProbeNodeEditorProps) => {
  const renderReflectionProbeProperties = () => {
    const renderedProperty = DefaultReflectionProbeSettings.map((element, id) => {
      if ((props.node as any).reflectionProbeSettings.reflectionType == 1 && element.label == 'Realtime Settings') {
        return <div key={id + 'Realtime'} />
      }
      const renderProp = element.label ? [<div key={id + 'title'}>{element.label}</div>] : []
      element?.options?.forEach((property, propertyid) => {
        renderProp.push(<ReflectionProbeProperties key={id + '' + propertyid} element={property} {...props} />)
      })
      renderProp.push(<br key={id + 'break'} />)
      return renderProp
    })
    return <>{renderedProperty}</>
  }

  return (
    <div>
      {renderReflectionProbeProperties()}
      <MediumButton onClick={(props.node as any).Bake}>Bake</MediumButton>
    </div>
  )
}

ReflectionProbeNodeEditor.iconComponent = BowlingBall
ReflectionProbeNodeEditor.description = 'For Adding Reflection Probe in your scene'
export default ReflectionProbeNodeEditor
