import {
  Group,
  MathUtils,
  Matrix4,
  BufferAttribute,
  BufferGeometry,
  Vector2,
  Vector4,
  Quaternion,
  Matrix3,
  Mesh,
  Object3D,
  Vector3,
  CustomBlending,
  SrcAlphaFactor,
  OneMinusSrcAlphaFactor,
  AddEquation,
  DoubleSide,
  ShaderMaterial,
  Scene
} from 'three'

/**
 * @author Mark Kellogg - http://www.github.com/mkkellogg
 */

//=======================================
// Trail Renderer
//=======================================

const MaxHeadVertices = 128
const PositionComponentCount = 3
const UVComponentCount = 2
const IndicesPerFace = 3
const FacesPerQuad = 2

let lastTrailUpdateTime

const direction = new Vector3()
const tempPosition = new Vector3()

const tempMatrix4 = new Matrix4()
const LocalOrientationTangent = new Vector3(1, 0, 0)
const LocalOrientationDirection = new Vector3(0, 0, -1)
const LocalHeadOrigin = new Vector3(0, 0, 0)
const tempQuaternion = new Quaternion()
const tempOffset = new Vector3()
const tempLocalHeadGeometry = []

const tempMatrix3 = new Matrix3()
const worldOrientation = new Vector3()
const tempDirection = new Vector3()

const tempLocalHeadGeometry2 = []
for (let i = 0; i < MaxHeadVertices; i++) {
  const vertex = new Vector3()
  tempLocalHeadGeometry2.push(vertex)
}

function getMatrix3FromMatrix4(matrix3, matrix4) {
  const e = matrix4.elements
  matrix3.set(e[0], e[1], e[2], e[4], e[5], e[6], e[8], e[9], e[10])
}

for (let i = 0; i < MaxHeadVertices; i++) {
  const vertex = new Vector3()
  tempLocalHeadGeometry.push(vertex)
}

const returnObj = {
  attribute: null,
  offset: 0,
  count: -1
}

const returnObj2 = {
  attribute: null,
  offset: 0,
  count: -1
}

const BaseVertexVars = [
  'attribute float nodeID;',
  'attribute float nodeVertexID;',
  'attribute vec3 nodeCenter;',

  'uniform float minID;',
  'uniform float maxID;',
  'uniform float trailLength;',
  'uniform float maxTrailLength;',
  'uniform float verticesPerNode;',
  'uniform vec2 textureTileFactor;',

  'uniform vec4 headColor;',
  'uniform vec4 tailColor;',

  'varying vec4 vColor;'
].join('\n')

const TexturedVertexVars = [BaseVertexVars, 'varying vec2 vUV;', 'uniform float dragTexture;'].join('\n')

const BaseFragmentVars = ['varying vec4 vColor;', 'uniform sampler2D texture;'].join('\n')

const TexturedFragmentVars = [BaseFragmentVars, 'varying vec2 vUV;'].join('\n')

const VertexShaderCore = [
  'float fraction = ( maxID - nodeID ) / ( maxID - minID );',
  'vColor = ( 1.0 - fraction ) * headColor + fraction * tailColor;',
  'vec4 realPosition = vec4( ( 1.0 - fraction ) * position.xyz + fraction * nodeCenter.xyz, 1.0 ); '
].join('\n')

const BaseVertexShader = [
  BaseVertexVars,

  'void main() { ',

  VertexShaderCore,
  'gl_Position = projectionMatrix * viewMatrix * realPosition;',

  '}'
].join('\n')

const BaseFragmentShader = [BaseFragmentVars, 'void main() { ', 'gl_FragColor = vColor;', '}'].join('\n')

const TexturedVertexShader = [
  TexturedVertexVars,

  'void main() { ',

  VertexShaderCore,
  'float s = 0.0;',
  'float t = 0.0;',
  'if ( dragTexture == 1.0 ) { ',
  '   s = fraction *  textureTileFactor.s; ',
  ' 	t = ( nodeVertexID / verticesPerNode ) * textureTileFactor.t;',
  '} else { ',
  '	s = nodeID / maxTrailLength * textureTileFactor.s;',
  ' 	t = ( nodeVertexID / verticesPerNode ) * textureTileFactor.t;',
  '}',
  'vUV = vec2( s, t ); ',
  'gl_Position = projectionMatrix * viewMatrix * realPosition;',

  '}'
].join('\n')

const TexturedFragmentShader = [
  TexturedFragmentVars,

  'void main() { ',

  'vec4 textureColor = texture2D( texture, vUV );',
  'gl_FragColor = vColor * textureColor;',

  '}'
].join('\n')

