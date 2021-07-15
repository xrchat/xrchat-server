/**
 * @author Abhishek Pathak <abhi.pathak401@gmail.com>
 */

import React from 'react'
import {
  ReflectionProbeRefreshTypes,
  ReflectionProbeTypes
} from '../../../../../../engine/src/editor/nodes/ReflectionProbeNode'
import BooleanInput from '../inputs/BooleanInput'
import CompoundNumericInput from '../inputs/CompoundNumericInput'
import InputGroup from '../inputs/InputGroup'
import SelectInput from '../inputs/SelectInput'
import { ControlledStringInput } from '../inputs/StringInput'
import Vector3Input from '../inputs/Vector3Input'
import { ReflectionPropertyTypes } from './ReflectionProbeNodeEditor'

type ReflectionProbePropertyEditorProps = {
  element?: any
  editor?: any
  node?: any
}

const reflectionProbeSelectTypes = [
  {
    label: 'Runtime',
    value: ReflectionProbeTypes.Realtime
  },
  {
    label: 'Baked',
    value: ReflectionProbeTypes.Baked
  }
]

const reflectionProbeRefreshSelectTypes = [
  {
    label: 'On Awake',
    value: ReflectionProbeRefreshTypes.OnAwake
  }
  // {
  //     label:"Every Frame",
  //     value:ReflectionProbeRefreshTypes.EveryFrame,
  // }
]

const reflectionResolutionTypes = [
  {
    label: '128',
    value: 128
  },
  {
    label: '256',
    value: 256
  },
  {
    label: '512',
    value: 512
  },
  {
    label: '1024',
    value: 1024
  },
  {
    label: '2048',
    value: 2048
  }
]

export const ReflectionProbeProperties = (props: ReflectionProbePropertyEditorProps) => {
  const onChangeProperty = (value, option: string) => {
    ;(props.editor as any).setObjectProperty(`reflectionProbeSettings.${option}`, value)
  }

  const getPropertyValue = (option: string) => {
    const value = (props.node as any)['reflectionProbeSettings'][option]
    return value
  }
  let renderVal = <></>
  const label = props.element.label
  const propertyName = props.element.propertyName

  switch (props.element.type) {
    case ReflectionPropertyTypes.Boolean:
      renderVal = (
        <BooleanInput value={getPropertyValue(propertyName)} onChange={(id) => onChangeProperty(id, propertyName)} />
      )
      break
    case ReflectionPropertyTypes.ReflectionProbeType:
      /* @ts-ignore */
      renderVal = (
        <SelectInput
          options={reflectionProbeSelectTypes}
          onChange={(id) => {
            onChangeProperty(id, propertyName)
          }}
          value={getPropertyValue(propertyName)}
        />
      )
      break

    case ReflectionPropertyTypes.RefreshMode:
      /* @ts-ignore */
      renderVal = (
        <SelectInput
          options={reflectionProbeRefreshSelectTypes}
          onChange={(id) => {
            onChangeProperty(id, propertyName)
          }}
          value={getPropertyValue(propertyName)}
        />
      )
      break

    case ReflectionPropertyTypes.Resolution:
      /* @ts-ignore */
      renderVal = (
        <SelectInput
          options={reflectionResolutionTypes}
          onChange={(id) => {
            onChangeProperty(id, propertyName)
          }}
          value={getPropertyValue(propertyName)}
        />
      )
      break

    case ReflectionPropertyTypes.Vector:
      renderVal = (
        <Vector3Input
          onChange={(id) => {
            onChangeProperty(id, propertyName)
          }}
          value={getPropertyValue(propertyName)}
        />
      )
      break

    default:
      renderVal = <div>Undefined value Type</div>
      break
  }
  return (
    /* @ts-ignore */
    <InputGroup name={label} label={label}>
      {renderVal}
    </InputGroup>
  )
}
