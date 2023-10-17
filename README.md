This is a little project showcasing a way to have LLMs autonomously generate and run GLSL shaders, with user input, (and sentiment models soon!).

![](https://github.com/davidesqalv/gen-ai-visual-mood-project/public/gifrecording.gif)

Next thing in the pipeline will be adding adaptive generated portrait images based on the user input, as well as sentiment analysis models.

It's a NextJS frontend with a FastAPI backend to perform the LLM (chatGPT) calls.

The shader generation has two layers:

1. The fragment shader, vertex shader, and color generation.
2. Another pass on the fragment shader, to make sure the code will run without human intervention.

To run, first start NextJS:

```bash
npm run dev
```

And boot fastAPI in port 8000:

```bash
cd fastapi; uvicorn app:app --port=8000 --reload
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

\*Disclaimer: the shader generation still fails sometimes, missing things such as function declarations, performing operations with vectors with different dimensions, etc. More iteration is needed on the prompts.
