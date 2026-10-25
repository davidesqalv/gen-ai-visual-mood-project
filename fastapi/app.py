from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import anthropic
from anthropic import AsyncAnthropic
from dotenv import find_dotenv, load_dotenv
from os import environ as env
import json
import re

# Loading env variables
ENV_FILE = find_dotenv()
if ENV_FILE:
    load_dotenv(ENV_FILE)

client = AsyncAnthropic(api_key=env.get("ANTHROPIC_API_KEY"))

MODEL = "claude-sonnet-5-5"
# medium keeps it quick; Sonnet 5.5 defaults to high
EFFORT = "medium"

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

THREEJS_NOTE = " It runs in a three.js ShaderMaterial on WebGL2 (GLSL ES 3.00 rules), so don't write #version lines, use float literals with a decimal point (1.0, not 1), and don't redeclare what three.js already provides (projectionMatrix, modelViewMatrix, position, uv). Write the code over multiple lines like normal GLSL source."

# The schema can't enforce the hex format, so anything else gets swapped out
HEX_COLOR = re.compile(r"^#([0-9a-fA-F]{3}){1,2}$")
FALLBACK_COLORS = ["#1b1033", "#e07a2f", "#8fbf5a"]


def clean_colors(colors):
    colors = [c.strip() for c in colors if isinstance(c, str)] + FALLBACK_COLORS
    return [c if HEX_COLOR.match(c) else FALLBACK_COLORS[i] for i, c in enumerate(colors[:3])]

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


async def ask(prompt):
    response = await client.messages.create(
        model=MODEL,
        max_tokens=16000,
        system=SYSTEM_MESSAGE,
        messages=[{"role": "user", "content": prompt}],
        output_config={
            "effort": EFFORT,
            "format": {"type": "json_schema", "schema": SHADER_SCHEMA},
        },
    )
    if response.stop_reason == "refusal":
        raise HTTPException(status_code=502, detail="Claude declined that one, try other words")
    if response.stop_reason == "max_tokens":
        raise HTTPException(status_code=502, detail="Claude ran out of room before finishing the shader")
    text = next(block.text for block in response.content if block.type == "text")
    shader = json.loads(text)
    shader["colors"] = clean_colors(shader.get("colors", []))
    return shader


def api_error(e):
    print(f"Anthropic error: {e}")
    if isinstance(e, anthropic.AuthenticationError):
        return HTTPException(status_code=500, detail="Anthropic rejected the API key, check ANTHROPIC_API_KEY in fastapi/.env")
    if isinstance(e, anthropic.RateLimitError):
        return HTTPException(status_code=429, detail="Rate limited by Anthropic, try again in a minute")
    return HTTPException(status_code=502, detail=str(e))


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
    try:
        data = await request.json()
        sentence = data.get("sentence")

        if not sentence:
            raise HTTPException(status_code=400, detail="Input string is required")

        shader = await ask(sentence)
        # print(f'shader to json: {shader}')

        return JSONResponse(content=shader)

    except HTTPException:
        raise
    except anthropic.APIError as e:
        raise api_error(e)
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/fix-shader")
async def fix_shader(request: Request):
    """Only called when three.js couldn't compile the shader. The model gets
    the error, its own code, and what the user originally said."""
    try:
        data = await request.json()
        sentence = data.get("sentence")
        shader = data.get("shader")
        compile_error = data.get("error")

        if not sentence or not shader or not compile_error:
            raise HTTPException(
                status_code=400, detail="sentence, shader and error are required"
            )

        fixed = await ask(
            f"""Hey, this shader doesn't work. three.js fails to compile it with this error:

{compile_error}

Here's the code:

{json.dumps(shader, indent=2)}

And here's what the user originally said: "{sentence}"

Fix it and send the whole thing back, keeping the same idea."""
        )
        return JSONResponse(content=fixed)

    except HTTPException:
        raise
    except anthropic.APIError as e:
        raise api_error(e)
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
