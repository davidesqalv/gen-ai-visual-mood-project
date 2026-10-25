This is a little project showcasing a way to have LLMs autonomously generate and run GLSL shaders, with user input, (and sentiment models soon!).

![](https://github.com/davidesqalv/gen-ai-visual-mood-project/blob/main/public/gifrecording.gif)

Next thing in the pipeline will be adding adaptive generated portrait images based on the user input, with controlnet/stable diffusion and vision preprocessing, as well as sentiment analysis models.

It's a NextJS frontend with a FastAPI backend to perform the LLM calls (OpenAI: GPT-6.1 Sol, GPT-6 Luna or GPT-5.6 Terra, picked from the dropdown under the input).

The shader generation has two layers:

1. The fragment shader, vertex shader, and color generation.
2. Another pass on the fragment shader, to make sure the code will run without human intervention.
3. If three.js still can't compile it, the previous shader stays on screen and the real compiler error is sent back to that second pass for a fix (up to 2 tries).

Both passes use structured outputs (a JSON schema), so the response always parses.

To run, first start NextJS:

```bash
npm run dev
```

And boot fastAPI in port 8000. First time only, set up the venv and put `OPENAI_API_KEY=...` in `fastapi/.env`:

```bash
cd fastapi
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

Then:

```bash
cd fastapi; .venv/bin/uvicorn app:app --port=8000 --reload
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

\*Disclaimer: the models still write shaders that don't compile sometimes (missing function declarations, vectors with different dimensions, etc.). When that happens, the compiler error now goes back to the model for a fix instead of leaving a blank screen.
