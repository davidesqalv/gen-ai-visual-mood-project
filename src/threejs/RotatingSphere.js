// RotatingSphere.js
import * as THREE from "three";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { extend, useThree } from "@react-three/fiber";

// import { Glitch } from "@react-three/postprocessing";

class GrayscaleShaderMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        tDiffuse: { value: null },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        varying vec2 vUv;
        void main() {
          vec4 color = texture2D(tDiffuse, vUv);
          float grayValue = dot(color.rgb, vec3(0.299, 0.587, 0.114));
          gl_FragColor = vec4(vec3(grayValue), 1.0);
        }
      `,
    });
  }
}

extend({ GrayscaleShaderMaterial });

export default function RotatingSphere(props) {
  const { videoTexture } = props;
  const meshRef = useRef();

  useFrame(() => {
    // meshRef.current.rotation.x += 0.01;
    meshRef.current.rotation.y += 0.01;
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 32, 32]} />
      <grayscaleShaderMaterial
        attach="material"
        uniforms-tDiffuse-value={videoTexture}
      />
      {/* <meshBasicMaterial map={videoTexture} /> */}
    </mesh>
  );
}
