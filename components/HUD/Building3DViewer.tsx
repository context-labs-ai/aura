'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

interface Building3DViewerProps {
  glbUrl: string;
  width?: number;
  height?: number;
  /** Number of floors for procedural wireframe (used when glbUrl === 'procedural') */
  floors?: number;
}

/**
 * Generate a procedural building wireframe group.
 * Creates an Iron Man scan aesthetic: clean geometric lines, floor divisions, neon edges.
 */
function createProceduralWireframe(
  floors: number,
  disposables: Array<{ dispose: () => void }>
): THREE.Group {
  const group = new THREE.Group();
  const floorHeight = 0.4;
  const totalHeight = floors * floorHeight;
  const baseWidth = 2.5;
  const baseDepth = 1.8;

  const cyanMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.9 });
  const dimMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.35 });
  disposables.push(cyanMat, dimMat);

  // Main building box
  const mainBox = new THREE.BoxGeometry(baseWidth, totalHeight, baseDepth);
  const mainEdges = new THREE.EdgesGeometry(mainBox);
  const mainLines = new THREE.LineSegments(mainEdges, cyanMat);
  mainLines.position.y = totalHeight / 2;
  group.add(mainLines);
  disposables.push(mainBox, mainEdges);

  // Floor division lines (horizontal planes at each floor)
  for (let i = 1; i < floors; i++) {
    const y = i * floorHeight;
    const floorGeo = new THREE.PlaneGeometry(baseWidth, baseDepth);
    const floorEdges = new THREE.EdgesGeometry(floorGeo);
    const floorLines = new THREE.LineSegments(floorEdges, dimMat);
    floorLines.rotation.x = -Math.PI / 2;
    floorLines.position.y = y;
    group.add(floorLines);
    disposables.push(floorGeo, floorEdges);
  }

  // Vertical column lines at corners (structural feel)
  const columnPositions = [
    [-baseWidth * 0.35, baseDepth * 0.35],
    [baseWidth * 0.35, baseDepth * 0.35],
    [-baseWidth * 0.35, -baseDepth * 0.35],
    [baseWidth * 0.35, -baseDepth * 0.35],
  ];
  for (const [x, z] of columnPositions) {
    const points = [new THREE.Vector3(x, 0, z), new THREE.Vector3(x, totalHeight, z)];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geo, dimMat);
    group.add(line);
    disposables.push(geo);
  }

  // Top crown / setback (if tall enough)
  if (floors > 10) {
    const crownWidth = baseWidth * 0.6;
    const crownDepth = baseDepth * 0.6;
    const crownHeight = floorHeight * 3;
    const crownGeo = new THREE.BoxGeometry(crownWidth, crownHeight, crownDepth);
    const crownEdges = new THREE.EdgesGeometry(crownGeo);
    const crownLines = new THREE.LineSegments(crownEdges, cyanMat);
    crownLines.position.y = totalHeight + crownHeight / 2;
    group.add(crownLines);
    disposables.push(crownGeo, crownEdges);
  }

  // Antenna/spire for tall buildings
  if (floors > 30) {
    const spireHeight = totalHeight * 0.15;
    const spirePoints = [
      new THREE.Vector3(0, totalHeight + (floors > 10 ? floorHeight * 3 : 0), 0),
      new THREE.Vector3(0, totalHeight + (floors > 10 ? floorHeight * 3 : 0) + spireHeight, 0),
    ];
    const spireGeo = new THREE.BufferGeometry().setFromPoints(spirePoints);
    const spire = new THREE.Line(spireGeo, cyanMat);
    group.add(spire);
    disposables.push(spireGeo);
  }

  // Cross-bracing diagonals on front face for structural aesthetic
  if (floors > 5) {
    const segmentFloors = Math.min(10, Math.floor(floors / 3));
    const segH = segmentFloors * floorHeight;
    for (let seg = 0; seg < Math.ceil(floors / segmentFloors); seg++) {
      const yBase = seg * segH;
      const yTop = Math.min(yBase + segH, totalHeight);
      const diagPoints = [
        new THREE.Vector3(-baseWidth / 2, yBase, baseDepth / 2),
        new THREE.Vector3(baseWidth / 2, yTop, baseDepth / 2),
      ];
      const diagGeo = new THREE.BufferGeometry().setFromPoints(diagPoints);
      const diagLine = new THREE.Line(diagGeo, dimMat);
      group.add(diagLine);
      disposables.push(diagGeo);
    }
  }

  return group;
}

/**
 * Three.js wireframe viewer that loads a GLB model and renders it
 * as a neon wireframe (EdgesGeometry + LineBasicMaterial) with
 * touch-enabled OrbitControls for drag/rotate.
 *
 * When glbUrl === 'procedural', generates an instant wireframe from floor count.
 *
 * This component imports Three.js directly and MUST only be used
 * via next/dynamic with { ssr: false }.
 */
export default function Building3DViewer({
  glbUrl,
  width = 350,
  height = 300,
  floors = 20,
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

    renderer.domElement.addEventListener('webglcontextlost', () => {
      setError('WebGL context lost');
    });

    // --- Controls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.5;
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    controlsRef.current = controls;
    disposablesRef.current.push(controls);

    function setupWireframeGroup(wireframeGroup: THREE.Group) {
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

      // Ground grid
      const gridSize = maxDim * 1.5;
      const gridHelper = new THREE.GridHelper(gridSize, 20, 0x00f0ff, 0x003344);
      gridHelper.position.y = -size.y / 2;
      (gridHelper.material as THREE.Material).opacity = 0.3;
      (gridHelper.material as THREE.Material).transparent = true;
      scene.add(gridHelper);

      setLoading(false);
    }

    if (glbUrl === 'procedural') {
      // --- Procedural wireframe (instant) ---
      const wireframeGroup = createProceduralWireframe(floors, disposablesRef.current);
      setupWireframeGroup(wireframeGroup);
    } else {
      // --- Load GLB model ---
      const loader = new GLTFLoader();
      loader.load(
        glbUrl,
        (gltf) => {
          const model = gltf.scene;
          const wireframeGroup = new THREE.Group();

          model.traverse((child) => {
            if (child instanceof THREE.Mesh && child.geometry) {
              const edgesGeometry = new THREE.EdgesGeometry(child.geometry, 15);
              const lineMaterial = new THREE.LineBasicMaterial({
                color: 0x00f0ff,
                transparent: true,
                opacity: 0.85,
              });

              const lineSegments = new THREE.LineSegments(edgesGeometry, lineMaterial);
              child.updateWorldMatrix(true, false);
              lineSegments.applyMatrix4(child.matrixWorld);

              wireframeGroup.add(lineSegments);
              disposablesRef.current.push(edgesGeometry);
              disposablesRef.current.push(lineMaterial);
            }
          });

          setupWireframeGroup(wireframeGroup);
        },
        undefined,
        (err) => {
          console.error('[Building3DViewer] Load error:', err);
          // Fallback to procedural on GLB load failure
          const wireframeGroup = createProceduralWireframe(floors, disposablesRef.current);
          setupWireframeGroup(wireframeGroup);
        }
      );
    }

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
      for (const disposable of disposablesRef.current) {
        disposable.dispose();
      }
      disposablesRef.current = [];
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      rendererRef.current = null;
    };
  }, [glbUrl, width, height, floors]);

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
        {'\u26A0'} {error}
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
          <span className="hud-spin" style={{ display: 'inline-block', marginRight: 8 }}>{'\u25D0'}</span>
          LOADING MODEL...
        </div>
      )}
    </div>
  );
}
