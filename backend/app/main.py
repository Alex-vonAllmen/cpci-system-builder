from fastapi import FastAPI
from app.core.config import settings
from app.api import admin, configurator
from app.db.session import engine, Base

# Create tables
Base.metadata.create_all(bind=engine)

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title=settings.PROJECT_NAME, openapi_url=f"{settings.API_V1_STR}/openapi.json")

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(configurator.router, prefix="/api/config", tags=["configurator"])

@app.get("/")
def read_root():
    return {"message": "Welcome to duagon CompactPCI Serial Configurator API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
