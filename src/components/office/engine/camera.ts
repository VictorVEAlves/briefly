export type CameraState = {
  zoom: number;
  offsetX: number;
  offsetY: number;
  minZoom: number;
  maxZoom: number;
  hasManualControl: boolean;
};

export const CAMERA_ZOOMS = [1, 2, 3] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getFitZoom(viewportWidth: number, viewportHeight: number, worldWidth: number, worldHeight: number) {
  return CAMERA_ZOOMS.find((zoom) => worldWidth * zoom <= viewportWidth && worldHeight * zoom <= viewportHeight) ?? 1;
}

export function createInitialCamera(
  viewportWidth: number,
  viewportHeight: number,
  worldWidth: number,
  worldHeight: number,
  compact: boolean
): CameraState {
  const preferredZoom = compact ? getFitZoom(viewportWidth, viewportHeight, worldWidth, worldHeight) : getFitZoom(viewportWidth, viewportHeight, worldWidth, worldHeight) >= 3 ? 3 : 2;
  const zoom = clamp(preferredZoom, 1, 3);

  return clampCamera(
    {
      zoom,
      offsetX: Math.floor((viewportWidth - worldWidth * zoom) / 2),
      offsetY: Math.floor((viewportHeight - worldHeight * zoom) / 2),
      minZoom: 1,
      maxZoom: 3,
      hasManualControl: false,
    },
    viewportWidth,
    viewportHeight,
    worldWidth,
    worldHeight
  );
}

export function clampCamera(
  camera: CameraState,
  viewportWidth: number,
  viewportHeight: number,
  worldWidth: number,
  worldHeight: number
) {
  const scaledWidth = worldWidth * camera.zoom;
  const scaledHeight = worldHeight * camera.zoom;

  const minOffsetX = Math.min(0, viewportWidth - scaledWidth);
  const minOffsetY = Math.min(0, viewportHeight - scaledHeight);
  const offsetX =
    scaledWidth <= viewportWidth
      ? Math.floor((viewportWidth - scaledWidth) / 2)
      : clamp(Math.floor(camera.offsetX), minOffsetX, 0);
  const offsetY =
    scaledHeight <= viewportHeight
      ? Math.floor((viewportHeight - scaledHeight) / 2)
      : clamp(Math.floor(camera.offsetY), minOffsetY, 0);

  return { ...camera, offsetX, offsetY };
}

export function zoomCamera(
  camera: CameraState,
  nextZoom: number,
  focusX: number,
  focusY: number,
  viewportWidth: number,
  viewportHeight: number,
  worldWidth: number,
  worldHeight: number
) {
  const zoom = clamp(nextZoom, camera.minZoom, camera.maxZoom);
  if (zoom === camera.zoom) return camera;

  const worldX = (focusX - camera.offsetX) / camera.zoom;
  const worldY = (focusY - camera.offsetY) / camera.zoom;

  const nextCamera = {
    ...camera,
    zoom,
    offsetX: Math.floor(focusX - worldX * zoom),
    offsetY: Math.floor(focusY - worldY * zoom),
    hasManualControl: true,
  };

  return clampCamera(nextCamera, viewportWidth, viewportHeight, worldWidth, worldHeight);
}

export function centerCameraOnPoint(
  camera: CameraState,
  worldX: number,
  worldY: number,
  viewportWidth: number,
  viewportHeight: number,
  worldWidth: number,
  worldHeight: number
) {
  return clampCamera(
    {
      ...camera,
      offsetX: Math.floor(viewportWidth / 2 - worldX * camera.zoom),
      offsetY: Math.floor(viewportHeight / 2 - worldY * camera.zoom),
    },
    viewportWidth,
    viewportHeight,
    worldWidth,
    worldHeight
  );
}

export function screenToWorld(camera: CameraState, x: number, y: number) {
  return {
    x: Math.floor((x - camera.offsetX) / camera.zoom),
    y: Math.floor((y - camera.offsetY) / camera.zoom),
  };
}

export function worldToScreen(camera: CameraState, x: number, y: number) {
  return {
    x: Math.floor(camera.offsetX + x * camera.zoom),
    y: Math.floor(camera.offsetY + y * camera.zoom),
  };
}
