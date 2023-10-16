// WebcamTexture.js
import { useEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

function WebcamTexture(props) {
  const { setVideoTexture } = props;
  // const { scene } = useThree();
  const videoRef = useRef(null);
  // const [videoTexture, setVideoTexture] = useState(null);

  useEffect(() => {
    const initWebcam = async () => {
      const constraints = { video: true };
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        videoRef.current.srcObject = stream;
        videoRef.current.play();

        const texture = new THREE.VideoTexture(videoRef.current);
        setVideoTexture(texture);
      } catch (error) {
        console.error("Error accessing webcam: ", error);
      }
    };

    initWebcam();
  }, []);

  // useEffect(() => {
  //   if (videoTexture) {
  //     scene.children.forEach((child) => {
  //       if (child.isMesh) {
  //         child.material.map = videoTexture;
  //         child.material.needsUpdate = true;
  //       }
  //     });
  //   }
  // }, [videoTexture, scene]);

  return (
    <>
      <Html>
        <video ref={videoRef} autoPlay muted style={{ display: "none" }} />
      </Html>
    </>
  );
}

export default WebcamTexture;
