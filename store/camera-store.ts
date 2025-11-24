export interface CameraPose {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  zoom: number;
  target?: [number, number, number];
}

import { atom } from "jotai";

export const cameraPoseAtom = atom<CameraPose | null>(null);


