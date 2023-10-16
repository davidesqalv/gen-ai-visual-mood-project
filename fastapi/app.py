from fastapi import FastAPI, Request, HTTPException
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


@app.get("/")
async def read_root():
    return {"Hello": "World"}


@app.post("/gen-shader")
async def gen_shader(request: Request):

    SYSTEM_MESSAGE = '''You are an assistant that based on a series of inputs, will give out a structured JSON object with the data needed to build a GLSL shader background. It will contain the following: the vertex shader, the fragment shader, and the three main colors in the background in hex format. The user will describe what mood they're in, or will ask for what background they want, and you will do your best job at converting that into the shader that best fits it. Only output the JSON object, don't say anything. Make sure the shader has many complicated moving things and is flashy but sophisticated and aesthetic. Also, include a uniform float "time" for the moving components. Always create a different combination of patterns and shapes.
Example:user:"I am not feeling well".you:"{
  "vertexShader": "attribute vec3 position;\nvoid main() {\ngl_Position = vec4(position, 1.0);\n}",
  "fragmentShader": "uniform float time;\nvoid main() {\nvec2 uv = (gl_FragCoord.xy / resolution.xy) + (time * 0.05);\nfloat r = 0.3*cos(uv.x+time);\nfloat g = 0.3*sin(uv.y+time);\nfloat b = 0.3*sqrt(uv.x+uv.y)*cos(time);\ngl_FragColor = vec4(r, g, b, 1.0);\n}",
  "colors": ["#ff0066", "#33ccff", "#00ffcc"]
}"'''

    try:
        data = await request.json()
        sentence = data.get("sentence")
        print("this is the sentence", sentence)

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

        shader = json.loads(shader)

        return JSONResponse(content=shader)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
