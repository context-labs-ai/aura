'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

interface Building3DViewerProps {
  glbUrl: string;
  width?: number;
  height?: number;
}

/**
 * Three.js wireframe viewer that loads a GLB model and renders it
 * as a neon wireframe (EdgesGeometry + LineBasicMaterial) with
 * touch-enabled OrbitControls for drag/rotate.
 *
 * This component imports Three.js directly and MUST only be used
 * via next/dynamic with { ssr: false }.
 */
export default function Building3DViewer({
  glbUrl,
  width = 350,
  height = 300,
}: Building3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const frameIdRef = useRef<number>(0);
  const disposablesRef = useRef<Array<{ dispose: () => void }>>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- Scene setup ---
    const scene = new THREE.Scene();
    scene.background = null; // transparent
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(8, 6, 8);
    cameraRef.current = camera;

    // --- Renderer ---
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });
    } catch {
      setError('WebGL unavailable');
      setLoading(false);
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    disposablesRef.current.push(renderer);

    // Handle WebGL context lost
    renderer.domElement.addEventListener('webglcontextlost', () => {
      setError('WebGL context lost');
    });

    // --- Controls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    controlsRef.current = controls;
    disposablesRef.current.push(controls);

    // --- Load GLB model ---
    const loader = new GLTFLoader();
    loader.load(
      glbUrl,
      (gltf) => {
        const model = gltf.scene;
        const wireframeGroup = new THREE.Group();

        // Traverse all meshes and create wireframe edges
        model.traverse((child) => {
          if (child instanceof THREE.Mesh && child.geometry) {
            const edgesGeometry = new THREE.EdgesGeometry(child.geometry, 15);
            const lineMaterial = new THREE.LineBasicMaterial({
              color: 0x00f0ff,
              transparent: true,
              opacity: 0.85,
            });

            const lineSegments = new THREE.LineSegments(edgesGeometry, lineMaterial);

            // Copy world transform
            child.updateWorldMatrix(true, false);
            lineSegments.applyMatrix4(child.matrixWorld);

            wireframeGroup.add(lineSegments);

            disposablesRef.current.push(edgesGeometry);
            disposablesRef.current.push(lineMaterial);
          }
        });

        scene.add(wireframeGroup);

        // Center model and fit camera
        const box = new THREE.Box3().setFromObject(wireframeGroup);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const distance = maxDim * 2;

        wireframeGroup.position.sub(center);
        camera.position.set(distance * 0.8, distance * 0.6, distance * 0.8);
        camera.lookAt(0, 0, 0);
        controls.target.set(0, 0, 0);
        controls.update();

        // Add a subtle grid on the ground plane
        const gridSize = maxDim * 1.5;
        const gridHelper = new THREE.GridHelper(gridSize, 20, 0x00f0ff, 0x003344);
        gridHelper.position.y = -size.y / 2;
        (gridHelper.material as THREE.Material).opacity = 0.3;
        (gridHelper.material as THREE.Material).transparent = true;
        scene.add(gridHelper);

        setLoading(false);
      },
      undefined,
      (err) => {
        console.error('[Building3DViewer] Load error:', err);
        setError('Failed to load 3D model');
        setLoading(false);
      }
    );

    // --- Animation loop ---
    function animate() {
      frameIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(frameIdRef.current);

      // Dispose all tracked resources
      for (const disposable of disposablesRef.current) {
        disposable.dispose();
      }
      disposablesRef.current = [];

      // Remove renderer DOM element
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }

      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      rendererRef.current = null;
    };
  }, [glbUrl, width, height]);

  // Handle resize
  useEffect(() => {
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    if (!renderer || !camera) return;

    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }, [width, height]);

  if (error) {
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--hud-red, #ff3344)',
          fontFamily: "var(--hud-font, 'Share Tech Mono', monospace)",
          fontSize: '0.7rem',
          border: '1px solid rgba(255,51,68,0.3)',
          borderRadius: 8,
          background: 'rgba(255,51,68,0.05)',
        }}
      >
        ⚠ {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width,
        height,
        position: 'relative',
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid rgba(0,240,255,0.2)',
        background: 'rgba(0,0,0,0.3)',
      }}
    >
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--hud-cyan, #00f0ff)',
            fontFamily: "var(--hud-font, 'Share Tech Mono', monospace)",
            fontSize: '0.65rem',
            letterSpacing: '0.1em',
            zIndex: 2,
          }}
        >
          <span className="hud-spin" style={{ display: 'inline-block', marginRight: 8 }}>◐</span>
          LOADING MODEL...
        </div>
      )}
    </div>
  );
}
