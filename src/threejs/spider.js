// SpiderModel.js
import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";

const Model = ({ modelPath }) => {
  // const gltf = useGLTF("lego1.gltf", true);
  const gltf = useGLTF(modelPath, true);
  // return <primitive object={gltf.scene} dispose={null} />;
  return <primitive object={gltf.scene} dispose={null} />;
};
const Lights = () => {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight position={[0, 10, 0]} intensity={1.5} />
      <spotLight intensity={1} position={[1000, 0, 0]} />
    </>
  );
};

function SpiderModel() {
  const group = useRef();
  const spiderRef = useRef();
  //   const { nodes } = useGLTF("/spoderman.glb");

  useFrame(() => {
    // This will rotate your model by 0.01 radians on every frame
    // group.current.rotation.y += 0.01;
    // spiderRef.current.rotation.y += 0.01;
  });

  return (
    <group>
      {/* <mesh
        geometry={nodes.spider.geometry}
        material={nodes.spider.material}
      ></mesh> */}
      <mesh ref={spiderRef} position={[0, -10, 0]}>
        <Model modelPath={"/spoderman.glb"} />
      </mesh>
      <Lights />
    </group>
  );
}

export default SpiderModel;
