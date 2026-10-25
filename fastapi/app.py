from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import openai
from openai import AsyncOpenAI
import tiktoken
from dotenv import find_dotenv, load_dotenv
from os import environ as env
import json

# Loading env variables
ENV_FILE = find_dotenv()
if ENV_FILE:
    load_dotenv(ENV_FILE)

client = AsyncOpenAI(api_key=env.get("OPENAI_API_KEY"))

# Models the frontend can pick from (same list as MODELS in page-client.js)
MODELS = ["gpt-6.1-sol", "gpt-6-luna", "gpt-5.6-terra"]

# Structured outputs: the model has to answer with exactly these fields,
# so the JSON always parses and there's no chatter around the code
SHADER_SCHEMA = {
    "type": "object",
    "properties": {
        "vertexShader": {"type": "string"},
        "fragmentShader": {"type": "string"},
        "colors": {
            "type": "array",
            "items": {"type": "string"},
            "description": "the three main colors in hex format, like #ff0066",
        },
    },
    "required": ["vertexShader", "fragmentShader", "colors"],
    "additionalProperties": False,
}

FRAGMENT_SCHEMA = {
    "type": "object",
    "properties": {"fragmentShader": {"type": "string"}},
    "required": ["fragmentShader"],
    "additionalProperties": False,
}

CHECK_MESSAGE = "The following is a fragment shader. Your job is to check it is valid, and that all functions, constants, and variables are defined. Functions such as 'fmb()', 'noise2D()', 'random()', etc. all have to be fully and completely declared within the code, always before they are used. If the function is referenced before declared, change the order accordingly. If there is any function that is used but not declared, add the function definition so it can work. Make sure the assignments, and operation such as sum and subtraction with vectors always match their dimensions, so there won't be any dimension mismatch errors. The fragment shader must only contain the following uniforms and use them: float time, vec3 color1, vec3 color2, vec3 color3, and resolution. Are all functions declared? Output the corrected shader code without doing any additional comments or saying anything else. It will be run on three.js, so make sure it is compatible with that. Output strictly only code, do not make any comments, even if the code has no issues. Do not make any comments before or after the code, it is important."

THREEJS_NOTE = " It runs in a three.js ShaderMaterial on WebGL2 (GLSL ES 3.00 rules), so don't write #version lines, use float literals with a decimal point (1.0, not 1), and don't redeclare what three.js already provides (projectionMatrix, modelViewMatrix, position, uv)."


async def ask(model, instructions, text, schema):
    response = await client.responses.create(
        model=model,
        instructions=instructions,
        input=text,
        text={
            "format": {
                "type": "json_schema",
                "name": "shader",
                "schema": schema,
                "strict": True,
            }
        },
    )
    if response.status == "incomplete":
        raise HTTPException(
            status_code=502,
            detail=f"The model stopped early ({response.incomplete_details.reason})",
        )
    return json.loads(response.output_text)


def get_model(data):
    model = data.get("model") or MODELS[0]
    if model not in MODELS:
        raise HTTPException(status_code=400, detail=f"Unknown model: {model}")
    return model


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

    SYSTEM_MESSAGE = '''You are an assistant that based on a series of inputs, will give out a structured JSON object with the data needed to build a GLSL shader background. It will contain the following: the vertex shader, the fragment shader, and the three main colors in the background in hex format. The user will answer the question "are you feeling spooky?". If their answer is "yes", or any other type of affirmative expression or confirmation, you will generate the craziest possible halloween themed glsl background shader. It has to include some pattern like swirls, noise, and the like.  Otherwise, you will generate a calm, nice looking background shader with a happy and passive color palette. Any function you may use has to be defined in the code, unless it is already included such as dot() or mix(). Only output the JSON object, don't say anything. Make sure the shader has many complicated moving things and is flashy but sophisticated and aesthetic. Also, include a uniform float "time" for the moving components. Always create a different combination of patterns and shapes, something that looks like it came out of shadertoy, with patterns like spirals, zebra lines, etc. Important: the pattern has to be descriptive and go with the flow with sentence is given by the user. Also include the declaration of functions such as random(), noise(), etc. in case they are needed. Do not declare again functions that already exist such as sin() or dot(). Never use a function or variable or constant that is not defined. All code needs to be written, nothing can be added later. Make sure it is a complex pattern, not just some gradient over time. The colors have to follow a pleasing color palette, no over-saturated values. The fragment shader must only contain the following uniforms and use them: float time, vec3 color1, vec3 color2, vec3 color3, vec2 resolution. Vec2 resolution is a uniform and must be declared. Make sure to define the value of all constants.''' + THREEJS_NOTE + ''' Example:user:"yes I want something spooky".you:"{
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
        model = get_model(data)

        if not sentence:
            raise HTTPException(status_code=400, detail="Input string is required")

        shader = await ask(model, SYSTEM_MESSAGE, sentence, SHADER_SCHEMA)
        # print(f'shader to json: {shader}')

        # Second pass: same checker as before, now answering with a schema too
        checked = await ask(
            model, CHECK_MESSAGE + THREEJS_NOTE, shader["fragmentShader"], FRAGMENT_SCHEMA
        )
        shader["fragmentShader"] = checked["fragmentShader"]

        return JSONResponse(content=shader)

    except HTTPException:
        raise
    except openai.APIError as e:
        print(f"OpenAI error: {e}")
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/fix-shader")
async def fix_shader(request: Request):
    """The browser couldn't compile the shader, so run the checker again with
    the real compiler error so it knows exactly what to fix."""
    try:
        data = await request.json()
        frag_shader = data.get("fragmentShader")
        compile_error = data.get("error")
        model = get_model(data)

        if not frag_shader or not compile_error:
            raise HTTPException(
                status_code=400, detail="fragmentShader and error are required"
            )

        checked = await ask(
            model,
            CHECK_MESSAGE + THREEJS_NOTE,
            f"{frag_shader}\n\nThis shader failed to compile in three.js with this error:\n{compile_error}",
            FRAGMENT_SCHEMA,
        )
        return JSONResponse(content=checked)

    except HTTPException:
        raise
    except openai.APIError as e:
        print(f"OpenAI error: {e}")
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
