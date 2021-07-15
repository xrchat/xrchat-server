import { CameraHelper, Matrix4, PerspectiveCamera } from 'three'
import EditorNodeMixin from './EditorNodeMixin'
export default class ScenePreviewCameraNode extends EditorNodeMixin(PerspectiveCamera) {
  static legacyComponentName = 'scene-preview-camera'
  static nodeName = 'Scene Preview Camera'
  static canAddNode(editor) {
    return editor.scene.findNodeByType(ScenePreviewCameraNode) === null
  }
  constructor(editor) {
    super(editor, 80, 16 / 9, 0.2, 8000)
    const cameraHelper = new CameraHelper(this as any)
    cameraHelper.layers.set(1)
    this.helper = cameraHelper
  }
  setFromViewport() {
    const matrix = new Matrix4().copy(this.parent.matrixWorld).invert().multiply(this.editor.camera.matrixWorld)
    matrix.decompose(this.position, this.rotation, this.scale)
    this.editor.emit('objectsChanged', [this])
    this.editor.emit('selectionChanged')
  }
  onSelect() {
    this.editor.scene.add(this.helper)
    this.helper.update()
  }
  onDeselect() {
    this.editor.scene.remove(this.helper)
  }
  async serialize(projectID) {
    return await super.serialize(projectID, { 'scene-preview-camera': {} })
  }
  prepareForExport() {
    super.prepareForExport()
    // This name is required in the current Hubs client.
    // It's possible to migrate to the scene-preview-camera component in the future.
    this.name = 'scene-preview-camera'
    this.addGLTFComponent('scene-preview-camera')
    this.replaceObject()
  }
}
