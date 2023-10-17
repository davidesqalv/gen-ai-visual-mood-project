"use client";

import { Canvas } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useState } from "react";
import GLSLBackground from "../threejs/GLSLBackground";
import RotatingSphere from "../threejs/RotatingSphere";
import WebcamTexture from "../threejs/WebcamTexture";
import { useFrame } from "@react-three/fiber";
import dynamic from "next/dynamic";

import "../threejs/RoundedInput.scss";

const API_URL = process.env.API_URL;

// const RotatingSphere = dynamic(() => import("../threejs/RotatingSphere"), {
//   loading: () => (
//     <Html>
//       <p>Dynamically loading rotating sphere...</p>
//     </Html>
//   ),
// });

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
  const [shaderData, setShaderData] = useState(null);
  const [loadingResponse, setLoadingResponse] = useState(false);

  function getGPTShader(inputText) {
    // make a post request to the server with the input from the user
    // the server will return the shader
    setLoadingResponse(true);
    fetch(`${API_URL}/gen-shader`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sentence: inputText }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("this is the JSON");
        console.log(Object.keys(data));
        setShaderData(data);
        setLoadingResponse(false);
      });
  }

  return (
    <>
      <div style={{ zIndex: "1000" }}>
        <div style={{ width: "10rem", color: "white" }}>
          hello, how are you feeling today?
        </div>
        {loadingResponse && <div style={{ color: "white" }}>loading...</div>}
        {!loadingResponse && (
          <RoundedInput
            onButtonClick={(inputValue) => getGPTShader(inputValue)}
          />
        )}
      </div>
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
        <GLSLBackground attach="material" shaderData={shaderData} />
      </Canvas>
    </>
  );
}

//instance a new sphere with a stable diffusion generated image
//have chatgpt decide what music you want and get it from the youtube api
//have chatgpt decide the shader with a text input
//ask how are you feeling and have it generate a shader based on that, also use faceapi as input