class TrailRenderer extends Object3D {
  orientToMovement = false
  geometry: BufferGeometry
  mesh: Mesh
  nodeCenters: Vector3[]
  lastNodeCenter: Vector3
  currentNodeCenter: Vector3
  lastOrientationDir: Vector3
  nodeIDs: number[]
  currentLength = 0
  currentEnd = 0
  currentNodeID = 0

  scene: Scene
  material: ShaderMaterial
  length = 200
  localHeadGeometry: Vector3[]
  // Test fix
  VerticesPerNode = 10
  vertexCount = 10
  faceCount = 10
  FacesPerNode = 10
  FaceIndicesPerNode = 10

  targetObject: Object3D
  dragTexture = false

  static createMaterial(vertexShader, fragmentShader, customUniforms: any = {}) {
    customUniforms.trailLength = { type: 'f', value: null }
    customUniforms.verticesPerNode = { type: 'f', value: null }
    customUniforms.minID = { type: 'f', value: null }
    customUniforms.maxID = { type: 'f', value: null }
    customUniforms.dragTexture = { type: 'f', value: null }
    customUniforms.maxTrailLength = { type: 'f', value: null }
    customUniforms.textureTileFactor = { type: 'v2', value: null }

    customUniforms.headColor = { type: 'v4', value: new Vector4() }
    customUniforms.tailColor = { type: 'v4', value: new Vector4() }

    vertexShader = vertexShader || BaseVertexShader
    fragmentShader = fragmentShader || BaseFragmentShader

    return new ShaderMaterial({
      uniforms: customUniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,

      transparent: true,
      alphaTest: 0.5,

      blending: CustomBlending,
      blendSrc: SrcAlphaFactor,
      blendDst: OneMinusSrcAlphaFactor,
      blendEquation: AddEquation,

      depthTest: true,
      depthWrite: false,

      side: DoubleSide
    })
  }

  static createBaseMaterial(customUniforms: any = {}) {
    return TrailRenderer.createMaterial(BaseVertexShader, BaseFragmentShader, customUniforms)
  }

  static createTexturedMaterial(customUniforms: any = {}) {
    customUniforms.texture = { type: 't', value: null }

    return TrailRenderer.createMaterial(TexturedVertexShader, TexturedFragmentShader, customUniforms)
  }

  constructor(orientToMovement) {
    super()

    if (orientToMovement) this.orientToMovement = true
  }

  initialize(
    material: ShaderMaterial,
    length: number,
    dragTexture: boolean,
    localHeadWidth: number,
    localHeadGeometry: Vector3[],
    targetObject: any
  ) {
    // TODO make targetObject object3d type
    this.destroyMesh()

    this.length = length > 0 ? length + 1 : 0
    this.dragTexture = dragTexture
    this.targetObject = targetObject

    this.initializeLocalHeadGeometry(localHeadWidth, localHeadGeometry)

    this.nodeIDs = []
    this.nodeCenters = []

    for (let i = 0; i < this.length; i++) {
      this.nodeIDs[i] = -1
      this.nodeCenters[i] = new Vector3()
    }

    this.material = material

    this.initializeGeometry()
    this.initializeMesh()

    this.material.uniforms.trailLength.value = 0
    this.material.uniforms.minID.value = 0
    this.material.uniforms.maxID.value = 0
    this.material.uniforms.dragTexture.value = this.dragTexture
    this.material.uniforms.maxTrailLength.value = this.length
    this.material.uniforms.verticesPerNode.value = this.VerticesPerNode
    this.material.uniforms.textureTileFactor.value = new Vector2(1.0, 1.0)

    this.reset()
  }

  initializeLocalHeadGeometry(localHeadWidth: number, localHeadGeometry: Vector3[]) {
    this.localHeadGeometry = []

    if (!localHeadGeometry) {
      const halfWidth = (localHeadWidth || 1.0) / 2.0

      this.localHeadGeometry.push(new Vector3(-halfWidth, 0, 0))
      this.localHeadGeometry.push(new Vector3(halfWidth, 0, 0))

      this.VerticesPerNode = 2
    } else {
      this.VerticesPerNode = 0
      for (let i = 0; i < localHeadGeometry.length && i < MaxHeadVertices; i++) {
        const vertex = localHeadGeometry[i]

        if (vertex && vertex instanceof Vector3) {
          const vertexCopy = new Vector3()

          vertexCopy.copy(vertex)

          this.localHeadGeometry.push(vertexCopy)
          this.VerticesPerNode++
        }
      }
    }

    this.FacesPerNode = (this.VerticesPerNode - 1) * 2
    this.FaceIndicesPerNode = this.FacesPerNode * 3
  }

