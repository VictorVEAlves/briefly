'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  centerCameraOnPoint,
  clampCamera,
  createInitialCamera,
  screenToWorld,
  zoomCamera,
  type CameraState,
} from '../engine/camera';
import {
  getEntityFocusPoint,
  getInteractiveEntityAt,
  OFFICE_WORLD,
} from '../layout/officeLayout';
import type { OfficeEntityId } from '../agents/agentConfig';

type TooltipState = {
  id: OfficeEntityId;
  x: number;
  y: number;
} | null;

type UseOfficeInteractionArgs = {
  viewportWidth: number;
  viewportHeight: number;
  isCompact: boolean;
  onSelect?: (id: OfficeEntityId) => void;
};

type PointerState = {
  active: boolean;
  lastX: number;
  lastY: number;
  moved: boolean;
};

export function useOfficeInteraction({
  viewportWidth,
  viewportHeight,
  isCompact,
  onSelect,
}: UseOfficeInteractionArgs) {
  const [camera, setCamera] = useState<CameraState>(() =>
    createInitialCamera(1200, 720, OFFICE_WORLD.width, OFFICE_WORLD.height, false)
  );
  const [hoveredId, setHoveredId] = useState<OfficeEntityId | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const pointerRef = useRef<PointerState>({
    active: false,
    lastX: 0,
    lastY: 0,
    moved: false,
  });

  const preferredZoom = useMemo(() => {
    if (isCompact) return 2;
    return viewportWidth >= 1360 ? 3 : 2;
  }, [isCompact, viewportWidth]);

  useEffect(() => {
    if (!viewportWidth || !viewportHeight) return;

    setCamera((current) => {
      if (isCompact) {
        return createInitialCamera(
          viewportWidth,
          viewportHeight,
          OFFICE_WORLD.width,
          OFFICE_WORLD.height,
          true
        );
      }

      return clampCamera(
        {
          ...current,
          zoom: current.zoom || preferredZoom,
        },
        viewportWidth,
        viewportHeight,
        OFFICE_WORLD.width,
        OFFICE_WORLD.height
      );
    });
  }, [isCompact, preferredZoom, viewportHeight, viewportWidth]);

  const resolveHoveredEntity = useCallback(
    (screenX: number, screenY: number) => {
      const world = screenToWorld(camera, screenX, screenY);
      const entityId = getInteractiveEntityAt(world.x, world.y);
      setHoveredId(entityId);
      setTooltip(
        entityId
          ? {
              id: entityId,
              x: screenX,
              y: screenY,
            }
          : null
      );
      return entityId;
    },
    [camera]
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      pointerRef.current = {
        active: !isCompact,
        lastX: event.clientX,
        lastY: event.clientY,
        moved: false,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      resolveHoveredEntity(event.nativeEvent.offsetX, event.nativeEvent.offsetY);
    },
    [isCompact, resolveHoveredEntity]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const pointer = pointerRef.current;
      const screenX = event.nativeEvent.offsetX;
      const screenY = event.nativeEvent.offsetY;

      if (pointer.active) {
        const dx = event.clientX - pointer.lastX;
        const dy = event.clientY - pointer.lastY;
        pointer.lastX = event.clientX;
        pointer.lastY = event.clientY;

        if (Math.abs(dx) + Math.abs(dy) > 2) {
          pointer.moved = true;
        }

        setCamera((current) =>
          clampCamera(
            {
              ...current,
              offsetX: current.offsetX + dx,
              offsetY: current.offsetY + dy,
            },
            viewportWidth,
            viewportHeight,
            OFFICE_WORLD.width,
            OFFICE_WORLD.height
          )
        );
        setHoveredId(null);
        setTooltip(null);
        return;
      }

      resolveHoveredEntity(screenX, screenY);
    },
    [resolveHoveredEntity, viewportHeight, viewportWidth]
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const pointer = pointerRef.current;
      const entityId = resolveHoveredEntity(
        event.nativeEvent.offsetX,
        event.nativeEvent.offsetY
      );

      if (!pointer.moved && entityId && onSelect) {
        onSelect(entityId);
      }

      pointerRef.current = {
        active: false,
        lastX: 0,
        lastY: 0,
        moved: false,
      };
      event.currentTarget.releasePointerCapture(event.pointerId);
    },
    [onSelect, resolveHoveredEntity]
  );

  const handlePointerLeave = useCallback(() => {
    if (!pointerRef.current.active) {
      setHoveredId(null);
      setTooltip(null);
    }
  }, []);

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLCanvasElement>) => {
      if (isCompact) return;
      event.preventDefault();
      const direction = event.deltaY < 0 ? 1 : -1;
      const screenX = event.nativeEvent.offsetX;
      const screenY = event.nativeEvent.offsetY;

      setCamera((current) =>
        zoomCamera(
          current,
          current.zoom + direction,
          screenX,
          screenY,
          viewportWidth,
          viewportHeight,
          OFFICE_WORLD.width,
          OFFICE_WORLD.height
        )
      );
    },
    [isCompact, viewportHeight, viewportWidth]
  );

  const focusEntity = useCallback(
    (entityId: OfficeEntityId) => {
      const point = getEntityFocusPoint(entityId);
      if (!point) return;
      setCamera((current) =>
        centerCameraOnPoint(
          current,
          point.x,
          point.y,
          viewportWidth,
          viewportHeight,
          OFFICE_WORLD.width,
          OFFICE_WORLD.height
        )
      );
    },
    [viewportHeight, viewportWidth]
  );

  return {
    camera,
    hoveredId,
    tooltip,
    focusEntity,
    setCamera,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
    handleWheel,
  };
}
