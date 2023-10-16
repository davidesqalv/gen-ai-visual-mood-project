// GLSLBackground.js
import * as THREE from "three";
import { useMemo } from "react";
import { extend, useThree, useFrame } from "@react-three/fiber";

extend({ ShaderMaterial: THREE.ShaderMaterial });

export default function GLSLBackground() {
  const { scene } = useThree();
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        resolution: { value: [window.innerWidth, window.innerHeight] },
        color1: { value: new THREE.Color(0xfcba03) },
        color2: { value: new THREE.Color(0xff0000) },
        time: { value: 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec2 resolution;
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        varying vec2 vUv;
        void main() {
          float factor = sin(time) * 0.5 + 0.5;
          vec3 color = mix(color1, color2, factor);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
  }, []);

  useFrame(({ clock }) => {
    material.uniforms.time.value = clock.getElapsedTime();
    scene.background = material;
  });

  return (
    <>
      <mesh>
        <planeGeometry args={[20, 20]} />
        <shaderMaterial attach="material" args={[material]} />
      </mesh>
    </>
  );
}