  initializeGeometry() {
    this.vertexCount = this.length * this.VerticesPerNode
    this.faceCount = this.length * this.FacesPerNode

    const geometry = new BufferGeometry()

    const nodeIDs = new Float32Array(this.vertexCount)
    const nodeVertexIDs = new Float32Array(this.vertexCount * this.VerticesPerNode)
    const positions = new Float32Array(this.vertexCount * PositionComponentCount)
    const nodeCenters = new Float32Array(this.vertexCount * PositionComponentCount)
    const uvs = new Float32Array(this.vertexCount * UVComponentCount)
    const indices = new Uint32Array(this.faceCount * IndicesPerFace)

    const nodeIDAttribute = new BufferAttribute(nodeIDs, 1)
    geometry.setAttribute('nodeID', nodeIDAttribute)

    const nodeVertexIDAttribute = new BufferAttribute(nodeVertexIDs, 1)
    geometry.setAttribute('nodeVertexID', nodeVertexIDAttribute)

    const nodeCenterAttribute = new BufferAttribute(nodeCenters, PositionComponentCount)
    geometry.setAttribute('nodeCenter', nodeCenterAttribute)

    const positionAttribute = new BufferAttribute(positions, PositionComponentCount)
    geometry.setAttribute('position', positionAttribute)

    const uvAttribute = new BufferAttribute(uvs, UVComponentCount)
    geometry.setAttribute('uv', uvAttribute)

    const indexAttribute = new BufferAttribute(indices, 1)
    geometry.setIndex(indexAttribute)

    this.geometry = geometry
  }

  zeroVertices() {
    const positions = this.geometry.getAttribute('position') as BufferAttribute

    for (let i = 0; i < this.vertexCount; i++) {
      const index = i * 3

      positions.setX(index, 0)
      positions.setY(index + 1, 0)
      positions.setZ(index + 2, 0)
    }

    positions.needsUpdate = true
    positions.updateRange.count = -1
  }

  zeroIndices() {
    const indices = this.geometry.getIndex()

    for (let i = 0; i < this.faceCount; i++) {
      const index = i * 3

      indices.setX(index, 0)
      indices.setY(index + 1, 0)
      indices.setZ(index + 2, 0)
    }

    indices.needsUpdate = true
    indices.updateRange.count = -1
  }

  formInitialFaces() {
    this.zeroIndices()

    const indices = this.geometry.getIndex()

    for (let i = 0; i < this.length - 1; i++) {
      this.connectNodes(i, i + 1)
    }

    indices.needsUpdate = true
    indices.updateRange.count = -1
  }

  initializeMesh() {
    this.mesh = new Mesh(this.geometry, this.material)
    //StackOverflow says .dynamic unneeded in later versions
    //this.mesh.dynamic = true;
    this.mesh.matrixAutoUpdate = false
  }

  destroyMesh() {
    if (this.mesh) {
      this.mesh = null
    }
  }

  reset() {
    this.currentLength = 0
    this.currentEnd = -1

    this.lastNodeCenter = null
    this.currentNodeCenter = null
    this.lastOrientationDir = null

    this.currentNodeID = 0

    this.formInitialFaces()
    this.zeroVertices()

    this.geometry.setDrawRange(0, 0)
  }

  updateUniforms() {
    if (this.currentLength < this.length) {
      this.material.uniforms.minID.value = 0
    } else {
      this.material.uniforms.minID.value = this.currentNodeID - this.length
    }
    this.material.uniforms.maxID.value = this.currentNodeID
    this.material.uniforms.trailLength.value = this.currentLength
    this.material.uniforms.maxTrailLength.value = this.length
    this.material.uniforms.verticesPerNode.value = this.VerticesPerNode
  }

  advance() {
    this.targetObject.updateMatrixWorld()
    tempMatrix4.copy(this.targetObject.matrixWorld)

    this.advanceWithTransform(tempMatrix4)

    this.updateUniforms()
  }

  advanceWithPositionAndOrientation(nextPosition, orientationTangent) {
    this.advanceGeometry({ position: nextPosition, tangent: orientationTangent }, null)
  }

  advanceWithTransform(transformMatrix) {
    this.advanceGeometry(null, transformMatrix)
  }

