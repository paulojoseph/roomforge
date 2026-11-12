'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { planBounds } from '@/core/model';
import type { Plan } from '@/core/model';
import { wallBox, planToWorld } from '@/core/walls-geometry';
import { openingRect } from '@/core/openings';
import { selectPlan, useEditor } from '@/features/editor/store';
import { createWebGPURenderer, hasWebGPU } from './renderer';

function toGeometry(positions: number[], normals: number[] | null, indices: number[]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (normals) g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  g.setIndex(indices);
  if (!normals) g.computeVertexNormals();
  return g;
}

// One mesh per wall. Every edit builds all of them again.
function Walls({ plan }: { plan: Plan }) {
  const geometries = useMemo(
    () =>
      plan.walls.map((w) => {
        const m = wallBox(w);
        return { id: w.id, geo: toGeometry(m.positions, m.normals, m.indices) };
      }),
    [plan],
  );

  useEffect(() => () => geometries.forEach((g) => g.geo.dispose()), [geometries]);

  return (
    <group>
      {geometries.map((g) => (
        <mesh key={g.id} geometry={g.geo} castShadow receiveShadow>
          <meshStandardMaterial color="#d9d4c7" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// Doors and windows are flat dark rectangles in front of both wall faces.
function OpeningMarks({ plan }: { plan: Plan }) {
  const geometries = useMemo(() => {
    const out: { id: string; geo: THREE.BufferGeometry; kind: string }[] = [];
    for (const op of plan.openings) {
      const w = plan.walls.find((x) => x.id === op.wallId);
      if (!w) continue;
      for (const side of [-1, 1] as const) {
        out.push({
          id: op.id + (side === -1 ? 'a' : 'b'),
          kind: op.kind,
          geo: toGeometry(openingRect(w, op, side), null, [0, 1, 2, 0, 2, 3]),
        });
      }
    }
    return out;
  }, [plan]);

  useEffect(() => () => geometries.forEach((g) => g.geo.dispose()), [geometries]);

  return (
    <group>
      {geometries.map((g) => (
        <mesh key={g.id} geometry={g.geo}>
          <meshBasicMaterial color={g.kind === 'door' ? '#2a2420' : '#27323b'} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

// moves the camera to look at the plan whenever a whole plan is loaded
function CameraRig({ controls }: { controls: React.RefObject<any> }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const loadId = useEditor((s) => s.loadId);

  // with an async renderer the Canvas can leave the aspect at 0
  useEffect(() => {
    if (size.width > 0 && size.height > 0) {
      camera.aspect = size.width / size.height;
      camera.updateProjectionMatrix();
    }
  }, [camera, size.width, size.height]);

  useEffect(() => {
    const plan = useEditor.getState().history.present;
    const b = planBounds(plan);
    const centre = b ? planToWorld({ x: (b.min.x + b.max.x) / 2, y: (b.min.y + b.max.y) / 2 }) : ([3, 0, -2.5] as const);
    const span = b ? Math.max(b.max.x - b.min.x, b.max.y - b.min.y) / 1000 : 6;
    const dist = Math.max(6, span * 1.9);
    camera.position.set(centre[0] + dist * 0.6, dist * 0.8, centre[2] + dist * 0.8);
    camera.lookAt(centre[0], 0, centre[2]);
    if (controls.current) {
      controls.current.target.set(centre[0], 0, centre[2]);
      controls.current.update();
    }
  }, [loadId, camera, controls]);

  return null;
}

// The Canvas may call it more than once before the first call is done, so
// the renderer is made once per canvas.
const pendingByCanvas = new WeakMap<object, Promise<any>>();

function makeGpuGl(props: any) {
  let p = pendingByCanvas.get(props.canvas);
  if (!p) {
    p = createWebGPURenderer(props).then(({ renderer, kind }) => {
      useEditor.getState().setRenderer(kind);
      return renderer;
    });
    pendingByCanvas.set(props.canvas, p);
  }
  return p;
}

// plain object on purpose, see CAMERA
const GL_PROPS = { antialias: true };

// Module level on purpose: if the Canvas sees a new camera object on a
// render it builds a new camera, and that one starts with aspect 0.
const CAMERA = { position: [8, 9, 10] as [number, number, number], fov: 45, near: 0.1, far: 500 };

export default function Viewer3D() {
  const plan = useEditor(selectPlan);
  const renderer = useEditor((s) => s.renderer);
  const controls = useRef<any>(null);
  const [mode, setMode] = useState<'pending' | 'webgpu' | 'webgl'>('pending');

  // WebGPU if the browser has it, WebGL otherwise
  useEffect(() => {
    let alive = true;
    hasWebGPU().then((ok) => {
      if (!alive) return;
      if (!ok) useEditor.getState().setRenderer('WebGL');
      setMode(ok ? 'webgpu' : 'webgl');
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="absolute inset-0">
      {mode !== 'pending' && (
        <Canvas shadows={false} camera={CAMERA} gl={(mode === 'webgpu' ? makeGpuGl : GL_PROPS) as any}>
          <color attach="background" args={['#eceae3']} />
          <ambientLight intensity={0.9} />
          <directionalLight position={[10, 18, 6]} intensity={1.6} />
          <gridHelper args={[60, 60, '#b8b3a5', '#d4d0c4']} position={[0, -0.002, 0]} />
          <Walls plan={plan} />
          <OpeningMarks plan={plan} />
          <OrbitControls ref={controls} makeDefault enableDamping={false} maxPolarAngle={Math.PI / 2 - 0.02} />
          <CameraRig controls={controls} />
        </Canvas>
      )}
      <div className="pointer-events-none absolute bottom-2 right-2 rounded bg-white/85 px-2 py-1 text-xs text-neutral-600">
        {renderer ? `Renderer: ${renderer}` : 'Renderer: starting'}
      </div>
    </div>
  );
}
