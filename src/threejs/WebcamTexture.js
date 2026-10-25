// WebcamTexture.js
import { useEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

function WebcamTexture(props) {
  const { setVideoTexture } = props;
  // const { scene } = useThree();
  const videoRef = useRef(null);
  // const [videoTexture, setVideoTexture] = useState(null);

  useEffect(() => {
    // The video element lives outside the React tree (drei's <Html> wrapper
    // gets unmounted mid-render on React 19)
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    videoRef.current = video;
    let stream = null;
    let stopped = false;

    const initWebcam = async () => {
      const constraints = { video: true };
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (stopped) return stream.getTracks().forEach((track) => track.stop());
        video.srcObject = stream;
        await video.play();

        const texture = new THREE.VideoTexture(video);
        setVideoTexture(texture);
      } catch (error) {
        console.error("Error accessing webcam: ", error);
      }
    };

    initWebcam();

    return () => {
      stopped = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [setVideoTexture]);

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

  return null;
}

export default WebcamTexture;
