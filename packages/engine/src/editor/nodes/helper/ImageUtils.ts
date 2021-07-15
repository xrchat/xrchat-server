/**
 * @author Abhishek Pathak <abhi.pathak401@gmail.com>
 */

import { Api } from '@xrengine/client-core'
import {
  BackSide,
  ClampToEdgeWrapping,
  CubeCamera,
  CubeTexture,
  DoubleSide,
  IcosahedronGeometry,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PlaneBufferGeometry,
  RawShaderMaterial,
  RGBAFormat,
  Scene,
  Texture,
  Uniform,
  UnsignedByteType,
  WebGLCubeRenderTarget,
  WebGLRenderTarget
} from 'three'
import { WebGLRenderer } from 'three/src/renderers/WebGLRenderer'
import { getCanvasBlob } from '../../functions/thumbnails'

//#region CubemapToEquirectangular Shader
const vertexShader = `
	attribute vec3 position;
	attribute vec2 uv;

	uniform mat4 projectionMatrix;
	uniform mat4 modelViewMatrix;

	varying vec2 vUv;

	void main()  {

		vUv = vec2( 1.- uv.x, uv.y );
		gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

	}
`

const fragmentShader = `
	precision mediump float;

	uniform samplerCube map;

	varying vec2 vUv;

	#define M_PI 3.1415926535897932384626433832795

	void main()  {

		vec2 uv = vUv;

		float longitude = uv.x * 2. * M_PI - M_PI + M_PI / 2.;
		float latitude = uv.y * M_PI;

		vec3 dir = vec3(
			- sin( longitude ) * sin( latitude ),
			cos( latitude ),
			- cos( longitude ) * sin( latitude )
		);
		normalize( dir );

		gl_FragColor = textureCube( map, dir );

	}
`

//#endregion

//download the imagedata as png
export const downloadImage = (imageData: ImageData, imageName = 'Image', width: number, height: number): void => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = width
  canvas.height = height
  ctx.putImageData(imageData, 0, 0)
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob)
    const fileName = `${imageName}.png`
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.setAttribute('download', fileName)
    anchor.className = 'download-js-link'
    anchor.innerHTML = 'downloading...'
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    setTimeout(() => {
      anchor.click()
      document.body.removeChild(anchor)
    }, 1)
  }, 'image/png')
}

//convert Cubemap To Equirectangular map
export const convertCubemapToEquiImageData = async (
  renderer: WebGLRenderer,
  source: WebGLCubeRenderTarget,
  width: number,
  height: number,
  returnAsBlob = false
): Promise<{ imageData?: ImageData; blob?: Blob }> => {
  const scene = new Scene()
  const material = new RawShaderMaterial({
    uniforms: {
      map: new Uniform(new CubeTexture())
    },
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    side: DoubleSide,
    transparent: true
  })
  const quad = new Mesh(new PlaneBufferGeometry(1, 1), material)
  scene.add(quad)
  const camera = new OrthographicCamera(1 / -2, 1 / 2, 1 / 2, 1 / -2, -10000, 10000)

  quad.scale.set(width, height, 1)
  camera.left = width / -2
  camera.right = width / 2
  camera.top = height / 2
  camera.bottom = height / -2
  camera.updateProjectionMatrix()
  const renderTarget = new WebGLRenderTarget(width, height, {
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    format: RGBAFormat,
    type: UnsignedByteType
  })

  renderer.setRenderTarget(renderTarget)
  quad.material.uniforms.map.value = source
  renderer.render(scene, camera)
  const pixels = new Uint8Array(4 * width * height)
  renderer.readRenderTargetPixels(renderTarget, 0, 0, width, height, pixels)
  const imageData = new ImageData(new Uint8ClampedArray(pixels), width, height)
  if (returnAsBlob) {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = width
    canvas.height = height
    ctx.putImageData(imageData, 0, 0)
    const blob = (await new Promise((resolve) => canvas.toBlob(resolve))) as Blob
    return { blob }
  }
  return { imageData }
}

//convert Equirectangular map to WebGlCubeRenderTarget
export const convertEquiToCubemap = (renderer: WebGLRenderer, source: Texture, size: number): WebGLCubeRenderTarget => {
  const convertScene = new Scene()

  const gl = renderer.getContext()
  const maxSize = gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE)

  const material = new MeshBasicMaterial({
    map: null,
    side: BackSide
  })

  const mesh = new Mesh(new IcosahedronGeometry(100, 4), material)
  convertScene.add(mesh)

  const mapSize = Math.min(size, maxSize)
  const cubeRenderTarget: WebGLCubeRenderTarget = new WebGLCubeRenderTarget(mapSize)
  const cubecam = new CubeCamera(1, 100000, cubeRenderTarget)
  material.map = source
  cubecam.update(renderer, convertScene)
  return cubeRenderTarget
}

export const uploadCubemap = async (
  renderer: WebGLRenderer,
  api: Api,
  source: WebGLCubeRenderTarget,
  resoulution: number,
  imageIdentifier?: string,
  projectID?: any
) => {
  const blob = (await convertCubemapToEquiImageData(renderer, source, resoulution, resoulution, true)).blob
  const value = (await api.upload(blob, null, null, imageIdentifier, projectID)) as any

  return value
}
