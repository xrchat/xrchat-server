// @ts-nocheck

import EditorNodeMixin from './EditorNodeMixin'
import Spline from '../../scene/classes/Spline'
import { Object3D } from 'three'

export default class SplineNode extends EditorNodeMixin(Object3D) {
  static legacyComponentName = 'spline'
  static nodeName = 'Spline'
  helper = null
  loadedSplinePositions = null
  static async deserialize(editor, json) {
    console.log('DESERIALIZE', json)
    const node = await super.deserialize(editor, json)
    const { splinePositions } = json.components.find((c) => c.name === 'spline').props
    node.loadedSplinePositions = splinePositions
    return node
  }
  constructor(editor) {
    super(editor)
    this.helper = new Spline()

    super.add(this.helper)
  }
  onAdd() {
    this.helper.init(this.editor, this.loadedSplinePositions)
    const initialSplineHelperObjects = this.helper.getCurrentSplineHelperObjects()
    for (let index = 0; index < initialSplineHelperObjects.length; index++) {
      const object = initialSplineHelperObjects[index]
      this.addSplineHelperObjectToEditorNodes(object)
    }
  }
  onChange() {}
  onSelect() {}
  onDeselect() {}
  onAddNodeToSpline() {
    const newSplineObject = this.helper.addPoint()

    this.addSplineHelperObjectToEditorNodes(newSplineObject)
  }
  addSplineHelperObjectToEditorNodes(splineHelperObject) {
    super.add(splineHelperObject)
    // Maybe this should not be done here?
    this.editor.nodes.push(splineHelperObject)
  }
  copy(source, recursive = true) {
    super.copy(source, false)
    console.log('COPY')
  }
  async serialize(projectID) {
    console.log('SERIALIZE')
    const splineExportInfo = this.helper.exportSpline()
    console.log(splineExportInfo)
    return await super.serialize(projectID, {
      spline: {
        splinePositions: splineExportInfo
      }
    })
  }
  prepareForExport() {
    super.prepareForExport()
    console.log('prepareForExport')
    // this.remove(this.helper);
    // this.addGLTFComponent("point-light", {
    //   color: this.color,
    // });
    // this.replaceObject();
  }
}
