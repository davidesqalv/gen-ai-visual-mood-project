from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import openai
import tiktoken
from dotenv import find_dotenv, load_dotenv
from os import environ as env
import json

# Loading env variables
ENV_FILE = find_dotenv()
if ENV_FILE:
    load_dotenv(ENV_FILE)

openai.api_key = env.get("OPENAI_API_KEY")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        # AND your production domain
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/")
async def read_root():
    return {"Hello": "World"}


@app.post("/gen-shader")
async def gen_shader(request: Request):

    SYSTEM_MESSAGE = '''You are an assistant that based on a series of inputs, will give out a structured JSON object with the data needed to build a GLSL shader background. It will contain the following: the vertex shader, the fragment shader, and the three main colors in the background in hex format. The user will describe what mood they're in, or will ask for what background they want, and you will do your best job at converting that into the shader that best fits it. Only output the JSON object, don't say anything. Make sure the shader has many complicated moving things and is flashy but sophisticated and aesthetic. Also, include a uniform float "time" for the moving components. Always create a different combination of patterns and shapes, something that looks like it came out of shadertoy, with patterns like spirals, zebra lines, etc. Important: the pattern has to be descriptive and go with the flow with sentence is given by the user. Also include the declaration of functions such as random(), noise(), etc. in case they are needed. Do not declare again functions that already exist such as sin() or dot(). Never use a function or variable or constant that is not defined. All code needs to be written, nothing can be added later. Make sure it is a complex pattern, not just some gradient over time. The colors have to follow a pleasing color palette, no over-saturated values. The fragment shader must only contain the following uniforms and use them: float time, vec3 color1, vec3 color2, vec3 color3, vec2 resolution. Vec2 resolution is a uniform and must be declared. Make sure to define the value of all constants. Example:user:"I am not feeling well".you:"{
  "vertexShader": "varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }",
  "fragmentShader": "uniform vec2 resolution;
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        uniform vec3 color3;
        varying vec2 vUv;
        void main() {
          float factor = sin(time) * 0.5 + 0.5;
          vec3 color = mix(color1, color2, factor);
          gl_FragColor = vec4(color, 1.0);
        }",
  "colors": ["#ff0066", "#33ccff", "#00ffcc"]
}"'''

    try:
        data = await request.json()
        sentence = data.get("sentence")

        if not sentence:
            raise HTTPException(status_code=400, detail="Input string is required")

        # Making request to OpenAI GPT-4 API for chat completion
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": SYSTEM_MESSAGE},
                {"role": "user", "content": sentence},
            ],
        )
        shader = response["choices"][0]["message"]["content"]

        # print(f"Generated shader: {shader}")

        shader = json.loads(shader, strict=False)
        # print(f'shader to json: {shader}')

        fragShader = shader["fragmentShader"]

        checkResponse = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": "The following is a fragment shader. Your job is to check it is valid, and that all functions, constants, and variables are defined. Functions such as 'fmb()', 'noise2D()', 'random()', etc. all have to be fully and completely declared within the code, always before they are used. If the function is referenced before declared, change the order accordingly. If there is any function that is used but not declared, add the function definition so it can work. Make sure the assignments, and operation such as sum and subtraction with vectors always match their dimensions, so there won't be any dimension mismatch errors. The fragment shader must only contain the following uniforms and use them: float time, vec3 color1, vec3 color2, vec3 color3, and resolution. Are all functions declared? Output the corrected shader code without doing any additional comments or saying anything else. It will be run on three.js, so make sure it is compatible with that. Output strictly only code, do not make any comments, even if the code has no issues. Do not make any comments before or after the code, it is important.",
                },
                {"role": "user", "content": fragShader},
            ],
        )

        newFragShader = checkResponse["choices"][0]["message"]["content"]

        # print(f"Generated shader: {newFragShader}")

        shader["fragmentShader"] = newFragShader

        return JSONResponse(content=shader)

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
