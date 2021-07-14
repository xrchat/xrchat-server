import { Map } from '@styled-icons/fa-solid/Map'
import i18n from 'i18next'
import React from 'react'
import { withTranslation } from 'react-i18next'
import BooleanInput from '../inputs/BooleanInput'
import InputGroup from '../inputs/InputGroup'
import StringInput from '../inputs/StringInput'
import NodeEditor from './NodeEditor'
/**
 * [BoxColliderNodeEditor is used to provide properties to customize box collider element]
 * @type {[component class]}
 */

export function MapNodeEditor(props: { editor?: any; node?: any; t: any }) {
  console.log('Props are', props)
  const { node, editor, t } = props

  const onChangeStartLatitude = (payload) => {
    editor.setPropertySelected('startLatitude', payload)
  }

  const onChangeStartLongitude = (payload) => {
    editor.setPropertySelected('startLongitude', payload)
  }

  const onChangeIsGlobal = (payload) => {
    editor.setPropertySelected('isGlobal', payload)
  }

  const onChangeUseStartCoordinates = (payload) => {
    editor.setPropertySelected('useStartCoordinates', payload)
  }

  //defining description and shows this description in NodeEditor  with title of elementt,
  // available to add in scene in assets.
  const description = i18n.t('editor:properties.map.description')

  return (
    <NodeEditor {...props} description={description}>
      {/* @ts-ignore */}
      <InputGroup
        name="Is Global?"
        label={t('editor:properties.map.lbl-isGlobal')}
        info={t('editor:properties.map.info-isGlobal')}
      >
        <BooleanInput value={node.isGlobal} onChange={onChangeIsGlobal} />
      </InputGroup>
      {/* @ts-ignore */}
      <InputGroup
        name="Force start coordinates??"
        label={t('editor:properties.map.lbl-useStartCoordinates')}
        info={t('editor:properties.map.info-useStartCoordinates')}
      >
        <BooleanInput value={node.isGlobal} onChange={onChangeUseStartCoordinates} />
      </InputGroup>
      {/* @ts-ignore */}
      <InputGroup name="Start Latitude" label={t('editor:properties.map.lbl-startLatitude')}>
        <StringInput
          /* @ts-ignore */
          value={node.startLatitude}
          onChange={onChangeStartLatitude}
        />
      </InputGroup>
      {/* @ts-ignore */}
      <InputGroup name="Start Longitude" label={t('editor:properties.map.lbl-startLongitude')}>
        <StringInput
          /* @ts-ignore */
          value={node.startLongitude}
          onChange={onChangeStartLongitude}
        />
      </InputGroup>
    </NodeEditor>
  )
}

MapNodeEditor.iconComponent = Map

export default withTranslation()(MapNodeEditor)
