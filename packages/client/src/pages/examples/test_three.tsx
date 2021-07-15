import React, { useEffect, useState } from 'react'
import {
  Scene,
  WebGLRenderer,
  Color,
  Mesh,
  BoxBufferGeometry,
  MeshStandardMaterial,
  Vector3,
  PerspectiveCamera
} from 'three'
import TrailRenderer from '../../../../engine/src/scene/classes/TrailRenderer'

const canvasStyle = {
  zIndex: 0,
  width: '100%',
  height: '100%',
  position: 'absolute',
  WebkitUserSelect: 'none',
  userSelect: 'none'
} as React.CSSProperties

const LocationPage = () => {
  return (
    <>
      <DevPage />
    </>
  )
}

export default LocationPage

const engineRendererCanvasId = 'engine-renderer-canvas'
let count = 0
const DevPage = () => {
  useEffect(() => {
    init()
  }, [])

  async function init(): Promise<any> {
    const scene = new Scene()
    scene.background = new Color('grey')

    const renderer = new WebGLRenderer({ canvas: document.getElementById(engineRendererCanvasId) as HTMLCanvasElement })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(window.devicePixelRatio)

    const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.set(40, 10, 20)
    camera.lookAt(0, 0, 0)

    const trailTarget = new Mesh(new BoxBufferGeometry(), new MeshStandardMaterial({ color: new Color('lime') }))
    scene.add(trailTarget)

    const trailHeadGeometry = []
    trailHeadGeometry.push(new Vector3(-1.0, 0.0, 0.0), new Vector3(0.0, 0.0, 0.0), new Vector3(1.0, 0.0, 0.0))
    const trail = new TrailRenderer(false)
    const trailMaterial = TrailRenderer.createBaseMaterial()
    const trailLength = 150

    trail.initialize(trailMaterial, trailLength, false, 150, trailHeadGeometry, trailTarget)
    scene.add(trail)

    const animate = () => {
      requestAnimationFrame(animate)

      count += 0.02

      trailTarget.position.set(Math.sin(count) * 10, 0, Math.cos(count) * 10)

      renderer.render(scene, camera)
    }
    requestAnimationFrame(animate)
  }

  return (
    <>
      <div>
        <canvas id={engineRendererCanvasId} style={canvasStyle} />
      </div>
    </>
  )
}
