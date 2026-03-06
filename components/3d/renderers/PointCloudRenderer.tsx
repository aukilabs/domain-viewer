"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { plyAsyncParse } from "@/utils/ply-parser.web";
import { useAtomValue } from "jotai";
import { pointCloudDataAtom, alignmentMatrixAtom } from "@/store/domainStore";
import { pointCloudVisibleAtom } from "@/store/visualizationStore";

export default function PointCloudRenderer() {
  const visible = useAtomValue(pointCloudVisibleAtom);
  const pointCloudData = useAtomValue(pointCloudDataAtom);
  const alignmentMatrix = useAtomValue(alignmentMatrixAtom);
  const parseIdRef = useRef(0);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.09,
        vertexColors: true,
        sizeAttenuation: true,
        depthWrite: true,
        opacity: 1,
        transparent: true,
      }),
    [],
  );

  const alignmentMatrix4 = useMemo(() => {
    if (!alignmentMatrix) return null;
    return new THREE.Matrix4().fromArray(alignmentMatrix);
  }, [alignmentMatrix]);

  useEffect(() => {
    if (!pointCloudData) {
      setGeometry((prev) => {
        prev?.dispose();
        return null;
      });
      return;
    }

    const currentParseId = ++parseIdRef.current;

    plyAsyncParse(pointCloudData, true)
      .then((nextGeometry) => {
        if (parseIdRef.current !== currentParseId) {
          nextGeometry.dispose();
          return;
        }

        setGeometry((prev) => {
          prev?.dispose();
          return nextGeometry;
        });
      })
      .catch((err) => {
        if (parseIdRef.current === currentParseId) {
          console.error("[PointCloudRenderer] PLY parse failed:", err);
        }
      });

    return () => {
      parseIdRef.current++;
    };
  }, [pointCloudData]);

  useEffect(() => {
    return () => {
      material.dispose();
      setGeometry((prev) => {
        prev?.dispose();
        return null;
      });
    };
  }, [material]);

  if (!geometry || !visible) return null;

  return (
    <group matrixAutoUpdate={false} matrix={alignmentMatrix4 ?? undefined}>
      <points geometry={geometry} material={material} matrixAutoUpdate={false} />
    </group>
  );
}
