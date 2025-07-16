from fastapi import FastAPI
from api.audio import router as audio_router

app = FastAPI()

app.include_router(audio_router)

# Placeholder routers (to be implemented)
@app.get('/')
def root():
    return {"message": "Med Convo Backend API"} 