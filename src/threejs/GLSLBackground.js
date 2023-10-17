// GLSLBackground.js
import * as THREE from "three";
import { useMemo, useEffect, useState } from "react";
import { extend, useThree, useFrame } from "@react-three/fiber";

extend({ ShaderMaterial: THREE.ShaderMaterial });

export default function GLSLBackground(props) {
  const { shaderData } = props;
  const [vertexShaderCode, setVertexShaderCode] = useState(`varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`);
  const [fragmentShaderCode, setFragmentShaderCode] = useState(
    `uniform float time;\nvarying vec2 vUv;\nvoid main(void) {\nvec2 position = -1.0 + 2.0 * vUv;\nvec2 adjustedPos = vec2(position.x/position.y, 1.0);\nfloat angle = atan(adjustedPos.x, adjustedPos.y)/3.14;\nfloat dist = length(adjustedPos);\nfloat zebra = step(0.02, mod(dist*12.0-angle+time*0.3, 0.08));\nvec3 color = mix(vec3(0.9, 0.6, 0.2), vec3(0.1,0.3,0.4), zebra);\ngl_FragColor = vec4(color,1.0);\n}`
  );

  const [colors, setColors] = useState(["#ffffff", "#ff0000", "#ff0000"]);

  const { scene } = useThree();
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        resolution: { value: [window.innerWidth, window.innerHeight] },
        color1: { value: new THREE.Color(colors[0]) },
        color2: { value: new THREE.Color(colors[1]) },
        color3: { value: new THREE.Color(colors[2]) },
        time: { value: 0.0 },
      },
      vertexShader: vertexShaderCode,
      fragmentShader: fragmentShaderCode,
    });
  }, [vertexShaderCode, fragmentShaderCode, colors]);

  useFrame(({ clock }) => {
    material.uniforms.time.value = clock.getElapsedTime();
    scene.background = material;
  });

  useEffect(() => {
    if (shaderData) {
      let lastVertexShaderCode = vertexShaderCode;
      let lastFragmentShaderCode = fragmentShaderCode;
      let lastColors = colors;

      try {
        console.log("the material is something so here i am changing it");
        console.log(shaderData);
        setVertexShaderCode(shaderData.vertexShader);
        setFragmentShaderCode(shaderData.fragmentShader);
        setColors(shaderData.colors);

        material.needsUpdate = true;
      } catch (error) {
        setVertexShaderCode(lastVertexShaderCode);
        setFragmentShaderCode(lastFragmentShaderCode);
        setColors(lastColors);
        material.needsUpdate = true;
      }
    }
  }, [shaderData, material]);

  useEffect(() => {
    console.log(
      `window dimensions: ${window.innerWidth} x ${window.innerHeight}`
    );
  }, []);

  return (
    <>
      <mesh>
        <planeGeometry args={[20, 20]} />
        <shaderMaterial attach="material" args={[material]} />
      </mesh>
    </>
  );
}
