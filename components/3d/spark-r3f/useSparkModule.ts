import { useEffect, useState } from "react";
import type {
  SparkRenderer,
  SplatMesh,
  SplatFileType,
} from "@sparkjsdev/spark";

type SparkModule = {
  SparkRenderer: typeof SparkRenderer;
  SplatMesh: typeof SplatMesh;
  SplatFileType: typeof SplatFileType;
};

let sparkModulePromise: Promise<SparkModule> | null = null;

function loadSparkModule(): Promise<SparkModule> {
  if (!sparkModulePromise) {
    sparkModulePromise = import(
      /* @vite-ignore */ "@sparkjsdev/spark"
    ) as Promise<SparkModule>;
  }
  return sparkModulePromise;
}

export function useSparkModule() {
  const [sparkModule, setSparkModule] = useState<SparkModule | null>(null);

  useEffect(() => {
    let mounted = true;
    if (typeof window === "undefined") {
      return () => {
        mounted = false;
      };
    }

    void loadSparkModule()
      .then((module) => {
        if (mounted) setSparkModule(module);
      })
      .catch((error) => {
        console.error(`[useSparkModule] failed to load Spark module`, error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return sparkModule;
}
