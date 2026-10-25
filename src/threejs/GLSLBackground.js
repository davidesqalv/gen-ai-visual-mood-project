// GLSLBackground.js
import * as THREE from "three";
import { useMemo, useEffect, useRef, useState } from "react";
import { extend, useThree, useFrame } from "@react-three/fiber";

extend({ ShaderMaterial: THREE.ShaderMaterial });

// What's on screen before the first answer: slow smoke folding into itself
// (noise warped by more noise), with thin glowing seams where it folds
const DEFAULT_FRAGMENT_SHADER = `uniform float time;
uniform vec2 resolution;
uniform vec3 color1;
uniform vec3 color2;
uniform vec3 color3;
varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 turn = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p = turn * p * 2.0 + 17.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 p = (vUv - 0.5) * 6.0;
  float t = time * 0.06;

  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3 - t)));
  vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + t * 1.5),
                fbm(p + 3.0 * q + vec2(8.3, 2.8) - t));
  float smoke = fbm(p + 3.0 * r);

  vec3 color = mix(color1, color3, smoothstep(0.2, 0.8, smoke));
  float seam = pow(1.0 - abs(r.x - 0.5) * 2.0, 12.0);
  color += color2 * seam * smoothstep(0.3, 0.8, smoke);
  color *= 0.85 + 0.15 * sin(time * 0.5);
  color *= smoothstep(1.6, 0.2, length(vUv - 0.5) * 2.6);

  gl_FragColor = vec4(color, 1.0);
}`;

export default function GLSLBackground(props) {
  const { shaderData, onCompileError } = props;
  const [vertexShaderCode, setVertexShaderCode] = useState(`varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`);
  const [fragmentShaderCode, setFragmentShaderCode] = useState(DEFAULT_FRAGMENT_SHADER);

  // night, pumpkin glow, purple smoke (three.js makes hex colors darker
  // and more saturated, so these are picked a bit light)
  const [colors, setColors] = useState(["#1a0f2e", "#ffa040", "#7b4bb8"]);

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