  advanceGeometry(positionAndOrientation, transformMatrix) {
    const nextIndex = this.currentEnd + 1 >= this.length ? 0 : this.currentEnd + 1

    if (transformMatrix) {
      this.updateNodePositionsFromTransformMatrix(nextIndex, transformMatrix)
    } else {
      this.updateNodePositionsFromOrientationTangent(
        nextIndex,
        positionAndOrientation.position,
        positionAndOrientation.tangent
      )
    }

    if (this.currentLength >= 1) {
      this.connectNodes(this.currentEnd, nextIndex)

      if (this.currentLength >= this.length) {
        const disconnectIndex = this.currentEnd + 1 >= this.length ? 0 : this.currentEnd + 1
        this.disconnectNodes(disconnectIndex)
      }
    }

    if (this.currentLength < this.length) {
      this.currentLength++
    }

    this.currentEnd++
    if (this.currentEnd >= this.length) {
      this.currentEnd = 0
    }

    if (this.currentLength >= 1) {
      if (this.currentLength < this.length) {
        this.geometry.setDrawRange(0, (this.currentLength - 1) * this.FaceIndicesPerNode)
      } else {
        this.geometry.setDrawRange(0, this.currentLength * this.FaceIndicesPerNode)
      }
    }

    this.updateNodeID(this.currentEnd, this.currentNodeID)
    this.currentNodeID++
  }

  updateHead() {
    if (this.currentEnd < 0) return

    this.targetObject.updateMatrixWorld()
    tempMatrix4.copy(this.targetObject.matrixWorld)

    this.updateNodePositionsFromTransformMatrix(this.currentEnd, tempMatrix4)
  }

  updateNodeID(nodeIndex, id) {
    this.nodeIDs[nodeIndex] = id

    const nodeIDs = this.geometry.getAttribute('nodeID') as BufferAttribute
    const nodeVertexIDs = this.geometry.getAttribute('nodeVertexID') as BufferAttribute

    // TODO: clean this up, use set properly rather than iterating
    for (let i = 0; i < this.VerticesPerNode; i++) {
      const baseIndex = nodeIndex * this.VerticesPerNode + i
      nodeIDs.set([id], baseIndex)
      nodeVertexIDs.set([i], baseIndex)
    }

    nodeIDs.needsUpdate = true
    nodeVertexIDs.needsUpdate = true

    nodeIDs.updateRange.offset = nodeIndex * this.VerticesPerNode
    nodeIDs.updateRange.count = this.VerticesPerNode

    nodeVertexIDs.updateRange.offset = nodeIndex * this.VerticesPerNode
    nodeVertexIDs.updateRange.count = this.VerticesPerNode
  }

  updateNodeCenter(nodeIndex, nodeCenter) {
    this.lastNodeCenter = this.currentNodeCenter

    this.currentNodeCenter = this.nodeCenters[nodeIndex]
    this.currentNodeCenter.copy(nodeCenter)

    const nodeCenters = this.geometry.getAttribute('nodeCenter') as BufferAttribute

    for (let i = 0; i < this.VerticesPerNode; i++) {
      const baseIndex = (nodeIndex * this.VerticesPerNode + i) * 3
      nodeCenters.setX(baseIndex, nodeCenter.x)
      nodeCenters.setY(baseIndex, nodeCenter.y)
      nodeCenters.setZ(baseIndex, nodeCenter.z)
    }

    nodeCenters.needsUpdate = true
    nodeCenters.updateRange.offset = nodeIndex * this.VerticesPerNode * PositionComponentCount
    nodeCenters.updateRange.count = this.VerticesPerNode * PositionComponentCount
  }

  updateNodePositionsFromOrientationTangent(nodeIndex, nodeCenter, orientationTangent) {
    const positions = this.geometry.getAttribute('position') as BufferAttribute

    this.updateNodeCenter(nodeIndex, nodeCenter)

    tempOffset.copy(nodeCenter)
    tempOffset.sub(LocalHeadOrigin)
    tempQuaternion.setFromUnitVectors(LocalOrientationTangent, orientationTangent)

    for (let i = 0; i < this.localHeadGeometry.length; i++) {
      const vertex = tempLocalHeadGeometry[i]
      vertex.copy(this.localHeadGeometry[i])
      vertex.applyQuaternion(tempQuaternion)
      vertex.add(tempOffset)
    }

    for (let i = 0; i < this.localHeadGeometry.length; i++) {
      const positionIndex = (this.VerticesPerNode * nodeIndex + i) * PositionComponentCount
      const transformedHeadVertex = tempLocalHeadGeometry[i]

      positions.setX(positionIndex, transformedHeadVertex.x)
      positions.setY(positionIndex + 1, transformedHeadVertex.y)
      positions.setZ(positionIndex + 2, transformedHeadVertex.z)
    }

    positions.needsUpdate = true
  }

