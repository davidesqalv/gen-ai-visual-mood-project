// GLSLBackground.js
import * as THREE from "three";
import { useMemo, useEffect, useRef, useState } from "react";
import { extend, useThree, useFrame } from "@react-three/fiber";

extend({ ShaderMaterial: THREE.ShaderMaterial });

export default function GLSLBackground(props) {
  const { shaderData, onCompileError } = props;
  const [vertexShaderCode, setVertexShaderCode] = useState(`varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`);
  const [fragmentShaderCode, setFragmentShaderCode] = useState(
    `uniform float time;\nvarying vec2 vUv;\nvoid main(void) {\nvec2 position = -1.0 + 2.0 * vUv;\nvec2 adjustedPos = vec2(position.x/position.y, 1.0);\nfloat angle = atan(adjustedPos.x, adjustedPos.y)/3.14;\nfloat dist = length(adjustedPos);\nfloat zebra = step(0.02, mod(dist*12.0-angle+time*0.3, 0.08));\nvec3 color = mix(vec3(0.9, 0.6, 0.2), vec3(0.1,0.3,0.4), zebra);\ngl_FragColor = vec4(color,1.0);\n}`
  );

  const [colors, setColors] = useState(["#ffffff", "#ff0000", "#ff0000"]);

  const { scene, gl } = useThree();
  // The shader that was on screen before the latest one, to go back to if the new one doesn't compile
  const lastShader = useRef(null);
  // three.js can compile a new shader before React re-runs the effects below,
  // so the error handler reads these refs instead of state from its closure
  const currentFragment = useRef(fragmentShaderCode);
  const onCompileErrorRef = useRef(onCompileError);

  useEffect(() => {
    onCompileErrorRef.current = onCompileError;
  }, [onCompileError]);  const material = useMemo(() => {
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
      lastShader.current = { vertexShaderCode, fragmentShaderCode, colors };
      currentFragment.current = shaderData.fragmentShader;
      console.log("the material is something so here i am changing it");
      console.log(shaderData);
      setVertexShaderCode(shaderData.vertexShader);
      setFragmentShaderCode(shaderData.fragmentShader);
      setColors(shaderData.colors);
    }
    // only when a new shader comes in, not every time the material is rebuilt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shaderData]);

  // three.js compiles the shader the first time it draws it. If that fails, go
  // back to the last shader that worked and pass the compiler error up so the
  // checker can fix it.
  useEffect(() => {
    gl.debug.onShaderError = (glContext, program, glVertexShader, glFragmentShader) => {
      const source = glContext.getShaderSource(glFragmentShader) || "";
      if (!source.includes(currentFragment.current) || !lastShader.current) {
        console.error("Shader error:", glContext.getShaderInfoLog(glFragmentShader));
        return;
      }

      const error = [describeErrors(glContext, glVertexShader), describeErrors(glContext, glFragmentShader)]
        .filter(Boolean)
        .join("\n");
      console.log(`shader didn't compile, going back to the last one\n${error}`);

      const last = lastShader.current;
      lastShader.current = null;
      currentFragment.current = last.fragmentShaderCode;
      setVertexShaderCode(last.vertexShaderCode);
      setFragmentShaderCode(last.fragmentShaderCode);
      setColors(last.colors);
      onCompileErrorRef.current?.(error);
    };
    return () => {
      gl.debug.onShaderError = null;
    };
  }, [gl]);

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

// The compiler log, with the offending line under each error. The line numbers
// count three.js's own prefix too, so the line itself is what helps the model.
function describeErrors(glContext, shader) {
  const log = (glContext.getShaderInfoLog(shader) || "").trim();
  if (!log) return "";
  const lines = (glContext.getShaderSource(shader) || "").split("\n");
  return log
    .split("\n")
    .map((entry) => {
      const match = entry.match(/ERROR: \d+:(\d+):/);
      const line = match && lines[Number(match[1]) - 1];
      return line ? `${entry}\n  on line: ${line.trim()}` : entry;
    })
    .join("\n");
}
