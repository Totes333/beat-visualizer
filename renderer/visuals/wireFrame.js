import * as THREE from 'three';
import createGL from 'gl';

export function createWireframeRenderer(width, height) {
  const gl = createGL(width, height, {
    preserveDrawingBuffer: true
  });

  const renderer = new THREE.WebGLRenderer({
    context: gl
  });

  renderer.setSize(width, height);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    70,
    width / height,
    0.1,
    1000
  );

  camera.position.z = 40;

  const geometry = new THREE.PlaneGeometry(
    100,
    100,
    64,
    64
  );

  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true
  });

  const plane = new THREE.Mesh(
    geometry,
    material
  );

  plane.rotation.x = -1.1;

  scene.add(plane);

  return {
    renderer,
    scene,
    camera,
    plane,
    gl
  };
}