  updateNodePositionsFromTransformMatrix(nodeIndex, transformMatrix) {
    const positions = this.geometry.getAttribute('position') as BufferAttribute

    tempPosition.set(0, 0, 0)
    tempPosition.applyMatrix4(transformMatrix)
    this.updateNodeCenter(nodeIndex, tempPosition)

    for (let i = 0; i < this.localHeadGeometry.length; i++) {
      const vertex2 = tempLocalHeadGeometry2[i]
      vertex2.copy(this.localHeadGeometry[i])
    }

    for (let i = 0; i < this.localHeadGeometry.length; i++) {
      const vertex3 = tempLocalHeadGeometry2[i]
      vertex3.applyMatrix4(transformMatrix)
    }

    if (this.lastNodeCenter && this.orientToMovement) {
      getMatrix3FromMatrix4(tempMatrix3, transformMatrix)
      worldOrientation.set(0, 0, -1)
      worldOrientation.applyMatrix3(tempMatrix3)

      tempDirection.copy(this.currentNodeCenter)
      tempDirection.sub(this.lastNodeCenter)
      tempDirection.normalize()

      if (tempDirection.lengthSq() <= 0.0001 && this.lastOrientationDir) {
        tempDirection.copy(this.lastOrientationDir)
      }

      if (tempDirection.lengthSq() > 0.0001) {
        if (!this.lastOrientationDir) this.lastOrientationDir = new Vector3()

        tempQuaternion.setFromUnitVectors(worldOrientation, tempDirection)

        tempOffset.copy(this.currentNodeCenter)

        for (let i = 0; i < this.localHeadGeometry.length; i++) {
          const vertex4 = tempLocalHeadGeometry2[i]
          vertex4.sub(tempOffset)
          vertex4.applyQuaternion(tempQuaternion)
          vertex4.add(tempOffset)
        }
      }
    }

    for (let i = 0; i < this.localHeadGeometry.length; i++) {
      const positionIndex = (this.VerticesPerNode * nodeIndex + i) * PositionComponentCount
      const transformedHeadVertex = tempLocalHeadGeometry2[i]

      positions.setX(positionIndex, transformedHeadVertex.x)
      positions.setY(positionIndex + 1, transformedHeadVertex.y)
      positions.setZ(positionIndex + 2, transformedHeadVertex.z)
    }

    positions.needsUpdate = true

    positions.updateRange.offset = nodeIndex * this.VerticesPerNode * PositionComponentCount
    positions.updateRange.count = this.VerticesPerNode * PositionComponentCount
  }

  connectNodes(srcNodeIndex, destNodeIndex) {
    const indices = this.geometry.getIndex()

    for (let i = 0; i < this.localHeadGeometry.length - 1; i++) {
      const srcVertexIndex = this.VerticesPerNode * srcNodeIndex + i
      const destVertexIndex = this.VerticesPerNode * destNodeIndex + i

      const faceIndex = (srcNodeIndex * this.FacesPerNode + i * FacesPerQuad) * IndicesPerFace

      indices.setX(faceIndex, srcVertexIndex)
      indices.setY(faceIndex + 1, destVertexIndex)
      indices.setZ(faceIndex + 2, srcVertexIndex + 1)

      indices.setX(faceIndex + 3, destVertexIndex)
      indices.setY(faceIndex + 4, destVertexIndex + 1)
      indices.setZ(faceIndex + 5, srcVertexIndex + 1)
    }

    indices.needsUpdate = true
    indices.updateRange.count = -1

    returnObj.attribute = indices
    returnObj.offset = srcNodeIndex * this.FacesPerNode * IndicesPerFace
    returnObj.count = this.FacesPerNode * IndicesPerFace

    return returnObj
  }

  disconnectNodes(srcNodeIndex) {
    const indices = this.geometry.getIndex()

    for (let i = 0; i < this.localHeadGeometry.length - 1; i++) {
      const faceIndex = (srcNodeIndex * this.FacesPerNode + i * FacesPerQuad) * IndicesPerFace

      indices.setX(faceIndex, 0)
      indices.setY(faceIndex + 1, 0)
      indices.setZ(faceIndex + 2, 0)

      indices.setX(faceIndex + 3, 0)
      indices.setY(faceIndex + 4, 0)
      indices.setZ(faceIndex + 5, 0)
    }

    indices.needsUpdate = true
    indices.updateRange.count = -1

    returnObj2.attribute = indices
    returnObj2.offset = srcNodeIndex * this.FacesPerNode * IndicesPerFace
    returnObj2.count = this.FacesPerNode * IndicesPerFace

    return returnObj2
  }
}

export default TrailRenderer
