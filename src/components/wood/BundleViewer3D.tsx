"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { Edges, OrbitControls, Text } from "@react-three/drei";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { WoodBoard } from "@/lib/wood/types";
import { BUNDLE_LENGTH_MM, BUNDLE_WIDTH_MM, BUNDLE_HEIGHT_MM } from "@/lib/wood/layout";
import * as THREE from "three";

const SCALE = 0.001;

type BoardPickMode = "add" | "remove";

function BoardMesh({
  board,
  selected,
  onPick,
}: {
  board: WoodBoard;
  selected: boolean;
  onPick: (id: number, mode: BoardPickMode) => void;
}) {
  const issued = board.status === "issued";
  const color = issued ? "#94a3b8" : selected ? "#3b9fe8" : "#d4a574";

  return (
    <mesh
      position={[board.posX * SCALE, board.posY * SCALE, board.posZ * SCALE]}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (issued) return;
        if (e.button === 2) {
          e.nativeEvent.preventDefault();
          onPick(board.id, "remove");
        } else if (e.button === 0) {
          onPick(board.id, "add");
        }
      }}
      onContextMenu={(e) => e.nativeEvent.preventDefault()}
    >
      <boxGeometry args={[board.widthMm * SCALE, board.thicknessMm * SCALE, board.lengthMm * SCALE]} />
      <meshStandardMaterial color={color} transparent={issued} opacity={issued ? 0.4 : 1} roughness={0.65} />
      <Edges
        scale={1.04}
        threshold={15}
        color={selected ? "#1e5a9e" : issued ? "#64748b" : "#5c4033"}
        lineWidth={selected ? 2 : 1}
      />
    </mesh>
  );
}

function SceneContent({
  boards,
  selectedIds,
  onPick,
  onBoxSelect,
}: {
  boards: WoodBoard[];
  selectedIds: Set<number>;
  onPick: (id: number, mode: BoardPickMode) => void;
  onBoxSelect: (ids: number[]) => void;
}) {
  const { camera, gl } = useThree();
  const dims = useMemo(
    () => ({
      w: BUNDLE_WIDTH_MM * SCALE,
      h: BUNDLE_HEIGHT_MM * SCALE,
      l: BUNDLE_LENGTH_MM * SCALE,
    }),
    []
  );

  useEffect(() => {
    const cx = dims.w / 2;
    const cy = dims.h / 2;
    camera.position.set(cx * 1.05, cy * 0.85, -dims.l * 0.35);
    camera.lookAt(cx, cy * 0.55, dims.l * 0.15);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.near = 0.05;
      camera.far = 200;
      camera.updateProjectionMatrix();
    }
  }, [camera, dims]);

  const projectBoardIdsInRect = useCallback(
    (x0: number, y0: number, x1: number, y1: number) => {
      const rect = new DOMRect(
        Math.min(x0, x1),
        Math.min(y0, y1),
        Math.abs(x1 - x0),
        Math.abs(y1 - y0)
      );
      if (rect.width < 6 && rect.height < 6) return [];

      const canvas = gl.domElement;
      const hit: number[] = [];
      const v = new THREE.Vector3();

      for (const b of boards) {
        if (b.status === "issued") continue;
        v.set(b.posX * SCALE, b.posY * SCALE, b.posZ * SCALE);
        v.project(camera);
        const sx = ((v.x + 1) / 2) * canvas.clientWidth;
        const sy = ((-v.y + 1) / 2) * canvas.clientHeight;
        if (rect.left <= sx && sx <= rect.right && rect.top <= sy && sy <= rect.bottom) {
          hit.push(b.id);
        }
      }
      return hit;
    },
    [boards, camera, gl.domElement]
  );

  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 8, -6]} intensity={1.2} />
      <directionalLight position={[-3, 5, 4]} intensity={0.35} />

      <mesh position={[dims.w / 2, dims.h / 2, dims.l / 2]}>
        <boxGeometry args={[dims.w, dims.h, dims.l]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.06} />
        <Edges color="#3b9fe8" />
      </mesh>

      <mesh
        position={[dims.w / 2, -0.002, dims.l / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.stopPropagation();
          const startX = e.nativeEvent.offsetX;
          const startY = e.nativeEvent.offsetY;
          const canvas = gl.domElement;

          const onMove = (ev: PointerEvent) => {
            const r = canvas.getBoundingClientRect();
            const ids = projectBoardIdsInRect(
              startX,
              startY,
              ev.clientX - r.left,
              ev.clientY - r.top
            );
            if (ids.length) onBoxSelect(ids);
          };

          const onUp = (ev: PointerEvent) => {
            const r = canvas.getBoundingClientRect();
            const ids = projectBoardIdsInRect(
              startX,
              startY,
              ev.clientX - r.left,
              ev.clientY - r.top
            );
            if (ids.length) onBoxSelect(ids);
            canvas.removeEventListener("pointermove", onMove);
            canvas.removeEventListener("pointerup", onUp);
          };

          canvas.addEventListener("pointermove", onMove);
          canvas.addEventListener("pointerup", onUp);
        }}
      >
        <planeGeometry args={[dims.w * 1.5, dims.l * 1.5]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {boards.map((b) => (
        <BoardMesh key={b.id} board={b} selected={selectedIds.has(b.id)} onPick={onPick} />
      ))}

      <Text position={[dims.w / 2, dims.h + 0.15, dims.l * 0.5]} fontSize={0.07} color="#0a1120" maxWidth={3.5}>
        Góc 3/4 mặt đầu gỗ · Trái: chọn thêm · Phải: bỏ chọn · Kéo: chọn nhiều · Zoom/Pan (không xoay)
      </Text>

      <OrbitControls
        makeDefault
        enableRotate={false}
        enablePan
        enableZoom
        target={[dims.w / 2, dims.h * 0.5, dims.l * 0.2]}
      />
    </>
  );
}

export function BundleViewer3D({
  boards,
  selectedIds,
  onChangeSelection,
  className = "h-[560px] w-full rounded-xl overflow-hidden bg-mist border border-navy/10",
}: {
  boards: WoodBoard[];
  selectedIds: Set<number>;
  onChangeSelection: (ids: Set<number>) => void;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handlePick = useCallback(
    (id: number, mode: BoardPickMode) => {
      const next = new Set(selectedIds);
      if (mode === "add") next.add(id);
      else next.delete(id);
      onChangeSelection(next);
    },
    [selectedIds, onChangeSelection]
  );

  const handleBoxSelect = useCallback(
    (ids: number[]) => {
      const next = new Set(selectedIds);
      for (const id of ids) next.add(id);
      onChangeSelection(next);
    },
    [selectedIds, onChangeSelection]
  );

  if (!mounted) return <div className={className}>Đang tải mô hình 3D...</div>;

  return (
    <div className={className}>
      <Canvas
        shadows
        camera={{ fov: 42 }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("contextmenu", (e) => e.preventDefault());
        }}
      >
        <SceneContent
          boards={boards}
          selectedIds={selectedIds}
          onPick={handlePick}
          onBoxSelect={handleBoxSelect}
        />
      </Canvas>
    </div>
  );
}
