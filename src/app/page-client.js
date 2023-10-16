"use client";

import { Canvas } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useState } from "react";
import GLSLBackground from "../threejs/GLSLBackground";
import RotatingSphere from "../threejs/RotatingSphere";
import WebcamTexture from "../threejs/WebcamTexture";
import { useFrame } from "@react-three/fiber";

import "../threejs/RoundedInput.scss";

function RoundedInput({ onButtonClick }) {
  const [inputValue, setInputValue] = useState("");

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const handleButtonClick = () => {
    onButtonClick(inputValue);
  };

  return (
    <div className="rounded-input-container">
      <input
        type="text"
        placeholder="Enter text"
        value={inputValue}
        onChange={handleInputChange}
        className="rounded-input"
      />
      <button onClick={handleButtonClick} className="icon-button">
        <i className="fas fa-arrow-right"></i>
      </button>
    </div>
  );
}

export default function HomePage() {
  const [videoTexture, setVideoTexture] = useState(null);

  return (
    <Canvas
      style={{
        position: "absolute",
        top: "0",
        left: "0",
        width: "100vw",
        height: "100vh",
      }}
    >
      <WebcamTexture setVideoTexture={setVideoTexture} />
      {videoTexture && <RotatingSphere videoTexture={videoTexture} />}
      <GLSLBackground attach="material" />
      <Html>
        <div style={{ width: "10rem" }}>hello, how are you feeling today?</div>
        <RoundedInput onButtonClick={(inputValue) => console.log(inputValue)} />
      </Html>
    </Canvas>
  );
}

//instance a new sphere with a stable diffusion generated image
//have chatgpt decide what music you want and get it from the youtube api
//have chatgpt decide the shader with a text input
//ask how are you feeling and have it generate a shader based on that, also use faceapi as input
