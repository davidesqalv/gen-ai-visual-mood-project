"use client";

import { Canvas } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useRef, useState } from "react";
import GLSLBackground from "../threejs/GLSLBackground";
import RotatingSphere from "../threejs/RotatingSphere";
import WebcamTexture from "../threejs/WebcamTexture";
import { useFrame } from "@react-three/fiber";
import dynamic from "next/dynamic";

import LoadingMessage from "./loading-message";
import "../threejs/RoundedInput.scss";
import SpiderModel from "@/threejs/spider";

const API_URL = process.env.API_URL;

// How many times to send a shader back with its compiler error before giving up
const MAX_FIXES = 2;

// The backend streams progress as one JSON object per line ({"stage": ...}),
// then {"shader": ...} at the end, or {"error": ...} if something broke
async function streamShader(url, body, onProgress) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || `request failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line);
      if (event.error) throw new Error(event.error);
      if (event.shader) return event.shader;
      onProgress(event);
    }
  }
  throw new Error("the connection closed before the shader arrived");
}

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

  const handleKeyDown = (event) => {
    if (event.key === "Enter") handleButtonClick();
  };

  return (
    <div className="rounded-input-container">
      <input
        type="text"
        placeholder="Enter text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className="rounded-input"
      />
      <button onClick={handleButtonClick} className="icon-button">
        <i className="fa fa-arrow-right"></i>
      </button>
    </div>
  );
}

export default function HomePage() {
  const [videoTexture, setVideoTexture] = useState(null);
  const [shaderData, setShaderData] = useState(null);
  const [loadingResponse, setLoadingResponse] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [progress, setProgress] = useState({ stage: "sending" });
  const fixAttempts = useRef(0);
  const lastSentence = useRef("");

  function getGPTShader(inputText) {
    // make a post request to the server with the input from the user
    // the server will return the shader
    setLoadingResponse(true);
    setErrorMessage(null);
    fixAttempts.current = 0;
    lastSentence.current = inputText;
    setProgress({ stage: "sending" });
    streamShader(`${API_URL}/gen-shader`, { sentence: inputText }, setProgress)
      .then((data) => {
        console.log("this is the JSON");
        console.log(Object.keys(data));
        setShaderData(data);
        setLoadingResponse(false);
      })
      .catch((error) => {
        setErrorMessage(error.message);
        setLoadingResponse(false);
      });
  }

  // GLSLBackground already went back to the last shader that worked, so send
  // this one back to the model with the compiler error and the original prompt
  function fixShader(compileError) {
    if (fixAttempts.current >= MAX_FIXES) {
      setErrorMessage("couldn't get that shader to compile, try again");
      return;
    }
    fixAttempts.current += 1;
    setLoadingResponse(true);
    // the name in quotes in the compiler error, like 'noise'
    const culprit = compileError.match(/'(\w+)'/)?.[1];
    setProgress({ stage: "fixing", culprit });
    streamShader(
      `${API_URL}/fix-shader`,
      {
        sentence: lastSentence.current,
        shader: shaderData,
        error: compileError,
      },
      // keep the fixing messages up until Claude starts rewriting
      (event) =>
        setProgress(event.stage === "writing" ? event : { stage: "fixing", culprit })
    )
      .then((data) => {
        setShaderData(data);
        setLoadingResponse(false);
      })
      .catch((error) => {
        setErrorMessage(error.message);
        setLoadingResponse(false);
      });
  }

  return (
    <>
      <div style={{ zIndex: "1000" }}>
        <div style={{ width: "10rem", color: "white" }}>
          are you feeling spooky?
        </div>
        {loadingResponse && <LoadingMessage progress={progress} />}
        {errorMessage && <div style={{ color: "white" }}>{errorMessage}</div>}

        <RoundedInput
          onButtonClick={(inputValue) => getGPTShader(inputValue)}
        />
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
        {/* <SpiderModel /> */}
        <WebcamTexture setVideoTexture={setVideoTexture} />
        {videoTexture && <RotatingSphere videoTexture={videoTexture} />}
        <GLSLBackground
          attach="material"
          shaderData={shaderData}
          onCompileError={fixShader}
        />
      </Canvas>
      {/* <Canvas
        style={{
          position: "absolute",
          top: "0",
          left: "0",
          width: "100vw",
          height: "100vh",
        }}
        camera={{ position: [0, 0, 120], fov: 70, zoom: state.zoom }}
      ></Canvas> */}
    </>
  );
}

//instance a new sphere with a stable diffusion generated image
//have chatgpt decide what music you want and get it from the youtube api
//have chatgpt decide the shader with a text input
//ask how are you feeling and have it generate a shader based on that, also use faceapi as input
