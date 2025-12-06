from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import admin, configurator, examples, articles

app = FastAPI(title=settings.PROJECT_NAME, openapi_url=f"{settings.API_V1_STR}/openapi.json")

# CORS Configuration
origins = [
    "http://localhost:5173",
    "http://localhost:3000", # Common React port backup
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(configurator.router, prefix="/api/config", tags=["configurator"])
app.include_router(examples.router, prefix="/api/examples", tags=["examples"])
app.include_router(articles.router, prefix="/api/articles", tags=["articles"])

@app.get("/")
def read_root():
    return {"message": "Welcome to duagon CompactPCI Serial Configurator API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
