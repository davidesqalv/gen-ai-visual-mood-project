// RotatingSphere.js
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

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
      <meshBasicMaterial map={videoTexture} />
    </mesh>
  );
}
